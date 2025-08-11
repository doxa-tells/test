const Tesseract = require('tesseract.js');

async function extractTextFromImage(imagePath) {
    try {
        const { data: { text } } = await Tesseract.recognize(imagePath, 'rus+eng');
        return text.trim();
    } catch (err) {
        console.error("❌ OCR ошибка:", err.message);
        return '';
    }
}

module.exports = { extractTextFromImage };