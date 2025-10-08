// Мини-аппа "Откликнуться по e-mail"
(function () {
  const tg = window.Telegram && window.Telegram.WebApp;

  // 1) Инициализация WebApp UI
  if (tg) {
    tg.ready();
    try { tg.expand(); } catch {}
    // Тема
    if (tg.colorScheme === 'light') document.body.classList.add('tg-theme-light');
  }

  // 2) Утилиты
  const $ = (id) => document.getElementById(id);

  function b64urlDecode(str) {
    if (!str) return '';
    // заменить URL-символы обратно
    const pad = str.length % 4 === 2 ? '==' : str.length % 4 === 3 ? '=' : str.length % 4 === 1 ? '===' : '';
    const s = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
    try {
      return decodeURIComponent(
        Array.prototype.map.call(atob(s), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
    } catch {
      return '';
    }
  }

  function buildMailto(to, subject, body) {
    const params = [];
    if (subject) params.push('subject=' + encodeURIComponent(subject));
    if (body) params.push('body=' + encodeURIComponent(body));
    const qs = params.join('&');
    // В адресе e-mail не кодируем @ и + (клиенты понимают)
    return `mailto:${to}${qs ? '?' + qs : ''}`;
  }

  function validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
  }

  // 3) Проставляем данные из query-параметров
  const usp = new URLSearchParams(location.search);
  const to = (usp.get('to') || '').trim();
  const subject = usp.get('subject') || 'Заявка на кастинг';
  const body = b64urlDecode(usp.get('body') || '');

  $('to').value = to;
  $('subject').value = subject;
  $('body').value = body;

  // 4) Кнопки
  $('btn-open').addEventListener('click', () => {
    const toV = $('to').value.trim();
    if (!validateEmail(toV)) {
      alert('Проверьте e-mail получателя.');
      return;
    }
    const mailto = buildMailto(toV, $('subject').value, $('body').value);
    // Предостережение по длине URL (mailto ограничен вебвью ~2К)
    const warn = $('warn');
    if (mailto.length > 1900) warn.hidden = false; else warn.hidden = true;

    // Пытаемся открыть почтовый клиент
    try {
      // anchor-клик более надёжный в WebView
      const a = document.createElement('a');
      a.href = mailto;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      // Фолбэк
      location.href = mailto;
    }
  });

  $('btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('body').value);
      if (tg) tg.HapticFeedback && tg.HapticFeedback.notificationOccurred('success');
      alert('Текст скопирован. Если почтовый клиент не открылся — вставьте вручную.');
    } catch {
      alert('Не удалось скопировать. Выделите текст вручную и скопируйте.');
    }
  });

  $('btn-close').addEventListener('click', () => {
    if (tg && tg.close) tg.close();
    else window.history.back();
  });
})();
