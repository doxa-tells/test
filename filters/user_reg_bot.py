from telethon import TelegramClient, events
import os
import json
from dotenv import load_dotenv
from pathlib import Path

# Загрузка переменных окружения
env_path = Path(__file__).resolve().parent.parent / "telegram_bot" / ".env"
load_dotenv(dotenv_path=env_path)

api_id = int(os.getenv("API_ID"))
api_hash = os.getenv("API_HASH")
bot_token = os.getenv("BOT_TOKEN")

# Инициализация клиента
client = TelegramClient("reg_bot_session", api_id, api_hash).start(bot_token=bot_token)

# Путь к базе
DB_PATH = os.path.join(os.path.dirname(__file__), 'users.json')

# 👉 Путь к баннеру (положи картинку сюда: filters/assets/first_message.png)
BANNER_PATH = os.path.join(os.path.dirname(__file__), 'assets', 'first_message.png')

# Временные данные пользователей
pending_users = {}

# Вопросы по очереди
QUESTIONS = [
    ("sex", "Какой у вас пол? (мужской/женский)"),
    ("type", "👤 Какой у вас типаж? (например, 'славянский', 'восточный', 'азиатский')"),
    ("age", "📆 Ваш игровой возраст? (Отметьте диапазон. Например 20-25)"),
    ("height", "📏 Ваш рост в сантиметрах?"),
    ("body", "🏋️ Ваше телосложение? (стройное, спортивное, полное и т.п.)"),
    ("location", "Города с которых искать кастинги (можно несколько)")
]

# Если файл не существует — создаём пустой словарь
if not os.path.exists(DB_PATH):
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump({}, f, ensure_ascii=False, indent=2)

@client.on(events.NewMessage(pattern='/start'))
async def start_registration(event):
    user_id = str(event.sender_id)
    pending_users[user_id] = {}

    # 🔹 Отправляем картинку с подписью одним сообщением (если файл есть),
    # иначе — просто текст.
    caption = "👋 Привет! Давайте зарегистрируем ваш профиль для подбора кастингов."
    try:
        if os.path.exists(BANNER_PATH):
            await client.send_file(event.chat_id, BANNER_PATH, caption=caption)
        else:
            await event.respond(caption)
    except Exception as e:
        print(f"⚠️ Не удалось отправить баннер: {e}")
        await event.respond(caption)

    await ask_next_question(event, user_id)

async def ask_next_question(event, user_id):
    user_data = pending_users.get(user_id, {})
    for key, question in QUESTIONS:
        if key not in user_data:
            await event.respond(question)
            return
    # Если все ответы собраны — сохранить
    try:
        with open(DB_PATH, 'r', encoding='utf-8') as f:
            users = json.load(f)
            if not isinstance(users, dict):
                users = {}
    except (json.JSONDecodeError, FileNotFoundError):
        users = {}

    users[user_id] = user_data
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

    await event.respond("✅ Ваш профиль сохранён. Спасибо!")
    pending_users.pop(user_id, None)

@client.on(events.NewMessage)
async def handle_response(event):
    if event.raw_text.startswith('/'):  # Игнорировать команды
        return

    user_id = str(event.sender_id)
    if user_id not in pending_users:
        return  # Игнорировать, если пользователь не в процессе регистрации

    user_data = pending_users[user_id]
    for key, _ in QUESTIONS:
        if key not in user_data:
            user_data[key] = event.raw_text.strip()
            await ask_next_question(event, user_id)
            return

# ===== Новые команды: /profile (/me) и /delete =====

@client.on(events.NewMessage(pattern=r'^/(profile|me)$'))
async def show_profile(event):
    user_id = str(event.sender_id)
    # читаем базу профилей
    try:
        with open(DB_PATH, 'r', encoding='utf-8') as f:
            users = json.load(f)
            if not isinstance(users, dict):
                users = {}
    except (json.JSONDecodeError, FileNotFoundError):
        users = {}

    profile = users.get(user_id)
    if not profile:
        await event.respond("У вас пока нет профиля. Нажмите /start, чтобы пройти регистрацию.")
        return

    sex = profile.get('sex', '—')
    typ = profile.get('type', '—')
    age = profile.get('age', '—')
    height = profile.get('height', '—')
    body = profile.get('body', '—')
    location = profile.get('location', '—')

    text = (
        "🧾 Ваш профиль:\n"
        f"• Пол: {sex}\n"
        f"• Типаж: {typ}\n"
        f"• Игровой возраст: {age}\n"
        f"• Рост: {height}\n"
        f"• Телосложение: {body}\n"
        f"• Города: {location}\n\n"
        "Чтобы обновить данные — отправьте /start и пройдите регистрацию заново."
    )
    await event.respond(text, parse_mode='markdown')

@client.on(events.NewMessage(pattern=r'^/(delete|remove)$'))
async def delete_profile(event):
    user_id = str(event.sender_id)
    # читаем базу
    try:
        with open(DB_PATH, 'r', encoding='utf-8') as f:
            users = json.load(f)
            if not isinstance(users, dict):
                users = {}
    except (json.JSONDecodeError, FileNotFoundError):
        users = {}

    if user_id in users:
        users.pop(user_id, None)
        with open(DB_PATH, 'w', encoding='utf-8') as f:
            json.dump(users, f, indent=2, ensure_ascii=False)
        await event.respond("🗑 Профиль удалён. Чтобы создать заново — отправьте /start.")
    else:
        await event.respond("ℹ️ Профиль не найден. Отправьте /start, чтобы зарегистрироваться.")

print("🤖 Бот запущен. Готов регистрировать пользователей...")
client.run_until_disconnected()