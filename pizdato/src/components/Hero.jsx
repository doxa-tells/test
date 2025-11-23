import React from 'react';
import { motion } from 'framer-motion';
import { Button, Badge, Card } from './Shared';
import DemoAnimation from './DemoAnimation';

const Hero = () => {
    return (
        <section className="slide" style={{ padding: '60px 0 80px', overflow: 'hidden' }}>
            <div className="wrap">
                <div className="hero-grid" style={{ display: 'grid', gap: '40px', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', alignItems: 'center' }}>

                    {/* Left Content */}
                    <div className="hero-content" style={{ zIndex: 2 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            style={{
                                color: 'var(--glow)', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '16px',
                                textTransform: 'uppercase', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            <span style={{ width: '8px', height: '8px', background: 'var(--glow)', borderRadius: '50%', boxShadow: '0 0 10px var(--glow)' }}></span>
                            Roletapp AI
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            style={{ marginBottom: '24px' }}
                        >
                            Ваш личный <br />
                            <span className="text-gradient">ИИ-кастинг агент</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            style={{ fontSize: '20px', color: 'var(--muted)', marginBottom: '32px', maxWidth: '540px' }}
                        >
                            Собирает 10/10 кастингов со всех чатов Казахстана. Фильтрует спам. Шлёт только то, что подходит именно вам.
                        </motion.p>

                        <motion.div
                            className="cta-group"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}
                        >
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <Button variant="primary" onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}>
                                    Попробовать бесплатно
                                </Button>
                                <Button variant="secondary" onClick={() => document.getElementById('how').scrollIntoView({ behavior: 'smooth' })}>
                                    Как это работает
                                </Button>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: 'var(--ok)' }}>✓</span> Пробный месяц за 30 ₸. Отмена в 1 клик.
                            </div>
                        </motion.div>

                        <div className="badges" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '40px' }}>
                            <Badge icon="⚡">Уведомления в Telegram</Badge>
                            <Badge icon="🎯">Точность подбора</Badge>
                            <Badge icon="🛡️">Без спама</Badge>
                        </div>
                    </div>

                    {/* Right Visual */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}
                    >
                        {/* Background Glow */}
                        <div style={{
                            position: 'absolute', inset: '-20%', background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
                            zIndex: -1, filter: 'blur(60px)'
                        }} />

                        <DemoAnimation />
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default Hero;
