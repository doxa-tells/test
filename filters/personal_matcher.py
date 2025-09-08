# -*- coding: utf-8 -*-

from telethon import TelegramClient, events
import os
from telethon import Button
from dotenv import load_dotenv
from pathlib import Path

from utils import (
    get_all_users,
    check_match_ai,
    store_match,
    purge_old_matches,
    store_notice,
)

# --- ENV --------------------------------------------------------------------

# грузим .env из telegram_bot/.env
env_path = Path(__file__).resolve().parent.parent / "telegram_bot" / ".env"
load_dotenv(dotenv_path=env_path)

api_id = int(os.getenv("API_ID"))
api_hash = os.getenv("API_HASH")
bot_token = os.getenv("BOT_TOKEN")

client = TelegramClient("personal_matcher_session", api_id, api_hash).start(bot_token=bot_token)

# --- НАСТРОЙКИ ----------------------------------------------------------------
# чат и ветка, где ловим кастинги
TARGET_CHAT_ID = -1003099254143   # группа с кастингами
TARGET_THREAD_ID = 4              # id нужной ветки (topic)

# текст уведомления пользователю (шлём 1 раз за событие на каждого)
NOTIFY_TEXT = (
    "✨ Для вас появился новый подходящий кастинг.\n\n"
)


# --- ХЕЛПЕРЫ ------------------------------------------------------------------

def get_topic_id(msg):
    """Достаём topic/thread id из разных мест."""
    for attr in ("message_thread_id", "thread_id", "reply_to_top_id", "top_msg_id", "topic_id"):
        if hasattr(msg, attr) and getattr(msg, attr):
            return getattr(msg, attr)
    if getattr(msg, "reply_to", None):
        for attr in ("reply_to_top_id", "reply_to_msg_id"):
            val = getattr(msg.reply_to, attr, None)
            if val:
                return val
    return None


def _log_users(users):
    print(f"👥 Пользователей в базе: {len(users)}")
    for u in users:
        print(
            f"   • id={u.get('user_id')} | "
            f"{(u.get('full_name') or '—')} | "
            f"{(u.get('sex') or '—')} | "
            f"{(u.get('cities') or '—')}"
        )


from telethon import Button  # (у тебя уже импортирован)

async def _save_and_notify(user_id: int, source_chat: int, message_ids, text_cache: str, thread_id: int):
    match_id = store_match(
        user_id=user_id,
        source_chat=source_chat,
        message_ids=message_ids,
        text_cache=text_cache,
        thread_id=thread_id,
    )
    try:
        msg = await client.send_message(
            int(user_id),
            NOTIFY_TEXT,
            buttons=[
                [Button.inline("📰 Посмотреть", b"view_castings")],  # ← ВАЖНО: callback data
            ],
            link_preview=False,
        )
        # сохраняем id созданного уведомления
        store_notice(int(user_id), int(msg.id))
        print(f"🔔 Уведомление отправлено user_id={user_id} (match_id={match_id}, notice_id={msg.id})")
    except Exception as e:
        print(f"⚠️ Не удалось отправить уведомление user_id={user_id}: {e}")

# --- ОБРАБОТКА ОДИНОЧНОГО СООБЩЕНИЯ -----------------------------------------

@client.on(events.NewMessage(chats=[TARGET_CHAT_ID]))
async def handle_new_casting(event):
    msg = event.message
    topic_id = get_topic_id(msg)

    print("\n================= 📥 NewMessage =================")
    print(f"chat_id={event.chat_id}, topic_id={topic_id}, msg_id={msg.id}")

    if topic_id != TARGET_THREAD_ID:
        print("❌ Не та ветка — пропуск.")
        return

    casting_text = (event.raw_text or "").strip()
    if not casting_text:
        print("⚠️ Пустой текст — пропуск.")
        return

    # чистим просроченные матчи
    removed = purge_old_matches()
    if removed:
        print(f"🧹 purge_old_matches: удалено {removed} строк")

    users = get_all_users()
    if not users:
        print("⚠️ В базе нет пользователей.")
        return

    _log_users(users)

    matched_any = False
    notified = set()  # чтобы одному юзеру не слать по несколько уведомлений на один пост

    for u in users:
        user_id = u["user_id"]
        print(f"\n--- 🔎 Проверка user_id={user_id} ---")
        ok = check_match_ai(u, casting_text, debug=True)
        if not ok:
            print("⛔️ Не подходит (ИИ).")
            continue

        matched_any = True
        try:
            # сохраняем оригинальные ids (для одиночного поста — один id)
            await _save_and_notify(
                user_id=user_id,
                source_chat=event.chat_id,
                message_ids=[msg.id],
                text_cache=casting_text,
                thread_id=topic_id or None,
            )
            notified.add(user_id)
        except Exception as e:
            print(f"⚠️ Ошибка save/notify user_id={user_id}: {e}")

    if not matched_any:
        print("🔕 Никому не подошло.")
    else:
        print(f"✅ Сохранено подходящих кастингов: {len(notified)} пользователям")

# --- ОБРАБОТКА АЛЬБОМА -------------------------------------------------------

@client.on(events.Album(chats=[TARGET_CHAT_ID]))
async def handle_album(event):
    msg0 = event.messages[0]
    topic_id = get_topic_id(msg0)

    print("\n================= 🎞 NewAlbum =================")
    print(f"chat_id={event.chat_id}, topic_id={topic_id}, msg_ids={[m.id for m in event.messages]}")

    if topic_id != TARGET_THREAD_ID:
        print("❌ Не та ветка — пропуск.")
        return

    casting_text = (msg0.raw_text or "").strip()
    if not casting_text:
        print("⚠️ Пустой текст — пропуск.")
        return

    # чистим просроченные матчи
    removed = purge_old_matches()
    if removed:
        print(f"🧹 purge_old_matches: удалено {removed} строк")

    users = get_all_users()
    if not users:
        print("⚠️ В базе нет пользователей.")
        return

    _log_users(users)

    matched_any = False
    notified = set()
    album_ids = [m.id for m in event.messages]

    for u in users:
        user_id = u["user_id"]
        print(f"\n--- 🔎 Проверка (альбом) user_id={user_id} ---")
        ok = check_match_ai(u, casting_text, debug=True)
        if not ok:
            print("⛔️ Не подходит (ИИ).")
            continue

        matched_any = True
        try:
            await _save_and_notify(
                user_id=user_id,
                source_chat=event.chat_id,
                message_ids=album_ids,
                text_cache=casting_text,
                thread_id=topic_id or None,
            )
            notified.add(user_id)
        except Exception as e:
            print(f"⚠️ Ошибка save/notify user_id={user_id}: {e}")

    if not matched_any:
        print("🔕 Никому не подошло (альбом).")
    else:
        print(f"✅ Сохранено подходящих альбомов: {len(notified)} пользователям")


print("🤖 Personal matcher запущен. Ловим кастинги, сохраняем матчи и шлём уведомления…")
client.run_until_disconnected()