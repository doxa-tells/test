import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUpNumber from './CountUpNumber';
import telegramLogo from '../../assets/logo/telegram-svgrepo-com.svg';
import whatsappLogo from '../../assets/logo/whatsapp-svgrepo-com.svg';
import instagramLogo from '../../assets/logo/instagram-1-svgrepo-com.svg';

const StatCarousel = () => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            number: 70,
            text: "Кастингов\nкаждый день",
            showIcons: false
        },
        {
            number: 44,
            text: "Источников собранных\nв одном месте",
            showIcons: true
        }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 4000); // Смена каждые 4 секунды

        return () => clearInterval(interval);
    }, []);

    const direction = currentSlide === 0 ? 1 : -1;

    return (
        <>
            {/* Пульсирующий светящийся фон */}
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                style={{
                    position: 'absolute',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(47, 239, 85, 0.3), transparent)',
                    filter: 'blur(20px)'
                }}
            />

            {/* Слайды */}
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentSlide}
                        custom={direction}
                        initial={{ y: direction > 0 ? -300 : 300, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: direction > 0 ? 300 : -300, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {/* Логотипы WhatsApp и Telegram (только для второго слайда, ВЫШЕ числа) */}
                        {slides[currentSlide].showIcons && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    duration: 0.5,
                                    delay: 0.3,
                                    type: "spring",
                                    bounce: 0.5
                                }}
                                style={{
                                    display: 'flex',
                                    gap: '16px',
                                    marginBottom: '12px',
                                    alignItems: 'center'
                                }}
                            >
                                <img
                                    src={whatsappLogo}
                                    alt="WhatsApp"
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        filter: 'drop-shadow(0 2px 8px rgba(37, 211, 102, 0.5))'
                                    }}
                                />
                                <img
                                    src={instagramLogo}
                                    alt="Instagram"
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        filter: 'drop-shadow(0 2px 8px rgba(225, 48, 108, 0.5))'
                                    }}
                                />
                                <img
                                    src={telegramLogo}
                                    alt="Telegram"
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        filter: 'drop-shadow(0 2px 8px rgba(0, 136, 204, 0.5))'
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* Анимированное число */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                duration: 0.8,
                                type: "spring",
                                bounce: 0.6,
                                delay: 0.2
                            }}
                            style={{
                                fontSize: '64px', // Уменьшили размер
                                fontWeight: '900',
                                background: 'linear-gradient(135deg, #2fef55ff, #2df5d3ff, #00f9a2ff)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                marginBottom: '12px',
                                lineHeight: '1',
                                position: 'relative',
                                filter: 'drop-shadow(0 0 6px rgba(47, 239, 85, 0.3))'
                            }}
                        >
                            <CountUpNumber target={slides[currentSlide].number} delay={300} />+
                        </motion.div>

                        {/* Описание */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.6,
                                delay: slides[currentSlide].showIcons ? 0.5 : 0.4
                            }}
                            style={{
                                fontSize: '13px',
                                background: 'linear-gradient(135deg, #2fef55ff, #2df5d3ff, #00f9a2ff)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                textAlign: 'center',
                                lineHeight: '1.5',
                                fontWeight: '800',
                                letterSpacing: '0.8px',
                                whiteSpace: 'pre-line'
                            }}
                        >
                            {slides[currentSlide].text}
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </>
    );
};

export default React.memo(StatCarousel);
