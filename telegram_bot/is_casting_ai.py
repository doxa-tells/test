import base64
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()  # загружает переменные из .env

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Инициализация клиента
openai_client = OpenAI()

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