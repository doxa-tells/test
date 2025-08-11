import base64
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()  # загружает переменные из .env

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 🔹 Маркеры отказа
REFUSAL_MARKERS = [
    # англ.
    "i'm sorry", "im sorry", "sorry", "i cannot", "i can't", "i wont", "i won't",
    "i am unable", "i'm unable", "unable to", "not able to", "as an ai", "i am an ai",
    "i cannot help", "can't help", "i cannot provide", "i can't provide",
    "this content is not allowed", "cannot comply", "i must refuse",
    # рус.
    "извините", "извиняюсь", "простите", "к сожалению",
    "не могу", "не смогу", "не буду", "я не могу", "я не буду",
    "я не имею права", "не имею права", "не могу помочь", "не могу предоставить",
]
MAX_ATTEMPTS = 10


async def format_casting_template(text, image_path=None):
    base_content = [
        {
            "type": "text",
            "text": f"""Ты бот, который форматирует кастинг в единый шаблон. 
ТОЛЬКО ШАБЛОН, БЕЗ вступлений, объяснений или оправданий.
Твоя задача по шагам:
— Прочитать текст сообщения.
— Если к сообщению прикреплено изображение, и на нём есть текст — учти его.
— Если на изображении нет текста — игнорируй.
— Игнорируй визуальную часть изображения: лица, фон и т.д., НО НЕ ТЕКСТ!

Формат шаблона:
🎨 Проект: [название/тип проекта]  
👤 Роль/Типаж: [описание роли]  
🗓 Дата съёмок: [дата]  
⏰ Время: [время]  
💰 Гонорар: [сумма]  
📍 Локация: [город/место]  
📬 Контакт: [ссылка/никнейм]  
📝 Доп. информация: [всё остальное]

Если какое-то поле не указано — ставь прочерк "-".

Вот сообщение:
{text}
"""
        }
    ]

    if image_path:
        try:
            with open(image_path, "rb") as img:
                base64_img = base64.b64encode(img.read()).decode("utf-8")
            base_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{base64_img}",
                    "detail": "low"
                }
            })
        except Exception as e:
            print(f"⚠️ Не удалось прикрепить изображение к шаблонизации: {e}")

    attempt = 1
    while attempt <= MAX_ATTEMPTS:
        try:
            print(f"🔁 Попытка форматирования #{attempt}")
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": base_content}],
                max_tokens=1000
            )
            result = response.choices[0].message.content.strip()
            rl = result.lower()

            if result and not any(marker in rl for marker in REFUSAL_MARKERS):
                return result
            else:
                print("⚠️ Получен отказ/извинение или пустой ответ. Повторяем...")
                attempt += 1

        except Exception as e:
            print(f"❌ Ошибка шаблонизации: {e}")
            return text

    # Если за MAX_ATTEMPTS GPT так и не дал валидный ответ — возвращаем оригинал
    return text