import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './Shared';

const Benefits = () => {
    const benefits = [
        { title: 'Все кастинги в одном месте', text: 'ИИ мониторит 20+ источников 24/7. Вы больше никогда не упустите роль мечты.' },
        { title: 'Читает текст с фото', text: 'Даже если кастинг опубликован картинкой, наш ИИ распознает его и пришлет вам.' },
        { title: 'Идеальный порядок', text: 'Все объявления приходят в едином, удобном формате. Никакого визуального шума.' },
        { title: 'Персональный фильтр', text: 'Вы получаете только то, что подходит под ваш типаж, возраст и навыки.' },
        { title: 'Без мусора', text: 'Мы удаляем 95% спама, рекламы и повторов. Только чистые кастинги.' },
        { title: 'Скорость решает', text: 'Отправляйте заявку первым. В киноиндустрии это часто решает судьбу роли.' },
    ];

    return (
        <section className="slide" id="how" style={{ padding: '80px 0' }}>
            <div className="wrap">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    style={{ textAlign: 'center', marginBottom: '60px' }}
                >
                    <h2 style={{ marginBottom: '16px' }}>Технологии на службе <span className="text-gradient">вашей карьеры</span></h2>
                    <p>Мы автоматизировали рутину, чтобы вы занимались творчеством</p>
                </motion.div>

                <div className="grid" style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    {benefits.map((b, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="tile" style={{ height: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h3 style={{ fontSize: '20px' }}>{b.title}</h3>
                                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '15px' }}>{b.text}</p>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Benefits;
