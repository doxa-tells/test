import React, { useState, useEffect } from 'react';
import { Button } from './Shared';

const StickyBar = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > 800);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--border)',
            padding: 'var(--space-sm)',
            transform: visible ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.3s cubic-bezier(0.28, 0.11, 0.32, 1)'
        }}>
            <div className="container" style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
                <Button
                    variant="dark"
                    onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
                >
                    Почему это работает
                </Button>
                <Button
                    variant="primary"
                    onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                >
                    Попробовать
                </Button>
            </div>
        </div>
    );
};

export default StickyBar;
