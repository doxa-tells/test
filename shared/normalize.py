import regex as re  # 👈 используем модуль regex вместо re


def normalize(text: str) -> str:
    if not text:
        return ''

    text = text.lower()
    text = re.sub(r'@[a-z0-9_]+', '', text)
    text = re.sub(r'[^\p{L}\p{N}\s]+', '', text)  # Unicode-буквы и цифры
    text = re.sub(r'\d+', '#', text)
    text = re.sub(r'\s+', ' ', text)

    return text.strip()