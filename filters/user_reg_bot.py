# filters/user_reg_bot.py
# -*- coding: utf-8 -*-

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import base64
import aiohttp  # для HTTP-вызовов Bot API
import hmac, hashlib, time
import asyncio
import asyncpg
try:
    import redis.asyncio as redis
except Exception:  # если redis не установлен или недоступен
    redis = None
from telethon import types
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional
from utils import fetch_and_clear_notices
from dotenv import load_dotenv
from telethon import TelegramClient, events, Button
from telethon.tl.custom.message import Message
from telethon.errors import MessageIdInvalidError, MessageNotModifiedError
from filters.webapp_api import build_apply_webapp_url
import re
import urllib.parse as up  # у вас уже есть, но убедитесь что импорт именно как up
  # Добавляет /home/pc/Desktop/test/


# --- ENV --------------------------------------------------------------------

def _load_env():
    here = Path(__file__).resolve()
    candidates = [
        here.parents[1] / ".env",                  # /project/.env
        here.parents[1] / "telegram_bot" / ".env", # /project/telegram_bot/.env
        here.parent / ".env",                      # /project/filters/.env
    ]
    for p in candidates:
        if p.exists():
            load_dotenv(dotenv_path=p)
            return p
    load_dotenv()
    return None

_env_file = _load_env()

def _getenv(name: str, required=True, cast=None):
    v = os.getenv(name)
    if not v:
        if required:
            where = f" (файл: {_env_file})" if _env_file else ""
            raise RuntimeError(f"Переменная {name} не найдена{where}. Проверь .env")
        return None
    return cast(v) if cast else v

API_ID    = _getenv("API_ID",   required=True, cast=int)
API_HASH  = _getenv("API_HASH", required=True)
BOT_TOKEN = _getenv("BOT_TOKEN", required=True)
WEBAPP_URL = _getenv("WEBAPP_URL", required=True)
APPLY_WEBAPP_URL = _getenv("APPLY_WEBAPP_URL", required=True)
WEBAPP_SIGNING_SECRET = _getenv("WEBAPP_SIGNING_SECRET", required=False)
TTP_WEBHOOK_BASE = os.getenv("TTP_WEBHOOK_BASE", "http://127.0.0.1:8000").rstrip("/")
UPSALE_WEBAPP_URL = os.getenv("UPSALE_WEBAPP_URL")
SUPPORT_GROUP_ID_RAW = (os.getenv("SUPPORT_GROUP_ID") or "").strip()
SUPPORT_GROUP_ID = int(SUPPORT_GROUP_ID_RAW) if SUPPORT_GROUP_ID_RAW and SUPPORT_GROUP_ID_RAW.lstrip("-").isdigit() else None
SUPPORT_GROUP_INVITE = (os.getenv("SUPPORT_GROUP_INVITE") or "").strip()

# --- asyncpg pool & redis client --------------------------------------------
PG_DB = os.getenv("PG_DB")
PG_USER = os.getenv("PG_USER")
PG_PASSWORD = os.getenv("PG_PASSWORD")
PG_HOST = os.getenv("PG_HOST")
PG_PORT = os.getenv("PG_PORT")

_pg_pool: asyncpg.Pool | None = None

async def _ensure_pg_pool() -> asyncpg.Pool:
    global _pg_pool
    if _pg_pool is None:
        _pg_pool = await asyncpg.create_pool(
            user=PG_USER,
            password=PG_PASSWORD,
            database=PG_DB,
            host=PG_HOST,
            port=int(PG_PORT) if (PG_PORT and PG_PORT.isdigit()) else PG_PORT,
            min_size=1,
            max_size=10,
        )
    return _pg_pool

REDIS_URL = os.getenv("REDIS_URL")
_redis: Optional[Any] = None
if redis and REDIS_URL:
    try:
        _redis = redis.from_url(REDIS_URL)
    except Exception:
        _redis = None

# --- STORAGE ----------------------------------------------------------------

DATA_DIR   = Path(__file__).resolve().parents[1] / "data"
MEDIA_ROOT = DATA_DIR / "user_media"
DATA_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

def _db_connect():
    return psycopg2.connect(
        dbname=os.getenv("PG_DB"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASSWORD"),
        host=os.getenv("PG_HOST"),
        port=os.getenv("PG_PORT")
    )

def media_path(user_id: int, slot: int) -> Path:
    user_dir = MEDIA_ROOT / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir / f"photo{slot}.jpg"

def init_db():
    con = _db_connect()
    with con.cursor() as cur:
        # --- анкеты пользователей ---
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id BIGINT PRIMARY KEY,
                full_name TEXT,
                cities TEXT,
                sex TEXT,
                age_range TEXT,
                look_type TEXT,
                body_type TEXT,
                height_cm INTEGER,
                weight_kg INTEGER,
                hair_color TEXT,
                hair_type TEXT,
                eye_color TEXT,
                languages TEXT,
                video_vizitka TEXT,
                showreel TEXT,
                portfolio TEXT,
                projects TEXT,
                phone TEXT,
                skills TEXT,
                instagram TEXT,
                photo1_id TEXT,
                photo2_id TEXT,
                photo3_id TEXT,
                photo4_id TEXT,
                photo1_tg JSONB,
                photo2_tg JSONB,
                photo3_tg JSONB,
                photo4_tg JSONB,
                created_at TIMESTAMPTZ,
                updated_at TIMESTAMPTZ
            )
            """
        )

        # --- таблица подходящих кастингов (matches) ---
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS matches (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                source_chat BIGINT,
                thread_id INTEGER,
                message_ids JSONB,
                text_cache TEXT,
                created_at TIMESTAMPTZ NOT NULL
            )
            """
        )

        # --- согласие с офертой/политикой (персистентный флаг) ---
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS consents (
                user_id BIGINT PRIMARY KEY,
                accepted_at TIMESTAMPTZ NOT NULL
            )
            """
        )

        # --- статус подписки (active/inactive) ---
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS subs (
                user_id   BIGINT PRIMARY KEY,
                status    TEXT NOT NULL CHECK(status IN ('active','inactive')),
                updated_at TIMESTAMPTZ NOT NULL
            )
            """
        )

        # индексы
        cur.execute("CREATE INDEX IF NOT EXISTS idx_matches_user_created ON matches(user_id, created_at DESC)")

    con.commit()
    con.close()

async def a_upsert_user(user_id: int, data: Dict[str, Any]):
    now = datetime.now(timezone.utc)

    def _to_int(v):
        try:
            return int(str(v).strip())
        except (ValueError, TypeError):
            return None

    payload = {
        "full_name":     data.get("full_name"),
        "cities":        ", ".join(data["cities"]) if isinstance(data.get("cities"), list) else data.get("cities"),
        "sex":           data.get("sex"),
        "age_range":     data.get("age_range"),
        "look_type":     data.get("look_type"),
        "body_type":     data.get("body_type"),
        "height_cm":     _to_int(data.get("height_cm")),
        "weight_kg":     _to_int(data.get("weight_kg")),
        "hair_color":    data.get("hair_color"),
        "hair_type":     data.get("hair_type"),
        "eye_color":     data.get("eye_color"),
        "languages":     ", ".join(data["languages"]) if isinstance(data.get("languages"), list) else data.get("languages"),
        "video_vizitka": data.get("video_vizitka"),
        "showreel":      data.get("showreel"),
        "portfolio":     data.get("portfolio"),
        "projects":      data.get("projects"),
        "phone":         data.get("phone"),
        "instagram":     data.get("instagram"),
        "skills":        data.get("skills"),
        "photo1_id":     data.get("photo1_id"),
        "photo2_id":     data.get("photo2_id"),
        "photo3_id":     data.get("photo3_id"),
        "photo4_id":     data.get("photo4_id"),
        "photo1_tg":     json.dumps(data.get("photo1_tg")) if isinstance(data.get("photo1_tg"), dict) else None,
        "photo2_tg":     json.dumps(data.get("photo2_tg")) if isinstance(data.get("photo2_tg"), dict) else None,
        "photo3_tg":     json.dumps(data.get("photo3_tg")) if isinstance(data.get("photo3_tg"), dict) else None,
        "photo4_tg":     json.dumps(data.get("photo4_tg")) if isinstance(data.get("photo4_tg"), dict) else None,
    }
    fields = ", ".join(payload.keys())
    values = list(payload.values())
    placeholders = ", ".join(f"${i}" for i in range(2, 2+len(values)))
    ca_idx = 2+len(values)
    ua_idx = ca_idx+1
    set_updates = ", ".join(f"{k} = EXCLUDED.{k}" for k in payload.keys())

    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        await con.execute(
            f"""
            INSERT INTO users (user_id, {fields}, created_at, updated_at)
            VALUES ($1, {placeholders}, ${ca_idx}, ${ua_idx})
            ON CONFLICT(user_id) DO UPDATE SET
                {set_updates},
                updated_at = EXCLUDED.updated_at
            """,
            int(user_id), *values, now, now
        )

async def a_store_consent(uid: int):
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        await con.execute(
            "INSERT INTO consents(user_id, accepted_at) VALUES($1, $2) ON CONFLICT (user_id) DO NOTHING",
            int(uid), datetime.now(timezone.utc)
        )

async def a_init_db():
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        async with con.transaction():
            await con.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    user_id BIGINT PRIMARY KEY,
                    full_name TEXT,
                    cities TEXT,
                    sex TEXT,
                    age_range TEXT,
                    look_type TEXT,
                    body_type TEXT,
                    height_cm INTEGER,
                    weight_kg INTEGER,
                    hair_color TEXT,
                    hair_type TEXT,
                    eye_color TEXT,
                    languages TEXT,
                    video_vizitka TEXT,
                    showreel TEXT,
                    portfolio TEXT,
                    projects TEXT,
                    phone TEXT,
                    skills TEXT,
                    instagram TEXT,
                    photo1_id TEXT,
                    photo2_id TEXT,
                    photo3_id TEXT,
                    photo4_id TEXT,
                    photo1_tg JSONB,
                    photo2_tg JSONB,
                    photo3_tg JSONB,
                    photo4_tg JSONB,
                    created_at TIMESTAMPTZ,
                    updated_at TIMESTAMPTZ
                )
                """
            )
            await con.execute(
                """
                CREATE TABLE IF NOT EXISTS matches (
                    id SERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    source_chat BIGINT,
                    thread_id INTEGER,
                    message_ids JSONB,
                    text_cache TEXT,
                    created_at TIMESTAMPTZ NOT NULL
                )
                """
            )
            await con.execute(
                """
                CREATE TABLE IF NOT EXISTS consents (
                    user_id BIGINT PRIMARY KEY,
                    accepted_at TIMESTAMPTZ NOT NULL
                )
                """
            )
            await con.execute(
                """
                CREATE TABLE IF NOT EXISTS subs (
                    user_id   BIGINT PRIMARY KEY,
                    status    TEXT NOT NULL CHECK(status IN ('active','inactive')),
                    updated_at TIMESTAMPTZ NOT NULL
                )
                """
            )
            await con.execute("CREATE INDEX IF NOT EXISTS idx_matches_user_created ON matches(user_id, created_at DESC)")

def purge_old_matches(con=None):
    own = False
    if con is None:
        con = _db_connect(); own = True
    with con.cursor() as cur:
        cur.execute("DELETE FROM matches WHERE created_at < NOW() - INTERVAL '7 days'")
        deleted = cur.rowcount
    if own:
        con.commit(); con.close()
    return deleted

async def a_purge_old_matches(hours: int = 168) -> int:
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        cmd = await con.execute(
            "DELETE FROM matches WHERE created_at < NOW() - ($1::text || ' hours')::interval",
            int(hours),
        )
        try:
            return int(cmd.split()[-1])
        except Exception:
            return 0

def get_user_matches(uid: int):
    con = _db_connect()
    with con.cursor(cursor_factory=RealDictCursor) as cur:
        purge_old_matches(con)
        cur.execute(
            "SELECT * FROM matches WHERE user_id=%s ORDER BY created_at DESC, id DESC",
            (uid,)
        )
        rows = [dict(r) for r in cur.fetchall()]
    con.close()
    for r in rows:
        try:
            mids = r.get("message_ids") or []
            r["message_ids"] = [int(x) for x in mids]
        except Exception:
            r["message_ids"] = []
    return rows

async def a_get_user_matches(uid: int, limit: int = 1000) -> list[dict]:
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        await con.execute("DELETE FROM matches WHERE created_at < NOW() - INTERVAL '7 days'")
        rows = await con.fetch(
            "SELECT * FROM matches WHERE user_id=$1 ORDER BY created_at DESC, id DESC LIMIT $2",
            int(uid), int(limit)
        )
        out = [dict(r) for r in rows]
        for r in out:
            try:
                mids = r.get("message_ids") or []
                r["message_ids"] = [int(x) for x in mids]
            except Exception:
                r["message_ids"] = []
        return out

def delete_match_by_id(match_id: int, uid: int) -> bool:
    con = _db_connect()
    with con.cursor() as cur:
        cur.execute("DELETE FROM matches WHERE id=%s AND user_id=%s", (match_id, uid))
        deleted_count = cur.rowcount
    con.commit()
    con.close()
    return deleted_count > 0

async def a_delete_match_by_id(match_id: int, uid: int) -> bool:
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        cmd = await con.execute("DELETE FROM matches WHERE id=$1 AND user_id=$2", int(match_id), int(uid))
        try:
            return int(cmd.split()[-1]) > 0
        except Exception:
            return False

# ---- согласие: хелперы ----------------------------------------------------

def has_consent(uid: int) -> bool:
    con = _db_connect()
    with con.cursor() as cur:
        cur.execute("SELECT 1 FROM consents WHERE user_id=%s", (uid,))
        ok = cur.fetchone() is not None
    con.close()
    return ok

def store_consent(uid: int):
    con = _db_connect()
    with con.cursor() as cur:
        cur.execute(
            "INSERT INTO consents(user_id, accepted_at) VALUES(%s, %s) ON CONFLICT (user_id) DO NOTHING",
            (uid, datetime.now(timezone.utc))
        )
    con.commit()
    con.close()

async def a_store_consent(uid: int):
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        await con.execute(
            "INSERT INTO consents(user_id, accepted_at) VALUES($1, $2) ON CONFLICT (user_id) DO NOTHING",
            int(uid), datetime.now(timezone.utc)
        )

# ---- подписка: хелперы -----------------------------------------------------

def get_sub_status(uid: int) -> str:
    con = _db_connect()
    with con.cursor() as cur:
        try:
            cur.execute("SELECT status FROM subs WHERE user_id=%s", (uid,))
            row = cur.fetchone()
            return (row[0] if row else "inactive")
        except psycopg2.Error:
            return "inactive"
    con.close()

def set_sub_status(uid: int, status: str):
    status = "active" if status == "active" else "inactive"
    con = _db_connect()
    with con.cursor() as cur:
        cur.execute(
            "INSERT INTO subs(user_id, status, updated_at) VALUES(%s, %s, %s) ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at",
            (uid, status, datetime.now(timezone.utc))
        )
    con.commit()
    con.close()

async def a_set_sub_status(uid: int, status: str):
    status = "active" if status == "active" else "inactive"
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        await con.execute(
            "INSERT INTO subs(user_id, status, updated_at) VALUES($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at",
            int(uid), status, datetime.now(timezone.utc)
        )

def is_sub_active(uid: int) -> bool:
    return get_sub_status(uid) == "active"

# ---- подписка (plan) и категории (premium) ---------------------------------

def get_sub_plan(uid: int) -> Optional[str]:
    """Возвращает план подписки (None|'basic'|'premium')"""
    con = _db_connect()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT plan FROM subs WHERE user_id=%s", (uid,))
            row = cur.fetchone()
            return (row[0] if row else None)
    finally:
        con.close()

async def a_toggle_user_category(uid: int, code: str):
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        async with con.transaction():
            exists = await con.fetchval(
                "SELECT 1 FROM user_category_prefs WHERE user_id=$1 AND category_code=$2",
                int(uid), code
            )
            if exists:
                await con.execute("DELETE FROM user_category_prefs WHERE user_id=$1 AND category_code=$2", int(uid), code)
            else:
                await con.execute(
                    "INSERT INTO user_category_prefs(user_id, category_code) VALUES($1,$2) ON CONFLICT DO NOTHING",
                    int(uid), code
                )

async def a_list_categories() -> list[tuple[str, str]]:
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        rows = await con.fetch("SELECT code, title FROM categories ORDER BY code")
        return [(r["code"], r["title"]) for r in rows]

async def a_get_user_category_prefs(uid: int) -> set[str]:
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        rows = await con.fetch("SELECT category_code FROM user_category_prefs WHERE user_id=$1", int(uid))
        return {r["category_code"] for r in rows}

async def a_has_consent(uid: int) -> bool:
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        val = await con.fetchval("SELECT 1 FROM consents WHERE user_id=$1", int(uid))
        return val is not None

async def a_is_sub_active(uid: int) -> bool:
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        row = await con.fetchrow("SELECT status FROM subs WHERE user_id=$1", int(uid))
        return bool(row and row["status"] == "active")

async def a_get_sub_plan(uid: int) -> Optional[str]:
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        row = await con.fetchrow("SELECT plan FROM subs WHERE user_id=$1", int(uid))
        return (row["plan"] if row else None)

def list_categories() -> list[tuple[str, str]]:
    """Справочник категорий (code, title)"""
    con = _db_connect()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT code, title FROM categories ORDER BY code")
            return [(r[0], r[1]) for r in cur.fetchall()]
    finally:
        con.close()

def get_user_category_prefs(uid: int) -> set[str]:
    con = _db_connect()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT category_code FROM user_category_prefs WHERE user_id=%s", (uid,))
            return {r[0] for r in cur.fetchall()}
    finally:
        con.close()

def toggle_user_category(uid: int, code: str):
    con = _db_connect()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT 1 FROM user_category_prefs WHERE user_id=%s AND category_code=%s", (uid, code))
            exists = cur.fetchone() is not None
            if exists:
                cur.execute("DELETE FROM user_category_prefs WHERE user_id=%s AND category_code=%s", (uid, code))
            else:
                cur.execute(
                    "INSERT INTO user_category_prefs(user_id, category_code) VALUES(%s,%s) ON CONFLICT DO NOTHING",
                    (uid, code),
                )
        con.commit()
    finally:
        con.close()

def build_webapp_url(uid: int) -> str:
    """
    Добавляем к WEBAPP_URL параметры: uid, ts и подпись sig (если есть секрет),
    чтобы мини-аппа могла верифицировать запрос.
    """
    base = WEBAPP_URL
    ts = str(int(time.time()))
    q = {"uid": str(uid), "ts": ts}
    if WEBAPP_SIGNING_SECRET:
        msg = f"{uid}:{ts}".encode("utf-8")
        key = WEBAPP_SIGNING_SECRET.encode("utf-8")
        sig = hmac.new(key, msg, hashlib.sha256).hexdigest()
        q["sig"] = sig
    sep = "&" if ("?" in base) else "?"
    return base + sep + up.urlencode(q)

def build_upsell_webapp_url(uid: int, plan: Optional[str]) -> str:
    base = (UPSALE_WEBAPP_URL or WEBAPP_URL)
    ts = str(int(time.time()))
    q: Dict[str, str] = {"uid": str(uid), "ts": ts, "page": "upsell"}
    if plan:
        q["plan"] = str(plan)
    if WEBAPP_SIGNING_SECRET:
        msg = f"{uid}:{ts}".encode("utf-8")
        key = WEBAPP_SIGNING_SECRET.encode("utf-8")
        sig = hmac.new(key, msg, hashlib.sha256).hexdigest()
        q["sig"] = sig
    sep = "&" if ("?" in base) else "?"
    return base + sep + up.urlencode(q)

CONSENT_TEXT = (
    "🔐 **Согласие с условиями**\n\n"
    "Нажимая «Принять», вы подтверждаете, что ознакомились и соглашаетесь с "
    "[Публичной офертой](https://roletapp.kz/oferta/) и "
    "[Политикой конфиденциальности](https://roletapp.kz/privacy/).\n\n"
    "После принятия я продолжу выбранное вами действие."
)

CONSENT_ACTIONS = {"start_form_or_profile", "my_profile", "view_castings", "open_tariff", "open_upsell"}

async def guard_consent(ev: events.CallbackQuery.Event, action: str) -> bool:
    """
    Если согласие ещё не дано — редактируем текущее сообщение на экран согласия.
    Возвращает True, если показали экран согласия (и вызывающему обработчику надо сделать return).
    """
    if action not in CONSENT_ACTIONS:
        return False
    uid = ev.sender_id
    if await a_has_consent(uid):
        return False
    try:
        await client.edit_message(
            ev.chat_id,
            ev.message_id,
            CONSENT_TEXT,
            buttons=[
                [Button.inline("✅ Принять", f"consent_ok:{action}".encode("utf-8"))],
                [Button.inline("✖️ Отмена", b"consent_cancel")]
            ],
            link_preview=False,
            parse_mode="markdown",
        )
        # зафиксируем, что это «текущий экран» для дальнейших редактирований
        await _state_update(uid, {"screen_id": ev.message_id})
    except Exception:
        # запасной вариант — отправим новым сообщением
        await render_text(uid, ev.chat_id, CONSENT_TEXT, buttons=[
            [Button.inline("✅ Принять", f"consent_ok:{action}".encode("utf-8"))],
            [Button.inline("✖️ Отмена", b"consent_cancel")]
        ])
    return True

def button_only(step: Dict[str, Any]) -> bool:
    # Любой шаг, где предполагается выбор по кнопкам
    if step.get("type") in ("multiselect", "choice"):
        return True
    # choicefree с набором choices — тоже считаем «кнопочным»
    if step.get("type") == "choicefree" and step.get("choices"):
        return True
    return False

def upsert_user(user_id: int, data: Dict[str, Any]):
    con = _db_connect()
    now = datetime.now(timezone.utc)

    def _to_int(v):
        try:
            return int(str(v).strip())
        except (ValueError, TypeError):
            return None

    payload = {
        "full_name":     data.get("full_name"),
        "cities":        ", ".join(data["cities"]) if isinstance(data.get("cities"), list) else data.get("cities"),
        "sex":           data.get("sex"),
        "age_range":     data.get("age_range"),
        "look_type":     data.get("look_type"),
        "body_type":     data.get("body_type"),
        "height_cm":     _to_int(data.get("height_cm")),
        "weight_kg":     _to_int(data.get("weight_kg")),
        "hair_color":    data.get("hair_color"),
        "hair_type":     data.get("hair_type"),
        "eye_color":     data.get("eye_color"),
        "languages":     ", ".join(data["languages"]) if isinstance(data.get("languages"), list) else data.get("languages"),
        "video_vizitka": data.get("video_vizitka"),
        "showreel":      data.get("showreel"),
        "portfolio":     data.get("portfolio"),
        "projects":      data.get("projects"),
        "phone":         data.get("phone"),
        "instagram":     data.get("instagram"),
        "skills":        data.get("skills"),
        "photo1_id":     data.get("photo1_id"),
        "photo2_id":     data.get("photo2_id"),
        "photo3_id":     data.get("photo3_id"),
        "photo4_id":     data.get("photo4_id"),
        "photo1_tg":     json.dumps(data.get("photo1_tg")) if isinstance(data.get("photo1_tg"), dict) else None,
        "photo2_tg":     json.dumps(data.get("photo2_tg")) if isinstance(data.get("photo2_tg"), dict) else None,
        "photo3_tg":     json.dumps(data.get("photo3_tg")) if isinstance(data.get("photo3_tg"), dict) else None,
        "photo4_tg":     json.dumps(data.get("photo4_tg")) if isinstance(data.get("photo4_tg"), dict) else None,
    }

    fields = ", ".join(payload.keys())
    placeholders = ", ".join(["%s"] * len(payload))
    updates = ", ".join(f"{k} = EXCLUDED.{k}" for k in payload.keys())

    with con.cursor() as cur:
        cur.execute(
            f"""
            INSERT INTO users (user_id, {fields}, created_at, updated_at)
            VALUES (%s, {placeholders}, %s, %s)
            ON CONFLICT(user_id) DO UPDATE SET
                {updates},
                updated_at = EXCLUDED.updated_at
            """,
            [user_id, *payload.values(), now, now],
        )
    con.commit()
    con.close()

def get_user(user_id: int) -> Optional[Dict[str, Any]]:
    con = _db_connect()
    with con.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM users WHERE user_id=%s", (user_id,))
        row = cur.fetchone()
    con.close()
    if not row:
        return None
    return dict(row)

async def a_get_user(user_id: int) -> Optional[Dict[str, Any]]:
    pool = await _ensure_pg_pool()
    async with pool.acquire() as con:
        row = await con.fetchrow("SELECT * FROM users WHERE user_id=$1", int(user_id))
        return (dict(row) if row else None)
# --- bot api ------------------------------------------------------------------
BOT_API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"

async def botapi_send_message(chat_id: int, text: str, reply_markup: dict) -> Optional[int]:
    """
    Отправляет сообщение через Bot API.
    Возвращает message_id при успехе, иначе None.
    """
    try:
        import json as _json
        _rm_size = len(_json.dumps(reply_markup, ensure_ascii=False))
        print(f"[botapi_send_message] reply_markup size: {_rm_size} bytes")
    except Exception:
        pass
    payload = {
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": True,
        "reply_markup": reply_markup,
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BOT_API_BASE}/sendMessage", json=payload) as resp:
            data = await resp.json()
            if data.get("ok") and data.get("result"):
                return int(data["result"]["message_id"])
            else:
                print("BotAPI sendMessage error:", data)
                return None

async def botapi_delete_message(chat_id: int, message_id: int) -> bool:
    payload = {"chat_id": chat_id, "message_id": message_id}
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BOT_API_BASE}/deleteMessage", json=payload) as resp:
            data = await resp.json()
            if data.get("ok"):
                return True
            # Идемпотентность: если сообщения уже нет, считаем всё ОК
            if (
                data.get("error_code") == 400 and
                isinstance(data.get("description"), str) and
                "message to delete not found" in data["description"].lower()
            ):
                return True
            # Остальные ошибки — логируем и возвращаем False
            print("BotAPI deleteMessage error:", data)
            return False
async def botapi_copy_message(chat_id: int, from_chat_id: int, message_id: int,
                              caption: str, reply_markup: dict) -> Optional[int]:
    """
    Копирует исходное сообщение в чат пользователя с новой подписью и inline-клавиатурой.
    Возвращает message_id нового сообщения или None.
    """
    payload = {
        "chat_id": chat_id,
        "from_chat_id": from_chat_id,
        "message_id": message_id,
        "caption": caption,
        "disable_web_page_preview": True,
        "reply_markup": reply_markup,
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BOT_API_BASE}/copyMessage", json=payload) as resp:
            data = await resp.json()
            if data.get("ok") and data.get("result"):
                return int(data["result"]["message_id"])
            print("BotAPI copyMessage error:", data)
            return None

async def botapi_get_chat_member(chat_id: int, user_id: int) -> dict | None:
    payload = {"chat_id": chat_id, "user_id": user_id}
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BOT_API_BASE}/getChatMember", json=payload) as resp:
            try:
                data = await resp.json()
            except Exception:
                return None
            if data.get("ok"):
                return data.get("result")
            return None

async def maybe_remind_support_group(uid: int, chat_id: int):
    if SUPPORT_GROUP_ID is None or not SUPPORT_GROUP_INVITE:
        return
    # не чаще раза в сутки
    st = await _state_get(uid)
    last = int(st.get("support_reminded_ts", 0) or 0)
    now_ts = int(time.time())
    if (now_ts - last) < 86400:
        return
    try:
        member = await botapi_get_chat_member(SUPPORT_GROUP_ID, uid)
        status = (member or {}).get("status")
        if status in {"creator", "administrator", "member"}:
            return
    except Exception:
        pass
    kb = {
        "inline_keyboard": [
            [{"text": "💬 Вступить в чат поддержки", "url": SUPPORT_GROUP_INVITE}],
        ]
    }
    await botapi_send_message(chat_id, "У тебя активна подписка. Присоединяйся к нашему чату поддержки и общей ленте кастингов:", kb)
    await _state_update(uid, {"support_reminded_ts": now_ts})
# --- STATE ------------------------------------------------------------------

STATE: Dict[int, Dict[str, Any]] = {}
TMP_MSGS: Dict[int, list] = {}  # временные сообщения для очистки

# --- Redis-backed state (fallback to in-memory STATE) ------------------------
_STATE_KEY = "ua:state:{uid}"

async def _state_get(uid: int) -> Dict[str, Any]:
    if _redis is None:
        return STATE.setdefault(uid, {})
    try:
        raw = await _redis.get(_STATE_KEY.format(uid=uid))
        if not raw:
            return {}
        return json.loads(raw)
    except Exception:
        return STATE.setdefault(uid, {})

async def _state_update(uid: int, patch: Dict[str, Any]):
    if not isinstance(patch, dict):
        return
    if _redis is None:
        st = STATE.setdefault(uid, {})
        st.update(patch)
        return
    try:
        st = await _state_get(uid)
        st.update(patch)
        await _redis.set(_STATE_KEY.format(uid=uid), json.dumps(st))
    except Exception:
        st = STATE.setdefault(uid, {})
        st.update(patch)

async def _state_clear(uid: int):
    if _redis is None:
        STATE.pop(uid, None)
        return
    try:
        await _redis.delete(_STATE_KEY.format(uid=uid))
    except Exception:
        STATE.pop(uid, None)

WELCOME = (
    "🏠Главное меню\n\n"
    "📱Roletapp AI - Кастинг - платформа с базой 2000+ актеров.\n\n"
    "Нашей БЕСПЛАТНОЙ базой пользуются более 40 кастинг-директоров "
    "Salem, TigerFilms, Freedom Media, Unico Play и др.\n\n"
    "Используйте кнопки ниже:\n\n"
)

# лимит выбранных городов
MAX_CITIES = 3

def as_list(v):
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    if isinstance(v, str):
        return [s.strip() for s in v.split(",") if s.strip()]
    return []

def norm(s: str) -> str:
    return str(s).strip().lower()

def is_url_or_skip(text: str) -> str:
    t = (text or "").strip()
    return "" if t.lower() in ("нет", "no", "none", "-") else t

def format_summary(data: Dict[str, Any], *, show_hint: bool = True) -> str:
    langs = (", ".join(data["languages"]) if isinstance(data.get("languages"), list)
             else (data.get("languages") or "—"))
    lines = [
        f"🧾 {data.get('full_name','') or '—'}",
        f"📍 Города: {data.get('cities','—')}",
        f"👫 Пол: {data.get('sex','—')}",
        f"🎂 Игровой возраст: {data.get('age_range','—')}",
        f"🌍 Типаж: {data.get('look_type','—')}",
        f"🏋️‍♂️ Телосложение: {data.get('body_type','—')}",
        f"📏 Рост: {data.get('height_cm','—')} см",
        f"⚖️ Вес: {data.get('weight_kg','—')} кг",
        f"🎨 Цвет волос: {data.get('hair_color', '—')}",
        f"💈 Тип волос: {data.get('hair_type', '—')}",
        f"👁 Цвет глаз: {data.get('eye_color', '—')}",
        f"🗣 Языки: {langs}",
        f"🎬 Видеовизитка: {data.get('video_vizitka') or '—'}",
        f"📹 Шоурил: {data.get('showreel') or '—'}",
        f"🖼 Портфолио: {data.get('portfolio') or '—'}",
        f"🎞 Проекты: {data.get('projects','—')}",
        f"🧠 Навыки: {data.get('skills', '—')}",
        f"📞 Телефон: {data.get('phone','—')}",
        f"📸 Instagram: {data.get('instagram','—')}",
    ]
    if show_hint:
        lines += [
            "",
            "🌟 Подсказка:",
            "Подключи ИИ-кастинг агента и получай только подходящие для тебя кастинги из 30+ WA/TG групп с возможностью отправлять портфолио в один клик.",
        ]
    return "\n".join(lines)

def build_controls(can_back: bool):
    rows = []
    row = []
    if can_back:
        row.append(Button.inline("⬅️ Назад", b"back"))
    row.append(Button.inline("✖️ Отмена", b"cancel"))
    rows.append(row)
    return rows

# --- UI РЕНДЕРИНГ ----------------------------------------------------------

async def render_text(uid: int, chat_id: int, text: str, buttons=None):
    """Редактируем существующий экран или создаём новый; сохраняем screen_id в STATE."""
    st = await _state_get(uid)
    screen_id = st.get("screen_id")
    try:
        if screen_id:
            await client.edit_message(chat_id, screen_id, text, buttons=buttons, link_preview=False, parse_mode="markdown")
        else:
            msg: Message = await client.send_message(chat_id, text, buttons=buttons, link_preview=False, parse_mode="markdown")
            await _state_update(uid, {"screen_id": msg.id})
    except (MessageIdInvalidError, MessageNotModifiedError):
        msg: Message = await client.send_message(chat_id, text, buttons=buttons, link_preview=False, parse_mode="markdown")
        await _state_update(uid, {"screen_id": msg.id})

async def render_menu(chat_id: int, uid: int):
    active = await a_is_sub_active(uid)
    plan = await a_get_sub_plan(uid)

    # Сносим предыдущий экран (если был)
    st = await _state_get(uid)
    screen_id = st.get("screen_id")
    if screen_id:
        try:
            await client.delete_messages(chat_id, screen_id)
        except Exception:
            pass
        await _state_update(uid, {"screen_id": None})

    # Сборка клавиатуры Bot API
    rows = [
        [{"text": "📝 Попасть в базу (5 мин)", "callback_data": "start_form_or_profile"}],
        [{"text": "📇 Моя анкета", "callback_data": "my_profile"}],
        [{"text": "📰 Смотреть кастинги", "callback_data": "view_castings"}],
    ]

    if active:
        url = build_upsell_webapp_url(uid, plan)
        rows.append([{ "text": "🟢 ИИ кастинг-агент активен", "web_app": { "url": url } }])
    else:
        rows.append([{ "text": "⚡ Подключить ИИ кастинг-агента", "callback_data": "open_tariff" }])

    if active and ((plan or "").lower() == "premium"):
        rows.append([{ "text": "🎯 Категории (premium)", "callback_data": "catpick_open" }])

    kb = {"inline_keyboard": rows}
    mid = await botapi_send_message(chat_id, WELCOME, kb)
    if mid:
        await _state_update(uid, {"screen_id": mid})

# NOTE: category picker handlers will be placed after client initialization.

async def clear_sticky_notices(chat_id: int, uid: int, except_id: Optional[int] = None):
    """
    Удаляет все сообщения-уведомления, которые мы ранее отправляли пользователю.
    except_id — тот id, который уже удалён (например, ev.delete()).
    """
    ids = fetch_and_clear_notices(uid, except_id=except_id)
    if not ids:
        return
    try:
        await client.delete_messages(chat_id, ids, revoke=True)
    except Exception:
        pass

 # --- отклик: построение контакта и ссылки -----------------------------------
CONTACT_RE_EMAIL = re.compile(r"([A-Za-z0-9_.+\-]+@[A-Za-z0-9\-]+\.[A-Za-z0-9.\-]+)")
CONTACT_RE_TG = re.compile(r"@([A-Za-z0-9_]{5,})")
CONTACT_RE_PHONE = re.compile(r"(\+?\d[\d\-\s\(\)]{7,}\d)")

def _find_contact_in_text(text: str) -> dict:
    t = (text or "").strip()

    m = CONTACT_RE_EMAIL.search(t)
    if m:
        return {"type": "email", "email": m.group(1)}

    m = CONTACT_RE_TG.search(t)
    if m:
        return {"type": "tg", "username": m.group(1)}

    m = CONTACT_RE_PHONE.search(t)
    if m:
        digits = re.sub(r"\D", "", m.group(1))
        if len(digits) == 11 and digits.startswith("8"):
            digits = "7" + digits[1:]
        return {"type": "wa", "phone": digits}

    return {}

def _extract_project_and_role(ad_formatted: str) -> str:
    """Берёт из форматированного текста только строки Проект и Роль/Типаж.
    Если не находит — возвращает исходный текст как есть (на всякий случай).
    """
    try:
        lines = [(l or "").strip() for l in (ad_formatted or "").splitlines()]
        picked = []
        for l in lines:
            if l.startswith("🎨 Проект:") or l.startswith("👤 Роль/Типаж:"):
                picked.append(l)
        if picked:
            return "\n".join(picked)
        return ad_formatted.strip()
    except Exception:
        return (ad_formatted or "").strip()

def _build_apply_text(u: dict, ad_text: str, reduce_for_email: bool = False) -> str:
    ad = (ad_text or "").strip()
    if reduce_for_email:
        ad = _extract_project_and_role(ad)
    card = format_summary(u, show_hint=False)
    return (
        "Здравствуйте.\n"
        "Я по поводу вашего кастинга на Roletapp AI.\n\n"
        f"{ad}\n\n"
        "Моя анкета:\n"
        f"{card}"
    )
async def build_apply_button_dict(uid: int, ad_text: str) -> dict:
    """
    Возвращает словарь кнопки для inline_keyboard (Bot API):
    - при e-mail -> web_app
    - при WA/TG -> url
    - иначе      -> callback_data 'apply_unavailable'
    """
    contact = _find_contact_in_text(ad_text)
    u = await a_get_user(uid)
    if not u:
        return { "text": "✅ Откликнуться", "callback_data": "apply_unavailable" }

    def _cap_text(s: str, limit: int = 900) -> str:
        try:
            s = (s or "").strip()
            if len(s) <= limit:
                return s
            return s[: max(0, limit - 1) ] + "…"
        except Exception:
            return (s or "")

    # ✉️ e-mail -> открываем нашу мини-аппу /apply
    if contact.get("type") == "email":
        msg = _cap_text(_build_apply_text(u, ad_text, reduce_for_email=True))
        url = build_apply_webapp_url(
            APPLY_WEBAPP_URL,
            uid=uid,
            to=contact["email"],
            subject="Заявка на кастинг",
            body_text=msg,
            signing_secret=WEBAPP_SIGNING_SECRET,
        )
        return { "text": "✅ Откликнуться", "web_app": { "url": url } }

    # 💬 WhatsApp
    if contact.get("type") == "wa":
        msg = _cap_text(_build_apply_text(u, ad_text))
        enc = up.quote(msg)
        return { "text": "✅ Откликнуться", "url": f"https://wa.me/{contact['phone']}?text={enc}" }

    # 🤝 Telegram username
    if contact.get("type") == "tg":
        msg = _cap_text(_build_apply_text(u, ad_text))
        enc = up.quote(msg)
        user_link = f"https://t.me/{contact['username']}"
        return { "text": "✅ Откликнуться", "url": f"https://t.me/share/url?url={up.quote(user_link)}&text={enc}" }

    # Fallback — просто текст для поделиться
    msg = _cap_text(_build_apply_text(u, ad_text))
    enc = up.quote(msg)
    return { "text": "✅ Откликнуться", "url": f"https://t.me/share/url?text={enc}" }

async def _build_apply_url(uid: int, ad_text: str) -> Optional[str]:
    """
    Строим URL для «Откликнуться».
    Приоритет: телефон (wa.me) > @username (t.me/share с ссылкой на контакт) > fallback (t.me/share только с текстом).
    """
    u = await a_get_user(uid)
    if not u:
        return None

    msg = _build_apply_text(u, ad_text)
    enc = up.quote(msg)

    contact = _find_contact_in_text(ad_text)
    if contact.get("type") == "wa":
        # оф. формат wa.me — только цифры, без +
        return f"https://wa.me/{contact['phone']}?text={enc}"

    if contact.get("type") == "tg":
        # «Поделиться» с предзаполненным текстом и ссылкой на контакт
        user_link = f"https://t.me/{contact['username']}"
        return f"https://t.me/share/url?url={up.quote(user_link)}&text={enc}"

    # Fallback: контакта нет — откроется «Поделиться» в Telegram с готовым текстом
    return f"https://t.me/share/url?text={enc}"

async def build_casting_keyboard(uid: int, caption: str) -> dict:
    apply_btn = await build_apply_button_dict(uid, caption)
    return {
        "inline_keyboard": [
            [ { "text":"◀️", "callback_data":"cast_prev" }, { "text":"▶️", "callback_data":"cast_next" } ],
            [ { "text":"🙈 Скрыть", "callback_data":"cast_hide" }, apply_btn ],
            [ { "text":"🏠 Главное меню", "callback_data":"home" } ],
        ]
    }

def _build_source_link(source_chat: Optional[int], message_ids: list[int]) -> Optional[str]:
    """
    Пытаемся построить ссылку на оригинальный пост (для супергрупп/каналов).
    Формат: https://t.me/c/<abs_chat_id_without_-100>/<message_id>
    """
    try:
        if not source_chat or not message_ids:
            return None
        msg_id = int(message_ids[0])
        cid = int(source_chat)
        if str(cid).startswith("-100"):
            return f"https://t.me/c/{str(cid)[4:]}/{msg_id}"
        return None
    except Exception:
        return None

async def _render_match_view(uid: int, chat_id: int, match: dict, pos: int, total: int):
    """
    Показывает оригинальный пост с нужным поведением:
      • 1 фото + текст  -> одно сообщение (копия Bot API c подписью+позиция+кнопки)
      • только текст     -> одно сообщение (Bot API текст+позиция+кнопки)
      • альбом/неск.фото -> альбом отдельным сообщением, позиция+кнопки — вторым (Bot API)

    Важно: «Откликнуться» (в т.ч. web_app при e-mail) теперь всегда внутри одного сообщения.
    """
    # 0) очистим предыдущий показ
    st = await _state_get(uid)
    old_ids = st.get("castings_msg_ids") or []
    if old_ids:
        try:
            await client.delete_messages(chat_id, old_ids, revoke=True)
        except Exception:
            pass
        await _state_update(uid, {"castings_msg_ids": []})

    # если раньше для навигации или каста были Bot API-сообщения — удалим их
    prev_api_mid = st.get("castings_api_mid")
    if prev_api_mid is not None:
        await _state_update(uid, {"castings_api_mid": None})
    if prev_api_mid:
        try:
            await botapi_delete_message(chat_id, prev_api_mid)
        except Exception:
            pass

    prev_nav_mid = st.get("castings_nav_mid")
    if prev_nav_mid is not None:
        await _state_update(uid, {"castings_nav_mid": None})
    if prev_nav_mid:
        try:
            await botapi_delete_message(chat_id, prev_nav_mid)
        except Exception:
            pass

    # старый Telethon-навигационный экран (если был)
    if st.get("castings_nav_id"):
        try:
            await client.delete_messages(chat_id, st["castings_nav_id"], revoke=True)
        except Exception:
            pass
        st["castings_nav_id"] = None

    # сносим прежнюю webapp-кнопку (если когда-то отправлялась отдельным сообщением)
    prev_webapp_mid = st.pop("castings_webapp_mid", None)
    if prev_webapp_mid:
        try:
            await botapi_delete_message(chat_id, prev_webapp_mid)
        except Exception:
            pass

    # 1) достаём оригинальные сообщения
    source_chat = match.get("source_chat")
    message_ids = match.get("message_ids") or []
    src_msgs = []
    if source_chat and message_ids:
        try:
            got = await client.get_messages(int(source_chat), ids=message_ids)
            src_msgs = got if isinstance(got, list) else [got]
        except Exception:
            src_msgs = []

    # 2) текст подписи
    text_cache = match.get("text_cache") or ""
    caption = _extract_original_text(src_msgs, fallback=text_cache) or ""
    full_caption = (caption + f"\n\nПозиция: {pos}/{total}").strip()

    # 2a) Клавиатура (Bot API) с корректной «Откликнуться» (включая web_app при e-mail)
    kb_json = await build_casting_keyboard(uid, caption)

    # 3) случай: РОВНО ОДНО медиа (не альбом) -> копируем сообщением Bot API с новой подписью и клавиатурой
    if len(src_msgs) == 1:
        msg0 = src_msgs[0]
        is_single_media = bool(getattr(msg0, "media", None)) and getattr(msg0, "grouped_id", None) is None
        if is_single_media and source_chat and message_ids:
            try:
                # Bot API: copyMessage
                async with aiohttp.ClientSession() as session:
                    payload = {
                        "chat_id": chat_id,
                        "from_chat_id": int(source_chat),
                        "message_id": int(message_ids[0]),
                        "caption": full_caption,
                        "parse_mode": "Markdown",
                        "disable_web_page_preview": True,
                        "reply_markup": kb_json,
                    }
                    async with session.post(f"{BOT_API_BASE}/copyMessage", json=payload) as resp:
                        data = await resp.json()
                        if data.get("ok") and data.get("result"):
                            st["castings_api_mid"] = int(data["result"]["message_id"])
                            return
                        else:
                            print("BotAPI copyMessage error:", data)
            except Exception as e:
                print(f"⚠️ Не удалось скопировать медиа через Bot API: {e}")
                # упадём в общий фоллбэк ниже

    # 4) готовим файлы (если есть)
    files = await _download_media_files(src_msgs)

    # 4a) ТОЛЬКО ТЕКСТ -> одно Bot API сообщение с кнопками
    if not files:
        mid = await botapi_send_message(
            chat_id,
            (full_caption if caption else f"Позиция: {pos}/{total}"),
            kb_json,
        )
        if isinstance(mid, int):
            st["castings_api_mid"] = mid
        return

    # 4b) АЛЬБОМ / несколько файлов -> контент отдельно (Telethon), управление отдельно (Bot API)
    sent_ids = []
    try:
        if len(files) == 1:
            m = await client.send_file(chat_id, files[0], caption=caption, link_preview=False)
            sent_ids.append(m.id)
        else:
            mm = await client.send_file(chat_id, files, album=True, caption=caption, link_preview=False)
            sent_ids.extend([x.id for x in mm])
    finally:
        # подчистим времянки
        for f in files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception:
                pass

    st["castings_msg_ids"] = sent_ids

    # 5) отдельное Bot API-сообщение с позицией и кнопками (для альбомов)
    nav_mid = await botapi_send_message(chat_id, f"Позиция: {pos}/{total}", kb_json)
    if isinstance(nav_mid, int):
        st["castings_nav_mid"] = nav_mid

# --- WIZARD -----------------------------------------------------------------

STEPS = [
    {"key": "sex",          "q": "👫 **Какой у вас пол?**", "type": "choice",
     "choices": ["Мужской", "Женский"]},
    {"key": "full_name",    "q": "🧾 **Укажите Фамилию и имя** \n (Пример: Телманов Дархан)", "type": "text"},
    {"key": "cities", "q": "📍 **Выберите город(а), где готовы работать. Можно до 3-х**\n\n(✅Дождитесь появления галочки)\n", "type": "multiselect",
     "options": ["Алматы", "Астана", "Шымкент", "Актобе", "Караганда", "Тараз", "Павлодар", "Усть-Каменогорск","Семей", "Костанай","Кызылорда", "Атырау", "Уральск", "Петропавловск", "Темиртау", "Актау","Туркестан", "Экибастуз"], "limit": 3, "autonext": True },
    {"key": "age_range",    "q": "🎂 **Ваш игровой возраст** \n (Диапазон, например: 20-25)", "type": "text"},
    {"key": "look_type",    "q": "🌍 **Типаж внешности**", "type": "choicefree",
     "choices": ["Азиатский", "Европеоидный", "Ближневосточный", "Латинский", "Евразиатский", "Афроамериканский", "Индийский", "Скандинавский"]},
    {"key": "body_type",   "q": "🏋️‍♂️**Ваше телосложение**", "type": "choicefree",
     "choices": ["Худощавое", "Стройное", "Атлетичное", "Плотное", "Полное","Мускулистое",]},
    {"key": "height_cm",    "q": "📏 **Рост в сантиметрах** \n (только число. Например: 188)", "type": "number"},
    {"key": "weight_kg",    "q": "⚖️ **Вес в килограммах** \n (Только число. Например: 75)", "type": "number"},
    {"key": "hair_color", "q": "🎨 **Цвет волос**", "type": "choice", "choices": [
        "Чёрные", "Каштановые", "Русые", "Светло-русые", "Блондинистые",
        "Рыжие", "Седые", "Цветные"
    ]},
    {"key": "hair_type", "q": "💈 **Тип волос**", "type": "choice", "choices": [
        "Прямые", "Волнистые", "Кудрявые", "Афро", "Без волос"
    ]},
    {"key": "eye_color", "q": "👁 **Цвет глаз**", "type": "choice", "choices": [
        "Карие", "Голубые", "Зелёные", "Серые", "Чёрные", "Медовые", "Разные"
    ]},
    {"key": "languages",    "q": "🗣 **На каких языках говорите?** \n(Выберите один или несколько и нажмите сохранить)","type": "multiselect",
     "options": ["Русский", "Казахский", "Английский", "Немецкий", "Французский", "Турецкий", "Китайский", "Испанский", "Итальянский", "Арабский"], "limit": 10, "autonext": False},
    {"key": "video_vizitka","q": "🎬 **Видеовизитка (ссылкой)**. \n Видеовизитка — это короткое видео, где актёр естественно представляет себя в кадре, называя имя, возраст, параметры и демонстрируя внешность без актёрской игры.\n \nЕсли нет — нажмите «пропустить».\n(Можно добавить позже)", "type": "url-or-skip"},
    {"key": "showreel",     "q": "📹 **Шоурил (ссылкой)** \n Шоу-рил (showreel) — это короткое видео (1–2 минуты), в котором собраны лучшие актёрские сцены с участием актёра. Его задача — быстро показать кастинг-директорам твои способности, типаж и экранную харизму.\n \nЕсли нет — нажмите «пропустить».\n(Можно добавить позже)", "type": "url-or-skip"},
    {"key": "portfolio",    "q": "🖼 **Диск с фото и пробами (ссылкой)** \n Диск с портфолио и пробами — это цифровой носитель (обычно ссылка), на котором собраны Ваши разные фото и актёрские пробы для презентации кастинг-директору.\n \nЕсли нет — нажмите «пропустить»\n(Можно добавить позже)", "type": "url-or-skip"},
    {"key": "projects",     "q": "🎞 **Проекты/опыт** \nТекстом — можно в несколько строк.\n \nЕсли нет — нажмите «пропустить»\n (Можно добавить позже)", "type": "url-or-skip"},
    {"key": "phone",        "q": "📞 **Номер телефона** \n (Пример: +7(777)777-77-77)", "type": "text"},
    {"key": "instagram",    "q": "📸 **Instagram ссылка** \n Пример:\nhttps://www.instagram.com/**doxa.tells**/", "type": "text"},
    {"key": "skills",       "q": "🧠 **Специальные навыки** \n (Опишите коротко все свои навыки, через запятую: фехтование, акробатика, вождение авто)", "type": "text"},
    {"key": "photo1_id", "q": "📷 Фото #1 — **анфас**. Пришлите фото как изображение.", "type": "photo", "slot": 1},
    {"key": "photo2_id", "q": "📷 Фото #2 — **профиль**. Пришлите фото как изображение.", "type": "photo", "slot": 2,
     "optional": True},
    {"key": "photo3_id", "q": "📷 Фото #3 — **3/4**. Пришлите фото как изображение.", "type": "photo", "slot": 3,
     "optional": True},
    {"key": "photo4_id", "q": "📷 Фото #4 — **полный рост**. Пришлите фото как изображение.", "type": "photo", "slot": 4,
     "optional": True},
]
# Читаемые названия для кнопок точечного редактирования
FIELD_LABELS = {
    "sex": "Пол",
    "full_name": "Фамилия и имя",
    "cities": "Города",
    "age_range": "Игровой возраст",
    "look_type": "Типаж внешности",
    "body_type": "Телосложение",
    "height_cm": "Рост",
    "weight_kg": "Вес",
    "hair_color": "Цвет волос",
    "hair_type": "Тип волос",
    "eye_color": "Цвет глаз",
    "languages": "Языки",
    "video_vizitka": "Видеовизитка",
    "showreel": "Шоурил",
    "portfolio": "Портфолио",
    "projects": "Проекты/опыт",
    "phone": "Телефон",
    "instagram": "Instagram",
    "skills": "Специальные навыки",
}

# Список редактируемых по одному полей (все, кроме фото)
EDITABLE_KEYS = [s["key"] for s in STEPS if s.get("type") != "photo"]
KEY_TO_INDEX = {s["key"]: i for i, s in enumerate(STEPS)}

def progress_text(i: int) -> str:
    total = len(STEPS)
    return f"Шаг {i+1}/{total}"

def step_in_scope(step: Dict[str, Any], scope: Optional[str]) -> bool:
    if not scope:
        return True
    if scope == "form":
        return step.get("type") != "photo"
    if scope == "photos":
        return step.get("type") == "photo"
    return True

def first_index_for_scope(scope: Optional[str]) -> int:
    for idx, s in enumerate(STEPS):
        if step_in_scope(s, scope):
            return idx
    return len(STEPS)

def prefill_answers_from_user(u: Dict[str, Any]) -> Dict[str, Any]:
    langs  = u.get("languages") or ""
    cities = u.get("cities") or ""
    return {
        "sex":          u.get("sex") or "",
        "full_name":    u.get("full_name") or "",
        "cities":       [s.strip() for s in cities.split(",") if s.strip()],
        "age_range":    u.get("age_range") or "",
        "look_type":    u.get("look_type") or "",
        "body_type":    u.get("body_type") or "",
        "height_cm":    u.get("height_cm") if u.get("height_cm") is not None else "",
        "weight_kg":    u.get("weight_kg") if u.get("weight_kg") is not None else "",
        "hair_color":   u.get("hair_color") or "",
        "hair_type":    u.get("hair_type") or "",
        "eye_color":    u.get("eye_color") or "",
        "languages":    [s.strip() for s in langs.split(",") if s.strip()],
        "video_vizitka":u.get("video_vizitka") or "",
        "showreel":     u.get("showreel") or "",
        "portfolio":    u.get("portfolio") or "",
        "projects":     u.get("projects") or "",
        "phone":        u.get("phone") or "",
        "instagram":    u.get("instagram") or "",
        "skills":       u.get("skills") or "",
        "photo1_id":    u.get("photo1_id") or "",
        "photo2_id":    u.get("photo2_id") or "",
        "photo3_id":    u.get("photo3_id") or "",
        "photo4_id":    u.get("photo4_id") or "",
        "photo1_tg":    u.get("photo1_tg"),
        "photo2_tg":    u.get("photo2_tg"),
        "photo3_tg":    u.get("photo3_tg"),
        "photo4_tg":    u.get("photo4_tg"),
    }

async def delete_album(chat_id: int, uid: int):
    st = await _state_get(uid)
    ids = st.get("album_msg_ids") or []
    if ids:
        try:
            await client.delete_messages(chat_id, ids, revoke=True)
        except Exception:
            pass
        await _state_update(uid, {"album_msg_ids": []})

async def delete_current_screen(chat_id: int, uid: int):
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})
    sid = st.get("screen_id")
    if sid:
        try:
            await client.delete_messages(chat_id, sid, revoke=True)
        except Exception:
            pass
        st["screen_id"] = None

# ---- sticky notifications cleanup -----------------------------------------

# такой же префикс использует personal_matcher
NOTIFY_PREFIX = "✨ Для вас появились новые подходящие кастинги."

def _is_notify_message(msg) -> bool:
    """Распознаём наше уведомление (текст + кнопка 'ок')."""
    try:
        txt = (msg.raw_text or "").strip()
        if txt.startswith(NOTIFY_PREFIX):
            return True

        # кнопка 'ок' или callback data == b'notif_ok'
        btns = getattr(msg, "buttons", None)
        if btns:
            for row in btns:
                for b in row:
                    label = (getattr(b, "text", "") or "").lower()
                    data  = getattr(b, "data", b"") or b""
                    if label in ("ок", "ok") or data == b"notif_ok":
                        return True
        return False
    except Exception:
        return False


async def clear_tmp_msgs(chat_id: int, uid: int):
    ids = TMP_MSGS.pop(uid, [])
    if ids:
        try:
            await client.delete_messages(chat_id, ids)
        except Exception:
            pass

async def render_step(uid: int, chat_id: int):
    await clear_tmp_msgs(chat_id, uid)
    st = STATE[uid]
    i = st["step"]
    step = STEPS[i]
    header = f"🧩 **Анкета актёра**\n{progress_text(i)}\n\n{step['q']}"

    # <<< добавили: back доступен либо если это не первый шаг, либо если мы в режиме редактирования
    can_back = (i > 0) or bool(st.get("scope"))

    # ---- Мультивыбор -------------------------------------------------------
    if step.get("type") == "multiselect":
        key = step["key"]
        limit = step.get("limit", MAX_CITIES)
        raw = st["answers"].get(key, [])
        selected = [x for x in as_list(raw) if x in step["options"]]
        count = len(selected)
        title = f"{step['q']} (выбрано {count}/{limit})" if limit else f"{step['q']} (выбрано {count})"

        buttons = []
        for opt in step["options"]:
            mark = "✅" if opt in selected else "☐"
            payload = f"multi:{key}:{opt}".encode("utf-8")
            buttons.append([Button.inline(f"{mark} {opt}", payload)])

        buttons.append([Button.inline("💾 Сохранить", f"multi_done:{key}".encode("utf-8"))])
        buttons += build_controls(can_back=can_back)
        await render_text(uid, chat_id, title, buttons=buttons)
        return
    # -----------------------------------------------------------------------

    buttons = []
    if step.get("type") in ("choice", "choicefree") and step.get("choices"):
        row = []
        for opt in step["choices"]:
            payload = f"ans:{step['key']}:{opt}".encode("utf-8")
            row.append(Button.inline(opt, payload))
            if len(row) == 2:
                buttons.append(row)
                row = []
        if row:
            buttons.append(row)

    if step.get("type") == "url-or-skip" or step.get("key") == "projects":
        buttons.insert(0, [Button.inline("⏭ Пропустить", f"skip:{step['key']}".encode("utf-8"))])

    # [NEW] Разрешаем пропуск для фото, НО только начиная со 2-й (slot > 1)
    if step.get("type") == "photo" and int(step.get("slot", 1)) > 1:
        buttons.insert(0, [Button.inline("⏭ Пропустить", f"skip:{step['key']}".encode("utf-8"))])

    buttons += build_controls(can_back=can_back)

    # ---- Инструкции с изображением -----------------------------------------
    instruction_map = {
        "photo1_id": "first_instruction.png",
        "photo2_id": "second_instruction.png",
        "photo3_id": "third_instruction.png",
        "photo4_id": "fourth_instruction.png",
    }
    file_name = instruction_map.get(step["key"])
    if file_name:
        instruction_path = Path(__file__).parent / "assets" / file_name
        if instruction_path.exists():
            try:
                # Удаляем старое сообщение, если оно есть
                old_id = st.get("screen_id")
                if old_id:
                    try:
                        await client.delete_messages(chat_id, old_id)
                    except Exception as e:
                        print(f"⚠️ Не удалось удалить старое сообщение: {e}")

                # Отправляем новое сообщение с картинкой
                msg = await client.send_file(
                    chat_id,
                    file=str(instruction_path),
                    caption=header,
                    buttons=buttons,
                )
                st["screen_id"] = msg.id
                return
            except Exception as e:
                print(f"❌ Ошибка при отправке инструкции с фото: {e}")
    # ------------------------------------------------------------------------

    await render_text(uid, chat_id, header, buttons=buttons)

async def advance_or_finish(uid: int, chat_id: int):
    st = STATE.get(uid)
    if not st:
        return

    # 🔚 РАННИЙ ФИНИШ ДЛЯ ТОЧЕЧНОГО РЕДАКТИРОВАНИЯ
    if st.pop("finish_after_step", False):
        old = await a_get_user(uid) or {}
        to_save = {**old, **st.get("answers", {})}
        await a_upsert_user(uid, to_save)
        u = await a_get_user(uid)

        # убрать текущий экран мастера, если ещё висит
        try:
            if st.get("screen_id"):
                await client.delete_messages(chat_id, st["screen_id"])
        except Exception:
            pass

        # подчистить времянки и залипшие уведомления
        await clear_tmp_msgs(chat_id, uid)
        await clear_sticky_notices(chat_id, uid)

        # полностью сбросить состояние мастера
        STATE.pop(uid, None)

        # показать профиль
        await show_profile_screen(uid, chat_id, u, reposition=True)
        return

    # --- обычное продвижение по мастеру ---
    scope = st.get("scope")  # None | "form" | "photos"
    while st["step"] < len(STEPS) and not step_in_scope(STEPS[st["step"]], scope):
        st["step"] += 1

    # если дошли до конца — сохраняем и выходим на профиль
    if st["step"] >= len(STEPS):
        old = await a_get_user(uid) or {}
        to_save = {**old, **st["answers"]}
        await a_upsert_user(uid, to_save)
        u = await a_get_user(uid)

        try:
            if st.get("screen_id"):
                await client.delete_messages(chat_id, st["screen_id"])
        except Exception:
            pass

        await clear_tmp_msgs(chat_id, uid)
        await clear_sticky_notices(chat_id, uid)

        STATE.pop(uid, None)
        await show_profile_screen(uid, chat_id, u, reposition=True)
        return

    # перед отрисовкой следующего шага тоже сносим залипшие уведомления
    await clear_sticky_notices(chat_id, uid)
    await render_step(uid, chat_id)

import tempfile
from telethon.tl.types import Message as TgMessage

async def _download_media_files(msgs: list[TgMessage]) -> list[str]:
    """Скачивает медиа из сообщений во временную папку и возвращает пути."""
    paths = []
    for m in msgs or []:
        if getattr(m, "media", None):
            try:
                p = await client.download_media(m, file=tempfile.gettempdir())
                if p:
                    paths.append(p)
            except Exception:
                pass
    return paths

def _extract_original_text(msgs: list[TgMessage], fallback: str = "") -> str:
    """
    Берём оригинальный текст/подпись из первого сообщения альбома/поста.
    Если пусто — используем fallback (text_cache из matches).
    """
    if msgs:
        t = (msgs[0].raw_text or "").strip()
        if t:
            return t
    return fallback or " "

def _is_webapp_msg(msg) -> bool:
    try:
        # 1) по callback-кнопке "webapp_back"
        btns = getattr(msg, "buttons", None)
        if btns:
            for row in btns:
                for b in row:
                    if getattr(b, "data", b"") == b"webapp_back":
                        return True
        # 2) по заголовку (на случай отсутствия кнопок в объекте)
        t = (msg.raw_text or "").strip()
        if t.startswith("⚡ *Подключение тарифа*") or t.startswith("⚡ Подключение тарифа"):
            return True
    except Exception:
        pass
    return False

async def cleanup_webapp_leftovers(chat_id: int, limit: int = 50):
    """Снести все старые webapp-сообщения в чате, даже если STATE пуст."""
    try:
        msgs = await client.get_messages(chat_id, limit=limit)
        to_del = [m.id for m in msgs if _is_webapp_msg(m)]
        if to_del:
            await client.delete_messages(chat_id, to_del, revoke=True)
    except Exception:
        pass

# --- CLIENT -----------------------------------------------------------------

client = TelegramClient("user_reg_bot", API_ID, API_HASH).start(bot_token=BOT_TOKEN)

# --- Category picker (premium) -----------------------------------------------

# Переопределение отображаемых названий категорий по их code
DISPLAY_TITLES = {
    "film_role": "Роль в кино/сериале",
    "commercial": "Рекламный ролик",
    "extras": "Актеры массовых сцен",
    "model": "Модель",
}

async def _render_category_picker(uid: int, chat_id: int):
    cats = await a_list_categories()
    selected = await a_get_user_category_prefs(uid)
    rows = []
    for code, title in cats:
        mark = "✅" if code in selected else "▫️"
        label = DISPLAY_TITLES.get(code, title)
        rows.append([Button.inline(f"{mark} {label}", f"catpick_toggle:{code}".encode("utf-8"))])
    rows.append([Button.inline("🏠 Главное меню", b"home")])
    await render_text(uid, chat_id, "Выберите свои категории — и получайте кастинги именно под вас.", buttons=rows)

@client.on(events.CallbackQuery(pattern=b"^catpick_open$"))
async def on_catpick_open(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    if not (await a_is_sub_active(uid)) or ((await a_get_sub_plan(uid)) or "").lower() != "premium":
        await ev.answer("Доступно только для premium", alert=True)
        return
    await _render_category_picker(uid, ev.chat_id)

@client.on(events.CallbackQuery(pattern=b"^catpick_toggle:"))
async def on_catpick_toggle(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    if not (await a_is_sub_active(uid)) or ((await a_get_sub_plan(uid)) or "").lower() != "premium":
        await ev.answer("Доступно только для premium", alert=True)
        return
    try:
        code = ev.data.decode("utf-8").split(":",1)[1]
        await a_toggle_user_category(uid, code)
        await _render_category_picker(uid, ev.chat_id)
    except Exception:
        await ev.answer("Ошибка", alert=True)

# --- handlers: cancel subscription ------------------------------------------

@client.on(events.CallbackQuery(pattern=b"^cancel_sub_open$"))
async def on_cancel_sub_open(ev: events.CallbackQuery.Event):
    try:
        await ev.answer()
    except Exception:
        pass

@client.on(events.CallbackQuery(pattern=b"^cancel_sub_confirm$"))
async def on_cancel_sub_confirm(ev: events.CallbackQuery.Event):
    try:
        await ev.answer()
    except Exception:
        pass

# ------- CONSENT handlers ---------------------------------------------------
# добавь это рядом с остальными хэндлерами
def _check_webapp_sig(uid: int, ts: str, sig: str) -> bool:
    if not WEBAPP_SIGNING_SECRET:
        return True
    try:
        msg = f"{uid}:{ts}".encode("utf-8")
        expect = hmac.new(WEBAPP_SIGNING_SECRET.encode("utf-8"), msg, hashlib.sha256).hexdigest()
        # защита от подмены и протухания
        fresh = abs(int(time.time()) - int(ts)) <= 3600  # 1 час
        return fresh and hmac.compare_digest(expect, sig)
    except Exception:
        return False

@client.on(events.NewMessage(pattern=r"^/start (.+)$"))
async def start_with_payload(ev: events.NewMessage.Event):
    payload = ev.pattern_match.group(1)
    # ожидаем: sub_ok:<uid>:<ts>:<sig>
    if payload.startswith("sub_ok:"):
        parts = payload.split(":")
        if len(parts) == 4:
            _, uid_s, ts, sig = parts
            try:
                uid_int = int(uid_s)
            except Exception:
                uid_int = 0
            if uid_int == ev.sender_id and _check_webapp_sig(uid_int, ts, sig):
                await a_set_sub_status(uid_int, "active")
                await render_menu(ev.chat_id, uid_int)
                return
    # если пэйлоад не наш — можешь показать обычное меню:
    await render_menu(ev.chat_id, ev.sender_id)

@client.on(events.CallbackQuery(data=b"apply_unavailable"))
async def apply_unavailable(ev: events.CallbackQuery.Event):
    await ev.answer("Контакт в объявлении не найден. Листайте дальше ⏭ или откликнитесь вручную.", alert=False)

@client.on(events.CallbackQuery(pattern=b"^consent_ok:"))
async def consent_ok(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    raw = ev.data.decode("utf-8", errors="ignore")
    _, action = raw.split(":", 1)
    await a_store_consent(uid)
    # после принятия — выполнить запрошенное действие
    if action == "start_form_or_profile":
        await start_form_or_profile(ev)
    elif action == "my_profile":
        await my_profile(ev)
    elif action == "view_castings":
        await view_castings(ev)
    elif action == "open_tariff":
        await open_tariff(ev)
    elif action == "open_upsell":
        await open_upsell(ev)

@client.on(events.CallbackQuery(data=b"consent_cancel"))
async def consent_cancel(ev: events.CallbackQuery.Event):
    # Просто вернём главное меню
    await render_menu(ev.chat_id, ev.sender_id)

@client.on(events.CallbackQuery(data=b"open_tariff"))
async def open_tariff(ev: events.CallbackQuery.Event):
    # 🔒 перед действием — проверка согласия
    if await guard_consent(ev, "open_tariff"):
        return

    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    try:
        await ev.delete()
    except Exception:
        pass

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        await delete_current_screen(chat_id, uid)
        await delete_album(chat_id, uid)
        await clear_tmp_msgs(chat_id, uid)
        await clear_sticky_notices(ev.chat_id, uid, except_id=getattr(ev, "message_id", None))
        await cleanup_webapp_leftovers(ev.chat_id)

        prev_mid = st.pop("webapp_msg_id", None)
        if prev_mid:
            await botapi_delete_message(chat_id, prev_mid)

        # ✅ главное изменение: собираем URL мини-аппы с прокидкой uid (и, при необходимости, подписью)
        url = build_webapp_url(uid)

        kb = {
            "inline_keyboard": [
                [{ "text": "⚡ Подключить ИИ-кастинг агента", "web_app": { "url": url } }],
                [{ "text": "⬅️ Назад", "callback_data": "webapp_back" }]
            ]
        }
        text = "⚡ *Подключение тарифа*\n\nОткрой мини-приложение, затем вернись «Назад»."
        mid = await botapi_send_message(chat_id, text, kb)
        if mid:
            st["webapp_msg_id"] = mid
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"open_upsell"))
async def open_upsell(ev: events.CallbackQuery.Event):
    if await guard_consent(ev, "open_upsell"):
        return

    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    try:
        await ev.delete()
    except Exception:
        pass

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        await delete_current_screen(chat_id, uid)
        await delete_album(chat_id, uid)
        await clear_tmp_msgs(chat_id, uid)
        await clear_sticky_notices(ev.chat_id, uid, except_id=getattr(ev, "message_id", None))
        await cleanup_webapp_leftovers(ev.chat_id)

        prev_mid = st.pop("webapp_msg_id", None)
        if prev_mid:
            await botapi_delete_message(chat_id, prev_mid)

        plan = await a_get_sub_plan(uid)
        url = build_upsell_webapp_url(uid, plan)

        kb = {
            "inline_keyboard": [
                [{ "text": "📈 Мой тариф и апгрейд", "web_app": { "url": url } }],
                [{ "text": "⬅️ Назад", "callback_data": "webapp_back" }]
            ]
        }
        text = "📈 *Тариф и апгрейд*\n\nОткрой мини-приложение, затем вернись «Назад»."
        mid = await botapi_send_message(chat_id, text, kb)
        if mid:
            st["webapp_msg_id"] = mid
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"webapp_back"))
async def webapp_back(ev):
    uid, chat_id = ev.sender_id, ev.chat_id
    # удаляем сообщение мини-аппы с кнопкой
    try:
        await ev.delete()
    except Exception:
        pass

    # сбрасываем "текущий экран", чтобы меню перерисовалось корректно
    STATE.setdefault(uid, {})["screen_id"] = None

    # на всякий — удалим любые залипшие webapp-сообщения
    await cleanup_webapp_leftovers(chat_id)

    # рисуем главное меню с актуальной кнопкой (активен/подключить)
    await render_menu(chat_id, uid)

# /start -> главное меню (один экран)
@client.on(events.NewMessage(pattern=r"^/start$"))
async def start_menu(ev: events.NewMessage.Event):
    uid = ev.sender_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})
    if st.get("busy"):
        return
    st["busy"] = True
    try:
        await delete_album(ev.chat_id, uid)
        await clear_tmp_msgs(ev.chat_id, uid)
        await clear_sticky_notices(ev.chat_id, uid, except_id=getattr(ev, "message_id", None))
        await cleanup_webapp_leftovers(ev.chat_id)
        mid = st.get("webapp_msg_id")
        if mid:
            await botapi_delete_message(ev.chat_id, mid)
            st["webapp_msg_id"] = None
        await delete_current_screen(ev.chat_id, uid)
        await render_menu(ev.chat_id, uid)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(pattern=b"^ans:"))
async def answer_choice(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    # 🧹 подчистим уведомления перед обработкой ответа
    await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        if "step" not in st:
            return
        i = st["step"]
        if i >= len(STEPS):
            return
        step = STEPS[i]
        raw = ev.data.decode("utf-8", errors="ignore")
        _, key, value = raw.split(":", 2)
        if key != step["key"]:
            return
        st["answers"][key] = value
        st["step"] += 1
        await advance_or_finish(uid, chat_id)
    finally:
        st["busy"] = False

# [ADD] Кнопка «Пропустить» для шагов url-or-skip
@client.on(events.CallbackQuery(pattern=b"^skip:"))
async def skip_field(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    except_id = ev.message.id if getattr(ev, "message", None) else None
    await clear_sticky_notices(chat_id, uid, except_id=except_id)

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        if "step" not in st:
            return
        i = st["step"]
        if i >= len(STEPS):
            return

        step = STEPS[i]
        key  = step["key"]
        scope = st.get("scope")  # None | "form" | "photos"
        editing = scope in ("form", "photos")

        try:
            raw = ev.data.decode("utf-8", errors="ignore")
            _, payload_key = raw.split(":", 1)
        except ValueError:
            return
        if payload_key != key:
            return

        typ = step.get("type")

        if typ == "url-or-skip":
            # если редактируем и значение уже есть — оставляем как есть
            cur = st["answers"].get(key, "")
            if editing and (cur or str(cur).strip()):
                pass  # не меняем
            else:
                st["answers"][key] = ""  # первичное заполнение: «нет»
        elif typ == "photo":
            slot = int(step.get("slot", 1))
            # Первое фото обязательно только в первичном мастере (в редактировании разрешим пролистывать)
            if slot <= 1 and not editing:
                await ev.answer("Первое фото обязательно 👇", alert=False)
                return
            if editing:
                pass  # «пропустить» = оставить текущую фотографию
            else:
                # первичное заполнение: просто пустим дальше без фото
                st["answers"][key] = ""
                st[f"photo{slot}_tg"] = None
        else:
            return

        st["step"] += 1
        await advance_or_finish(uid, chat_id)
    finally:
        st["busy"] = False

# Кнопка "Главное меню"
@client.on(events.CallbackQuery(data=b"home"))
async def go_home(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    # удаляем само сообщение с нажатой кнопкой (если ещё есть)
    try:
        await ev.delete()
    except Exception:
        pass
    st["screen_id"] = None

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        # на всякий добьём хвосты из мастера
        await delete_album(chat_id, uid)
        await clear_tmp_msgs(chat_id, uid)
        await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))
        await cleanup_webapp_leftovers(ev.chat_id)
        mid = st.get("webapp_msg_id")
        if mid:
            try:
                await botapi_delete_message(chat_id, mid)
            finally:
                st["webapp_msg_id"] = None
        await delete_current_screen(ev.chat_id, uid)
        await render_menu(chat_id, uid)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(pattern=b"^multi:"))
async def toggle_multi(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    # 🧹 подчистим уведомления, кроме текущего сообщения
    await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        if "step" not in st:
            return
        i = st["step"]
        if i >= len(STEPS):
            return

        step   = STEPS[i]
        key    = step["key"]
        limit  = step.get("limit")
        auto   = bool(step.get("autonext"))
        valid  = set(step.get("options", []))

        try:
            _, payload_key, value = ev.data.decode("utf-8", errors="ignore").split(":", 2)
        except ValueError:
            return
        if payload_key != key or (valid and value not in valid):
            return

        raw = st["answers"].get(key, [])
        selected = [x for x in as_list(raw) if (not valid) or (x in valid)]
        selected = list(dict.fromkeys(selected))

        added_now = False
        if value in selected:
            selected.remove(value)
        else:
            if limit and len(selected) >= limit:
                await ev.answer(f"Можно выбрать до {limit}.", alert=False)
            else:
                selected.append(value)
                added_now = True

        st["answers"][key] = selected

        if auto and limit and added_now and len(selected) == limit:
            st["answers"][key] = ", ".join(selected)
            st["step"] += 1
            await advance_or_finish(uid, chat_id)
            return

        await render_step(uid, chat_id)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(pattern=b"^multi_done:"))
async def done_multi(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})
    if st.get("busy"):
        return
    st["busy"] = True
    try:
        # 🧹 Сначала подчистим уведомления
        except_id = ev.message.id if getattr(ev, "message", None) else None
        await clear_sticky_notices(chat_id, uid, except_id=except_id)

        if "step" not in st:
            return
        i = st["step"]
        if i >= len(STEPS):
            return

        step = STEPS[i]
        key   = step["key"]
        limit = step.get("limit")

        try:
            _, payload_key = ev.data.decode("utf-8", errors="ignore").split(":", 1)
        except ValueError:
            return
        if payload_key != key:
            return

        raw = st["answers"].get(key, [])
        selected = [s.strip() for s in raw.split(",")] if isinstance(raw, str) else list(raw)
        selected = [s for s in selected if s]

        if not selected:
            await ev.answer("Выберите хотя бы один вариант или нажмите «Отмена».", alert=False)
            return

        if limit:
            selected = selected[:limit]

        st["answers"][key] = ", ".join(selected)
        st["step"] += 1
        await advance_or_finish(uid, chat_id)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"edit_profile"))
async def edit_profile(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    # УДАЛЯЕМ сообщение, по кнопке из которого пришли (даже если оно из "прошлой сессии")
    try:
        await ev.delete()
    except Exception:
        pass
    st["screen_id"] = None

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        # подчистим уведомления и временные сообщения
        await clear_tmp_msgs(chat_id, uid)
        await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))

        # Уже внутри мастера — ничего не перерисовываем
        if "step" in st and "answers" in st:
            return

        u = await a_get_user(uid)
        if not u:
            STATE[uid].update({"step": 0, "answers": {}, "scope": None})
            await render_step(uid, chat_id)
            return

        # Единый экран (по желанию — со сбросом альбома)
        await show_profile_screen(uid, chat_id, u,
                                  reposition=True, edit_mode=True, reset_album=True)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"edit_form"))
async def edit_form(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    try:
        await ev.delete()
    except Exception:
        pass
    st["screen_id"] = None

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        u = await a_get_user(uid)
        if not u:
            await delete_album(chat_id, uid)
            await clear_tmp_msgs(chat_id, uid)
            await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))
            STATE[uid].update({"step": 0, "answers": {}, "scope": None})
            await render_step(uid, chat_id)
            return

        await delete_album(chat_id, uid)
        await clear_tmp_msgs(chat_id, uid)

        st["answers"] = prefill_answers_from_user(u)
        st["scope"]   = "form"
        st["step"]    = first_index_for_scope("form")

        # ✅ при редактировании города начинаем с пустых чекбоксов
        st["answers"]["cities"] = []   # если нужно, аналогично можно очистить и языки: st["answers"]["languages"] = []

        await render_step(uid, chat_id)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"edit_photos"))
async def edit_photos(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    # Сносим исходный экран (из которого кликнули)
    try:
        await ev.delete()
    except Exception:
        pass
    st["screen_id"] = None

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        u = await a_get_user(uid)
        if not u:
            await delete_album(chat_id, uid)
            await clear_tmp_msgs(chat_id, uid)
            await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))
            STATE[uid].update({"step": 0, "answers": {}, "scope": None})
            await render_step(uid, chat_id)
            return

        await delete_album(chat_id, uid)
        await clear_tmp_msgs(chat_id, uid)

        st["answers"] = prefill_answers_from_user(u)
        st["scope"]   = "photos"
        st["step"]    = first_index_for_scope("photos")
        await render_step(uid, chat_id)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"start_form_or_profile"))
async def start_form_or_profile(ev: events.CallbackQuery.Event):
    # 🔒 перед действием — проверка согласия
    if await guard_consent(ev, "start_form_or_profile"):
        return

    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    # сносим сообщение-меню, из которого кликнули (после рестарта оно точно старое)
    try:
        await ev.delete()
    except Exception:
        pass
    st["screen_id"] = None  # чтобы следующий экран создался заново

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        u = await a_get_user(uid)

        # подчистка хвостов
        await delete_album(chat_id, uid)
        await clear_tmp_msgs(chat_id, uid)
        await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))

        if u:
            # показываем профиль одним экраном, можно сбросить альбом после рестарта
            await show_profile_screen(uid, chat_id, u, reposition=True, reset_album=False)
        else:
            STATE[uid].update({"step": 0, "answers": {}, "scope": None})
            await render_step(uid, chat_id)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"my_profile"))
async def my_profile(ev: events.CallbackQuery.Event):
    # 🔒 перед действием — проверка согласия
    if await guard_consent(ev, "my_profile"):
        return

    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    # удаляем сообщение, из которого пришёл клик
    try:
        await ev.delete()
    except Exception:
        pass
    st["screen_id"] = None

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        u = await a_get_user(uid)

        # подчистка хвостов
        await delete_album(chat_id, uid)
        await clear_tmp_msgs(chat_id, uid)
        await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))

        if not u:
            STATE[uid].update({"step": 0, "answers": {}, "scope": None})
            await render_step(uid, chat_id)
        else:
            await show_profile_screen(uid, chat_id, u, reposition=True, reset_album=False)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"view_castings"))
async def view_castings(ev: events.CallbackQuery.Event):
    # 🔒 перед действием — проверка согласия
    if await guard_consent(ev, "view_castings"):
        return

    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    # 🔐 ЗАМОК: пропускаем дальше только с активной подпиской
    if not (await a_is_sub_active(uid)):
        # При неактивной подписке показываем экран подключения тарифа и выходим
        try:
            await ev.delete()
        except Exception:
            pass
        await delete_current_screen(chat_id, uid)
        await delete_album(chat_id, uid)
        await clear_tmp_msgs(chat_id, uid)
        await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))

        txt = (
            "🔒 **Раздел «Смотреть кастинги» доступен с активной подпиской.**\n\n"
            "Подключите ИИ-кастинг-агента, чтобы получать **только подходящие** объявления "
            "и откликаться в один клик."
        )
        await render_text(uid, chat_id, txt, buttons=[
            [Button.inline("⚡ Подключить ИИ кастинг-агента", b"open_tariff")],
            [Button.inline("⬅️ Назад", b"back")],
            [Button.inline("🏠 Главное меню", b"home")],
        ])
        return

    # --- дальше идёт твоя логика показа кастингов (без изменений) ---

    # удаляем само уведомление с кнопкой
    try:
        await ev.delete()
    except Exception:
        pass

    # подчистим ВСЕ старые уведомления (кроме того, что мы только что удалили)
    await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))

    # подчистим всё, что могло висеть
    await delete_current_screen(chat_id, uid)
    await delete_album(chat_id, uid)
    await clear_tmp_msgs(chat_id, uid)

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        matches = await a_get_user_matches(uid)
        for it in matches:
            it.setdefault("source_chat", None)
            it.setdefault("message_ids", [])
            it.setdefault("text_cache", "")

        st["cast_items"] = matches
        st["cast_idx"] = 0

        if not matches:
            # если нет — покажем заглушку
            txt = "Пока подходящих объявлений нет. Как только появятся — я уведомлю!"
            await render_text(uid, chat_id, txt, buttons=[
                [Button.inline("🏠 Главное меню", b"home")]
            ])
            return

        await _render_match_view(uid, chat_id, matches[0], pos=1, total=len(matches))
    finally:
        st["busy"] = False


@client.on(events.CallbackQuery(data=b"cast_next"))
async def cast_next(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None})

    # убираем сообщение, из которого кликнули
    try:
        await ev.delete()
    except Exception:
        pass
    st["screen_id"] = None

    # подметаем залипшие уведомления (кроме только что нажатого)
    await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        items = st.get("cast_items") or []
        if not items:
            await render_text(
                uid,
                chat_id,
                "Пока подходящих объявлений нет. Как только появятся — я уведомлю!",
                buttons=[
                    [Button.inline("🏠 Главное меню", b"home")],
                ],
            )
            return

        # шаг вперёд по кольцу
        idx = (st.get("cast_idx", 0) + 1) % len(items)
        st["cast_idx"] = idx

        # счётчик свайпов и показ рекламы каждые 15 кликов
        cnt = int(st.get("ad_swipes", 0) or 0) + 1
        st["ad_swipes"] = cnt
        try:
            await _state_update(uid, {"ad_swipes": cnt})
        except Exception:
            pass
        if cnt % 15 == 0:
            plan = await a_get_sub_plan(uid)
            upsell_url = build_upsell_webapp_url(uid, plan=plan)
            kb = {
                "inline_keyboard": [
                    [{ "text": "Подключить премиум можно здесь", "web_app": { "url": upsell_url } }],
                    [{ "text": "⬅️ Вернуться к просмотру", "callback_data": "ad_continue" }]
                ]
            }
            await botapi_send_message(chat_id, "🔥 Подключите премиум: выберите свои категории и получайте только нужные кастинги быстрее.", kb)
            return

        # рендер текущего матча
        match = items[idx]
        await _render_match_view(uid, chat_id, match, pos=idx + 1, total=len(items))
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"cast_prev"))
async def cast_prev(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None})

    # убираем кнопку, с которой пришёл клик
    try:
        await ev.delete()
    except Exception:
        pass
    st["screen_id"] = None

    # подметаем залипшие уведомления (кроме только что нажатого)
    await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        items = st.get("cast_items") or []
        if not items:
            await render_text(
                uid,
                chat_id,
                "Пока подходящих объявлений нет. Как только появятся — я уведомлю!",
                buttons=[
                    [Button.inline("⬅️ Назад", b"back")],
                    [Button.inline("🏠 Главное меню", b"home")],
                ],
            )
            return

        # шаг назад по кольцу
        idx = (st.get("cast_idx", 0) - 1) % len(items)
        st["cast_idx"] = idx

        # счётчик свайпов и показ рекламы каждые 15 кликов
        cnt = int(st.get("ad_swipes", 0) or 0) + 1
        st["ad_swipes"] = cnt
        try:
            await _state_update(uid, {"ad_swipes": cnt})
        except Exception:
            pass
        if cnt % 15 == 0:
            url = build_webapp_url(uid)
            kb = {
                "inline_keyboard": [
                    [{ "text": "Подключить премиум можно здесь", "web_app": { "url": url } }],
                    [{ "text": "⬅️ Вернуться к просмотру", "callback_data": "ad_continue" }]
                ]
            }
            await botapi_send_message(chat_id, "🔥 Подключите премиум: выберите свои категории и получайте только нужные кастинги быстрее.", kb)
            return

        # рендер текущего матча
        match = items[idx]
        await _render_match_view(uid, chat_id, match, pos=idx + 1, total=len(items))
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"ad_continue"))
async def ad_continue(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None})

    # убрать промо-сообщение, из которого пришёл клик
    try:
        await ev.delete()
    except Exception:
        pass

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        items = st.get("cast_items") or []
        if not items:
            await render_text(
                uid,
                chat_id,
                "Пока подходящих объявлений нет. Как только появятся — я уведомлю!",
                buttons=[[Button.inline("🏠 Главное меню", b"home")]],
            )
            return
        idx = st.get("cast_idx", 0)
        idx = max(0, min(idx, len(items) - 1))
        await _render_match_view(uid, chat_id, items[idx], pos=idx + 1, total=len(items))
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"cast_hide"))
async def cast_hide(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None})

    # удалить сообщение, откуда кликнули, и подчистить уведомления
    try:
        await ev.delete()
    except Exception:
        pass
    await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        items = st.get("cast_items") or []
        if not items:
            await render_text(
                uid, chat_id,
                "Пока подходящих объявлений нет. Как только появятся — я уведомлю!",
                buttons=[[Button.inline("⬅️ Назад", b"back")],
                         [Button.inline("🏠 Главное меню", b"home")]]
            )
            return

        idx = st.get("cast_idx", 0)
        idx = max(0, min(idx, len(items)-1))
        current = items[idx]
        match_id = int(current.get("id", 0) or 0)

        # Удаляем матч из БД и локального списка
        if match_id:
            await a_delete_match_by_id(match_id, uid)

        items.pop(idx)

        if not items:
            st["cast_items"] = []
            st["cast_idx"] = 0
            await render_text(
                uid, chat_id,
                "Вы скрыли все актуальные объявления. Как только появятся новые — я уведомлю!",
                buttons=[[Button.inline("⬅️ Назад", b"back")],
                         [Button.inline("🏠 Главное меню", b"home")]]
            )
            return

        # Сдвиг индекса, если скрыли последний элемент
        if idx >= len(items):
            idx = 0
        st["cast_items"] = items
        st["cast_idx"] = idx

        # Перерисовываем следующий элемент
        await _render_match_view(uid, chat_id, items[idx], pos=idx + 1, total=len(items))
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"back"))
async def go_back(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    # Удаляем сообщение, по кнопке из которого пришли
    try:
        await ev.delete()
    except Exception:
        pass

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        # 1) Сначала снесём webapp-экран, если он ещё висит (по id из STATE)
        mid = st.get("webapp_msg_id")
        if mid:
            ok = await botapi_delete_message(chat_id, mid)
            if ok:
                st["webapp_msg_id"] = None

        # 1a) На случай рестарта процесса: подчистим ВСЕ "висячие" webapp-сообщения
        #     (те, у которых есть кнопка с callback_data == webapp_back, либо характерный заголовок)
        await cleanup_webapp_leftovers(chat_id)

        # 2) Снесём «текущий экран» (если мы его рендерили Telethon'ом)
        await delete_current_screen(chat_id, uid)

        async def show_single_screen():
            await clear_tmp_msgs(chat_id, uid)
            u = await a_get_user(uid)
            if not u:
                await delete_album(chat_id, uid)
                await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))
                STATE[uid].update({"step": 0, "answers": {}, "scope": None})
                await render_step(uid, chat_id)
                return
            await show_profile_screen(uid, chat_id, u, reposition=True, edit_mode=False, reset_album=True)

        # если мастер не активен — показываем единый экран
        if "step" not in st or "answers" not in st:
            await show_single_screen()
            return

        i = st["step"]
        scope = st.get("scope")

        # первый шаг в режиме редактирования → назад в меню «Что хотите изменить?»
        if i <= 0:
            st.pop("step", None)
            st.pop("answers", None)

            if scope in ("form", "photos"):
                await clear_tmp_msgs(chat_id, uid)
                u = await a_get_user(uid)
                if u:
                    await show_profile_screen(uid, chat_id, u, reposition=True, edit_mode=True, reset_album=False)
                else:
                    STATE[uid].update({"step": 0, "answers": {}, "scope": None})
                    await render_step(uid, chat_id)
                return

            await show_single_screen()
            return

        # обычный шаг назад с учётом scope
        def allowed(step_def: Dict[str, Any]) -> bool:
            t = step_def.get("type")
            if scope == "form":
                return t != "photo"
            if scope == "photos":
                return t == "photo"
            return True

        new_i = i - 1
        while new_i >= 0 and not allowed(STEPS[new_i]):
            new_i -= 1

        if new_i < 0:
            st.pop("step", None)
            st.pop("answers", None)
            if scope in ("form", "photos"):
                await clear_tmp_msgs(chat_id, uid)
                u = await a_get_user(uid)
                if u:
                    await show_profile_screen(uid, chat_id, u, reposition=True, edit_mode=True, reset_album=False)
                else:
                    STATE[uid].update({"step": 0, "answers": {}, "scope": None})
                    await render_step(uid, chat_id)
            else:
                await show_single_screen()
            return

        st["step"] = new_i
        prev_key = STEPS[new_i]["key"]
        st["answers"].pop(prev_key, None)
        await render_step(uid, chat_id)

    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(pattern=b"^edit_field:"))
async def edit_single_field(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    try:
        await ev.delete()
    except Exception:
        pass
    st["screen_id"] = None

    # 🧹 подчистим уведомления (кроме того, из которого кликнули)
    await clear_sticky_notices(chat_id, uid, except_id=getattr(ev, "message_id", None))

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        u = await a_get_user(uid)
        if not u:
            await delete_album(chat_id, uid)
            await clear_tmp_msgs(chat_id, uid)
            STATE[uid].update({"step": 0, "answers": {}, "scope": None})
            await render_step(uid, chat_id)
            return

        await clear_tmp_msgs(chat_id, uid)

        raw = ev.data.decode("utf-8", errors="ignore")
        _, key = raw.split(":", 1)
        if key not in KEY_TO_INDEX:
            return

        st["answers"] = prefill_answers_from_user(u)
        st["scope"]   = "form"
        st["step"]    = KEY_TO_INDEX[key]

        # 🔑 ВАЖНО: после ввода одного поля сразу завершаем мастер
        st["finish_after_step"] = True

        await render_step(uid, chat_id)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"notif_ok"))
async def notif_ok(ev: events.CallbackQuery.Event):
    # просто убрать сообщение-уведомление
    try:
        await ev.delete()
    except Exception:
        pass

@client.on(events.CallbackQuery(data=b"cancel"))
async def go_cancel(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    # 1) удалить сообщение, из которого пришёл клик (если ещё есть)
    try:
        await ev.delete()
    except Exception:
        pass
    st["screen_id"] = None  # чтобы не пытаться редактировать старое

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        # 2) подчистить альбом, временные подсказки и залипшие уведомления
        await delete_album(chat_id, uid)
        await clear_tmp_msgs(chat_id, uid)
        # id кликнутого сообщения (если есть), чтобы не пытаться удалить его второй раз
        except_id = ev.message.id if getattr(ev, "message", None) else None
        await clear_sticky_notices(chat_id, uid, except_id=except_id)

        # 3) сбросить состояние мастера
        st.pop("step", None)
        st.pop("answers", None)

        # 4) показать главное меню
        await render_menu(chat_id, uid)
    finally:
        st["busy"] = False

# Приём ответов (мастер)
@client.on(events.NewMessage)
async def handle_answer(ev: events.NewMessage.Event):
    if ev.out:
        return
    if not ev.photo and not (ev.raw_text and ev.raw_text.strip()):
        return

    uid = ev.sender_id
    st = STATE.get(uid)
    if not st or "step" not in st:
        return

    i = st["step"]
    if i >= len(STEPS):
        return

    step = STEPS[i]
    key  = step["key"]
    typ  = step["type"]

    # --- ФОТО ---
    if typ == "photo":
        if not ev.photo:
            return

        slot = step.get("slot", i + 1)
        dst = media_path(uid, slot)
        try:
            await client.download_media(ev.message, file=str(dst))
            local_path = str(dst)
        except Exception:
            return

        ph = ev.photo  # telethon.tl.types.Photo
        tg_ref = {
            "id": ph.id,
            "access_hash": ph.access_hash,
            "file_reference": base64.b64encode(ph.file_reference or b"").decode()
        }

        st["answers"][f"photo{slot}_id"] = local_path
        st["answers"][f"photo{slot}_tg"] = tg_ref

        try:
            await ev.delete()
        except Exception:
            pass

        st["step"] += 1
        await advance_or_finish(uid, ev.chat_id)
        return

    # --- НЕ ФОТО ---
    text = (ev.raw_text or "").strip()

    # всегда пробуем удалить сообщение пользователя
    try:
        await ev.delete()
    except Exception:
        pass

    # если шаг только с кнопками — не принимаем ручной ввод
    if button_only(step):
        m = await client.send_message(ev.chat_id, "Пожалуйста, используйте кнопки ниже 🙏")
        TMP_MSGS.setdefault(uid, []).append(m.id)
        return

    if typ == "choice":
        t = norm(text)
        choices_n = [norm(c) for c in step["choices"]]
        if t not in choices_n:
            m = await client.send_message(ev.chat_id, f"Пожалуйста, выберите: {', '.join(step['choices'])}")
            TMP_MSGS.setdefault(uid, []).append(m.id)
            return
        value = step["choices"][choices_n.index(t)]
    elif typ == "choicefree":
        value = text
    elif typ == "number":
        if not text.isdigit():
            m = await client.send_message(ev.chat_id, "Нужно целое число.")
            TMP_MSGS.setdefault(uid, []).append(m.id)
            return
        value = int(text)
    elif typ == "list":
        value = [p.strip() for p in text.split(",") if p.strip()]
    elif typ == "url-or-skip":
        value = is_url_or_skip(text)
    else:
        value = text

    st["answers"][key] = value
    st["step"] += 1
    await advance_or_finish(uid, ev.chat_id)

@client.on(events.CallbackQuery(data=b"noop"))
async def noop(ev: events.CallbackQuery.Event):
    await ev.answer("Подписка активна ✅", alert=False)
# --- Профильный экран + альбом ---------------------------------------------

# --- Профильный экран: только меню редактирования -------------------------

# --- Профильный экран ------------------------------------------------------

# --- Профильный экран ------------------------------------------------------
async def show_profile_screen(
    uid: int,
    chat_id: int,
    u: Dict[str, Any],
    reposition: bool = False,
    edit_mode: bool = False,
    reset_album: bool = False,
):
    active = await a_is_sub_active(uid)
    plan = await a_get_sub_plan(uid)
    st = await _state_get(uid)
    st.setdefault("screen_id", None)
    st.setdefault("album_msg_ids", [])

    if reposition and st.get("screen_id"):
        try:
            await client.delete_messages(chat_id, st["screen_id"])
        except Exception:
            pass
        await _state_update(uid, {"screen_id": None})

    # Меню редактирования — без альбома
    if edit_mode:
        await delete_album(chat_id, uid)

        rows = []
        # по одному полю — одна кнопка в строке (чтобы не ломать в мобильном)
        for key in EDITABLE_KEYS:
            title = FIELD_LABELS.get(key, key)
            rows.append([Button.inline(f"✏️ {title}", f"edit_field:{key}".encode("utf-8"))])

        # нижний блок управления
        rows.append([Button.inline("🧹 Переписать полностью анкету", b"edit_form")])
        rows.append([Button.inline("📷 Изменить фотографии", b"edit_photos")])
        rows.append([Button.inline("⬅️ Назад", b"back")])

        await render_text(uid, chat_id, "Что хотите изменить?", buttons=rows)
        return

    # ----- обычный экран профиля с альбомом -----
    if reset_album:
        await delete_album(chat_id, uid)

    st = await _state_get(uid)
    album_ids = st.get("album_msg_ids") or []
    if not album_ids:
        media = []
        for idx in (1, 2, 3, 4):
            tg = u.get(f"photo{idx}_tg")
            if isinstance(tg, dict) and {"id", "access_hash", "file_reference"} <= set(tg.keys()):
                try:
                    media.append(
                        types.InputPhoto(
                            id=int(tg["id"]),
                            access_hash=int(tg["access_hash"]),
                            file_reference=base64.b64decode(tg["file_reference"])
                        )
                    )
                    continue
                except Exception:
                    pass
            p = u.get(f"photo{idx}_id")
            if p and Path(p).exists():
                media.append(p)

        if media:
            try:
                msgs = await client.send_file(chat_id, media, album=True)
                await _state_update(uid, {"album_msg_ids": [m.id for m in msgs]})
            except Exception:
                await _state_update(uid, {"album_msg_ids": []})
            # небольшая задержка, чтобы альбом оказался выше текста в истории
            await asyncio.sleep(0.2)

    # Удалим предыдущий экран профиля, чтобы нарисовать Bot API клавиатуру
    st2 = await _state_get(uid)
    prev = st2.get("screen_id")
    if prev:
        try:
            await client.delete_messages(chat_id, prev)
        except Exception:
            pass
        await _state_update(uid, {"screen_id": None})

    txt = "📇 Твоя анкета:\n\n" + format_summary(u, show_hint=not active)
    rows = [
        [{"text": "✏️ Редактировать", "callback_data": "edit_profile"}],
        [{"text": "📰 Смотреть кастинги", "callback_data": "view_castings"}],
    ]
    if active:
        url = build_upsell_webapp_url(uid, plan)
        rows.append([{ "text": "🟢 ИИ кастинг-агент активен", "web_app": { "url": url } }])
    else:
        rows.append([{ "text": "⚡ Подключить ИИ кастинг-агента", "callback_data": "open_tariff" }])
    rows.append([{ "text": "🏠 Главное меню", "callback_data": "home" }])

    kb = {"inline_keyboard": rows}
    new_mid = await botapi_send_message(chat_id, txt, kb)
    if new_mid:
        await _state_update(uid, {"screen_id": new_mid})
# --- RUN --------------------------------------------------------------------

def main():
    init_db()
    print("🤖 Бот регистрации запущен. Готов принимать анкеты...")
    client.run_until_disconnected()

if __name__ == "__main__":
    main()