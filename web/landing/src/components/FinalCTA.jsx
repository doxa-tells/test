import React from 'react';
import { motion } from 'framer-motion';
import { Section, Headline, Subtext, Button } from './Shared';
import { Sparkles, Zap, Shield } from 'lucide-react';

const FinalCTA = () => {
    const benefits = [
        { icon: <Zap />, text: 'Первый месяц всего 30 ₸' },
        { icon: <Shield />, text: '30 дней гарантии возврата' },
        { icon: <Sparkles />, text: 'Отмена в один клик' }
    ];

    return (
        <Section>
            <div style={{
                textAlign: 'center',
                maxWidth: '900px',
                margin: '0 auto',
                background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.1) 0%, rgba(0, 163, 255, 0.05) 100%)',
                padding: 'var(--space-2xl) var(--space-lg)',
                borderRadius: 'var(--card-radius)',
                border: '1px solid rgba(0, 113, 227, 0.2)'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <Headline size="medium" className="mb-md">
                        Ваша карьера начинается <span className="text-gradient">здесь</span>
                    </Headline>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                >
                    <Subtext className="mb-lg" style={{ fontSize: '21px' }}>
                        Хватит ждать удачного случая.<br />
                        Пора получать роли, которые вы заслуживаете.
                    </Subtext>
                </motion.div>

                {/* Benefits Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 'var(--space-md)',
                        marginBottom: 'var(--space-lg)'
                    }}
                >
                    {benefits.map((benefit, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0, 113, 227, 0.15)',
                                borderRadius: '12px'
                            }}>
                                {React.cloneElement(benefit.icon, { size: 24, color: '#0071e3' })}
                            </div>
                            <span style={{ fontSize: '15px', color: '#f5f5f7', fontWeight: 500 }}>{benefit.text}</span>
                        </div>
                    ))}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                >
                    <Button
                        variant="primary"
                        size="large"
                        style={{ padding: '20px 48px', fontSize: '19px' }}
                        onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        Начать прямо сейчас
                    </Button>
                </motion.div>
            </div>
        </Section>
    );
};

export default FinalCTA;
