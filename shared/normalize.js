function normalize(text = '') {
    return text
        .toLowerCase() // всё в нижний регистр
        .replace(/@[a-z0-9_]+/gi, '') // убираем теги вроде @aidana
        .replace(/[^\p{L}\p{N}\s]+/gu, '') // убираем спецсимволы (кроме букв и цифр)
        .replace(/\d+/g, '#') // заменяем числа на #
        .replace(/\s+/g, ' ') // убираем лишние пробелы
        .trim();
}

module.exports = { normalize };