# filters/user_reg_bot.py
# -*- coding: utf-8 -*-
"""
Анкетирование в одном сообщении (один экран):
- /start -> меню с двумя кнопками:
    • 📝 Попасть в базу (5 мин)
    • 📇 Моя анкета
- Умный роутинг:
    • Если профиля нет -> "Попасть в базу" запускает мастер
    • Если профиль есть -> "Попасть в базу" открывает "Мою анкету"
    • "Моя анкета" без профиля -> перенаправление в мастер
- Навигация в мастере: «Назад» / «Отмена», редактируется одно сообщение
- Фото сохраняются на диск: data/user_media/<user_id>/photo{1..4}.jpg
- Профили хранятся в SQLite: data/actors.db
- В "Моя анкета": сначала отправляем альбом из 4 фото, затем показываем анкету в экране.
  Альбом остаётся в истории и повторно не пересылается.
"""

import os
import sqlite3
import json
from telethon import types
import base64
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from dotenv import load_dotenv
from telethon import TelegramClient, events, Button
from telethon.tl.custom.message import Message
from telethon.errors import MessageIdInvalidError, MessageNotModifiedError

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

# --- STORAGE ----------------------------------------------------------------

DATA_DIR   = Path(__file__).resolve().parents[1] / "data"
DB_PATH    = DATA_DIR / "actors.db"
MEDIA_ROOT = DATA_DIR / "user_media"
DATA_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

def media_path(user_id: int, slot: int) -> Path:
    user_dir = MEDIA_ROOT / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir / f"photo{slot}.jpg"

def init_db():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            full_name TEXT,
            cities TEXT,
            sex TEXT,
            age_range TEXT,
            look_type TEXT,
            body_type TEXT,
            height_cm INTEGER,
            weight_kg INTEGER,
            hair TEXT,
            languages TEXT,
            video_vizitka TEXT,
            showreel TEXT,
            portfolio TEXT,
            projects TEXT,
            phone TEXT,
            instagram TEXT,
            photo1_id TEXT,
            photo2_id TEXT,
            photo3_id TEXT,
            photo4_id TEXT,
            photo1_tg TEXT,
            photo2_tg TEXT,
            photo3_tg TEXT,
            photo4_tg TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        """
    )
    # миграция на случай старой базы
    for col in ("photo1_tg","photo2_tg","photo3_tg","photo4_tg"):
        try:
            cur.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT")
        except Exception:
            pass
    con.commit()
    con.close()

def button_only(step: Dict[str, Any]) -> bool:
    # Любой шаг, где предполагается выбор по кнопкам
    if step.get("type") in ("multiselect", "choice"):
        return True
    # choicefree с набором choices — тоже считаем «кнопочным»
    if step.get("type") == "choicefree" and step.get("choices"):
        return True
    return False

def upsert_user(user_id: int, data: Dict[str, Any]):
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    now = datetime.utcnow().isoformat()

    def _to_int(v):
        try:
            return int(str(v).strip())
        except Exception:
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
        "hair":          data.get("hair"),
        "languages":     ", ".join(data["languages"]) if isinstance(data.get("languages"), list) else data.get("languages"),
        "video_vizitka": data.get("video_vizitka"),
        "showreel":      data.get("showreel"),
        "portfolio":     data.get("portfolio"),
        "projects":      data.get("projects"),
        "phone":         data.get("phone"),
        "instagram":     data.get("instagram"),
        "photo1_id":     data.get("photo1_id"),
        "photo2_id":     data.get("photo2_id"),
        "photo3_id":     data.get("photo3_id"),
        "photo4_id":     data.get("photo4_id"),
        # быстрые TG-ссылки (json)
        "photo1_tg":     json.dumps(data.get("photo1_tg")) if isinstance(data.get("photo1_tg"), dict) else data.get("photo1_tg"),
        "photo2_tg":     json.dumps(data.get("photo2_tg")) if isinstance(data.get("photo2_tg"), dict) else data.get("photo2_tg"),
        "photo3_tg":     json.dumps(data.get("photo3_tg")) if isinstance(data.get("photo3_tg"), dict) else data.get("photo3_tg"),
        "photo4_tg":     json.dumps(data.get("photo4_tg")) if isinstance(data.get("photo4_tg"), dict) else data.get("photo4_tg"),
    }

    fields = ", ".join(payload.keys())
    placeholders = ", ".join("?" for _ in payload)
    updates = ", ".join(f"{k}=excluded.{k}" for k in payload.keys())

    cur.execute(
        f"""
        INSERT INTO users (user_id, {fields}, created_at, updated_at)
        VALUES (?, {placeholders}, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            {updates},
            updated_at=excluded.updated_at
        """,
        [user_id, *payload.values(), now, now],
    )
    con.commit()
    con.close()

def get_user(user_id: int) -> Optional[Dict[str, Any]]:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute("SELECT * FROM users WHERE user_id=?", (user_id,))
    row = cur.fetchone()
    con.close()
    if not row:
        return None
    d = dict(row)
    # распарсим json из photo*_tg в dict
    for i in (1, 2, 3, 4):
        key = f"photo{i}_tg"
        v = d.get(key)
        if isinstance(v, str) and v.strip():
            try:
                d[key] = json.loads(v)
            except Exception:
                pass
    return d

# --- STATE ------------------------------------------------------------------

STATE: Dict[int, Dict[str, Any]] = {}
TMP_MSGS: Dict[int, list] = {}  # временные сообщения для очистки

WELCOME = (
    "🏠**Главное меню**\n\n"
    "📱**Roletapp AI** - Кастинг - платформа с базой 2000+ актеров.\n\n"
    "Нашей БЕСПЛАТНОЙ базой пользуются более 40 кастинг-директоров "
    "**Salem, TigerFilms, Freedom Media, Unico Play и др.**\n\n"
    "Используйте кнопки ниже:\n\n"
    "📝 Попасть в базу - Cоздать анкету\n"
    "👤 Моя анкета - Проверить анкету"
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

def format_summary(data: Dict[str, Any]) -> str:
    langs = (", ".join(data["languages"]) if isinstance(data.get("languages"), list)
             else (data.get("languages") or "—"))
    lines = [
        f"🧾 **{data.get('full_name','') or '—'}**",
        f"📍 Города: {data.get('cities','—')}",
        f"👫 Пол: {data.get('sex','—')}",
        f"🎂 Игровой возраст: {data.get('age_range','—')}",
        f"🌍 Типаж: {data.get('look_type','—')}",
        f"🏋️‍♂️ Телосложение: {data.get('body_type','—')}",
        f"📏 Рост: {data.get('height_cm','—')} см",
        f"⚖️ Вес: {data.get('weight_kg','—')} кг",
        f"💇 Волосы: {data.get('hair','—')}",
        f"🗣 Языки: {langs}",
        f"🎬 Видеовизитка: {data.get('video_vizitka') or '—'}",
        f"📹 Шоурил: {data.get('showreel') or '—'}",
        f"🖼 Портфолио: {data.get('portfolio') or '—'}",
        f"🎞 Проекты: {data.get('projects','—')}",
        f"📞 Телефон: {data.get('phone','—')}",
        f"📸 Instagram: {data.get('instagram','—')}",
        f"\n🌟🌟🌟"
        f"\nПодключи ИИ-кастинг агента и получай **только подходящие для тебя** кастинги из 30+ WA/TG групп, с уникальной возможностью отправлять портфолио в один клик",
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
    st = STATE.setdefault(uid, {})
    screen_id = st.get("screen_id")
    try:
        if screen_id:
            await client.edit_message(chat_id, screen_id, text, buttons=buttons, link_preview=False, parse_mode="markdown")
        else:
            msg: Message = await client.send_message(chat_id, text, buttons=buttons, link_preview=False, parse_mode="markdown")
            st["screen_id"] = msg.id
    except (MessageIdInvalidError, MessageNotModifiedError):
        msg: Message = await client.send_message(chat_id, text, buttons=buttons, link_preview=False, parse_mode="markdown")
        st["screen_id"] = msg.id

async def render_menu(chat_id: int, uid: int):
    await render_text(
        uid, chat_id, WELCOME,
        buttons=[
            [Button.inline("📝 Попасть в базу (5 мин)", b"start_form_or_profile")],
            [Button.inline("📇 Моя анкета", b"my_profile")],
        ],
    )

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
    {"key": "height_cm",    "q": "📏 **Рост в сантиметрах** \n (только число)", "type": "number"},
    {"key": "weight_kg",    "q": "⚖️ **Вес в килограммах** \n (только число)", "type": "number"},
    {"key": "hair",         "q": "💇‍♂️ **Цвет и тип волос** \n (Пример: карие - кудрявые)", "type": "text"},
    {"key": "languages",    "q": "🗣 **На каких языках говорите?** \n (Выберите один или несколько)","type": "multiselect",
     "options": ["Русский", "Казахский", "Английский", "Немецкий", "Французский", "Турецкий", "Китайский", "Испанский", "Итальянский", "Арабский"], "limit": 10, "autonext": False},
    {"key": "video_vizitka","q": "🎬 **Видеовизитка (ссылка)**. \nЕсли нет — отправьте «нет».", "type": "url-or-skip"},
    {"key": "showreel",     "q": "📹 **Шоурил (ссылка)** \nЕсли нет — отправьте «нет».", "type": "url-or-skip"},
    {"key": "portfolio",    "q": "🖼 **Портфолио (ссылка)** \nЕсли нет — отправьте «нет».", "type": "url-or-skip"},
    {"key": "projects",     "q": "🎞 **Проекты/опыт** \nТекстом — можно в несколько строк.", "type": "text"},
    {"key": "phone",        "q": "📞 **Номер телефона** \n (Пример: +7(777)777-77-77)", "type": "text"},
    {"key": "instagram",    "q": "📸 **Instagram ссылка** \n Пример:\nhttps://www.instagram.com/**doxa.tells**/", "type": "text"},
    {"key": "photo1_id",    "q": "📷 Фото #1 — *анфас*. Пришлите фото как изображение.", "type": "photo", "slot": 1},
    {"key": "photo2_id",    "q": "📷 Фото #2 — *профиль*. Пришлите фото как изображение.", "type": "photo", "slot": 2},
    {"key": "photo3_id",    "q": "📷 Фото #3 — *3/4*. Пришлите фото как изображение.", "type": "photo", "slot": 3},
    {"key": "photo4_id",    "q": "📷 Фото #4 — *полный рост*. Пришлите фото как изображение.", "type": "photo", "slot": 4},
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
    "hair": "Волосы",
    "languages": "Языки",
    "video_vizitka": "Видеовизитка",
    "showreel": "Шоурил",
    "portfolio": "Портфолио",
    "projects": "Проекты/опыт",
    "phone": "Телефон",
    "instagram": "Instagram",
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
        "hair":         u.get("hair") or "",
        "languages":    [s.strip() for s in langs.split(",") if s.strip()],
        "video_vizitka":u.get("video_vizitka") or "",
        "showreel":     u.get("showreel") or "",
        "portfolio":    u.get("portfolio") or "",
        "projects":     u.get("projects") or "",
        "phone":        u.get("phone") or "",
        "instagram":    u.get("instagram") or "",
        "photo1_id":    u.get("photo1_id") or "",
        "photo2_id":    u.get("photo2_id") or "",
        "photo3_id":    u.get("photo3_id") or "",
        "photo4_id":    u.get("photo4_id") or "",
        "photo1_tg":    u.get("photo1_tg"),
        "photo2_tg":    u.get("photo2_tg"),
        "photo3_tg":    u.get("photo3_tg"),
        "photo4_tg":    u.get("photo4_tg"),
    }

async def show_edit_menu(uid: int, chat_id: int):
    txt = "Что хотите изменить?"
    buttons = [
        [Button.inline("📝 Изменить анкету",  b"edit_form")],
        [Button.inline("📷 Изменить фотографии", b"edit_photos")],
        [Button.inline("🏠 Главное меню", b"home")],
    ]
    await render_text(uid, chat_id, txt, buttons=buttons)

async def delete_album(chat_id: int, uid: int):
    st = STATE.get(uid)
    if not st:
        return
    ids = st.get("album_msg_ids") or []
    if ids:
        try:
            await client.delete_messages(chat_id, ids, revoke=True)
        except Exception:
            pass
        st["album_msg_ids"] = []

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
        buttons += build_controls(can_back=can_back)   # <— было (i > 0)
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

    buttons += build_controls(can_back=can_back)  # <— было (i > 0)
    await render_text(uid, chat_id, header, buttons=buttons)

async def advance_or_finish(uid: int, chat_id: int):
    st = STATE.get(uid)
    if not st:
        return

    # 🔚 РАННИЙ ФИНИШ ДЛЯ ТОЧЕЧНОГО РЕДАКТИРОВАНИЯ
    if st.pop("finish_after_step", False):
        old = get_user(uid) or {}
        to_save = {**old, **st.get("answers", {})}
        upsert_user(uid, to_save)
        u = get_user(uid)

        try:
            if st.get("screen_id"):
                await client.delete_messages(chat_id, st["screen_id"])
        except Exception:
            pass

        await clear_tmp_msgs(chat_id, uid)

        # Полностью сбросим состояние мастера
        STATE.pop(uid, None)

        await show_profile_screen(uid, chat_id, u, reposition=True)
        return

    # --- дальше твоя логика как была ---
    scope = st.get("scope")  # None | "form" | "photos"
    while st["step"] < len(STEPS) and not step_in_scope(STEPS[st["step"]], scope):
        st["step"] += 1
    if st["step"] >= len(STEPS):
        old = get_user(uid) or {}
        to_save = {**old, **st["answers"]}
        upsert_user(uid, to_save)
        u = get_user(uid)
        try:
            if st.get("screen_id"):
                await client.delete_messages(chat_id, st["screen_id"])
        except Exception:
            pass
        await clear_tmp_msgs(chat_id, uid)
        STATE.pop(uid, None)
        await show_profile_screen(uid, chat_id, u, reposition=True)
        return

    await render_step(uid, chat_id)

# --- CLIENT -----------------------------------------------------------------

client = TelegramClient("user_reg_bot", API_ID, API_HASH).start(bot_token=BOT_TOKEN)

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
        await render_menu(ev.chat_id, uid)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(pattern=b"^ans:"))
async def answer_choice(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})
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

# Кнопка "Главное меню"
@client.on(events.CallbackQuery(data=b"home"))
async def go_home(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
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
        await delete_album(ev.chat_id, uid)
        await clear_tmp_msgs(ev.chat_id, uid)
        await render_menu(ev.chat_id, uid)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(pattern=b"^multi:"))
async def toggle_multi(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})
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
        await clear_tmp_msgs(chat_id, uid)

        # Уже внутри мастера — ничего не перерисовываем
        if "step" in st and "answers" in st:
            return

        u = get_user(uid)
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
        u = get_user(uid)
        if not u:
            await delete_album(chat_id, uid)
            await clear_tmp_msgs(chat_id, uid)
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
        u = get_user(uid)
        if not u:
            await delete_album(chat_id, uid)
            await clear_tmp_msgs(chat_id, uid)
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
        u = get_user(uid)
        await clear_tmp_msgs(chat_id, uid)

        if u:
            # показываем профиль одним экраном, можно сбросить альбом после рестарта
            await show_profile_screen(uid, chat_id, u, reposition=True, reset_album=False)
        else:
            await delete_album(chat_id, uid)
            STATE[uid].update({"step": 0, "answers": {}, "scope": None})
            await render_step(uid, chat_id)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"my_profile"))
async def my_profile(ev: events.CallbackQuery.Event):
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
        u = get_user(uid)
        await clear_tmp_msgs(chat_id, uid)

        if not u:
            await delete_album(chat_id, uid)
            STATE[uid].update({"step": 0, "answers": {}, "scope": None})
            await render_step(uid, chat_id)
        else:
            await show_profile_screen(uid, chat_id, u, reposition=True, reset_album=False)
    finally:
        st["busy"] = False

@client.on(events.CallbackQuery(data=b"back"))
async def go_back(ev: events.CallbackQuery.Event):
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
        async def show_single_screen():
            await clear_tmp_msgs(chat_id, uid)
            u = get_user(uid)
            if not u:
                await delete_album(chat_id, uid)
                STATE[uid].update({"step": 0, "answers": {}, "scope": None})
                await render_step(uid, chat_id)
                return
            await show_profile_screen(uid, chat_id, u, reposition=True, edit_mode=False, reset_album=True)

        # мастер не активен — единый экран
        if "step" not in st or "answers" not in st:
            await show_single_screen()
            return

        i = st["step"]
        scope = st.get("scope")

        # <<< ВАЖНО: если это первый шаг в режиме редактирования (scope),
        #            то возвращаемся в меню "Что хотите изменить?"
        if i <= 0:
            # чистим состояние мастера
            st.pop("step", None)
            st.pop("answers", None)

            if scope in ("form", "photos"):
                await clear_tmp_msgs(chat_id, uid)
                u = get_user(uid)
                if u:
                    await show_profile_screen(uid, chat_id, u, reposition=True, edit_mode=True, reset_album=False)
                else:
                    # на всякий — если профиля нет, запускаем мастер с нуля
                    STATE[uid].update({"step": 0, "answers": {}, "scope": None})
                    await render_step(uid, chat_id)
                return

            # без scope — как раньше: единый экран
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
                u = get_user(uid)
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

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        u = get_user(uid)
        if not u:
            await delete_album(chat_id, uid)
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

@client.on(events.CallbackQuery(data=b"cancel"))
async def go_cancel(ev: events.CallbackQuery.Event):
    uid = ev.sender_id
    chat_id = ev.chat_id
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    # 1) удалить сообщение, из которого пришёл клик (важно после рестарта)
    try:
        await ev.delete()
    except Exception:
        pass
    st["screen_id"] = None  # чтобы не пытаться редактировать старое

    if st.get("busy"):
        return
    st["busy"] = True
    try:
        # 2) подчистить альбом и временные подсказки
        await delete_album(chat_id, uid)
        await clear_tmp_msgs(chat_id, uid)

        # 3) сбросить состояние мастера
        st.pop("step", None)
        st.pop("answers", None)

        # 4) показать главное меню (одним окном)
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
    st = STATE.setdefault(uid, {"screen_id": None, "album_msg_ids": []})

    if reposition and st.get("screen_id"):
        try:
            await client.delete_messages(chat_id, st["screen_id"])
        except Exception:
            pass
        st["screen_id"] = None

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
                st["album_msg_ids"] = [m.id for m in msgs]
            except Exception:
                st["album_msg_ids"] = []

    txt = "📇 **Твоя анкета:**\n\n" + format_summary(u)
    buttons = [
        [Button.inline("✏️ Редактировать", b"edit_profile")],
        [Button.inline("🏠 Главное меню", b"home")],
    ]
    await render_text(uid, chat_id, txt, buttons=buttons)
# --- RUN --------------------------------------------------------------------

def main():
    init_db()
    print("🤖 Бот регистрации запущен. Готов принимать анкеты...")
    client.run_until_disconnected()

if __name__ == "__main__":
    main()