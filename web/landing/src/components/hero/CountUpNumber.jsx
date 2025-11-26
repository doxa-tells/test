import React, { useState, useEffect } from 'react';

const CountUpNumber = ({ target, duration = 1500, pause = 2000, delay = 0 }) => {
    const [count, setCount] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const startAnimation = () => {
            setIsAnimating(true);
            const steps = 60; // Количество шагов
            const increment = target / steps;
            let current = 0;

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    setCount(target);
                    clearInterval(timer);
                    setIsAnimating(false);

                    // Пауза, затем сброс и повтор
                    setTimeout(() => {
                        setCount(0);
                        startAnimation();
                    }, pause);
                } else {
                    setCount(Math.floor(current));
                }
            }, duration / steps);

            return () => clearInterval(timer);
        };

        // Первый запуск с задержкой
        const initialTimeout = setTimeout(startAnimation, delay);

        return () => clearTimeout(initialTimeout);
    }, [target, delay, duration, pause]);

    return <span>{count}</span>;
};

export default React.memo(CountUpNumber);
