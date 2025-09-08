const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const { Client, LocalAuth } = require('whatsapp-web.js');
const { isCastingAI } = require('./isCastingAI');
const { formatCastingTemplate } = require('./formatCastingTemplate');
const { extractTextFromImage } = require('../shared/ocr_extractor');
const { isDuplicateCasting } = require('../shared/isDuplicateCasting');

const qrcode = require('qrcode-terminal');
const axios = require('axios');
const FormData = require('form-data');

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

console.log("🟡 Инициализация WhatsApp клиента...");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// 🔐 QR-код
client.on('qr', (qr) => {
  console.log('📱 Отсканируй QR-код для входа в WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// 🚀 Клиент готов
client.on('ready', () => {
  console.log('✅ WhatsApp Client is ready!');
});

// ❌ Ошибки
client.on('auth_failure', msg => {
  console.error('🛑 Ошибка авторизации:', msg);
});

client.on('disconnected', reason => {
  console.warn('⚠️ Клиент отключён. Причина:', reason);
});

client.on('change_state', state => {
  console.log('🔄 Состояние клиента:', state);
});

client.on('loading_screen', percent => {
  console.log(`⏳ Загрузка: ${percent}%`);
});

// 📩 Обработка сообщений
client.on('message', async (message) => {
  try {
    const chat = await message.getChat();
    const contact = await message.getContact();

    if (!chat.isGroup) {
      console.log('🔕 Не групповое сообщение. Пропускаем.');
      return;
    }

    console.log(`\n📅 Новое сообщение из: ${chat.name}`);
    console.log(`👤 От: ${contact.pushname || contact.number}`);
    console.log(`📝 Сообщение: ${message.body || '[Медиа]'}`);

    let text = message.body || '';
    let imagePath = null;

    // 📷 Скачивание фото
    if (message.hasMedia) {
      console.log("📷 Медиа обнаружено, скачиваем...");
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

    // 🧠 AI фильтр: кастинг или нет
    console.log("🤖 GPT-фильтр: определяем кастинг...");
    const isCasting = await isCastingAI(text, imagePath);
    console.log("🧠 AI ответ:", isCasting ? 'да' : 'нет');

    if (!isCasting) {
      console.log("❌ Не кастинг. Пропускаем.");
      if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      return;
    }

    console.log("✅ Кастинг подтверждён");

    // 🧾 OCR + проверка дубликатов
    const ocrText = imagePath ? await extractTextFromImage(imagePath) : '';
    console.log("🔍 Текст из OCR:", ocrText);
    const isDup = await isDuplicateCasting(text, ocrText);
    console.log("🧿 Проверка на дубликат:", isDup ? 'уже публиковался' : 'новый');

    if (isDup) {
      console.log("🔁 Кастинг уже был. Пропускаем.");
      if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      return;
    }

    // 📄 Форматирование
    console.log("📄 Преобразуем в шаблон...");
    const formatted = await formatCastingTemplate(text, imagePath);

    // 🏷️ Источник
    const sourceQuote = `<blockquote>Источник (WhatsApp): ${escapeHtml(chat.name)}</blockquote>`;
    const finalMessage = `${formatted}\n\n${sourceQuote}`;

    // 🖼️ Фототриггеры
    const hay = `${text} ${ocrText}`.toLowerCase();
    const triggers = [
      'как на фото', 'на фото', 'как на картинке', 'на картинке', 'как на изображении',
      'см фото', 'см. фото', 'смотри фото', 'см картинку', 'см. картинку', 'смотри картинку',
      'like the photo', 'as in the photo', 'see photo'
    ];
    const shouldSendPhoto = !!imagePath && triggers.some(t => hay.includes(t));

    console.log("📤 Подготовка к отправке в Telegram...");

    // 📬 Отправка
    try {
      if (shouldSendPhoto && fs.existsSync(imagePath)) {
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
      console.error("❌ Ошибка при отправке в Telegram:", err.message);
    }

    // 🧹 Очистка
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log("🧹 Временное изображение удалено.");
    }

  } catch (e) {
    console.error("🛑 Ошибка при обработке сообщения:", e.message, e.stack);
  }
});

client.initialize() ;