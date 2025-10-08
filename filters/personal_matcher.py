# -*- coding: utf-8 -*-

import os
import json
from typing import Optional, List, Tuple
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from telethon import TelegramClient, events, Button
from dotenv import load_dotenv

from utils import (
    get_all_users,
    check_match_ai,
    store_match,
    purge_old_matches,
    store_notice,
)

# ── ENV ──────────────────────────────────────────────────────────────────────

env_path = Path(__file__).resolve().parent.parent / "telegram_bot" / ".env"
load_dotenv(dotenv_path=env_path)

API_ID = int(os.getenv("API_ID"))
API_HASH = os.getenv("API_HASH")
BOT_TOKEN = os.getenv("BOT_TOKEN")

client = TelegramClient("personal_matcher_session", API_ID, API_HASH).start(bot_token=BOT_TOKEN)

# ── CONST ────────────────────────────────────────────────────────────────────

# чат и ветка, где ловим кастинги
TARGET_CHAT_ID = -1003099254143  # группа с кастингами
TARGET_THREAD_ID = 4             # id нужной ветки (topic)

# важно: префикс совпадает с ботом (см. user_reg_bot.NOTIFY_PREFIX)
NOTIFY_TEXT = "✨ Для вас появились новые подходящие кастинги.\n\n"

# путь к общей БД
DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DB_PATH = DATA_DIR / "actors.db"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── DB HELPERS (подписка + weekly_stats) ─────────────────────────────────────

def _db():
    return sqlite3.connect(DB_PATH)

def is_sub_active(uid: int) -> bool:
    con = _db(); cur = con.cursor()
    try:
        cur.execute("SELECT status FROM subs WHERE user_id=?", (uid,))
        row = cur.fetchone()
        return bool(row and (row[0] == "active"))
    except sqlite3.OperationalError:
        # если таблицы нет — считаем неподписчиком
        return False
    finally:
        con.close()

def _init_weekly_table():
    con = _db(); cur = con.cursor()
    try:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS weekly_stats (
                user_id    INTEGER NOT NULL,
                week_start TEXT    NOT NULL,  -- YYYY-MM-DD (понедельник, UTC)
                cnt        INTEGER  NOT NULL DEFAULT 0,
                PRIMARY KEY (user_id, week_start)
            )
            """
        )
        con.commit()
    finally:
        con.close()

def _week_start_str(dt: Optional[datetime] = None) -> str:
    dt = dt or datetime.utcnow()
    monday = dt - timedelta(days=dt.weekday())
    return monday.date().isoformat()

def bump_weekly_counter(uid: int, *, amount: int = 1):
    _init_weekly_table()
    ws = _week_start_str()
    con = _db(); cur = con.cursor()
    try:
        cur.execute(
            """
            INSERT INTO weekly_stats(user_id, week_start, cnt)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, week_start)
            DO UPDATE SET cnt = cnt + excluded.cnt
            """,
            (uid, ws, amount),
        )
        con.commit()
    finally:
        con.close()

def fetch_counts_for_current_week() -> List[Tuple[int, int]]:
    _init_weekly_table()
    ws = _week_start_str()
    con = _db(); cur = con.cursor()
    try:
        cur.execute("SELECT user_id, cnt FROM weekly_stats WHERE week_start=?", (ws,))
        return [(int(r[0]), int(r[1])) for r in cur.fetchall()]
    finally:
        con.close()

def reset_current_week_counts():
    ws = _week_start_str()
    con = _db(); cur = con.cursor()
    try:
        cur.execute("DELETE FROM weekly_stats WHERE week_start=?", (ws,))
        con.commit()
    finally:
        con.close()

# ── MISC ─────────────────────────────────────────────────────────────────────

def get_topic_id(msg):
    """Вытягиваем topic/thread id из разных полей."""
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
        print(f"   • id={u.get('user_id')} | {(u.get('full_name') or '—')} | {(u.get('sex') or '—')} | {(u.get('cities') or '—')}")

# ── Сохранение + уведомление/инкремент ──────────────────────────────────────

async def _save_and_notify(user_id: int, source_chat: int, message_ids, text_cache: str, thread_id: Optional[int]):
    """
    Сохраняем матч. Если пользователь подписан — пушим уведомление.
    Если нет — только увеличиваем weekly-счётчик.
    В любом случае матч в таблицу matches записываем.
    """
    match_id = store_match(
        user_id=user_id,
        source_chat=source_chat,
        message_ids=message_ids,
        text_cache=text_cache,
        thread_id=thread_id,
    )

    if is_sub_active(user_id):
        try:
            msg = await client.send_message(
                int(user_id),
                NOTIFY_TEXT,
                buttons=[[Button.inline("📰 Посмотреть", b"view_castings")]],
                link_preview=False,
            )
            store_notice(int(user_id), int(msg.id))  # позже user_reg_bot их подчистит
            print(f"🔔 push user_id={user_id} (match_id={match_id}, notice_id={msg.id})")
        except Exception as e:
            print(f"⚠️ push error user_id={user_id}: {e}")
    else:
        bump_weekly_counter(user_id, amount=1)
        print(f"🗓 bump weekly counter user_id={user_id} (match_id={match_id})")

# ── Хэндлеры входящих постов ────────────────────────────────────────────────

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

    removed = purge_old_matches()
    if removed:
        print(f"🧹 purge_old_matches: удалено {removed} строк")

    users = get_all_users()
    if not users:
        print("⚠️ В базе нет пользователей.")
        return

    _log_users(users)

    matched_any = False
    for u in users:
        user_id = u["user_id"]
        print(f"\n--- 🔎 Проверка user_id={user_id} ---")
        ok = check_match_ai(u, casting_text, debug=True)
        if not ok:
            print("⛔️ Не подходит (ИИ).")
            continue

        matched_any = True
        try:
            await _save_and_notify(
                user_id=user_id,
                source_chat=event.chat_id,
                message_ids=[msg.id],
                text_cache=casting_text,
                thread_id=topic_id or None,
            )
        except Exception as e:
            print(f"⚠️ Ошибка save/notify user_id={user_id}: {e}")

    print("🔕 Никому не подошло." if not matched_any else "✅ Готово для одиночного поста.")

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

    removed = purge_old_matches()
    if removed:
        print(f"🧹 purge_old_matches: удалено {removed} строк")

    users = get_all_users()
    if not users:
        print("⚠️ В базе нет пользователей.")
        return

    _log_users(users)

    matched_any = False
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
        except Exception as e:
            print(f"⚠️ Ошибка save/notify user_id={user_id}: {e}")

    print("🔕 Никому не подошло (альбом)." if not matched_any else "✅ Готово для альбома.")

# ── Недельный дайджест (ручной триггер) ─────────────────────────────────────

@client.on(events.NewMessage(pattern=r"^/send_weekly_digest_now$"))
async def send_weekly_digest_now(ev):
    """
    Разошлёт дайджест всем неподписчикам, у кого за текущую неделю cnt>0,
    и очистит счётчики.
    """
    counts = fetch_counts_for_current_week()
    if not counts:
        await ev.reply("Пусто: на этой неделе пока нет накопленных совпадений.")
        return

    sent = 0
    for uid, cnt in counts:
        if cnt <= 0:
            continue
        try:
            text = (
                "🗓 **Недельный дайджест**\n\n"
                f"За эту неделю для вас найдено: **{cnt}** подходящих кастинг(ов).\n\n"
                "Подключите ИИ-кастинг-агента, чтобы получать подходящее **сразу** и откликаться в один клик."
            )
            msg = await client.send_message(
                int(uid),
                text,
                buttons=[
                    [Button.inline("📰 Смотреть кастинги", b"view_castings")],
                    [Button.inline("⚡ Подключить ИИ кастинг-агента", b"open_tariff")],
                ],
                link_preview=False,
            )
            store_notice(int(uid), int(msg.id))
            sent += 1
        except Exception as e:
            print(f"⚠️ digest send error uid={uid}: {e}")

    reset_current_week_counts()
    await ev.reply(f"Готово. Отправлено дайджестов: {sent}")

# ── RUN ─────────────────────────────────────────────────────────────────────

print("🤖 Personal matcher запущен. Ловим кастинги, сохраняем матчи, пушим подписчикам и копим статистику для дайджеста…")
client.run_until_disconnected()