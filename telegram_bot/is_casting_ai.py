import base64
try:
    from openai import OpenAI  # optional dependency
except Exception:
    OpenAI = None
from dotenv import load_dotenv
import os
import re
from typing import List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()  # загружает переменные из .env

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY) if (OPENAI_API_KEY and OpenAI) else None

# --- DB helper (used for caching categories) ---------------------------------
def _db():
    return psycopg2.connect(
        dbname=os.getenv("PG_DB"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASSWORD"),
        host=os.getenv("PG_HOST"),
        port=os.getenv("PG_PORT"),
    )

# --- Categorization -----------------------------------------------------------
_CATEGORY_MAP = [
    # роль в кино (фильмы, сериалы) — любые упоминания съёмок кино/сериалов, роли, кастинга на роль
    ("film_role", [
        r"роль", r"на роль", r"кастинг", r"проба",
        r"кино", r"фильм", r"сериал", r"эпизодич",
    ]),
    # рекламный ролик
    ("commercial", [
        r"реклам", r"ролик", r"бренд", r"product", r"commercial",
    ]),
    # актёры массовых сцен (АМС, массовка)
    ("extras", [
        r"амс", r"массовк", r"массовая сцен", r"statist", r"extras",
    ]),
    # модель
    ("model", [
        r"модель", r"model", r"подиум", r"fashion", r"фэшн", r"каталож",
    ]),
]

def categorize_casting(text: str, image_path: Optional[str] = None) -> List[str]:
    """Lightweight heuristic categorizer that returns a list of category codes.
    If OPENAI is configured, this can later be upgraded to LLM-based classification.
    """
    t = (text or "").lower()
    found = []
    for code, pats in _CATEGORY_MAP:
        for p in pats:
            if re.search(p, t):
                found.append(code)
                break
    # fallback: если ничего не нашли — считать как film_role при явном упоминании съёмок/кастинга,
    # иначе как commercial (наиболее частая задача)
    if not found:
        if re.search(r"кастинг|съемк|съёмк|проба|съёмоч", t):
            found.append("film_role")
        else:
            found.append("commercial")
    return list(dict.fromkeys(found))  # dedup, keep order

def get_or_compute_categories(source_chat: int, message_id: int, thread_id: Optional[int], text: str, image_path: Optional[str] = None) -> List[str]:
    con = _db()
    try:
        with con.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT categories FROM casting_category_cache WHERE source_chat=%s AND message_id=%s",
                (int(source_chat), int(message_id)),
            )
            row = cur.fetchone()
            if row and row.get("categories"):
                return list(row["categories"])  # already list from PG array

            cats = categorize_casting(text, image_path)
            cur.execute(
                """
                INSERT INTO casting_category_cache (source_chat, message_id, thread_id, categories)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (source_chat, message_id)
                DO UPDATE SET categories = EXCLUDED.categories
                """,
                (int(source_chat), int(message_id), thread_id, cats),
            )
            con.commit()
            return cats
    finally:
        con.close()

# 🔍 AI-фильтрация
async def is_casting_ai(text, image_path=None):
    content = [{
        "type": "text",
        "text": f"""Ты анализируешь текст и изображение, чтобы определить, является ли это сообщение **объявлением кастинга**.

1. **Сначала** прочитай текст сообщения.
2. Затем, **если на изображении есть текст — учти его.** Визуальные элементы (лица, эмоции, фон) **игнорируй полностью.**
3. Если в тексте (или на фото с текстом) есть **минимум 2 из 5 пунктов**:
— проект/тип съёмки,
— типаж/роль,
— дата съёмки,
    - время съемок,
— локация,
— контакт для связи —
ТО это настоящий кастинг.

Если условий нет — ответь: \"нет\".  
Если всё подходит — ответь: \"да\".  
Только одно слово: \"да\" или \"нет\".

Вот сообщение:
{text}
"""
    }]

    if image_path:
        try:
            with open(image_path, "rb") as img:
                base64_img = base64.b64encode(img.read()).decode("utf-8")
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{base64_img}",
                    "detail": "low"
                }
            })
        except Exception as e:
            print(f"⚠️ Не удалось прочитать фото: {e}")

    try:
        print("🤖 Отправка запроса в GPT-4o...")
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": content}],
            max_tokens=5
        )
        reply = response.choices[0].message.content.lower()
        print(f"🧠 AI ответ: {reply}")
        return "да" in reply
    except Exception as e:
        print(f"❌ Ошибка AI-фильтрации: {e}")
        return False