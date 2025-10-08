import os
import sys
import platform
from pathlib import Path
import requests
from telethon import TelegramClient, events
from PIL import Image
from dotenv import load_dotenv

# ---------- где искать .env ----------
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent  # корень проекта: /opt/casting_mirror_bot
for candidate in (HERE / ".env", ROOT / ".env"):
    if candidate.exists():
        load_dotenv(candidate)
        print(f"📦 Загрузил .env: {candidate}")
        break
else:
    load_dotenv()
    print("📦 .env: автопоиск (ничего явного не найдено)")

# ---------- импорты модулей проекта ----------
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from shared.isDuplicateCasting import is_duplicate_casting
from shared.ocr_extractor import extract_text_from_image
from telegram_bot.format_casting_template import format_casting_template
from telegram_bot.is_casting_ai import is_casting_ai

# ---------- tesseract кроссплатформенно ----------
try:
    import pytesseract
    if platform.system() == "Darwin" and Path("/opt/homebrew/bin/tesseract").exists():
        pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"
    elif Path("/usr/bin/tesseract").exists():
        pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"
    elif Path("/usr/local/bin/tesseract").exists():
        pytesseract.pytesseract.tesseract_cmd = "/usr/local/bin/tesseract"
except Exception as e:
    print(f"⚠️ pytesseract не настроен: {e}")

# ---------- env ----------
def require_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"ENV {name} is required")
    return v

API_ID          = int(require_env("API_ID"))
API_HASH        = require_env("API_HASH")
BOT_TOKEN       = require_env("BOT_TOKEN")  # нужен только для отправки в целевой чат через Bot API
DEST_CHAT_ID    = int(require_env("DESTINATION_CHAT_ID"))
THREAD_RAW      = (os.getenv("DESTINATION_THREAD_ID") or "").strip()
DEST_THREAD_ID  = int(THREAD_RAW) if THREAD_RAW.isdigit() else None

print("🔧 ENV готово:",
      f"API_ID✓, CHAT_ID={DEST_CHAT_ID}, THREAD_ID={DEST_THREAD_ID if DEST_THREAD_ID is not None else '—'}")

# ---------- Telethon как ЮЗЕР, фиксированная сессия ----------
SESSION_NAME = "mirror_session"
client = TelegramClient(SESSION_NAME, API_ID, API_HASH)

# ---------- источники ----------
source_threads = {
    "-1002712928305_3",      # тест топик
    "-1001343083522_40014",  # добрые киношники
}
source_without_topic = [
    -4690232474,
    -1002867564870,
    -1001185887859,
    -1001496435905,
    -1001558970072,
    -1001228544389,
    -1001283285008,
    -1002637607696,
    -1002692826194,
    -1002111636925,
    -1002222308517,
    -1002144305952,
]
all_sources = list({int(s.split('_')[0]) for s in source_threads}) + source_without_topic

@client.on(events.NewMessage(chats=all_sources))
async def handler(event):
    try:
        msg = event.message
        chat_id_only = event.chat_id

        # без «пункта 3»: простая эвристика thread_id как раньше
        actual_thread_id = (
            getattr(msg, 'thread_id', None)
            or getattr(msg, 'message_thread_id', None)
            or (msg.reply_to.reply_to_msg_id if msg.reply_to else None)
        )
        chat_id_str = f"{chat_id_only}_{actual_thread_id}"

        if chat_id_only in source_without_topic:
            print(f"✅ Источник без темы: {chat_id_only}")
        elif chat_id_str in source_threads:
            print(f"✅ Проходит фильтр: {chat_id_str}")
        else:
            print(f"❌ {chat_id_str} не в отслеживаемых — пропускаем.")
            return

        # текст
        text = (getattr(msg, 'message', '') or getattr(msg, 'text', '') or getattr(msg, 'raw_text', ''))
        sender = await event.get_chat()
        sender_name = getattr(sender, 'title', 'Источник неизвестен')
        print(f"\n📅 Новое сообщение из: {sender_name}")
        if text:
            print(f"📝 {text[:200]}{'...' if len(text) > 200 else ''}")

        # картинка (photo или документ с image/*)
        image_path = None
        if getattr(msg, "photo", None):
            print("📷 Фото: скачиваем…")
            image_path = await msg.download_media()
        elif getattr(msg, "document", None) and getattr(msg.document, "mime_type", "").startswith("image/"):
            print(f"📎 Документ-картинка ({msg.document.mime_type}): скачиваем…")
            image_path = await msg.download_media()

        if image_path:
            print(f"⬇️ Скачано: {image_path}")
            try:
                file_size = os.path.getsize(image_path)
                w = h = 0
                try:
                    with Image.open(image_path) as im:
                        w, h = im.size
                except Exception:
                    pass
                if file_size < 15000 or (w <= 150 and h <= 150):
                    print(f"⚠️ Preview ({w}x{h}, {file_size} bytes) — удаляю.")
                    os.remove(image_path)
                    image_path = None
            except Exception as e:
                print(f"⚠️ Не удалось проверить изображение: {e}")

        # AI-фильтр
        is_cast = await is_casting_ai(text, image_path)
        if not is_cast:
            print("❌ Не кастинг, пропускаем.")
            if image_path and os.path.exists(image_path):
                os.remove(image_path)
            return
        print("✅ Кастинг подтверждён")

        # Дубликаты + OCR
        ocr_text = extract_text_from_image(image_path) if image_path else ''
        if is_duplicate_casting(text, ocr_text):
            print("🔁 Дубликат. Пропускаю.")
            if image_path and os.path.exists(image_path):
                os.remove(image_path)
            return

        # триггеры «нужно фото»
        triggers = [
            "как на фото", "как на картинке", "как на изображении",
            "см. фото", "смотри фото", "см. картинку",
            "like the photo", "as in the photo", "see photo"
        ]
        hay = f"{text or ''} {ocr_text or ''}".lower()
        keep_photo = bool(image_path) and any(t in hay for t in triggers)

        # форматирование
        formatted = await format_casting_template(text, image_path)
        quote_html = f"<blockquote>Источник (Telegram): {sender_name}</blockquote>"
        final_message = f"{formatted}\n\n{quote_html}"

        # отправка в целевой чат/тред через Bot API
        try:
            if keep_photo and image_path:
                print("🖼️ Отправляю фото + caption…")
                url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"
                with open(image_path, "rb") as f:
                    files = {"photo": f}
                    data = {
                        "chat_id": DEST_CHAT_ID,
                        "caption": final_message,
                        "parse_mode": "HTML",
                    }
                    if DEST_THREAD_ID is not None:
                        data["message_thread_id"] = DEST_THREAD_ID
                    resp = requests.post(url, data=data, files=files, timeout=30)
            else:
                print("💬 Отправляю текст…")
                url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
                payload = {
                    "chat_id":      DEST_CHAT_ID,
                    "text":         final_message,
                    "parse_mode":   "HTML",
                }
                if DEST_THREAD_ID is not None:
                    payload["message_thread_id"] = DEST_THREAD_ID
                resp = requests.post(url, json=payload, timeout=30)

            if resp.status_code != 200:
                print(f"❌ Telegram API {resp.status_code}: {resp.text}")
            else:
                print("📤 Отправлено (200).")
        finally:
            if image_path and os.path.exists(image_path):
                try:
                    os.remove(image_path)
                    print("🧹 Временный файл удалён.")
                except Exception as e:
                    print(f"⚠️ Не удалил фото: {e}")

    except Exception as e:
        print(f"❌ Ошибка в handler: {e}")

if __name__ == "__main__":
    print("🚀 Клиент (юзер) стартует… Если первый запуск — спросит телефон/код.")
    client.start()              # ← как ЮЗЕР, без bot_token
    client.run_until_disconnected()