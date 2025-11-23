import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Section, Headline, Subtext, Card } from './Shared';
import { ChevronDown } from 'lucide-react';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Card style={{ marginBottom: 'var(--space-sm)', cursor: 'pointer' }} onClick={() => setIsOpen(!isOpen)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isOpen ? 'var(--space-sm)' : 0 }}>
                <h4 style={{ fontSize: '19px', fontWeight: 600 }}>{question}</h4>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ flexShrink: 0, marginLeft: 'var(--space-sm)' }}
                >
                    <ChevronDown size={20} color="var(--text-secondary)" />
                </motion.div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.6, margin: 0 }}>
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
};

const FAQ = () => {
    const faqs = [
        { q: 'Почему так дешево (30 ₸)?', a: 'Мы уверены в качестве нашего продукта. Эта символическая цена позволяет вам попробовать сервис без риска и убедиться в его пользе.' },
        { q: 'Откуда гарантия, что это не спам?', a: 'Наш ИИ обучен фильтровать 95% рекламного шума и дублей. Мы мониторим только проверенные источники.' },
        { q: 'Смогу ли я отменить подписку?', a: 'Да, конечно. Вы можете отменить подписку в любой момент в один клик. Никаких скрытых условий.' },
        { q: 'На каких кастингах вы работаете?', a: 'Мы охватываем весь рынок Казахстана: кино, сериалы, рекламные ролики, музыкальные клипы и UGC-контент.' },
        { q: 'Что если кастинг опубликован только картинкой?', a: 'Наша технология OCR считывает текст даже с фотографий, так что вы не пропустите ни одного объявления.' }
    ];

    return (
        <Section id="faq" compact>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                    <Headline size="medium" className="mb-md">
                        Частые вопросы
                    </Headline>
                    <Subtext>Всё, что нужно знать перед стартом</Subtext>
                </div>

                <div>
                    {faqs.map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <FAQItem question={item.q} answer={item.a} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
};

export default FAQ;
