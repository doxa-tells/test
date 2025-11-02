# -*- coding: utf-8 -*-

import os
import json
import traceback
from typing import Optional, List, Tuple
import re
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from pathlib import Path

from telethon import TelegramClient, events, Button
from dotenv import load_dotenv
import sys
sys.path.append(str(Path(__file__).resolve().parents[1]))  # add project root to import path
from telegram_bot.is_casting_ai import get_or_compute_categories

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

# ── DB HELPERS (подписка + weekly_stats) ─────────────────────────────────────

def _db():
    return psycopg2.connect(
        dbname=os.getenv("PG_DB"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASSWORD"),
        host=os.getenv("PG_HOST"),
        port=os.getenv("PG_PORT")
    )

def _sub_info(uid: int) -> tuple:
    con = _db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT plan, status FROM subs WHERE user_id=%s", (uid,))
            row = cur.fetchone()
            if not row:
                return (None, None)
            return (row[0], row[1])
    finally:
        con.close()

def _prefs(uid: int) -> set:
    con = _db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT category_code FROM user_category_prefs WHERE user_id=%s", (uid,))
            return {r[0] for r in cur.fetchall()}
    finally:
        con.close()

def is_sub_active(uid: int) -> bool:
    con = _db()
    try:
        with con.cursor() as cur:
            try:
                cur.execute("SELECT status FROM subs WHERE user_id=%s", (uid,))
                row = cur.fetchone()
                return bool(row and (row[0] == "active"))
            except psycopg2.Error:
                return False
    finally:
        con.close()

def _init_weekly_table():
    con = _db()
    with con.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS weekly_stats (
                user_id    BIGINT NOT NULL,
                week_start DATE   NOT NULL,  -- YYYY-MM-DD (понедельник, UTC)
                cnt        BIGINT NOT NULL DEFAULT 0,
                PRIMARY KEY (user_id, week_start)
            )
            """
        )
    con.commit()
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
            VALUES (%s, %s, %s)
            ON CONFLICT(user_id, week_start)
            DO UPDATE SET cnt = weekly_stats.cnt + EXCLUDED.cnt;
            """,
            (uid, ws, amount),
        )
    except psycopg2.Error:
        con.rollback()
        raise
    finally:
        con.commit()
        con.close()

def fetch_counts_for_current_week() -> List[Tuple[int, int]]:
    _init_weekly_table()
    ws = _week_start_str()
    con = _db()
    try:
        with con.cursor() as cur:
            cur.execute("SELECT user_id, cnt FROM weekly_stats WHERE week_start=%s", (ws,))
            rows = [(int(r[0]), int(r[1])) for r in cur.fetchall()]
        return rows
    finally:
        con.close()

def reset_current_week_counts():
    ws = _week_start_str()
    con = _db()
    with con.cursor() as cur:
        cur.execute("DELETE FROM weekly_stats WHERE week_start=%s", (ws,))
    con.commit()
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

def _parse_user_age_range(u: dict) -> Optional[Tuple[int, int]]:
    """Парсим 'игровой возраст' пользователя из поля age_range (например '20-25')."""
    ar = (u.get("age_range") or "").strip()
    if not ar:
        return None
    # варианты: '20-25', '20–25', 'от 20 до 25', '20+' (интерпретируем как 20-99)
    ar = ar.replace("–", "-")
    m = re.search(r"(\d{1,2})\s*[-]\s*(\d{1,2})", ar)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        if a > b:
            a, b = b, a
        return (a, b)
    m = re.search(r"от\s*(\d{1,2})\s*до\s*(\d{1,2})", ar, re.IGNORECASE)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        if a > b:
            a, b = b, a
        return (a, b)
    m = re.search(r"(\d{1,2})\s*\+", ar)
    if m:
        a = int(m.group(1))
        return (a, 99)
    m = re.search(r"(\d{1,2})", ar)
    if m:
        a = int(m.group(1))
        return (a, a)
    return None

def _parse_casting_age_range(text: str) -> Optional[Tuple[int, int]]:
    """Извлекаем возраст/диапазон из текста кастинга."""
    t = (text or "").lower()
    # нормализуем тире
    t = t.replace("–", "-")
    # диапазоны: 12-13, 18-25, от 20 до 30
    m = re.search(r"\b(\d{1,2})\s*[-]\s*(\d{1,2})\b", t)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        if a > b:
            a, b = b, a
        return (a, b)
    m = re.search(r"от\s*(\d{1,2})\s*до\s*(\d{1,2})", t)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        if a > b:
            a, b = b, a
        return (a, b)
    # один возраст: '12 лет', '12-ть лет' (упрощенно)
    m = re.search(r"\b(\d{1,2})\s*лет\b", t)
    if m:
        a = int(m.group(1))
        return (a, a)
    # 'до 12 лет'
    m = re.search(r"до\s*(\d{1,2})\s*лет", t)
    if m:
        b = int(m.group(1))
        return (0, b)
    # '18+' условно как 18-99
    m = re.search(r"\b(\d{1,2})\s*\+\b", t)
    if m:
        a = int(m.group(1))
        return (a, 99)
    return None

def _age_ranges_overlap(a: Tuple[int, int], b: Tuple[int, int]) -> bool:
    return max(a[0], b[0]) <= min(a[1], b[1])

def _hard_constraints_ok(u: dict, text: str) -> bool:
    t = (text or "").lower()
    sex = (u.get("sex") or "").lower()
    cities_str = (u.get("cities") or "")
    # gender
    has_f = any(x in t for x in ["жен", "девоч", "девуш", "женщ"])
    has_m = any(x in t for x in ["муж", "парен", "юнош", "мальчик"])
    if has_f and not has_m:
        if sex not in ("женский", "жен", "female", "f"):
            return False
    if has_m and not has_f:
        if sex not in ("мужской", "муж", "male", "m"):
            return False
    # city
    user_cities = [c.strip().lower() for c in cities_str.split(",") if c.strip()]
    mentioned_common = [
        "алматы","астана","шымкент","караганда","павлодар","актобе","усть-каменогорск",
        "костанай","кокшетау","актау","атырау","талдыкорган","тараз","петропавловск",
    ]
    if any(c in t for c in mentioned_common):
        if user_cities and not any(c in t for c in user_cities):
            return False
    # возраст (игровой возраст пользователя против требований кастинга)
    user_age = _parse_user_age_range(u)
    cast_age = _parse_casting_age_range(t)

    # Спец-обработка детских ключевых слов, если явного возраста нет
    child_words = ["мальчик", "девочка", "подросток", "ребенок", "ребёнок", "kid", "teen"]
    has_child_kw = any(w in t for w in child_words)

    if user_age:
        if cast_age:
            # если кастинг явно указал возраст — требуем пересечение диапазонов
            if not _age_ranges_overlap(user_age, cast_age):
                return False
        elif has_child_kw:
            # без явного возраста, но роль детская — ограничим верхнюю границу
            # считаем детским: максимум 16 лет
            if user_age[0] > 16:
                return False

    return True

def _append_match_log(entry: dict):
    try:
        log_path = os.getenv("MATCHER_LOG")
        if not log_path:
            base = Path(__file__).resolve().parents[1]
            log_path = str(base / "logs" / "matcher.log")
        p = Path(log_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with p.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as _:
        pass

async def _save_and_notify(user_id: int, source_chat: int, message_ids, text_cache: str, thread_id: Optional[int], cats: Optional[set] = None):
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

    try:
        plan, status = _sub_info(int(user_id))
    except Exception:
        plan, status = (None, None)
    try:
        _append_match_log({
            "ts": datetime.utcnow().isoformat(),
            "match_id": match_id,
            "user_id": int(user_id),
            "source_chat": int(source_chat),
            "message_ids": list(message_ids) if isinstance(message_ids, (list, tuple)) else message_ids,
            "thread_id": int(thread_id) if thread_id is not None else None,
            "plan": (plan or None),
            "status": (status or None),
            "cats": sorted(list(cats)) if cats else None,
        })
    except Exception:
        pass

# ── Хэндлеры входящих постов ────────────────────────────────────────────────

@client.on(events.NewMessage(chats=[TARGET_CHAT_ID]))
async def handle_new_casting(event):
    try:
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

        try:
            cats = get_or_compute_categories(event.chat_id, msg.id, topic_id, casting_text, None) or set()
        except Exception as e:
            print(f"⚠️ categories error: {e}\n{traceback.format_exc()}")
            cats = set()

        matched_any = False
        premium_with_prefs = []
        premium_no_prefs = []
        standard = []
        free = []
        for u in users:
            uid = int(u.get("user_id"))
            plan, status = _sub_info(uid)
            if status != "active":
                continue
            plan = (plan or "free").lower()
            if plan == "premium":
                pf = _prefs(uid)
                if pf and (pf.intersection(cats)):
                    premium_with_prefs.append(u)
                else:
                    premium_no_prefs.append(u)
            elif plan == "standard":
                standard.append(u)
            else:
                free.append(u)

        # логируем сводку по событию и когорты
        try:
            _append_match_log({
                "ts": datetime.utcnow().isoformat(),
                "event": "NewMessage",
                "chat_id": int(event.chat_id),
                "topic_id": int(topic_id) if topic_id is not None else None,
                "msg_ids": [int(msg.id)],
                "cats": sorted(list(cats)) if cats else [],
                "cohorts": {
                    "premium_with_prefs": len(premium_with_prefs),
                    "premium_no_prefs": len(premium_no_prefs),
                    "standard": len(standard),
                    "free": len(free),
                }
            })
        except Exception:
            pass

        for cohort in (premium_with_prefs, standard):
            for u in cohort:
                user_id = u["user_id"]
                print(f"\n--- 🔎 Проверка user_id={user_id} ---")
                # Полный контроль ИИ — только check_match_ai (debug для подробного лога)
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
                        cats=cats,
                    )
                except Exception as e:
                    print(f"⚠️ Ошибка save/notify user_id={user_id}: {e}")

        print("🔕 Никому не подошло." if not matched_any else "✅ Готово для одиночного поста.")
    except Exception as e:
        print(f"🔥 Handler error (NewMessage): {e}\n{traceback.format_exc()}")

@client.on(events.Album(chats=[TARGET_CHAT_ID]))
async def handle_album(event):
    try:
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
        try:
            cats = get_or_compute_categories(event.chat_id, album_ids[0], topic_id, casting_text, None) or set()
        except Exception as e:
            print(f"⚠️ categories error (album): {e}\n{traceback.format_exc()}")
            cats = set()

        premium_with_prefs = []
        premium_no_prefs = []
        standard = []
        free = []
        for u in users:
            uid = int(u.get("user_id"))
            plan, status = _sub_info(uid)
            if status != "active":
                continue
            plan = (plan or "free").lower()
            if plan == "premium":
                pf = _prefs(uid)
                if pf and (pf.intersection(cats)):
                    premium_with_prefs.append(u)
                else:
                    premium_no_prefs.append(u)
            elif plan == "standard":
                standard.append(u)
            else:
                free.append(u)

        # логируем сводку по событию и когорты
        try:
            _append_match_log({
                "ts": datetime.utcnow().isoformat(),
                "event": "Album",
                "chat_id": int(event.chat_id),
                "topic_id": int(topic_id) if topic_id is not None else None,
                "msg_ids": [int(m) for m in album_ids],
                "cats": sorted(list(cats)) if cats else [],
                "cohorts": {
                    "premium_with_prefs": len(premium_with_prefs),
                    "premium_no_prefs": len(premium_no_prefs),
                    "standard": len(standard),
                    "free": len(free),
                }
            })
        except Exception:
            pass

        for cohort in (premium_with_prefs, standard):
            for u in cohort:
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
                        cats=cats,
                    )
                except Exception as e:
                    print(f"⚠️ Ошибка save/notify user_id={user_id}: {e}")

        print("🔕 Никому не подошло (альбом)." if not matched_any else "✅ Готово для альбома.")
    except Exception as e:
        print(f"🔥 Handler error (Album): {e}\n{traceback.format_exc()}")

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