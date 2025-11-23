import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Shared';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Card className="faq-item" style={{ marginBottom: '16px', padding: 0, overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%', textAlign: 'left', padding: '20px', background: 'none', border: 'none',
                    color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                }}
            >
                <span style={{ fontWeight: 700, fontSize: '16px', paddingRight: '16px' }}>{question}</span>
                {isOpen ? <ChevronUp size={20} color="var(--muted)" /> : <ChevronDown size={20} color="var(--muted)" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '0 20px 20px', color: 'var(--muted)', lineHeight: 1.6, fontSize: '15px' }}>
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
};

const FAQ = () => {
    const faqs = [
        { q: 'Почему так дешево (30 ₸)?', a: 'Мы уверены в качестве нашего продукта. Эта символическая цена позволяет вам попробовать сервис без риска и убедиться в его пользе, прежде чем переходить на полную подписку.' },
        { q: 'Откуда гарантия, что это не спам?', a: 'Наш ИИ обучен фильтровать 95% рекламного шума и дублей. Мы мониторим только проверенные источники и модерируем поток объявлений.' },
        { q: 'Смогу ли я отменить подписку?', a: 'Да, конечно. Вы можете отменить подписку в любой момент в один клик через личный кабинет или ссылку в футере. Никаких скрытых условий.' },
        { q: 'На каких кастингах вы работаете?', a: 'Мы охватываем весь рынок Казахстана: кино, сериалы, рекламные ролики, музыкальные клипы и UGC-контент.' },
        { q: 'Что если кастинг опубликован только картинкой?', a: 'Наша технология OCR (оптическое распознавание символов) считывает текст даже с фотографий и скриншотов, так что вы не пропустите ни одного объявления.' },
    ];

    return (
        <section className="slide" id="faq" style={{ padding: '80px 0' }}>
            <div className="wrap" style={{ maxWidth: '800px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Частые вопросы</h2>
                    <p>Всё, что нужно знать перед стартом</p>
                </div>

                <div>
                    {faqs.map((item, i) => (
                        <FAQItem key={i} question={item.q} answer={item.a} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
