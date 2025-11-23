import React from 'react';

const Footer = ({ onCancelSubscription }) => {
    return (
        <footer style={{
            borderTop: '1px solid var(--border)',
            padding: 'var(--space-xl) 0',
            background: 'var(--bg)'
        }}>
            <div className="container">
                <div style={{
                    display: 'grid',
                    gap: 'var(--space-md)',
                    fontSize: '15px',
                    color: 'var(--text-secondary)'
                }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', justifyContent: 'center' }}>
                        <a href="https://roletapp.kz/oferta" target="_blank" rel="noopener" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }}>
                            Публичная оферта
                        </a>
                        <span>·</span>
                        <a href="https://roletapp.kz/privacy" target="_blank" rel="noopener" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }}>
                            Политика конфиденциальности
                        </a>
                        <span>·</span>
                        <a href="mailto:telmanov.darkhan@gmail.com" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }}>
                            Поддержка
                        </a>
                        <span>·</span>
                        <button
                            onClick={onCancelSubscription}
                            style={{
                                background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)',
                                font: 'inherit', cursor: 'pointer', transition: 'color 0.2s'
                            }}
                        >
                            Отменить подписку
                        </button>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '13px' }}>
                        <div><strong>ИП Телманов Дархан</strong> — ИИН 041124500027</div>
                        <div>Казахстан, г. Астана, ул. 117, 41</div>
                        <div style={{ marginTop: 'var(--space-sm)' }}>
                            © 2024 Caster AI. Все права защищены.
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
