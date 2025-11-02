# -*- coding: utf-8 -*-
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path
from typing import List, Dict, Any, Optional, Iterable
from datetime import datetime

# не создаём OpenAI-клиент на уровне модуля — .env может загрузиться выше
try:
    from openai import OpenAI
except Exception:
    OpenAI = None


# ---------- PostgreSQL connection ----------
def _connect():
    """Connects to the PostgreSQL database using environment variables."""
    try:
        conn = psycopg2.connect(
            dbname=os.getenv("PG_DB"),
            user=os.getenv("PG_USER"),
            password=os.getenv("PG_PASSWORD"),
            host=os.getenv("PG_HOST"),
            port=os.getenv("PG_PORT")
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"❌ Could not connect to PostgreSQL database: {e}")
        raise

# ---------- users ----------
def _row_to_dict(row: dict) -> Dict[str, Any]:
    d = dict(row)
    for k in ("height_cm", "weight_kg"):
        if d.get(k) in (None, "", "None"):
            d[k] = None
        else:
            try:
                d[k] = int(d[k])
            except Exception:
                pass
    return d

def get_all_users() -> List[Dict[str, Any]]:
    con = _connect()
    with con.cursor(cursor_factory=RealDictCursor) as cur:
        try:
            cur.execute("SELECT * FROM users ORDER BY updated_at DESC")
            rows = cur.fetchall()
        except psycopg2.Error as e:
            print(f"DB error in get_all_users: {e}")
            # Fallback for safety, though the first query should be fine if table exists
            cur.execute("SELECT * FROM users")
            rows = cur.fetchall()
    con.close()
    return [_row_to_dict(r) for r in rows]


# ---------- утилиты форматирования ----------
def _as_list_from_csv(v: Any) -> List[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    return [s.strip() for s in str(v).split(",") if s.strip()]

def _val(v: Optional[str]) -> str:
    return str(v or "").strip()

def _short_user_summary(u: Dict[str, Any]) -> str:
    name = _val(u.get("full_name")) or "—"
    sex = _val(u.get("sex")) or "—"
    cities = _val(u.get("cities")) or "—"
    return f"id={u.get('user_id')} | {name} | {sex} | {cities}"


# ---------- prompt ----------
def build_match_prompt(profile: Dict[str, Any], casting_text: str) -> str:
    sex         = _val(profile.get("sex"))
    cities      = _val(profile.get("cities"))
    age_range   = _val(profile.get("age_range"))
    look_type   = _val(profile.get("look_type"))
    body_type   = _val(profile.get("body_type"))
    height_cm   = _val(profile.get("height_cm"))
    weight_kg   = _val(profile.get("weight_kg"))
    hair_color  = _val(profile.get("hair_color"))
    hair_type   = _val(profile.get("hair_type"))
    eye_color   = _val(profile.get("eye_color"))
    languages   = _val(profile.get("languages"))

    return (
        "У тебя есть кастинг и актёрский профиль. "
        "Определи, подходит ли кастинг этому человеку.\n"
        "Будь гибким к неполным требованиям; если по сути человек мог бы подойти — считай, что подходит. "
        "Особенно внимательно смотри на город(а) и пол — они обязательные условия. "
        "Возраст оценивай по 'игровому возрасту': допускается диапазон примерно ±5 лет. "
        "По другим параметрам (типаж, телосложение, рост и т.д.) будь гибким: "
        "если явно не противоречит описанию роли, считай что подходит.\n"
        "Отвечай строго одним словом: 'да' или 'нет'.\n\n"
        f"=== ПРОФИЛЬ ===\n"
        f"Пол: {sex}\n"
        f"Города: {cities}\n"
        f"Игровой возраст: {age_range}\n"
        f"Типаж внешности: {look_type}\n"
        f"Телосложение: {body_type}\n"
        f"Рост: {height_cm}\n"
        f"Вес: {weight_kg}\n"
        f"Цвет волос: {hair_color}\n"
        f"Тип волос: {hair_type}\n"
        f"Цвет глаз: {eye_color}\n"
        f"Языки: {languages}\n\n"
        f"=== КАСТИНГ ===\n{casting_text}\n\n"
        "Ответ: "
    )


# ---------- OpenAI ----------
def _get_openai_client():
    if OpenAI is None:
        raise RuntimeError("Пакет openai не установлен. Установи: pip install openai")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY не найден в окружении (.env).")
    return OpenAI(api_key=api_key)

def check_match_ai(profile: Dict[str, Any], casting_text: str, *, debug: bool = False) -> bool:
    prompt = build_match_prompt(profile, casting_text)

    def _append_ai_log(entry: Dict[str, Any]):
        try:
            base = Path(__file__).resolve().parents[1]
            p = base / "logs" / "ai_matcher.log"
            p.parent.mkdir(parents=True, exist_ok=True)
            with p.open("a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception:
            pass

    if debug:
        print("\n" + "—" * 60)
        print(f"👤 Пользователь: { _short_user_summary(profile) }")
        print("📝 Промпт в ИИ:\n" + prompt)
        print("—" * 60)

    try:
        client = _get_openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=8,
        )
        text = (resp.choices[0].message.content or "").strip().lower()
        if debug:
            print(f"🤖 Ответ модели: {text!r}")
        decision = text.startswith("да")
        _append_ai_log({
            "ts": datetime.utcnow().isoformat(),
            "user_id": int(profile.get("user_id") or 0),
            "user_summary": _short_user_summary(profile),
            "casting_preview": (casting_text or "")[:800],
            "prompt": prompt,
            "response": text,
            "decision": bool(decision),
        })
        return decision
    except Exception as e:
        print(f"⚠️ Ошибка запроса к ИИ: {e}")
        # простой фоллбэк: город + пол в тексте
        try:
            cities = _as_list_from_csv(profile.get("cities"))
            sex = _val(profile.get("sex")).lower()
            text = casting_text.lower()
            decision = bool(any(c.lower() in text for c in cities) and (sex and sex in text))
            _append_ai_log({
                "ts": datetime.utcnow().isoformat(),
                "user_id": int(profile.get("user_id") or 0),
                "user_summary": _short_user_summary(profile),
                "casting_preview": (casting_text or "")[:800],
                "prompt": prompt,
                "error": str(e),
                "response": "<fallback>",
                "decision": bool(decision),
            })
            return decision
        except Exception:
            return False


# ---------- MATCHES ----------
def _ensure_matches_table(cur):
    """Создаём таблицу matches, если её ещё нет (на случай запуска мэтчера без user_reg_bot)."""
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS matches (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            source_chat BIGINT,
            thread_id INTEGER,
            message_ids JSONB,
            text_cache TEXT,
            created_at TIMESTAMPTZ NOT NULL
        )
        """
    )
    # индекс для быстрых выборок
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_matches_user_created ON matches(user_id, created_at DESC)"
    )

def store_match(
    user_id: int,
    source_chat: Optional[int],
    thread_id: Optional[int],
    message_ids: Iterable[int],
    text_cache: str = "",
) -> int:
    """
    Сохраняет подходящий кастинг в таблицу matches.
    message_ids — iterable из int (для альбомов несколько id).
    Возвращает id вставленной строки.
    """
    con = _connect()
    cur = con.cursor()
    _ensure_matches_table(cur)

    now = datetime.utcnow().isoformat()
    mids = [int(m) for m in (message_ids or [])]

    cur.execute(
        """
        INSERT INTO matches (user_id, source_chat, thread_id, message_ids, text_cache, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id;
        """,
        (
            int(user_id),
            int(source_chat) if source_chat is not None else None,
            int(thread_id) if thread_id is not None else None,
            json.dumps(mids),
            text_cache or "",
            now,
        ),
    )
    match_id = cur.fetchone()[0]
    con.commit()
    con.close()
    return match_id

def purge_old_matches(days: int = 7) -> int:
    """Удаляет матчи старше `days` дней. Возвращает количество удалённых строк."""
    con = _connect()
    cur = con.cursor()
    _ensure_matches_table(cur)
    cur.execute(
        "DELETE FROM matches WHERE created_at < NOW() - INTERVAL '%s days'",
        (int(days),),
    )
    deleted = cur.rowcount
    con.commit()
    con.close()
    return deleted

def get_user_matches(uid: int, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Возвращает свежие (<=7 дней) матчи пользователя, самые новые сначала.
    """
    con = _connect()
    cur = con.cursor()
    _ensure_matches_table(cur)
    # подчистим просроченные
    cur.execute("DELETE FROM matches WHERE created_at < NOW() - INTERVAL '7 days'")
    con.commit()

    cur.execute(
        "SELECT * FROM matches WHERE user_id=%s ORDER BY created_at DESC, id DESC LIMIT %s",
        (int(uid), int(limit)),
    )
    rows = [dict(r) for r in cur.fetchall()]
    con.close()

    # message_ids JSON -> list[int]
    for r in rows:
        try:
            mids = json.loads(r.get("message_ids") or "[]")
            r["message_ids"] = [int(x) for x in mids]
        except Exception:
            r["message_ids"] = []
    return rows


# ---------- NOTICES (уведомления "Смотреть кастинги") ----------
def _ensure_notices_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS notices (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            msg_id INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    cur.execute("CREATE INDEX IF NOT EXISTS idx_notices_user ON notices(user_id)")

def store_notice(user_id: int, msg_id: int) -> None:
    con = _connect()
    with con.cursor() as cur:
        _ensure_notices_table(cur)
        cur.execute(
            "INSERT INTO notices (user_id, msg_id, created_at) VALUES (%s, %s, NOW())",
            (int(user_id), int(msg_id)),
        )
    con.commit()
    con.close()

def fetch_and_clear_notices(user_id: int, except_id: Optional[int] = None) -> list[int]:
    """
    Возвращает все сохранённые msg_id уведомлений пользователя и удаляет их из БД.
    except_id — можно передать id, который уже удалили вручную (по клику), его вернём,
    но удалять не будем — чтобы не ловить лишние ошибки.
    """
    con = _connect()
    with con.cursor() as cur:
        _ensure_notices_table(cur)
        cur.execute("SELECT msg_id FROM notices WHERE user_id=%s", (int(user_id),))
        ids = [r[0] for r in cur.fetchall()]
        if ids:
            cur.execute("DELETE FROM notices WHERE user_id=%s", (int(user_id),))
            con.commit()
    con.close()
    # если надо — исключим один id
    if except_id is not None:
        ids = [i for i in ids if i != except_id]
    return ids