import os
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path

# Подгружаем ключ
env_path = Path(__file__).resolve().parent.parent / "telegram_bot" / ".env"
load_dotenv(dotenv_path=env_path)
openai_key = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=openai_key)

def match_profile_with_casting(casting_text, profile):
    """
    Возвращает True, если кастинг подходит под профиль.
    """
    prompt = f"""
У тебя есть кастинг и актёрский профиль. Твоя задача — определить, подходит ли данный кастинг этому человеку.

Будь гибким:
- Если в кастинге отсутствуют какие-либо требования (например, типаж, рост или телосложение), это не должно мешать подбору.
- Если параметры совпадают частично, но по сути человек мог бы подойти на роль — также считай, что подходит.

📄 Кастинг:
{casting_text}

👤 Профиль актёра:
Пол: {profile.get('sex', '-')}
Типаж: {profile.get('type', '-')}
Игровой Возраст: {profile.get('age', '-')}
Рост: {profile.get('height', '-')}
Телосложение: {profile.get('body', '-')}
Город: {profile.get('location', '-')}

Подходит ли данный кастинг этому человеку?
Ответь строго: да или нет.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Ты профессиональный кастинг-директор."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
        )

        answer = response.choices[0].message.content.strip().lower()
        print(f"🤖 Ответ GPT: {answer}")  # лог для отладки

        # Строгая проверка
        if answer.startswith("да"):
            return True
        elif answer.startswith("нет"):
            return False
        else:
            print("⚠️ Нестандартный ответ от GPT, считаем как 'нет'")
            return False

    except Exception as e:
        print(f"❌ Ошибка при сопоставлении профиля: {e}")
        return False