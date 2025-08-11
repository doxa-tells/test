from telethon import TelegramClient, events
import os, json, tempfile
from dotenv import load_dotenv
from pathlib import Path
from utils import match_profile_with_casting

# env
env_path = Path(__file__).resolve().parent.parent / "telegram_bot" / ".env"
load_dotenv(dotenv_path=env_path)

api_id = int(os.getenv("API_ID"))
api_hash = os.getenv("API_HASH")
bot_token = os.getenv("BOT_TOKEN")

client = TelegramClient("personal_matcher_session", api_id, api_hash).start(bot_token=bot_token)

DB_PATH = os.path.join(os.path.dirname(__file__), "users.json")

# 👉 ЗАДАЙ свои значения тут
TARGET_CHAT_ID = -1002835970298          # твоя группа с форумами
TARGET_THREAD_ID = 2                     # id нужной ветки (topic)


def get_topic_id(msg):
    """
    Универсально вытаскиваем topic/thread id из разных мест, в зависимости от версии/типа апдейта.
    Возвращаем int или None.
    """
    for attr in ("message_thread_id", "thread_id", "reply_to_top_id", "top_msg_id", "topic_id"):
        if hasattr(msg, attr) and getattr(msg, attr):
            return getattr(msg, attr)

    if getattr(msg, "reply_to", None):
        for attr in ("reply_to_top_id", "reply_to_msg_id"):
            val = getattr(msg.reply_to, attr, None)
            if val:
                return val

    return None


@client.on(events.NewMessage(chats=[TARGET_CHAT_ID]))
async def handle_new_casting(event):
    print("📥 Получено новое сообщение...")

    msg = event.message

    # Диагностика
    print(f"🔎 chat_id={event.chat_id}")
    print(f"🔎 has msg.message_thread_id? {hasattr(msg,'message_thread_id')} -> {getattr(msg,'message_thread_id', None)}")
    print(f"🔎 has msg.thread_id?         {hasattr(msg,'thread_id')} -> {getattr(msg,'thread_id', None)}")
    print(f"🔎 has msg.reply_to?          {bool(getattr(msg,'reply_to', None))}")
    if getattr(msg, 'reply_to', None):
        print(f"   ↳ reply_to.reply_to_top_id={getattr(msg.reply_to, 'reply_to_top_id', None)}")
        print(f"   ↳ reply_to.reply_to_msg_id={getattr(msg.reply_to, 'reply_to_msg_id', None)}")

    topic_id = get_topic_id(msg)
    print(f"🧵 Вычисленный topic_id: {topic_id}")

    if topic_id != TARGET_THREAD_ID:
        print("❌ Не та ветка. Пропускаем.")
        return

    casting_text = event.raw_text or ""
    if not casting_text.strip():
        print("⚠️ Пустой текст — пропускаем.")
        return

    # Загружаем профили
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            users = json.load(f)
        print(f"✅ Загружено профилей: {len(users)}")
    except Exception as e:
        print(f"❌ Ошибка чтения users.json: {e}")
        return

    if not users:
        print("⚠️ В базе нет пользователей.")
        return

    # Матчинг и отправка в ЛС
    matched_any = False
    for user_id, profile in users.items():
        try:
            if not match_profile_with_casting(casting_text, profile):
                continue

            matched_any = True

            # 1) Всегда пытаемся переслать оригинал (с медиа или без)
            try:
                await client.forward_messages(int(user_id), msg)
                print(f"📬 Переслано (оригинал) пользователю {user_id}")
                continue  # успех — к следующему пользователю
            except Exception as e:
                print(f"⚠️ Не удалось переслать оригинал: {e}")

            # 2) Фоллбэк: если есть медиа — скачать и отправить как файл с подписью
            tmp_path = None
            try:
                if msg.media:
                    tmp_dir = tempfile.gettempdir()
                    tmp_path = await client.download_media(msg, file=tmp_dir)

                    if tmp_path and os.path.exists(tmp_path):
                        await client.send_file(
                            int(user_id),
                            tmp_path,
                            caption=f"🎯 Найден подходящий кастинг для вас!\n\n{casting_text}"
                        )
                        print(f"📬 Отправлено (файл+подпись) пользователю {user_id}")
                    else:
                        # 3) Если медиа нет/не скачалось — отправляем текст
                        await client.send_message(int(user_id), f"🎯 Найден подходящий кастинг для вас!\n\n{casting_text}")
                        print(f"📬 Отправлено (текст) пользователю {user_id}")
                else:
                    # медиа нет — текст
                    await client.send_message(int(user_id), f"🎯 Найден подходящий кастинг для вас!\n\n{casting_text}")
                    print(f"📬 Отправлено (текст) пользователю {user_id}")

            except Exception as e:
                print(f"⚠️ Ошибка при фоллбэке пользователю {user_id}: {e}")
                # Последняя попытка — текст
                try:
                    await client.send_message(int(user_id), f"🎯 Найден подходящий кастинг для вас!\n\n{casting_text}")
                    print(f"📬 (fallback2) Отправлено (текст) пользователю {user_id}")
                except Exception as e2:
                    print(f"⚠️ Ошибка при отправке текста пользователю {user_id}: {e2}")
            finally:
                try:
                    if tmp_path and os.path.exists(tmp_path):
                        os.remove(tmp_path)
                except Exception:
                    pass

        except Exception as e:
            print(f"⚠️ Ошибка при обработке пользователя {user_id}: {e}")

    if not matched_any:
        print("🔕 Никому не подошло (или все отфильтрованы).")


# Дополнительный хэндлер для альбомов (несколько фото/медиа одним постом)
@client.on(events.Album(chats=[TARGET_CHAT_ID]))
async def handle_album(event):
    # Проверяем ветку по первому сообщению альбома
    msg0 = event.messages[0]
    topic_id = get_topic_id(msg0)
    if topic_id != TARGET_THREAD_ID:
        return

    casting_text = (msg0.raw_text or "").strip()

    # Юзеры
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            users = json.load(f)
    except Exception as e:
        print(f"❌ Ошибка чтения users.json (альбом): {e}")
        return

    for user_id, profile in users.items():
        try:
            if not match_profile_with_casting(casting_text, profile):
                continue

            # 1) пробуем переслать альбом целиком
            try:
                await client.forward_messages(int(user_id), event.messages)
                print(f"📬 Переслан альбом пользователю {user_id}")
                continue
            except Exception as e:
                print(f"⚠️ Не удалось переслать альбом: {e}")

            # 2) фоллбэк — отправим первое медиа с подписью
            tmp_path = None
            try:
                tmp_path = await client.download_media(event.messages[0])
                if tmp_path and os.path.exists(tmp_path):
                    await client.send_file(int(user_id), tmp_path, caption=f"🎯 Найден подходящий кастинг для вас!\n\n{casting_text}")
                    print(f"📬 Отправлено (первый файл альбома) пользователю {user_id}")
                else:
                    await client.send_message(int(user_id), f"🎯 Найден подходящий кастинг для вас!\n\n{casting_text}")
            except Exception as e:
                print(f"⚠️ Ошибка при фоллбэке альбома пользователю {user_id}: {e}")
            finally:
                try:
                    if tmp_path and os.path.exists(tmp_path):
                        os.remove(tmp_path)
                except Exception:
                    pass

        except Exception as e:
            print(f"⚠️ Ошибка при обработке пользователя (альбом) {user_id}: {e}")


print("🤖 Бот персонального подбора запущен и ожидает новые кастинги...")
client.run_until_disconnected()