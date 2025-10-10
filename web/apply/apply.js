// Мини-аппа "Откликнуться по e-mail"
(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg) { try { tg.ready(); tg.expand(); } catch {} if (tg.colorScheme==='light') document.body.classList.add('tg-theme-light'); }
  const $ = (id) => document.getElementById(id);

  function b64urlDecode(str){ if(!str) return ''; const pad=str.length%4===2?'==':str.length%4===3?'=':str.length%4===1?'===':''; const s=str.replace(/-/g,'+').replace(/_/g,'/')+pad; try{ return decodeURIComponent(Array.prototype.map.call(atob(s),c=>'%' + ('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')); }catch{ return ''; } }
  function buildMailto(to,subject,body){ const p=[]; if(subject) p.push('subject='+encodeURIComponent(subject)); if(body) p.push('body='+encodeURIComponent(body)); return `mailto:${to}${p.length?'?'+p.join('&'):''}`; }
  const emailRx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isIOS = (tg && tg.platform === 'ios') || /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Заполняем из query
  const usp=new URLSearchParams(location.search);
  $('to').value=(usp.get('to')||'').trim();
  $('subject').value=usp.get('subject')||'Заявка на кастинг';
  $('body').value=b64urlDecode(usp.get('body')||'');

  const btnOpen = $('btn-open');
  const warn = $('warn');

  function refreshHref(){
    const href = buildMailto(($('to').value||'').trim(), $('subject').value, $('body').value);
    btnOpen.setAttribute('href', href);
    warn.hidden = href.length <= 1900;
  }
  ['to','subject','body'].forEach(id => $(id).addEventListener('input', refreshHref));
  refreshHref();

  btnOpen.addEventListener('click', async (e) => {
    e.preventDefault();
    const to = ($('to').value || '').trim();
    if (!emailRx.test(to)) { alert('Проверьте e-mail получателя.'); return; }

    const subject = $('subject').value;
    const body = $('body').value;
    const mailto = buildMailto(to, subject, body);

    // iOS: открываем внешнюю страничку-бридж -> Safari -> Почта
    if (isIOS) {
      const bridge = `${location.origin}/apply/bridge.html?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      try { tg?.openLink?.(bridge); } catch { location.href = bridge; }
      return;
    }

    // Остальные платформы: даём шанс обычной ссылке и дубль через location.href
    try {
      const a = document.createElement('a');
      a.href = mailto; a.style.display='none';
      document.body.appendChild(a); a.click(); a.remove();
    } catch {}
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        try { location.href = mailto; } catch {}
      }
    }, 300);

    // Финальный фоллбек: системный шаринг (адрес не добавляем в текст)
    setTimeout(async () => {
      if (document.visibilityState === 'visible' && navigator.share) {
        try { await navigator.share({ title: subject || 'Заявка на кастинг', text: body }); } catch {}
      }
    }, 700);
  });

  $('btn-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('body').value); tg?.HapticFeedback?.notificationOccurred('success'); alert('Текст скопирован. Если почтовый клиент не открылся — вставьте вручную.'); }
    catch { alert('Не удалось скопировать. Выделите текст и скопируйте.'); }
  });

  $('btn-close').addEventListener('click', () => { if (tg?.close) tg.close(); else history.back(); });
})();
