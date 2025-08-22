import json
import os
import fcntl
from difflib import SequenceMatcher
from shared.normalize import normalize

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'shared', 'seen_castings_texts.json')
SIMILARITY_THRESHOLD = 0.90

def is_duplicate_casting(text='', ocr_text=''):
    normalized_text = normalize(text or '')
    normalized_ocr = normalize(ocr_text or '')
    combined_normalized = normalized_text + ' | ' + normalized_ocr

    # Убедимся, что файл существует
    if not os.path.exists(DB_PATH):
        with open(DB_PATH, 'w', encoding='utf-8') as f:
            json.dump([], f)

    with open(DB_PATH, 'r+', encoding='utf-8') as db_file:
        try:
            fcntl.flock(db_file, fcntl.LOCK_EX)

            try:
                seen = json.load(db_file)
            except json.JSONDecodeError:
                print("⚠️ Повреждён JSON. Начинаем с пустого списка.")
                seen = []

            # 1️⃣ Прямая проверка
            if combined_normalized in seen:
                print("🔁 Найден дубликат (точное совпадение)")
                return True

            # 2️⃣ Fuzzy проверка
            for entry in seen:
                ratio = SequenceMatcher(None, entry, combined_normalized).ratio()
                if ratio >= SIMILARITY_THRESHOLD:
                    print(f"⚠️ Fuzzy дубликат найден: совпадение {round(ratio * 100)}%")
                    return True

            # 💾 Добавление
            seen.append(combined_normalized)
            db_file.seek(0)
            db_file.truncate()
            json.dump(seen[-20:], db_file, ensure_ascii=False, indent=2)

        finally:
            fcntl.flock(db_file, fcntl.LOCK_UN)

    return False