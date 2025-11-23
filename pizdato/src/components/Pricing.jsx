import React from 'react';
import { motion } from 'framer-motion';
import { Button, Card } from './Shared';

const PricingCard = ({ title, price, afterPrice, features, isPremium, onSubscribe, delay }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
            style={{ height: '100%', position: 'relative' }}
        >
            {isPremium && (
                <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--glow)', color: '#000', padding: '4px 12px', borderRadius: '12px',
                    fontSize: '12px', fontWeight: 'bold', zIndex: 10, boxShadow: '0 4px 12px rgba(59,130,246,0.5)'
                }}>
                    РЕКОМЕНДУЕМ
                </div>
            )}

            <Card
                glass={true}
                style={{
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    border: isPremium ? '2px solid var(--glow)' : '1px solid rgba(255,255,255,0.08)',
                    background: isPremium ? 'linear-gradient(180deg, rgba(59,130,246,0.05) 0%, rgba(15,23,42,0.8) 100%)' : undefined
                }}
            >
                <h3 style={{ marginTop: 0, fontSize: '24px', color: isPremium ? '#fff' : 'var(--muted)' }}>{title}</h3>

                <div className="priceRow" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '24px 0', flexWrap: 'wrap' }}>
                    <div className="price" style={{ fontSize: '42px', fontWeight: 900, lineHeight: 1, color: '#fff' }}>{price}</div>
                    <div className="after" style={{ fontSize: '14px', color: 'var(--muted)' }}>{afterPrice}</div>
                </div>

                <div style={{ flex: 1 }}>
                    {features.map((f, i) => (
                        <div key={i} className="bullet" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', margin: '16px 0', color: '#cbd5e1' }}>
                            <span style={{ color: 'var(--ok)', flexShrink: 0 }}>✓</span>
                            <span className="t" style={{ flex: 1, fontSize: '15px' }}>{f}</span>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '32px' }}>
                    <Button
                        variant={isPremium ? 'primary' : 'secondary'}
                        style={{ width: '100%', marginBottom: '12px' }}
                        onClick={() => onSubscribe(isPremium ? 'premium' : 'pro')}
                    >
                        {isPremium ? 'Начать за 30 ₸' : 'Попробовать Стандарт'}
                    </Button>
                    <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                        {isPremium ? '30 дней пробный период. Отмена в 1 клик.' : 'Один съёмочный день окупит подписку.'}
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

const Pricing = ({ onSubscribe }) => {
    return (
        <section className="slide" id="pricing" style={{ padding: '80px 0' }}>
            <div className="wrap">
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Инвестируйте в свою <span className="text-gradient">карьеру</span></h2>
                    <p>Стоимость чашки кофе за месяц возможностей</p>
                </div>

                <div className="plans" style={{ display: 'grid', gap: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', maxWidth: '900px', margin: '0 auto' }}>
                    <PricingCard
                        title="Стандарт"
                        price="30 ₸"
                        afterPrice="/ мес (далее 3 490 ₸)"
                        features={[
                            'Все топ-кастинги РК в едином удобном шаблоне',
                            'Базовая фильтрация по профилю',
                            'Мгновенные уведомления',
                            'Отклик в 1 клик'
                        ]}
                        isPremium={false}
                        onSubscribe={onSubscribe}
                        delay={0}
                    />
                    <PricingCard
                        title="Профессионал"
                        price="30 ₸"
                        afterPrice="/ мес (далее 4 490 ₸)"
                        features={[
                            'Приоритетная фильтрация из 20+ источников',
                            'Персональная лента под ваши цели',
                            'История всех заявок',
                            'Максимальная скорость уведомлений',
                            'Приоритетная поддержка'
                        ]}
                        isPremium={true}
                        onSubscribe={onSubscribe}
                        delay={0.2}
                    />
                </div>
            </div>
        </section>
    );
};

export default Pricing;
