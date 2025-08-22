from telethon import TelegramClient, events, Button
from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument
import os
import sqlite3
from pathlib import Path
from dotenv import load_dotenv
import shutil
import datetime

# ─────────────────────────────────────────────────────────────
# Пути / окружение
# ─────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MEDIA_DIR = BASE_DIR / "media" / "users"
ASSETS_DIR = BASE_DIR / "assets"
DATA_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "actors.db"
PHOTO_GUIDE_PATH = ASSETS_DIR / "photo_guide.png"  # необязательно; если нет — отправим текст

# env как раньше
env_path = Path(__file__).resolve().parent.parent / "telegram_bot" / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

api_id = int(os.getenv("API_ID"))
api_hash = os.getenv("API_HASH")
bot_token = os.getenv("BOT_TOKEN")

client = TelegramClient("reg_bot_session", api_id, api_hash).start(bot_token=bot_token)

# ─────────────────────────────────────────────────────────────
# База данных (SQLite)
# ─────────────────────────────────────────────────────────────
def db_connect():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def db_init():
    with db_connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                telegram_user_id INTEGER PRIMARY KEY,
                name TEXT,
                cities TEXT,
                gender TEXT,
                age_range TEXT,
                ethnicity TEXT,
                body_type TEXT,
                height_cm INTEGER,
                weight_kg INTEGER,
                hair TEXT,
                languages TEXT,
                video_url TEXT,
                showreel_url TEXT,
                portfolio_url TEXT,
                experience TEXT,
                phone TEXT,
                instagram TEXT,
                photo1 TEXT,
                photo2 TEXT,
                photo3 TEXT,
                photo4 TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);")

def db_upsert_user(uid: int, answers: dict):
    for k in ("height_cm", "weight_kg"):
        if k in answers and isinstance(answers[k], str):
            try:
                answers[k] = int(answers[k].strip())
            except Exception:
                answers[k] = None
    fields = [
        "name","cities","gender","age_range","ethnicity","body_type",
        "height_cm","weight_kg","hair","languages","video_url","showreel_url",
        "portfolio_url","experience","phone","instagram","photo1","photo2","photo3","photo4"
    ]
    values = [answers.get(f) for f in fields]
    now = datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
    with db_connect() as conn:
        row = conn.execute("SELECT telegram_user_id FROM users WHERE telegram_user_id = ?", (uid,)).fetchone()
        if row:
            set_clause = ", ".join([f"{f} = ?" for f in fields])
            conn.execute(
                f"UPDATE users SET {set_clause}, updated_at = ? WHERE telegram_user_id = ?",
                values + [now, uid]
            )
        else:
            placeholders = ", ".join(["?"]*len(fields))
            conn.execute(
                f"""
                INSERT INTO users (
                    telegram_user_id, {", ".join(fields)}, created_at, updated_at
                ) VALUES (?, {placeholders}, ?, ?)
                """,
                [uid] + values + [now, now]
            )

def db_get_user(uid: int):
    with db_connect() as conn:
        return conn.execute("SELECT * FROM users WHERE telegram_user_id = ?", (uid,)).fetchone()

def db_delete_user(uid: int):
    with db_connect() as conn:
        conn.execute("DELETE FROM users WHERE telegram_user_id = ?", (uid,))

db_init()

# ─────────────────────────────────────────────────────────────
# Анкета: шаги
# ─────────────────────────────────────────────────────────────
QUESTIONS = [
    {"key": "name",         "prompt": "Фамилия и имя:", "type": "text", "optional": False},
    {"key": "cities",       "prompt": "Города:", "type": "text", "optional": False},
    {"key": "gender",       "prompt": "Пол: Мужской/женский", "type": "text", "optional": False},
    {"key": "age_range",    "prompt": "Игровой возраст (диапазон, напр. 20-25):", "type": "text", "optional": False},
    {"key": "ethnicity",    "prompt": "Типаж внешности (Европеоидный, Азиатский и т.д.):", "type": "text", "optional": False},
    {"key": "body_type",    "prompt": "Телосложение (худое, спортивное, полное и т.д.):", "type": "text", "optional": False},
    {"key": "height_cm",    "prompt": "Рост: см", "type": "text", "optional": False},
    {"key": "weight_kg",    "prompt": "Вес: кг", "type": "text", "optional": False},
    {"key": "hair",         "prompt": "Цвет и тип волос (например: каштановые — кудрявые):", "type": "text", "optional": False},
    {"key": "languages",    "prompt": "Языки (через запятую):", "type": "text", "optional": False},
    {"key": "video_url",    "prompt": "Видеовизитка: (ссылка, можно написать 'пропустить')", "type": "text", "optional": True},
    {"key": "showreel_url", "prompt": "Шоурил: (ссылка, можно написать 'пропустить')", "type": "text", "optional": True},
    {"key": "portfolio_url","prompt": "Портфолио: (ссылка, можно написать 'пропустить')", "type": "text", "optional": True},
    {"key": "experience",   "prompt": "Проекты (опыт):", "type": "text", "optional": False},
    {"key": "phone",        "prompt": "Номер телефона:", "type": "text", "optional": False},
    {"key": "instagram",    "prompt": "Инстаграм: (@username или ссылка)", "type": "text", "optional": False},
    {"key": "photo1",       "prompt": "Фото 1 — анфас. Пришлите фото.", "type": "photo", "optional": False},
    {"key": "photo2",       "prompt": "Фото 2 — профиль. Пришлите фото.", "type": "photo", "optional": False},
    {"key": "photo3",       "prompt": "Фото 3 — 3/4. Пришлите фото.", "type": "photo", "optional": False},
    {"key": "photo4",       "prompt": "Фото 4 — полный рост. Пришлите фото.", "type": "photo", "optional": False},
]
TOTAL_STEPS = len(QUESTIONS)

pending = {}  # user_id -> {"step": int, "answers": dict}

# ─────────────────────────────────────────────────────────────
# Хелперы
# ─────────────────────────────────────────────────────────────
def progress_text(step_index: int) -> str:
    return f"[Шаг {step_index + 1}/{TOTAL_STEPS}]"

async def send_photo_guide(event):
    try:
        if PHOTO_GUIDE_PATH.exists():
            await event.respond(file=str(PHOTO_GUIDE_PATH))
        else:
            await event.respond(
                "Инструкция по фото:\n"
                "1) Анфас — свет, нейтральный фон\n"
                "2) Профиль — левый/правый, свет ровный\n"
                "3) 3/4 — по пояс\n"
                "4) Полный рост — простой фон, без фильтров"
            )
    except Exception as e:
        print(f"⚠️ Не удалось отправить инструкцию по фото: {e}")

def is_media_photo(msg) -> bool:
    if isinstance(msg.media, MessageMediaPhoto):
        return True
    if isinstance(msg.media, MessageMediaDocument) and getattr(msg.media.document, "mime_type", ""):
        if msg.media.document.mime_type.startswith("image/"):
            return True
    return False

async def save_photo(user_id: int, key: str, event) -> str:
    user_dir = MEDIA_DIR / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    path = await event.download_media(file=str(user_dir))
    ext = Path(path).suffix or ".jpg"
    final_path = user_dir / f"{key}{ext}"
    try:
        if final_path.exists():
            final_path.unlink()
        Path(path).rename(final_path)
    except Exception:
        final_path = Path(path)
    return str(final_path)

async def ask_next(event, user_id: int):
    state = pending.get(user_id)
    if not state:
        return
    i = state["step"]
    if i >= TOTAL_STEPS:
        db_upsert_user(user_id, state["answers"])
        await event.respond("✅ Профиль сохранён. Спасибо!")
        pending.pop(user_id, None)
        return
    q = QUESTIONS[i]
    if q["type"] == "photo" and q["key"] == "photo1":
        await send_photo_guide(event)
    await event.respond(f"{progress_text(i)}\n{q['prompt']}")

def begin_registration(user_id: int):
    pending[user_id] = {"step": 0, "answers": {}}

# ─────────────────────────────────────────────────────────────
# Команды / кнопки
# ─────────────────────────────────────────────────────────────
WELCOME_TEXT = (
    "👋 Привет! Нашей БЕСПЛАТНОЙ базой пользуются кастинг директора Salem, TigerFilms, Freedom Media, Unico Play. "
    "Создай анкету бесплатно и получи шанс попасть в большое кино или заработать на рекламке)"
)

@client.on(events.NewMessage(pattern=r'^/start$'))
async def start_cmd(event):
    # показываем приветствие и кнопку
    await event.respond(
        WELCOME_TEXT,
        buttons=[[Button.inline("📝 Создать анкету", b"begin_reg")]]
    )
    # подсказки
    await event.respond("Команды: /me — показать анкету, /delete — удалить, /cancel — отменить заполнение.")

@client.on(events.CallbackQuery(pattern=b'^begin_reg$'))
async def cb_begin_reg(event):
    user_id = int(event.sender_id)
    begin_registration(user_id)
    await event.answer("Поехали!")
    await event.respond("Отлично! Начинаем заполнение. В любой момент: /cancel.")
    await ask_next(event, user_id)

@client.on(events.NewMessage(pattern=r'^/(profile|me)$'))
async def profile_cmd(event):
    user_id = int(event.sender_id)
    row = db_get_user(user_id)
    if not row:
        await event.respond("У вас ещё нет анкеты. Нажмите «📝 Создать анкету» или /start.")
        return
    text = (
        "🧾 Ваш профиль:\n"
        f"• ФИО: {row['name'] or '—'}\n"
        f"• Города: {row['cities'] or '—'}\n"
        f"• Пол: {row['gender'] or '—'}\n"
        f"• Игровой возраст: {row['age_range'] or '—'}\n"
        f"• Типаж: {row['ethnicity'] or '—'}\n"
        f"• Телосложение: {row['body_type'] or '—'}\n"
        f"• Рост: {row['height_cm'] or '—'} см\n"
        f"• Вес: {row['weight_kg'] or '—'} кг\n"
        f"• Волосы: {row['hair'] or '—'}\n"
        f"• Языки: {row['languages'] or '—'}\n"
        f"• Видеовизитка: {row['video_url'] or '—'}\n"
        f"• Шоурил: {row['showreel_url'] or '—'}\n"
        f"• Портфолио: {row['portfolio_url'] or '—'}\n"
        f"• Проекты: {row['experience'] or '—'}\n"
        f"• Телефон: {row['phone'] or '—'}\n"
        f"• Instagram: {row['instagram'] or '—'}\n"
    )
    await event.respond(text)
    photos = [row.get(f"photo{i}") for i in range(1, 5)]
    files = [p for p in photos if p and Path(p).exists()]
    for f in files:
        try:
            await event.respond(file=f)
        except Exception as e:
            print(f"⚠️ Не удалось отправить фото {f}: {e}")

@client.on(events.NewMessage(pattern=r'^/(delete|remove)$'))
async def delete_cmd(event):
    user_id = int(event.sender_id)
    row = db_get_user(user_id)
    if not row:
        await event.respond("Анкета не найдена.")
        return
    db_delete_user(user_id)
    try:
        user_dir = MEDIA_DIR / str(user_id)
        if user_dir.exists():
            shutil.rmtree(user_dir)
    except Exception as e:
        print(f"⚠️ Ошибка удаления папки с фото: {e}")
    await event.respond("🗑 Анкета удалена. Чтобы создать заново — /start.")

@client.on(events.NewMessage(pattern=r'^/cancel$'))
async def cancel_cmd(event):
    user_id = int(event.sender_id)
    if pending.pop(user_id, None):
        await event.respond("❌ Заполнение анкеты отменено.")
    else:
        await event.respond("Нет активного заполнения. Нажмите /start, чтобы начать.")

# ─────────────────────────────────────────────────────────────
# Приём ответов (текст/фото)
# ─────────────────────────────────────────────────────────────
@client.on(events.NewMessage)
async def handle_response(event):
    if event.raw_text and event.raw_text.startswith("/"):
        return
    user_id = int(event.sender_id)
    state = pending.get(user_id)
    if not state:
        return
    i = state["step"]
    if i >= TOTAL_STEPS:
        await ask_next(event, user_id)
        return
    q = QUESTIONS[i]
    key = q["key"]
    if q["type"] == "text":
        if not event.raw_text:
            await event.respond("Пожалуйста, отправьте текст.")
            return
        value = event.raw_text.strip()
        if q.get("optional") and value.lower() in ("пропустить", "skip", "нет", "no"):
            value = None
        if key in ("height_cm", "weight_kg") and value is not None:
            try:
                int(value)
            except Exception:
                await event.respond("Укажите число (например, 180).")
                return
        state["answers"][key] = value
        state["step"] += 1
        await ask_next(event, user_id)
        return
    if q["type"] == "photo":
        if not event.message or not event.message.media or not is_media_photo(event.message):
            await event.respond("Нужно отправить фотографию (изображение).")
            return
        try:
            saved_path = await save_photo(user_id, key, event)
            state["answers"][key] = saved_path
            state["step"] += 1
            await ask_next(event, user_id)
        except Exception as e:
            print(f"⚠️ Ошибка сохранения фото: {e}")
            await event.respond("Не удалось сохранить фото. Попробуйте ещё раз.")

# ─────────────────────────────────────────────────────────────
print("🤖 Бот регистрации (SQLite) запущен. Готов собирать анкеты...")
client.run_until_disconnected()