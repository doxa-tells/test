import React from 'react';
import { motion } from 'framer-motion';
import { Section, Headline, Subtext } from './Shared';
import { X, Check } from 'lucide-react';

const Comparison = () => {
    const before = [
        'Часы скроллинга в 20+ чатах',
        'Пропущенные кастинги из-за шума',
        'Спам, реклама и дубли',
        'Медленная реакция на объявления'
    ];

    const after = [
        'Кастинги сами приходят в ЛС',
        'Ни одного пропущенного объявления',
        'Только релевантные предложения',
        'Мгновенный отклик в 1 клик'
    ];

    return (
        <Section id="impact">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                <Headline size="medium" className="mb-md">
                    Почему выбирают <span className="text-gradient">Caster AI</span>
                </Headline>
                <Subtext>Разница, которую вы почувствуете с первого дня</Subtext>
            </div>

            <div className="grid grid-2">
                {/* Before */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="card"
                    style={{
                        background: 'rgba(255, 50, 50, 0.05)',
                        borderColor: 'rgba(255, 50, 50, 0.2)'
                    }}
                >
                    <h3 style={{ color: '#ff6b6b', marginBottom: 'var(--space-md)', fontSize: '24px' }}>
                        Без агента
                    </h3>
                    <ul style={{ listStyle: 'none', display: 'grid', gap: 'var(--space-sm)', flex: '1 1 auto' }}>
                        {before.map((item, i) => (
                            <li key={i} style={{ display: 'flex', gap: '12px', fontSize: '17px', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                                <X size={20} color="#ff6b6b" style={{ flexShrink: 0, marginTop: '2px' }} />
                                {item}
                            </li>
                        ))}
                    </ul>
                </motion.div>

                {/* After */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="card"
                    style={{
                        background: 'rgba(0, 113, 227, 0.05)',
                        borderColor: 'rgba(0, 113, 227, 0.3)'
                    }}
                >
                    <h3 className="text-gradient" style={{ marginBottom: 'var(--space-md)', fontSize: '24px' }}>
                        С Caster AI
                    </h3>
                    <ul style={{ listStyle: 'none', display: 'grid', gap: 'var(--space-sm)', flex: '1 1 auto' }}>
                        {after.map((item, i) => (
                            <li key={i} style={{ display: 'flex', gap: '12px', fontSize: '17px', color: '#f5f5f7', fontWeight: 500, alignItems: 'flex-start' }}>
                                <Check size={20} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                {item}
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>
        </Section>
    );
};

export default Comparison;
