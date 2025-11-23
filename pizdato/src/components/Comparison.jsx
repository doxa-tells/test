import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './Shared';

const Comparison = () => {
    return (
        <section className="slide" id="impact" style={{ padding: '80px 0' }}>
            <div className="wrap">
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Почему выбирают <span className="text-gradient">Roletapp</span></h2>
                    <p>Разница, которую вы почувствуете с первого дня</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    {/* Before */}
                    <Card style={{ padding: '32px', background: 'rgba(255, 50, 50, 0.03)', borderColor: 'rgba(255, 50, 50, 0.1)' }}>
                        <h3 style={{ color: '#f87171', marginBottom: '24px', fontSize: '24px' }}>Без агента</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '16px' }}>
                            {[
                                'Часы скроллинга в 20+ чатах',
                                'Пропущенные кастинги из-за шума',
                                'Спам, реклама и дубли',
                                'Медленная реакция на объявления',
                                'Хаос в переписках'
                            ].map((item, i) => (
                                <li key={i} style={{ display: 'flex', gap: '12px', color: 'var(--muted)' }}>
                                    <span style={{ color: '#f87171' }}>✕</span> {item}
                                </li>
                            ))}
                        </ul>
                    </Card>

                    {/* After */}
                    <Card glass={true} style={{ padding: '32px', border: '1px solid var(--glow)', boxShadow: 'var(--shadow-glow)' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '24px' }} className="text-gradient">С Roletapp AI</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '16px' }}>
                            {[
                                'Кастинги сами приходят в ЛС',
                                'Ни одного пропущенного объявления',
                                'Только релевантные предложения',
                                'Мгновенный отклик в 1 клик',
                                'Полный порядок и история заявок'
                            ].map((item, i) => (
                                <li key={i} style={{ display: 'flex', gap: '12px', color: '#fff', fontWeight: 500 }}>
                                    <span style={{ color: 'var(--ok)' }}>✓</span> {item}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
        </section>
    );
};

export default Comparison;
