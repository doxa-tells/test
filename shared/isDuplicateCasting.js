const fs = require('fs');
const path = require('path');
const lockfile = require('proper-lockfile');
const { normalize } = require('./normalize');
const fuzz = require('fuzzball');

const DB_PATH = path.join(__dirname, 'seen_castings_texts.json');
const SIMILARITY_THRESHOLD = 90;

async function isDuplicateCasting(text = '', ocrText = '') {
    const normText = normalize(text || '');
    const normOcr = normalize(ocrText || '');
    const entriesToCheck = [normText, normOcr].filter(Boolean);

    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify([]));
    }

    let release;
    try {
        // ⛓️ Ставим безопасный лок
        release = await lockfile.lock(DB_PATH, { retries: 3 });

        let seen;
        try {
            seen = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        } catch (err) {
            console.error('❌ Повреждён JSON файл дубликатов:', err.message);
            seen = [];
        }

        // 1️⃣ Прямое совпадение
        for (const entry of entriesToCheck) {
            if (seen.includes(entry)) {
                console.log("🔁 Найден точный дубликат");
                return true;
            }
        }

        // 2️⃣ Fuzzy сравнение
        for (const entry of seen) {
            for (const check of entriesToCheck) {
                const ratio = fuzz.token_set_ratio(entry, check);
                if (ratio >= SIMILARITY_THRESHOLD) {
                    console.log(`⚠️ Fuzzy дубликат найден: совпадение ${ratio}%`);
                    return true;
                }
            }
        }

        // 💾 Добавляем и сохраняем
        for (const item of entriesToCheck) {
            if (!seen.includes(item)) {
                seen.push(item);
            }
        }

        fs.writeFileSync(DB_PATH, JSON.stringify(seen.slice(-20), null, 2), 'utf-8');
        return false;

    } catch (err) {
        console.error('❌ Ошибка блокировки или обработки файла:', err.message);
        return false;

     } finally {
        if (release) {
            try {
                await release(); // правильный способ закрыть лок и удалить .lock
            } catch (err) {
                console.error("⚠️ Ошибка при снятии лока:", err.message);
            }
        }
    }
}
module.exports = { isDuplicateCasting };