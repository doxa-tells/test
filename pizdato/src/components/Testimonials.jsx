import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './Shared';

const TestimonialCard = ({ name, role, text, result, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay }}
    >
        <Card style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #334155, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    👤
                </div>
                <div>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{role}</div>
                </div>
            </div>
            <p style={{ fontSize: '15px', fontStyle: 'italic', color: '#cbd5e1', flex: 1 }}>"{text}"</p>
            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '12px', color: 'var(--ok)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Результат:</div>
                <div style={{ fontSize: '14px', color: '#fff' }}>{result}</div>
            </div>
        </Card>
    </motion.div>
);

const Testimonials = () => {
    const reviews = [
        {
            name: 'Алина К.',
            role: 'Начинающая актриса',
            text: 'Раньше я тратила по 2 часа в день на просмотр чатов. Теперь просто жду уведомления. Это магия!',
            result: 'Получила роль в рекламе банка через 2 недели'
        },
        {
            name: 'Данияр С.',
            role: 'Модель',
            text: 'Очень удобно, что нет спама. Приходят только реальные кастинги под мой типаж.',
            result: '3 съемки за первый месяц использования'
        },
        {
            name: 'Мария В.',
            role: 'Актриса эпизодов',
            text: 'Скорость реакции выросла в разы. Я теперь одна из первых отправляю заявку.',
            result: 'Попала в шорт-лист сериала на ТВ'
        },
        {
            name: 'Ержан Т.',
            role: 'Актер',
            text: 'Сначала сомневался, но 30 тенге не деньги. Окупилось с первой же массовки в 100 раз.',
            result: 'Стабильный поток предложений каждую неделю'
        }
    ];

    return (
        <section className="slide" style={{ padding: '80px 0' }}>
            <div className="wrap">
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Истории успеха</h2>
                    <p>Наши пользователи уже снимаются. А вы?</p>
                </div>
                <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {reviews.map((r, i) => (
                        <TestimonialCard key={i} {...r} delay={i * 0.1} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
