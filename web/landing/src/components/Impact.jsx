import React from 'react';
import { motion } from 'framer-motion';

const Impact = () => {
    const items = [
        { emoji: '⏱️', text: 'не тратят время на поиск кастингов — они приходят сами' },
        { emoji: '🔔', text: 'не пропускают ни один кастинг' },
        { emoji: '⚡', text: 'быстрее откликаются других' },
        { emoji: '🎬', text: 'получают больше ролей' },
        { emoji: '💸', text: 'зарабатывают больше денег' },
        { emoji: '🧹', text: 'не сидят в 20-ти разных WA/TG чатах, а только в 1' },
    ];

    return (
        <section className="slide" id="impact">
            <div className="wrap">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="hiCard"
                    style={{
                        background: 'linear-gradient(180deg,#142a66,#0c1f4a)',
                        border: '1px solid rgba(122,168,255,0.35)',
                        boxShadow: '0 10px 40px rgba(122,168,255,0.22), 0 20px 60px rgba(97,228,181,0.15), inset 0 0 0 1px rgba(255,255,255,0.06)',
                        borderRadius: '16px',
                        padding: '24px'
                    }}
                >
                    <h2 className="hiTitle" style={{ margin: '0 0 20px', fontSize: '24px', lineHeight: 1.2, fontWeight: 900, color: '#eaf2ff', letterSpacing: '0.2px', textShadow: '0 1px 0 rgba(10,20,40,0.4)' }}>
                        Актёры/Модели с ИИ-кастинг-агентом:
                    </h2>
                    <div className="emojiList" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {items.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="emojiItem"
                                style={{
                                    display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '12px 14px'
                                }}
                            >
                                <div className="emoji" style={{ fontSize: '30px', lineHeight: 1 }}>{item.emoji}</div>
                                <div className="emojiText" style={{ color: '#dbe6ff', fontWeight: 600 }}>{item.text}</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Impact;
