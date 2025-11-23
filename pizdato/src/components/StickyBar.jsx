import React, { useState, useEffect } from 'react';
import { Button } from './Shared';

const StickyBar = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const hero = document.querySelector('.slide'); // Assuming first slide is hero
            if (hero) {
                const rect = hero.getBoundingClientRect();
                if (rect.bottom < 0) {
                    setVisible(true);
                } else {
                    setVisible(false);
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div
            className={`stickybar ${visible ? '' : 'hide'}`}
            style={{
                position: 'fixed', left: 0, right: 0, bottom: '14px', zIndex: 10,
                pointerEvents: visible ? 'auto' : 'none',
                transition: 'opacity .35s ease, transform .35s ease',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)'
            }}
        >
            <div className="inner" style={{ maxWidth: 'var(--wrap)', margin: '0 auto', padding: '0 24px' }}>
                <div className="bar" style={{
                    display: 'flex', gap: '10px', flexWrap: 'wrap',
                    background: '#0f1737d8', border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(10px)', padding: '8px', borderRadius: '14px', boxShadow: 'var(--shadow)'
                }}>
                    <Button variant="secondary" style={{ flex: '1 1 0', padding: '12px 14px', borderRadius: '10px' }} onClick={() => document.getElementById('how').scrollIntoView({ behavior: 'smooth' })}>
                        Почему это работает
                    </Button>
                    <Button variant="primary" style={{ flex: '1 1 0', padding: '12px 14px', borderRadius: '10px' }} onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}>
                        Попробовать
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default StickyBar;
