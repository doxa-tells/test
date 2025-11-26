import React from 'react';

/**
 * Утилиты для оптимизации производительности анимаций
 */

// Проверка prefers-reduced-motion
export const prefersReducedMotion = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Определение производительности устройства
export const detectDevicePerformance = () => {
    if (typeof window === 'undefined') return 'high';

    const memory = navigator.deviceMemory || 4; // GB
    const cores = navigator.hardwareConcurrency || 2;

    // Low-end: <= 2GB RAM или <= 2 ядра
    if (memory <= 2 || cores <= 2) return 'low';

    // Mid-end: <= 4GB RAM или <= 4 ядра
    if (memory <= 4 || cores <= 4) return 'medium';

    // High-end: все остальное
    return 'high';
};

// Hook для использования в React компонентах
export const useReducedMotion = () => {
    const [reducedMotion, setReducedMotion] = React.useState(prefersReducedMotion());

    React.useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleChange = () => setReducedMotion(mediaQuery.matches);

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return reducedMotion;
};

// Throttle функция
export const throttle = (func, limit) => {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Debounce функция
export const debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

// Определение FPS (для мониторинга)
export const measureFPS = () => {
    let lastTime = performance.now();
    let frames = 0;
    let fps = 60;

    const loop = () => {
        const currentTime = performance.now();
        frames++;

        if (currentTime >= lastTime + 1000) {
            fps = Math.round((frames * 1000) / (currentTime - lastTime));
            frames = 0;
            lastTime = currentTime;
        }

        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
    return () => fps;
};

// Получить оптимальные настройки анимаций для устройства
export const getAnimationConfig = () => {
    const performance = detectDevicePerformance();
    const reduced = prefersReducedMotion();

    if (reduced) {
        return {
            enableAnimations: false,
            particleCount: 0,
            fps: 0,
            enableBlur: false,
            enableShadows: false
        };
    }

    switch (performance) {
        case 'low':
            return {
                enableAnimations: true,
                particleCount: 500,
                fps: 30,
                enableBlur: false,
                enableShadows: false
            };
        case 'medium':
            return {
                enableAnimations: true,
                particleCount: 1000,
                fps: 45,
                enableBlur: true,
                enableShadows: false
            };
        case 'high':
        default:
            return {
                enableAnimations: true,
                particleCount: 2000,
                fps: 60,
                enableBlur: true,
                enableShadows: true
            };
    }
};
