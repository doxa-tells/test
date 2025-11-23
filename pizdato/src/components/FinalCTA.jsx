import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './Shared';

const FinalCTA = () => {
    return (
        <section style={{ padding: '100px 0', position: 'relative', overflow: 'hidden' }}>
            {/* Background Glow */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                zIndex: -1, filter: 'blur(80px)'
            }} />

            <div className="wrap" style={{ textAlign: 'center', maxWidth: '700px' }}>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    style={{ fontSize: 'clamp(32px, 5vw, 48px)', marginBottom: '24px' }}
                >
                    Ваша карьера начинается <span className="text-gradient">здесь</span>
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    style={{ fontSize: '20px', color: 'var(--muted)', marginBottom: '40px' }}
                >
                    Хватит ждать удачного случая. Пора получать роли, которые вы заслуживаете.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                >
                    <Button
                        variant="primary"
                        style={{ padding: '20px 40px', fontSize: '18px', borderRadius: '20px' }}
                        onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                    >
                        Получить доступ за 30 ₸
                    </Button>
                    <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--muted)' }}>
                        30 дней гарантии возврата средств
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default FinalCTA;
