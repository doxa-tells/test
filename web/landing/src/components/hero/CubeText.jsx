import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CubeText = () => {
    const rotatingWords = ["кастинги", "съемки", "возможности"];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % rotatingWords.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row', // В одну строку
            alignItems: 'center',
            justifyContent: 'flex-start', // Сдвигаем влево
            paddingLeft: '30px', // Отступ от края
            width: '100%'
        }}>
            <span style={{
                fontSize: '22px', // Чуть меньше, чтобы влезло
                fontWeight: '900', // Сделали жирнее
                color: 'rgba(255,255,255,0.8)',
                letterSpacing: '2px',
                marginRight: '15px', // Отступ справа
                whiteSpace: 'nowrap'
            }}>
                Глобальные
            </span>

            {/* Контейнер фиксированной ширины для вращающихся слов */}
            <div style={{ width: '240px', height: '36px', position: 'relative', perspective: '1000px' }}>
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, rotateX: -90, y: -20 }}
                        animate={{ opacity: 1, rotateX: 0, y: 0 }}
                        exit={{ opacity: 0, rotateX: 90, y: 20 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start', // Выравниваем по левому краю контейнера
                            transformOrigin: '50% 50% -20px',
                            backfaceVisibility: 'hidden'
                        }}
                    >
                        <span style={{
                            fontSize: '26px',
                            fontWeight: '900',
                            background: 'linear-gradient(135deg, #2fef55ff, #2df5d3ff, #00f9a2ff)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '1px',
                            whiteSpace: 'nowrap',
                            textShadow: 'none' // Убираем тень, так как она не работает с градиентом
                        }}>
                            {rotatingWords[index]}
                        </span>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default React.memo(CubeText);
