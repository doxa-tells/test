import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Card } from './Shared';

const Counter = ({ value, label, suffix = '' }) => {
    return (
        <div style={{ textAlign: 'center' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, type: "spring" }}
                className="text-gradient"
                style={{ fontSize: '48px', fontWeight: 900, lineHeight: 1, marginBottom: '8px' }}
            >
                {value}{suffix}
            </motion.div>
            <div style={{ color: 'var(--muted)', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </div>
        </div>
    );
};

const TrustMetrics = () => {
    return (
        <section style={{ padding: '40px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
            <div className="wrap">
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: '40px' }}>
                    <Counter value="10k" suffix="+" label="Кастингов найдено" />
                    <Counter value="500" suffix="+" label="Активных актеров" />
                    <Counter value="48" suffix="ч" label="Среднее время отклика" />
                </div>
            </div>
        </section>
    );
};

export default TrustMetrics;
