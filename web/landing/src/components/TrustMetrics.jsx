import React from 'react';
import { motion } from 'framer-motion';
import { Section } from './Shared';

const TrustMetrics = () => {
    const metrics = [
        { value: '10k+', label: 'Кастингов найдено' },
        { value: '500+', label: 'Активных актеров' },
        { value: '48ч', label: 'Среднее время отклика' }
    ];

    return (
        <Section compact>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-lg)',
                textAlign: 'center',
                padding: 'var(--space-lg) 0',
                borderTop: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)'
            }}>
                {metrics.map((metric, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <div className="text-gradient" style={{
                            fontSize: 'clamp(40px, 5vw, 56px)',
                            fontWeight: 800,
                            lineHeight: 1,
                            marginBottom: '8px'
                        }}>
                            {metric.value}
                        </div>
                        <div style={{
                            fontSize: '15px',
                            color: 'var(--text-secondary)',
                            fontWeight: 500
                        }}>
                            {metric.label}
                        </div>
                    </motion.div>
                ))}
            </div>
        </Section>
    );
};

export default TrustMetrics;
