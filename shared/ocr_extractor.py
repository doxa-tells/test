from PIL import Image
import pytesseract

def extract_text_from_image(image_path):
    try:
        text = pytesseract.image_to_string(Image.open(image_path), lang='rus+eng')
        return text.strip()
    except Exception as e:
        print(f"❌ Ошибка OCR: {e}")
        return ''