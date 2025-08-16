// formatCastingTemplate.js
const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔹 Маркеры отказа от модели (RU/EN)
const REFUSAL_MARKERS = [
  // англ
  "i'm sorry", "im sorry", "sorry", "i cannot", "i can't", "i wont", "i won't",
  "i am unable", "i'm unable", "unable to", "not able to", "as an ai",
  "cannot comply", "i must refuse", "policy", "cannot help", "can't help",
  // рус
  "извините", "извиняюсь", "простите", "к сожалению",
  "не могу", "не смогу", "не буду", "я не могу", "я не буду",
  "я не имею права", "не имею права", "не могу помочь", "не могу предоставить"
];

const MAX_ATTEMPTS = 10;

async function formatCastingTemplate(text = "", imagePath = null) {
  const content = [];

  // 📩 Основной текст запроса
  content.push({
    type: "text",
    text: `Ты бот, который форматирует кастинг в единый шаблон. ТОЛЬКО ШАБЛОН ЗАПОЛНЕННЫЙ ПО МАКСИМУМУ, БЕЗ ВСТУПЛЕНИЙ/ОБЪЯСНЕНИЙ/ОПРАВДАНИЙ.
Твоя задача по шагам:
— Прочитай текст сообщения.
— Если к сообщению прикреплено изображение, и на нём есть текст — тоже его учти.
— Если на изображении нет текста — просто игнорируй его.
— Игнорируй визуальную часть изображения: лица, фон и т.д, НО НЕ ТЕКСТ!

Формат шаблона:
🎨 Проект: [название/тип проекта]  
👤 Роль/Типаж: [описание роли]  
🗓 Дата съёмок: [дата]  
⏰ Время: [время]  
💰 Гонорар: [сумма]  
📍 Локация: [город/место]  
📩 Контакт: [ссылка/никнейм]  
📝 Доп. информация: [всё остальное]

Если какое-то поле не указано — ставь прочерк "-".

Вот сообщение:
${text}`
  });

  // 📷 Добавляем изображение, если есть
  if (imagePath && fs.existsSync(imagePath)) {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${base64Image}`,
        detail: "low"
      }
    });
  }

  // 🔁 Повторяем до MAX_ATTEMPTS, пока не получим корректный ответ
  let attempt = 1;
  while (attempt <= MAX_ATTEMPTS) {
    try {
      console.log(`🧠 GPT attempt #${attempt}`);
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content }],
        max_tokens: 1000
      });

      const result = (response.choices?.[0]?.message?.content || "").trim();
      const rl = result.toLowerCase();

      const refused = !result || REFUSAL_MARKERS.some(m => rl.includes(m));
      if (!refused) {
        return result;
      } else {
        console.log("⚠️ GPT дал отказ/извинение или пустой ответ. Повторяем...");
        attempt++;
      }
    } catch (err) {
      console.error("❌ Ошибка форматирования:", err.message);
      return text; // при ошибке API сразу отдаем оригинал
    }
  }

  // Если все попытки неудачны — возвращаем оригинальный текст
  return text;
}

module.exports = { formatCastingTemplate };