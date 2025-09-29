from telethon import TelegramClient, events
from PIL import Image
import sys
import os
from dotenv import load_dotenv
import requests
import base64
from openai import OpenAI
import pytesseract
pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'
import json
from shared.isDuplicateCasting import is_duplicate_casting
from shared.ocr_extractor import extract_text_from_image
from telegram_bot.format_casting_template import format_casting_template
from telegram_bot.is_casting_ai import is_casting_ai
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from shared.isDuplicateCasting import is_duplicate_casting

# 🚀 Загрузка переменных
load_dotenv()

api_id = int(os.getenv("API_ID"))
api_hash = os.getenv("API_HASH")
bot_token = os.getenv("BOT_TOKEN")
chat_id = int(os.getenv("DESTINATION_CHAT_ID"))
thread_id = int(os.getenv("DESTINATION_THREAD_ID"))
openai_key = os.getenv("OPENAI_API_KEY")

# 🤖 Инициализация клиентов
client = TelegramClient("mirror_session", api_id, api_hash)
openai_client = OpenAI(api_key=openai_key)

# 🎯 Источники в формате строк: "chatId_threadId"
source_threads = {
    "-1002712928305_3",  # тест топик
    "-1001343083522_40014"  # добрые киношники
}

# 📣 Источники без тем
source_without_topic = [
    -4690232474,   # тест группа
    -1002867564870,# тест канал
    -1001185887859,# aktery.castingi.modeling
    -1001496435905,# кастинги казахстан алматы
    -1001558970072,# актеры база #1 ---
    -1001228544389,# сообщество кинематографистов
    -1001283285008,# все о кино
    -1002637607696,# kazakhstan casting club(astana)
    -1002692826194,# «солнечный ветер»
    -1002111636925,# кастинг в астане
    -1002222308517, # zhaniya kaz casting hub
    -1002144305952, # pve
]

# 🛁 Все источники
all_sources = list({int(s.split('_')[0]) for s in source_threads}) + source_without_topic

# 🔁 Обработка сообщений
@client.on(events.NewMessage(chats=all_sources))
async def handler(event):
    try:
        message = event.message

        # 🔍 Проверка источника
        chat_id_only = event.chat_id
        actual_thread_id = (
            getattr(message, 'thread_id', None)
            or getattr(message, 'message_thread_id', None)
            or (message.reply_to.reply_to_msg_id if message.reply_to else None)
        )
        chat_id_str = f"{chat_id_only}_{actual_thread_id}"

        if chat_id_only in source_without_topic:
            print(f"✅ Источник без темы: {chat_id_only}")
        elif chat_id_str in source_threads:
            print(f"✅ Проходит фильтр: {chat_id_str}")
        else:
            print(f"❌ {chat_id_str} не в отслеживаемых — пропускаем.")
            return

        text = (getattr(message, 'message', '') or
                getattr(message, 'text', '') or
                getattr(message, 'raw_text', ''))
        sender = await event.get_chat()
        sender_name = getattr(sender, 'title', 'Источник неизвестен')
        print(f"\n📅 Новое сообщение из: {sender_name}")
        if text:
            print(f"📝 Текст: {text[:100]}...")

        image_path = None
        if message.photo:
            print("📷 Обнаружено фото, загружаем...")
            image_path = await message.download_media()
            print(f"⬇️ Скачано: {image_path}")

            # 🛡️ Защита от preview Telegram (слишком маленькие/лёгкие)
            if image_path:
                file_size = os.path.getsize(image_path)
                try:
                    with Image.open(image_path) as img:
                        width, height = img.size
                except:
                    width, height = 0, 0

                if file_size < 15000 or (width <= 150 and height <= 150):
                    print(f"⚠️ Фото — Telegram preview ({width}x{height}, {file_size} bytes). Удаляем.")
                    os.remove(image_path)
                    image_path = None

        is_casting = await is_casting_ai(text, image_path)
        if not is_casting:
            print("❌ Не кастинг")
            if image_path:
                os.remove(image_path)
            return
        print("✅ Кастинг подтверждён")

        # 🔁 Проверка на дубликат по тексту + OCR
        ocr_text = extract_text_from_image(image_path) if image_path else ''
        if is_duplicate_casting(text, ocr_text):
            print("🔁 Кастинг уже был. Пропускаем.")
            if image_path:
                os.remove(image_path)
            return

        # 🖼️ Логика “оставить фото”
        triggers = [
            "как на фото", "как на картинке", "как на изображении",
            "см. фото", "смотри фото", "см. картинку",
            "like the photo", "as in the photo", "see photo"
        ]
        lc_text = (text or "").lower()
        lc_ocr = (ocr_text or "").lower()
        keep_photo = any(t in lc_text for t in triggers) or any(t in lc_ocr for t in triggers)

        # ✨ Шаблон
        formatted = await format_casting_template(text, image_path)

        # 💬 Цитата источника
        quote_html = f"<blockquote>Источник(Telegram): {sender_name}</blockquote>"
        final_message = f"{formatted}\n\n{quote_html}"

        # 🔗 РЕШЕНИЕ: отправляем фото капшеном, если нужно оставить изображение
        if image_path and keep_photo:
            print("🖼️ Отправляем шаблон с фото (caption).")
            url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
            with open(image_path, 'rb') as img_file:
                files = {"photo": img_file}
                data = {
                    "chat_id": chat_id,
                    "message_thread_id": thread_id,
                    "caption": final_message,
                    "parse_mode": "HTML"
                }
                resp = requests.post(url, data=data, files=files, timeout=30)
            print(f"📤 Фото+капшен отправлены. Статус: {resp.status_code}")
        else:
            # как раньше — просто текст
            data = {
                "chat_id": chat_id,
                "message_thread_id": thread_id,
                "text": final_message,
                "parse_mode": "HTML"
            }
            resp = requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json=data, timeout=30
            )
            print(f"📤 Сообщение отправлено. Статус: {resp.status_code}")

        if image_path:
            try:
                os.remove(image_path)
            except Exception as e:
                print(f"⚠️ Не удалось удалить временное фото: {e}")

    except Exception as e:
        print(f"❌ Ошибка: {e}")

print("🚀 Бот запущен. Слушаем кастинги...")
client.start()
client.run_until_disconnected()
