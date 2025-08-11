const { Client, LocalAuth } = require('whatsapp-web.js');
const { isCastingAI } = require('./isCastingAI');
const { formatCastingTemplate } = require('./formatCastingTemplate');
const { extractTextFromImage } = require('../shared/ocr_extractor');
const { isDuplicateCasting } = require('../shared/isDuplicateCasting');

const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data'); // 👈 для sendPhoto
require('dotenv').config();

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// 📸 QR для входа
client.on('qr', (qr) => {
  console.log('📱 Отсканируй QR-код для входа в WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// ✅ Бот готов
client.on('ready', () => {
  console.log('✅ WhatsApp Client is ready!');
});

// 📩 Обработка сообщений
client.on('message', async (message) => {
  const chat = await message.getChat();
  const contact = await message.getContact();

  if (!chat.isGroup) return;

  console.log(`\n📅 Новое сообщение из: ${chat.name}`);
  console.log(`👤 От: ${contact.pushname || contact.number}`);
  console.log(`📝 Сообщение: ${message.body || '[Медиа]'}`);

  let text = message.body || '';
  let imagePath = null;

  // 📷 Обнаружено фото, загружаем...
  if (message.hasMedia) {
    const media = await message.downloadMedia();
    if (media && media.mimetype.startsWith("image/")) {
      const buffer = Buffer.from(media.data, "base64");
      const fileName = `temp_${Date.now()}.jpg`;
      const filePath = path.join(__dirname, fileName);
      fs.writeFileSync(filePath, buffer);
      imagePath = filePath;
      console.log(`⬇️ Скачано: ${fileName}`);
    }
  }

  // 🤖 Отправка запроса в GPT-4o...
  const isCasting = await isCastingAI(text, imagePath);
  console.log("🧠 AI ответ:", isCasting ? 'да' : 'нет');

  if (!isCasting) {
    console.log("❌ Не кастинг. Пропускаем.");
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    return;
  }

  console.log("✅ Кастинг подтверждён");

  // 🧾 OCR + проверка на дубликат
  const ocrText = imagePath ? await extractTextFromImage(imagePath) : '';
  if (await isDuplicateCasting(text, ocrText)) {
    console.log("🔁 Кастинг уже был. Пропускаем.");
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    return;
  }

  // 🔁 Попытка форматирования #1
  const formatted = await formatCastingTemplate(text, imagePath);

  // 🏷️ Цитата-источник (HTML)
  const sourceQuote = `<blockquote>Источник (WhatsApp): ${escapeHtml(chat.name)}</blockquote>`;
  const finalMessage = `${formatted}\n\n${sourceQuote}`;

  // 🖼️ Триггеры “фото важно” — ВАРИАНТ Б (без регекса)
  const hay = `${text} ${ocrText}`.toLowerCase();
  const triggers = [
    'как на фото', 'на фото', 'как на картинке', 'на картинке', 'как на изображении',
    'см фото', 'см. фото', 'смотри фото', 'см картинку', 'см. картинку', 'смотри картинку',
    'like the photo', 'as in the photo', 'see photo'
  ];
  const shouldSendPhoto = !!imagePath && triggers.some(t => hay.includes(t));

  console.log("📤 Шаблон отправлен. Статус: отправка...");

  try {
    if (shouldSendPhoto && fs.existsSync(imagePath)) {
      // Отправляем фото в Telegram с подписью
      const form = new FormData();
      form.append('chat_id', process.env.DESTINATION_CHAT_ID);
      form.append('message_thread_id', parseInt(process.env.DESTINATION_THREAD_ID));
      form.append('caption', finalMessage);
      form.append('parse_mode', 'HTML');
      form.append('photo', fs.createReadStream(imagePath));

      const tgResponse = await axios.post(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`,
        form,
        { headers: form.getHeaders() }
      );
      console.log("📬 Фото+шаблон отправлены в Telegram:", tgResponse.status);
    } else {
      // Отправляем обычным текстом
      const payload = {
        chat_id: process.env.DESTINATION_CHAT_ID,
        message_thread_id: parseInt(process.env.DESTINATION_THREAD_ID),
        text: finalMessage,
        parse_mode: 'HTML'
      };

      const tgResponse = await axios.post(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
        payload
      );
      console.log("📬 Текст отправлен в Telegram:", tgResponse.status);
    }
  } catch (err) {
    console.error("❌ Ошибка при отправке:", err.message);
  }

  if (imagePath && fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
});

client.initialize();