import React from 'react';

const Footer = ({ onCancelSubscription }) => {
    return (
        <footer className="site-footer" style={{ paddingBottom: '110px' }}>
            <div className="wrap">
                <div style={{ margin: '16px 0 24px', padding: '14px', background: '#0f1737d8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', boxShadow: '0 10px 22px rgba(0,0,0,0.25)' }}>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', color: '#cfe0ff', marginBottom: '10px' }}>
                        <a href="https://roletapp.kz/oferta" target="_blank" rel="noopener" style={{ textDecoration: 'none', borderBottom: '1px dashed rgba(255,255,255,0.35)' }}>Публичная оферта</a>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <a href="https://roletapp.kz/privacy" target="_blank" rel="noopener" style={{ textDecoration: 'none', borderBottom: '1px dashed rgba(255,255,255,0.35)' }}>Политика конфиденциальности</a>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <a href="mailto:telmanov.darkhan@gmail.com" style={{ textDecoration: 'none', borderBottom: '1px dashed rgba(255,255,255,0.35)' }}>Контакты поддержки</a>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <button
                            onClick={onCancelSubscription}
                            style={{
                                background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer',
                                textDecoration: 'none', borderBottom: '1px dashed rgba(255,255,255,0.35)', fontWeight: 600, transition: 'opacity .2s ease'
                            }}
                        >
                            Отменить подписку
                        </button>
                    </div>

                    <div style={{ fontSize: '12px', color: '#9bb0e0', lineHeight: 1.5 }}>
                        <div><strong>ИП Телманов Дархан</strong> — ИИН 041124500027</div>
                        <div>Юридический адрес: Казахстан, г. Астана, ул. 117, 41</div>
                        <div>Поддержка: Пн–Пт 10:00–18:00 (Астана, GMT+6) · E-mail: <a href="mailto:telmanov.darkhan@gmail.com" style={{ color: 'inherit' }}>telmanov.darkhan@gmail.com</a></div>
                    </div>

                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#9bb0e0' }}>
                        © Roletapp AI. Все права защищены.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
