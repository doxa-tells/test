import React from 'react';
import { motion } from 'framer-motion';
import { Section, Headline, Subtext, Card, IconWrapper } from './Shared';
import { User } from 'lucide-react';

const TestimonialCard = ({ name, role, text, result }) => (
    <Card>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <IconWrapper icon={<User />} />
            <div>
                <div style={{ fontWeight: 600, color: '#f5f5f7' }}>{name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{role}</div>
            </div>
        </div>
        <p style={{ fontSize: '17px', fontStyle: 'italic', color: '#f5f5f7', marginBottom: 'var(--space-md)', lineHeight: 1.5, flex: '1 1 auto' }}>
            "{text}"
        </p>
        <div style={{
            padding: 'var(--space-sm)',
            background: 'rgba(48, 209, 88, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(48, 209, 88, 0.2)',
            flex: '0 0 auto'
        }}>
            <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                Результат:
            </div>
            <div style={{ fontSize: '15px', color: '#f5f5f7' }}>{result}</div>
        </div>
    </Card>
);

const Testimonials = () => {
    const reviews = [
        {
            name: 'Алина К.',
            role: 'Начинающая актриса',
            text: 'Раньше я тратила по 2 часа в день на просмотр чатов. Теперь просто жду уведомления.',
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
            text: 'Сначала сомневался, но 30 тенге не деньги. Окупилось в 100 раз.',
            result: 'Стабильный поток предложений каждую неделю'
        }
    ];

    return (
        <Section>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                <Headline size="medium" className="mb-md">
                    Истории успеха
                </Headline>
                <Subtext>Наши пользователи уже снимаются. А вы?</Subtext>
            </div>
            <div className="grid grid-2">
                {reviews.map((review, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <TestimonialCard {...review} />
                    </motion.div>
                ))}
            </div>
        </Section>
    );
};

export default Testimonials;
