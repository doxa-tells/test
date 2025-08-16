// isCastingAI.js
const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function isCastingAI(text = "", imagePath = null) {
  const content = [];

  content.push({
    type: "text",
    text: `Ты анализируешь текст и изображение, чтобы определить, является ли это сообщение **объявлением кастинга**.

1. **Сначала** прочитай текст сообщения.
2. Затем, **если на изображении есть текст — учти его.** Визуальные элементы (лица, эмоции, фон) **игнорируй полностью.**
3. Если в тексте (или на фото с текстом) есть **минимум 2 из 5 пунктов**:
— проект/тип съёмки,
— типаж/роль,
— дата съёмки,
— локация,
— контакт для связи —
ТО это настоящий кастинг.

Если условий нет — ответь: "нет".  
Если всё подходит — ответь: "да".  
Только одно слово: "да" или "нет".

Вот сообщение:
${text}`
  });

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

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content }],
      max_tokens: 10
    });

    const answer = response.choices[0].message.content.trim().toLowerCase();
    return answer.startsWith("да");
  } catch (err) {
    console.error("❌ Ошибка в isCastingAI:", err.message);
    return false;
  }
}

module.exports = { isCastingAI };