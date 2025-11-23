import React from 'react';
import { motion } from 'framer-motion';
import { Section, Headline, Subtext, Feature } from './Shared';
import { Target, Image, Sparkles, User, Shield, Zap } from 'lucide-react';

const Benefits = () => {
    const features = [
        {
            icon: <Target />,
            title: 'Все кастинги в одном месте',
            description: 'ИИ мониторит 20+ источников 24/7. Вы больше никогда не упустите роль мечты.'
        },
        {
            icon: <Image />,
            title: 'Читает текст с фото',
            description: 'Даже если кастинг опубликован картинкой, наш ИИ распознает его и пришлет вам.'
        },
        {
            icon: <Sparkles />,
            title: 'Идеальный порядок',
            description: 'Все объявления приходят в едином, удобном формате. Никакого визуального шума.'
        },
        {
            icon: <User />,
            title: 'Персональный фильтр',
            description: 'Вы получаете только то, что подходит под ваш типаж, возраст и навыки.'
        },
        {
            icon: <Shield />,
            title: 'Без мусора',
            description: 'Мы удаляем 95% спама, рекламы и повторов. Только чистые кастинги.'
        },
        {
            icon: <Zap />,
            title: 'Скорость решает',
            description: 'Отправляйте заявку первым. В киноиндустрии это часто решает судьбу роли.'
        }
    ];

    return (
        <Section id="how">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                <Headline size="medium" className="mb-md">
                    Технологии на службе <span className="text-gradient">вашей карьеры</span>
                </Headline>
                <Subtext>Мы автоматизировали рутину, чтобы вы занимались творчеством</Subtext>
            </div>

            <div className="grid grid-3">
                {features.map((feature, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Feature {...feature} />
                    </motion.div>
                ))}
            </div>
        </Section>
    );
};

export default Benefits;
