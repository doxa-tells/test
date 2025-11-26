import React, { useState, useEffect, useRef } from 'react';
import { getAnimationConfig } from '../../utils/performanceUtils';

const ParticleMorph = ({ texts = ["2000+", "МОДЕЛЕЙ", "АКТЕРОВ", "СОЗДАТЕЛЕЙ"] }) => {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [currentIndex, setCurrentIndex] = useState(0);

    // Получаем конфигурацию производительности
    const animConfig = getAnimationConfig();

    // Отслеживание размера контейнера для адаптивности
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setDimensions({ width, height });
            }
        });

        if (canvas.parentElement) {
            resizeObserver.observe(canvas.parentElement);
        }

        return () => resizeObserver.disconnect();
    }, []);

    // Кэш для частиц, чтобы не пересчитывать их каждый раз
    const particlesCache = useRef([]);
    // Используем refs для анимации, чтобы избежать ре-рендеров и прерываний
    const currentIndexRef = useRef(0);
    const startTimeRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Установка размеров
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        canvas.style.width = `${dimensions.width}px`;
        canvas.style.height = `${dimensions.height}px`;

        const width = dimensions.width;
        const height = dimensions.height;

        // Функция ease-in-out (Quad - более мягкая, чем Cubic)
        const easeInOutQuad = (t) => {
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        };

        // Генерация частиц (вынесена, чтобы кэшировать)
        const createParticles = (text) => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            tempCanvas.width = width * dpr;
            tempCanvas.height = height * dpr;
            tempCtx.scale(dpr, dpr);

            tempCtx.font = 'bold 100px Arial, sans-serif';
            const measured = tempCtx.measureText(text);

            const widthRatio = width < 250 ? 0.90 : 0.70;
            const maxTextWidth = width * widthRatio;

            const scale = maxTextWidth / measured.width;
            const fontSize = Math.min(100 * scale, height * (width < 250 ? 0.45 : 0.35));

            tempCtx.font = `bold ${fontSize}px Arial, sans-serif`;
            tempCtx.fillStyle = '#fff';
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            tempCtx.fillText(text, width / 2, height / 2);

            const imageData = tempCtx.getImageData(0, 0, width * dpr, height * dpr);
            const data = imageData.data;
            const particles = [];

            const gapRatio = width < 250 ? 1.5 : 3;
            const gap = Math.max(1, Math.floor(gapRatio * dpr));
            const baseSize = width < 250 ? 1.2 : 1.5;

            for (let y = 0; y < height * dpr; y += gap) {
                for (let x = 0; x < width * dpr; x += gap) {
                    const index = (y * (width * dpr) + x) * 4;
                    const alpha = data[index + 3];

                    if (alpha > 128) {
                        particles.push({
                            x: x / dpr,
                            y: y / dpr,
                            size: baseSize + (Math.sin(x * y) + 1) * 0.5,
                            color: '#ffffff'
                        });
                    }
                }
            }
            return particles;
        };

        // 1. Предварительно генерируем частицы для ВСЕХ текстов
        particlesCache.current = texts.map(text => createParticles(text));

        // Сбрасываем время начала при ресайзе/ините
        startTimeRef.current = Date.now();

        const displayDuration = 200; // Очень короткая пауза (только чтобы прочитать)
        const transitionDuration = 800; // Плавный долгий переход
        const cycleDuration = displayDuration + transitionDuration;

        const animate = () => {
            const currentTime = Date.now();
            let elapsed = currentTime - startTimeRef.current;

            // Если цикл завершился, переходим к следующему тексту МГНОВЕННО
            if (elapsed >= cycleDuration) {
                currentIndexRef.current = (currentIndexRef.current + 1) % texts.length;
                startTimeRef.current = currentTime; // Сброс времени
                elapsed = 0;
            }

            // Получаем текущие и следующие частицы из кэша
            const currentIndex = currentIndexRef.current;
            const nextIndex = (currentIndex + 1) % texts.length;

            const currentParticles = particlesCache.current[currentIndex];
            const nextParticles = particlesCache.current[nextIndex];

            // Очистка
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.scale(dpr, dpr);

            if (elapsed < displayDuration) {
                // Фаза 1: Статичный показ
                currentParticles.forEach(particle => {
                    ctx.fillStyle = particle.color;
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else {
                // Фаза 2: Морфинг
                const transitionElapsed = elapsed - displayDuration;
                const progress = easeInOutQuad(transitionElapsed / transitionDuration);

                const maxParticles = Math.max(currentParticles.length, nextParticles.length);

                for (let i = 0; i < maxParticles; i++) {
                    const currentP = currentParticles[i % currentParticles.length];
                    const nextP = nextParticles[i % nextParticles.length];

                    const x = currentP.x + (nextP.x - currentP.x) * progress;
                    const y = currentP.y + (nextP.y - currentP.y) * progress;
                    const size = currentP.size + (nextP.size - currentP.size) * progress;

                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [dimensions, texts]); // Зависим только от размеров и списка текстов

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1
            }}
        />
    );
};

export default React.memo(ParticleMorph);
