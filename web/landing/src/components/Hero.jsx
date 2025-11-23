import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Section, Badge } from './Shared';
// Иконки
import { Sparkles, Bell, Filter, Globe, Shield, Calendar, MessageCircle, Zap, CheckCircle, User, CreditCard, Lock, Settings, MapPin, Clock, Smartphone, TrendingUp, Cpu, BatteryCharging, Mail, Image, Wallet, MessageSquare, Home, Eye, Heart, Mountain, FileText, Bot, X, Send, Instagram, Twitter, Facebook, Linkedin, Youtube } from 'lucide-react';
import avatar1 from '../assets/avatar1.png';
import partner1 from '../assets/partners/image1.png';
import partner2 from '../assets/partners/image2.png';
import partner3 from '../assets/partners/image3.png';
import partner4 from '../assets/partners/image4.png';
import partner5 from '../assets/partners/image5.png';
import partner6 from '../assets/partners/image6.png';
import partner7 from '../assets/partners/image7.png';
import partner8 from '../assets/partners/image8.png';

// Компонент для анимации морфинга частиц
const ParticleMorph = ({ texts = ["2000+", "MODELS", "ACTORS", "CREATORS"] }) => {
    const canvasRef = React.useRef(null);
    const animationRef = React.useRef(null);
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [nextTextIndex, setNextTextIndex] = useState(1);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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
    const particlesCache = React.useRef([]);
    // Используем refs для анимации, чтобы избежать ре-рендеров и прерываний
    const currentIndexRef = React.useRef(0);
    const startTimeRef = React.useRef(0);

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

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
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

// Компонент Глобуса (High-End Version)
const WorldGlobe = () => {
    const canvasRef = React.useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let width = canvas.parentElement ? canvas.parentElement.clientWidth : 300;
        let height = canvas.parentElement ? canvas.parentElement.clientHeight : 200;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        ctx.scale(dpr, dpr);

        // --- КОНФИГУРАЦИЯ ---
        const GLOBE_RADIUS_RATIO = 0.42; // Чуть крупнее
        const DOT_COUNT = 3500; // ОЧЕНЬ много точек для плотности
        const DOT_SIZE_BASE = 0.9; // Точки чуть меньше, чтобы не сливались
        const LAND_THRESHOLD = 0.05; // Порог суши

        // Цвета
        const COLOR_BG = '#020617';
        const COLOR_OCEAN = '#1e40af'; // Blue 800 (Текстура океана)
        const COLOR_LAND = '#60a5fa'; // Blue 400 (Суша посветлее)
        const COLOR_CITY = '#22c55e'; // Green 500 (Зеленые города)
        const COLOR_CITY_GLOW = '#4ade80'; // Green 400 (Свечение)
        const COLOR_ARC = 'rgba(34, 197, 94, 0.5)'; // Green lines
        const COLOR_PULSE = '#ffffff';

        // --- ГЕНЕРАЦИЯ ТОЧЕК ---
        const particles = [];
        const phi = Math.PI * (3 - Math.sqrt(5));

        // Шум для материков (низкая частота = большие куски)
        const simpleNoise = (x, y, z) => {
            // Комбинация низкочастотных волн для формирования "континентов"
            return Math.sin(x * 2.5) * Math.cos(y * 2.5) +
                Math.sin(y * 2.5) * Math.cos(z * 2.5) +
                Math.sin(z * 2.5) * Math.cos(x * 2.5);
        };

        for (let i = 0; i < DOT_COUNT; i++) {
            const y = 1 - (i / (DOT_COUNT - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;

            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;

            // Определяем, суша это или океан
            const noiseVal = simpleNoise(x, y, z);
            const isLand = noiseVal > LAND_THRESHOLD;
            // Города только на суше, но не везде
            const isCity = isLand && Math.random() > 0.85;

            particles.push({
                x, y, z,
                ox: x, oy: y, oz: z, // Original coords
                isLand,
                isCity,
                size: isCity ? DOT_SIZE_BASE * 2 : (isLand ? DOT_SIZE_BASE : DOT_SIZE_BASE * 0.6),
                color: isCity ? COLOR_CITY : (isLand ? COLOR_LAND : COLOR_OCEAN),
                glow: isCity ? Math.random() : 0
            });
        }

        // --- ЛИНИИ СВЯЗИ (ARCS) ---
        let arcs = [];
        const MAX_ARCS = 20; // Вернули много линий

        const createArc = () => {
            // Выбираем две случайные точки "городов"
            const cities = particles.filter(p => p.isCity);
            if (cities.length < 2) return null;

            const start = cities[Math.floor(Math.random() * cities.length)];

            // Ищем соседей, чтобы линии были аккуратными и не летали "криво" через всю планету
            // Берем только те, что находятся на разумном расстоянии
            const neighbors = cities
                .map(p => ({ p, dist: Math.sqrt((start.x - p.x) ** 2 + (start.y - p.y) ** 2 + (start.z - p.z) ** 2) }))
                .filter(item => item.dist > 0.1 && item.dist < 0.8); // Ограничиваем дальность связи

            if (neighbors.length === 0) return null;

            // Берем случайного соседа
            const end = neighbors[Math.floor(Math.random() * neighbors.length)].p;

            // Контрольная точка для кривой Безье (вытягиваем наружу)
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const midZ = (start.z + end.z) / 2;
            const midLen = Math.sqrt(midX * midX + midY * midY + midZ * midZ);

            // Высота дуги зависит от расстояния
            const dist = Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2 + (start.z - end.z) ** 2);
            // Дуга низкая, аккуратная, чуть выше поверхности
            const arcHeight = 1.02 + dist * 0.2;

            const ctrlX = (midX / midLen) * arcHeight;
            const ctrlY = (midY / midLen) * arcHeight;
            const ctrlZ = (midZ / midLen) * arcHeight;

            return {
                start, end,
                ctrl: { x: ctrlX, y: ctrlY, z: ctrlZ },
                progress: 0,
                speed: 0.01 + Math.random() * 0.01, // Скорость вариативная
                life: 1, // Opacity/Life
                hasPulse: true,
                pulsePos: 0
            };
        };

        // --- АНИМАЦИЯ ---
        let rotation = 0;
        let animId;

        const animate = () => {
            // Ресайз
            if (canvas.parentElement && (canvas.parentElement.clientWidth !== width || canvas.parentElement.clientHeight !== height)) {
                width = canvas.parentElement.clientWidth;
                height = canvas.parentElement.clientHeight;
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                ctx.scale(dpr, dpr);
            }

            // Очистка с небольшим шлейфом (опционально, но лучше полная для четкости)
            ctx.clearRect(0, 0, width, height);

            // Центр и радиус
            const cx = width * 0.8; // Сдвигаем еще правее (80%), чтобы освободить левую часть
            const cy = height / 2;
            const globeRadius = Math.min(width, height) * GLOBE_RADIUS_RATIO;

            rotation += 0.002; // Медленное вращение

            // 1. Проекция
            const projectedParticles = particles.map(p => {
                // Вращение вокруг Y
                const rx = p.x * Math.cos(rotation) - p.z * Math.sin(rotation);
                const rz = p.x * Math.sin(rotation) + p.z * Math.cos(rotation);

                // Перспектива
                const scale = (rz + 2.5) / 3.5;
                // Сделали затухание мягче: задняя часть (rz=-1) будет иметь alpha ~0.2, передняя (rz=1) ~1.0
                const alpha = (rz + 1.5) / 2.5;

                return {
                    ...p,
                    px: cx + rx * globeRadius,
                    py: cy + p.y * globeRadius,
                    rz, // Z-depth
                    scale,
                    alpha
                };
            });

            // Сортировка по Z
            projectedParticles.sort((a, b) => a.rz - b.rz);

            // 2. Тело планеты и Атмосфера
            // Рисуем темный круг - основу планеты, чтобы она была плотной
            ctx.beginPath();
            ctx.arc(cx, cy, globeRadius * 0.98, 0, Math.PI * 2);
            ctx.fillStyle = '#172554'; // Blue 950 (Глубокий океан)
            ctx.fill();

            // Легкая обводка/свечение самого шара
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Внешнее свечение (Атмосфера)
            const gradient = ctx.createRadialGradient(cx, cy, globeRadius * 0.9, cx, cy, globeRadius * 1.5);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
            gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // 3. Точки
            projectedParticles.forEach(p => {
                // Убрали жесткое отсечение, рисуем почти все
                if (p.alpha < 0.05) return;

                ctx.beginPath();
                ctx.arc(p.px, p.py, p.size * p.scale, 0, Math.PI * 2);

                if (p.isCity) {
                    // Города светятся
                    ctx.fillStyle = p.color;
                    // Добавляем эффект пульсации
                    if (Math.random() > 0.98) p.glow = 1;
                    p.glow *= 0.95;

                    if (p.rz > 0) { // Только передние города светятся сильно
                        ctx.shadowBlur = 12 * p.glow;
                        ctx.shadowColor = COLOR_CITY_GLOW;
                    } else {
                        ctx.shadowBlur = 0;
                    }
                } else {
                    // Океан и суша
                    ctx.fillStyle = p.isLand
                        ? `rgba(96, 165, 250, ${0.8 * p.alpha})` // Светлая суша
                        : `rgba(30, 64, 175, ${0.6 * p.alpha})`; // Синий океан
                    ctx.shadowBlur = 0;
                }

                // Применяем глобальную прозрачность, но не даем ей упасть в 0
                ctx.globalAlpha = Math.max(0.1, p.alpha);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;
            });

            // 4. Управление и отрисовка дуг
            // Добавляем новые дуги
            // Чаще создаем (0.90)
            if (arcs.length < MAX_ARCS && Math.random() > 0.90) {
                const newArc = createArc();
                if (newArc) arcs.push(newArc);
            }

            // Обновляем и рисуем дуги
            ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow

            arcs = arcs.filter(arc => {
                arc.progress += arc.speed;
                if (arc.progress > 1) arc.life -= 0.02;

                if (arc.life <= 0) return false;

                // Расчет точек дуги в 3D и проекция
                // Кривая Безье: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
                const points = [];
                const segments = 25;

                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    const invT = 1 - t;

                    const x = invT * invT * arc.start.x + 2 * invT * t * arc.ctrl.x + t * t * arc.end.x;
                    const y = invT * invT * arc.start.y + 2 * invT * t * arc.ctrl.y + t * t * arc.end.y;
                    const z = invT * invT * arc.start.z + 2 * invT * t * arc.ctrl.z + t * t * arc.end.z;

                    // Вращение и проекция
                    const rx = x * Math.cos(rotation) - z * Math.sin(rotation);
                    const rz = x * Math.sin(rotation) + z * Math.cos(rotation);

                    // Скрываем дуги сзади планеты (простая проверка)
                    // Если средняя точка дуги сзади - скрываем или делаем прозрачной

                    const px = cx + rx * globeRadius;
                    const py = cy + y * globeRadius;

                    points.push({ px, py, rz });
                }

                // Рисуем линию
                ctx.beginPath();
                let isVisible = false;
                for (let i = 0; i < points.length - 1; i++) {
                    // Рисуем только если сегмент на переднем плане
                    if (points[i].rz > -0.2 || points[i + 1].rz > -0.2) {
                        if (!isVisible) {
                            ctx.moveTo(points[i].px, points[i].py);
                            isVisible = true;
                        }
                        ctx.lineTo(points[i + 1].px, points[i + 1].py);
                    } else {
                        isVisible = false;
                    }
                }

                if (isVisible) {
                    ctx.strokeStyle = COLOR_ARC;
                    ctx.lineWidth = 1.5 * arc.life;
                    ctx.stroke();
                }

                // Рисуем импульс (Pulse)
                if (arc.hasPulse) {
                    arc.pulsePos += 0.015; // Скорость импульса
                    if (arc.pulsePos > 1) {
                        arc.pulsePos = 0; // Loop pulse or stop? Let's loop
                    }

                    const t = arc.pulsePos;
                    const invT = 1 - t;
                    const x = invT * invT * arc.start.x + 2 * invT * t * arc.ctrl.x + t * t * arc.end.x;
                    const y = invT * invT * arc.start.y + 2 * invT * t * arc.ctrl.y + t * t * arc.end.y;
                    const z = invT * invT * arc.start.z + 2 * invT * t * arc.ctrl.z + t * t * arc.end.z;

                    const rx = x * Math.cos(rotation) - z * Math.sin(rotation);
                    const rz = x * Math.sin(rotation) + z * Math.cos(rotation);

                    if (rz > -0.2) { // Виден только спереди
                        const px = cx + rx * globeRadius;
                        const py = cy + y * globeRadius;

                        ctx.beginPath();
                        ctx.arc(px, py, 3, 0, Math.PI * 2);
                        ctx.fillStyle = COLOR_PULSE;
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = COLOR_CITY_GLOW;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
                }

                return true;
            });

            ctx.globalCompositeOperation = 'source-over'; // Reset

            animId = requestAnimationFrame(animate);
        };

        animate();

        return () => cancelAnimationFrame(animId);
    }, []);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
};

const Hero = () => {
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'Caster AI', body: 'Новый мэтч: Главная роль', time: 'сейчас' },
        { id: 2, title: 'Caster AI', body: 'Вас пригласили на пробы', time: '2м назад' },
        { id: 3, title: 'Caster AI', body: 'Подтверждение кастинга', time: '15м назад' },
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            setNotifications(prev => {
                const newNotif = {
                    id: Date.now(),
                    title: 'Caster AI',
                    body: ['Новый мэтч: Реклама Nike', 'Вас утвердили на роль!', 'Новое сообщение от режиссера'][Math.floor(Math.random() * 3)],
                    time: 'сейчас'
                };
                return [newNotif, ...prev.slice(0, 2)];
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Swipe Animation State
    const [swipeIndex, setSwipeIndex] = useState(0);
    const swipeCards = [
        { id: 1, title: 'Сериал на Netflix', role: 'Главная роль', action: 'like', color: '#30d158' },
        { id: 2, title: 'Реклама Йогурта', role: 'Массовка', action: 'dislike', color: '#ff3b30' },
        { id: 3, title: 'Драма HBO', role: 'Второй план', action: 'like', color: '#30d158' },
        { id: 4, title: 'Студенческий метр', role: 'Эпизод', action: 'dislike', color: '#ff3b30' },
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setSwipeIndex((prev) => (prev + 1) % swipeCards.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
        }
    }, []);

    const tileStyle = {
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden'
    };

    const centerFlex = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center'
    };

    return (
        <section className="section section-full" style={{ padding: '40px 0' }}>
            <div className="container-fluid">
                {/* 5x3 Grid для окружения центрального блокa с двух сторон */}
                {/* 5x3 Grid для окружения центрального блока с двух сторон */}
                <div className="pc-tiles pc-tiles-primary">

                    {/* --- ЛЕВАЯ КОЛОНКА (2 блока) --- */}

                    {/* 1. Smart Swipe (Tinder-like) */}
                    <motion.div
                        className="pc-tile g-blue"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        style={{
                            gridColumn: '1',
                            gridRow: '1 / span 2',
                            ...tileStyle,
                            padding: '0',
                            overflow: 'hidden',
                            position: 'relative'
                        }}
                    >
                        <div style={{ padding: '30px 30px 0 30px', zIndex: 2, position: 'relative' }}>
                            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>Swipe</h3>
                            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Find your perfect role</p>
                        </div>

                        <div style={{
                            flex: 1,
                            position: 'relative',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: '20px',
                            perspective: '1000px'
                        }}>
                            <AnimatePresence mode="popLayout">
                                {swipeCards.map((card, index) => {
                                    if (index !== swipeIndex) return null;
                                    return (
                                        <motion.div
                                            key={card.id}
                                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                            animate={{ scale: 1, opacity: 1, y: 0, x: 0, rotate: 0 }}
                                            exit={{
                                                x: card.action === 'like' ? 250 : -250,
                                                rotate: card.action === 'like' ? 20 : -20,
                                                opacity: 0,
                                                transition: { duration: 1.2, ease: "easeInOut" }
                                            }}
                                            transition={{ duration: 0.5 }}
                                            style={{
                                                position: 'absolute',
                                                width: '160px',
                                                height: '220px',
                                                background: '#fff',
                                                borderRadius: '16px',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                                padding: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                zIndex: 10,
                                                top: 0,
                                                transformOrigin: 'bottom center'
                                            }}
                                        >
                                            {/* Stamp Overlay */}
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                exit={{ opacity: 1 }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '40px',
                                                    left: card.action === 'like' ? '20px' : 'auto',
                                                    right: card.action === 'dislike' ? '20px' : 'auto',
                                                    border: `4px solid ${card.action === 'like' ? '#30d158' : '#ff3b30'}`,
                                                    color: card.action === 'like' ? '#30d158' : '#ff3b30',
                                                    padding: '4px 8px',
                                                    borderRadius: '8px',
                                                    fontSize: '24px',
                                                    fontWeight: '900',
                                                    transform: `rotate(${card.action === 'like' ? '-15deg' : '15deg'})`,
                                                    zIndex: 20,
                                                    pointerEvents: 'none'
                                                }}
                                            >
                                                {card.action === 'like' ? 'LIKE' : 'NOPE'}
                                            </motion.div>

                                            <div style={{ width: '100%', height: '110px', background: '#333', borderRadius: '8px', marginBottom: '10px', position: 'relative', overflow: 'hidden' }}>
                                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #666 0%, #444 100%)' }} />
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000', marginBottom: '2px' }}>{card.role}</div>
                                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>{card.title}</div>

                                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                                                <motion.div
                                                    animate={card.action === 'dislike' ? { scale: [1, 1.2, 1], background: ['#fff', '#ffe5e5', '#fff'] } : {}}
                                                    transition={{ delay: 0.2, duration: 0.5 }}
                                                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <X size={16} color="#ff3b30" />
                                                </motion.div>
                                                <motion.div
                                                    animate={card.action === 'like' ? { scale: [1, 1.2, 1], boxShadow: ['0 4px 10px rgba(48, 209, 88, 0.3)', '0 4px 20px rgba(48, 209, 88, 0.6)', '0 4px 10px rgba(48, 209, 88, 0.3)'] } : {}}
                                                    transition={{ delay: 0.2, duration: 0.5 }}
                                                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #30d158', background: '#30d158', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(48, 209, 88, 0.3)' }}
                                                >
                                                    <CheckCircle size={16} color="#fff" />
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* 2. Auto-Apply */}
                    <motion.div
                        className="pc-tile g-indigo"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        style={{
                            gridColumn: '1',
                            gridRow: '3',
                            ...tileStyle
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Zap size={24} color="#fff" />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                style={{ width: '8px', height: '8px', background: '#30d158', borderRadius: '50%' }}
                            />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Auto-Apply</h3>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Applying while you sleep</p>
                        </div>
                    </motion.div>

                    {/* --- ЦЕНТРАЛЬНАЯ ЧАСТЬ (3 колонки) --- */}

                    {/* 3. Match Alerts (Animated) */}
                    <motion.div
                        className="pc-tile g-lime"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        style={{
                            gridColumn: '2',
                            gridRow: '1',
                            ...tileStyle,
                            overflow: 'hidden'
                        }}
                    >
                        <Bell size={24} color="#fff" />

                        {/* Animated Notification */}
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 1.5, duration: 0.5, type: "spring" }}
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                background: 'rgba(255,255,255,0.9)',
                                padding: '6px 10px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                        >
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#000' }}>MATCH!</span>
                        </motion.div>

                        <div>
                            <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Matches</h3>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Instant Notifications</p>
                        </div>
                    </motion.div>

                    {/* 4. Script Analysis */}
                    <motion.div
                        className="pc-tile g-teal"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                        style={{
                            gridColumn: '2',
                            gridRow: '1',
                            ...tileStyle
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <FileText size={24} color="#fff" />
                            <Badge style={{ fontSize: '10px', padding: '2px 6px', height: 'auto' }}>PDF</Badge>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Scripts</h3>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>AI Analysis & Breakdown</p>
                        </div>
                    </motion.div>

                    {/* 5. Casting Chat */}
                    <motion.div
                        className="pc-tile g-cyan"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        style={{
                            gridColumn: '1',
                            gridRow: '3',
                            ...tileStyle
                        }}
                    >
                        <MessageCircle size={24} color="#fff" />
                        <div>
                            <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Chat</h3>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Direct to Directors</p>
                        </div>
                    </motion.div>

                    {/* 6. CASTER AI MAIN BLOCK */}
                    <motion.div
                        className="pc-tile g-gradient-main"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        style={{
                            gridArea: '2 / 2 / span 2 / span 3',
                            padding: '40px',
                            display: 'flex',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            minHeight: '200px',
                            alignItems: 'center',
                            textAlign: 'center',
                            position: 'relative',
                            background: 'radial-gradient(ellipse at 30% 50%, #4169E1 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, #20B2AA 0%, transparent 50%), linear-gradient(135deg, #32CD32 0%, #48D1CC 50%, #5F9EA0 100%)'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '150%',
                            height: '120%',
                            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                            pointerEvents: 'none'
                        }} />


                        <h1 style={{
                            fontSize: 'clamp(3.0rem, 10vw, 10rem)',
                            fontWeight: '800',
                            color: '#ffffff',
                            fontFamily: 'Alro, sans-serif',
                            marginBottom: '4px',
                            lineHeight: '0.9',
                            textAlign: 'center',
                            letterSpacing: '-0.02em',
                            filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.3))'
                        }}>
                            caster
                        </h1>

                        <Button
                            variant="primary"
                            size="medium"
                            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                            style={{
                                background: '#ffffff',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                                border: 'none',
                                minWidth: '160px',
                                padding: '10px 24px',
                                filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.15))'
                            }}
                        >
                            <span style={{
                                background: 'radial-gradient(ellipse at 30% 50%, #4169E1 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, #20B2AA 0%, transparent 50%), linear-gradient(135deg, #32CD32 0%, #48D1CC 50%, #5F9EA0 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                fontFamily: 'Alro, sans-serif',
                                fontSize: '16px',
                                letterSpacing: '0.5px',
                                fontWeight: 'bold'
                            }}>
                                Попробовать бесплатно
                            </span>
                        </Button>
                    </motion.div>

                    {/* 7. Audition Calendar */}
                    <motion.div
                        className="pc-tile g-pink"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.45 }}
                        style={{
                            gridColumn: '4',
                            gridRow: '1',
                            ...tileStyle
                        }}
                    >
                        <Calendar size={24} color="#fff" />
                        <div>
                            <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Calendar</h3>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Auto-Sync Auditions</p>
                        </div>
                    </motion.div>

                    {/* 8. World Networks (Globe Animation) */}
                    <motion.div
                        className="pc-tile"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        style={{
                            gridColumn: '3 / span 2',
                            gridRow: '1',
                            ...tileStyle,
                            padding: 0,
                            background: '#0f172a',
                            overflow: 'hidden',
                            position: 'relative',
                            display: 'flex', // Flex для позиционирования текста
                            alignItems: 'center'
                        }}
                    >
                        {/* Canvas (Absolute, full size) */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                            <WorldGlobe />
                        </div>

                        {/* Text (Left side, relative z-index higher) */}
                        <div style={{
                            position: 'relative',
                            zIndex: 2,
                            paddingLeft: '0px', // Абсолютно влево
                            maxWidth: '40%',
                            pointerEvents: 'none'
                        }}>
                            <h3 style={{
                                fontSize: '20px',
                                color: '#fff',
                                marginBottom: '6px',
                                fontWeight: 'bold',
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }}>
                                World Networks
                            </h3>
                            <p style={{
                                fontSize: '13px',
                                color: 'rgba(255,255,255,0.7)',
                                lineHeight: '1.4'
                            }}>
                                Global connection &<br />instant data transfer
                            </p>
                        </div>
                    </motion.div>

                    {/* --- ПРАВАЯ КОЛОНКА (2 блока) --- */}

                    {/* 10. Unified Communications (Slow Strict Sequence) */}
                    <motion.div
                        className="pc-tile g-purple"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        style={{
                            gridColumn: '5',
                            gridRow: '1 / span 2',
                            ...tileStyle,
                            padding: '0',
                            overflow: 'hidden',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                            {/* Icons */}
                            {[
                                { Icon: Send, color: '#0088cc', hexAngle: 0 },       // Telegram
                                { Icon: MessageCircle, color: '#25D366', hexAngle: 60 }, // WhatsApp
                                { Icon: Mail, color: '#EA4335', hexAngle: 120 },     // Email
                                { Icon: Instagram, color: '#E4405F', hexAngle: 180 }, // Instagram
                                { Icon: Twitter, color: '#1DA1F2', hexAngle: 240 },   // Twitter
                                { Icon: Facebook, color: '#1877F2', hexAngle: 300 }   // Facebook
                            ].map(({ Icon, color, hexAngle }, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        x: [
                                            Math.cos((hexAngle * Math.PI) / 180) * 70, // 0% Hexagon
                                            Math.cos((hexAngle * Math.PI) / 180) * 70, // 20% Wait (2s)
                                            0,                                         // 30% Merge Center (3s)
                                            0                                          // 100%
                                        ],
                                        y: [
                                            Math.sin((hexAngle * Math.PI) / 180) * 70, // 0% Hexagon
                                            Math.sin((hexAngle * Math.PI) / 180) * 70, // 20% Wait (2s)
                                            0,                                         // 30% Merge Center (3s)
                                            0                                          // 100%
                                        ],
                                        scale: [1, 1, 0, 0],
                                        opacity: [1, 1, 0, 0],
                                        rotate: [0, 0, 360, 360]
                                    }}
                                    transition={{
                                        duration: 10,
                                        times: [0, 0.2, 0.3, 1],
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    style={{
                                        position: 'absolute',
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
                                        background: color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    <Icon size={22} color="#fff" />
                                </motion.div>
                            ))}

                            {/* Logo Reveal */}
                            <motion.img
                                src={avatar1}
                                alt="Caster AI"
                                animate={{
                                    scale: [0, 0, 0, 1.1, 1, 1, 0.8, 0],
                                    opacity: [0, 0, 0, 1, 1, 1, 0, 0],
                                    rotate: [0, 0, 0, 0, 0, 0, -5, -5]
                                }}
                                transition={{
                                    duration: 10,
                                    times: [0, 0.3, 0.3, 0.35, 0.4, 0.6, 0.65, 1],
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                style={{
                                    position: 'absolute',
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '20px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                    zIndex: 5
                                }}
                            />

                            {/* Final Text */}
                            <motion.div
                                animate={{
                                    opacity: [0, 0, 0, 0, 1, 1, 0],
                                    scale: [0.8, 0.8, 0.8, 0.8, 1, 1, 0.9],
                                    y: [20, 20, 20, 20, 0, 0, -10]
                                }}
                                transition={{
                                    duration: 10,
                                    times: [0, 0.65, 0.65, 0.65, 0.7, 0.95, 1],
                                    repeat: Infinity,
                                    ease: "backOut"
                                }}
                                style={{
                                    position: 'absolute',
                                    textAlign: 'center',
                                    zIndex: 10,
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <h3 style={{
                                    fontSize: '28px',
                                    fontWeight: '900',
                                    color: '#fff',
                                    lineHeight: '1',
                                    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                    marginBottom: '8px'
                                }}>
                                    ALL<br />CASTINGS<br />INSIDE
                                </h3>
                                <div style={{ width: '40px', height: '4px', background: '#fff', borderRadius: '2px' }} />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* 11. Success Stats */}
                    <motion.div
                        className="pc-tile g-green"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.65 }}
                        style={{
                            gridColumn: '5',
                            gridRow: '3',
                            ...tileStyle
                        }}
                    >
                        <TrendingUp size={24} color="#fff" />
                        <div>
                            <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Stats</h3>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Success Rate</p>
                        </div>
                    </motion.div>

                </div>

                {/* Дополнительные блоки вторым рядом */}
                <div className="pc-tiles pc-tiles-secondary">

                    {/* 12. Locations - Левый блок с анимацией морфинга */}
                    <motion.div
                        className="pc-tile"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                        style={{
                            gridColumn: 'span 1',
                            gridRow: 'span 1',
                            ...tileStyle,
                            position: 'relative',
                            overflow: 'hidden',
                            background: '#41cf87',
                            padding: 0, // Убираем отступы, чтобы canvas был на весь блок
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {/* Canvas для анимации морфинга */}
                        <ParticleMorph />
                    </motion.div>

                    {/* 12b. Locations - Правый блок */}
                    <motion.div
                        className="pc-tile g-brown"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.75 }}
                        style={{
                            gridColumn: 'span 1',
                            gridRow: 'span 1',
                            ...tileStyle,
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <MapPin size={24} color="#fff" style={{ opacity: 0.5 }} />
                    </motion.div>

                    {/* 13. Global Casting (Merged Block with iOS Stack Animation) */}
                    <motion.div
                        className="pc-tile g-magenta"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.75 }}
                        style={{
                            gridColumn: 'span 4',
                            gridRow: 'span 1',
                            ...tileStyle,
                            overflow: 'hidden',
                            position: 'relative',
                            padding: 0
                        }}
                    >
                        {/* Text in top-left */}
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            left: '20px',
                            fontFamily: 'Alro, sans-serif',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            background: 'radial-gradient(ellipse at 30% 50%, #4169E1 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, #20B2AA 0%, transparent 50%), linear-gradient(135deg, #32CD32 0%, #48D1CC 50%, #5F9EA0 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            zIndex: 3
                        }}>
                            Будь быстрее
                        </div>

                        {/* Notification Stack */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '20px',
                            zIndex: 2
                        }}>
                            <AnimatePresence mode='popLayout'>
                                {notifications.map((item, i) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, y: 50, scale: 0.8 }}
                                        animate={{
                                            opacity: 1,
                                            y: i * 12,
                                            scale: 1 - i * 0.05,
                                            zIndex: 10 - i
                                        }}
                                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        style={{
                                            position: 'absolute',
                                            width: '100%',
                                            maxWidth: '100%',
                                            background: 'rgba(255, 255, 255, 0.9)',
                                            backdropFilter: 'blur(20px)',
                                            borderRadius: '16px',
                                            padding: '12px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                                            border: '1px solid rgba(255,255,255,0.5)',
                                            top: '50%',
                                            marginTop: '-30px',
                                            left: 0,
                                            right: 0
                                        }}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                            boxShadow: '0 2px 8px rgba(0,122,255,0.3)'
                                        }}>
                                            <img
                                                src={avatar1}
                                                alt="Caster AI"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}>{item.title}</span>
                                                <span style={{ fontSize: '11px', color: 'rgba(60,60,67,0.6)' }}>{item.time}</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#000', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.body}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* 15. Career Growth / Partners */}
                    <motion.div
                        className="pc-tile g-green"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.85 }}
                        style={{
                            gridColumn: 'span 2',
                            gridRow: 'span 1',
                            ...tileStyle,
                            overflow: 'hidden',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}
                    >
                        <h3 style={{
                            fontSize: '24px',
                            marginBottom: '0',
                            fontWeight: 'bold',
                            background: 'radial-gradient(ellipse at 30% 50%, #4169E1 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, #20B2AA 0%, transparent 50%), linear-gradient(135deg, #32CD32 0%, #48D1CC 50%, #5F9EA0 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>Наши партнеры</h3>

                        {/* Scrolling logos container */}
                        <div style={{
                            display: 'flex',
                            gap: '16px',
                            animation: 'scroll 20s linear infinite',
                            width: 'max-content'
                        }}>
                            {/* Duplicate logos for seamless loop */}
                            {[...Array(2)].map((_, setIndex) => (
                                <React.Fragment key={setIndex}>
                                    {[partner1, partner2, partner3, partner4, partner5, partner6, partner7, partner8].map((partnerImg, i) => (
                                        <div
                                            key={`${setIndex}-${i}`}
                                            style={{
                                                minWidth: '140px',
                                                height: '120px',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '4px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <img
                                                src={partnerImg}
                                                alt={`Partner ${i + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>

                        <style>{`
                            @keyframes scroll {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                        `}</style>
                    </motion.div>

                </div>
            </div >

            {/* Mobile Responsive Styles & New Desktop Adaptive */}
            < style > {`
                /* Base Grid Styles */
                .pc-tiles {
                    display: grid;
                    gap: 20px;
                    width: 100%;
                    margin: 0 auto;
                    /* Ограничиваем максимальную ширину, чтобы на iMac не растягивало слишком сильно */
                    max-width: 1600px; 
                }

                /* Primary Grid (5 columns) */
                .pc-tiles-primary {
                    grid-template-columns: repeat(5, 1fr);
                    /* Адаптивная высота ряда: растет вместе с экраном */
                    grid-auto-rows: minmax(clamp(140px, 12vh, 220px), auto);
                }

                /* Secondary Grid (8 columns для более гибкого разделения) */
                .pc-tiles-secondary {
                    grid-template-columns: repeat(8, 1fr);
                    grid-auto-rows: minmax(clamp(140px, 12vh, 220px), auto);
                    margin-top: 20px;
                }

                /* Large Screens (iMac 27" +) */
                @media (min-width: 1920px) {
                    .pc-tiles {
                        max-width: 2000px; /* Даем больше ширины на огромных экранах */
                        gap: 24px;
                    }
                    .pc-tiles-primary, .pc-tiles-secondary {
                        grid-auto-rows: minmax(180px, auto); /* Фиксируем минимальную высоту побольше */
                    }
                }

                /* Laptop / Desktop Standard (1280px - 1600px) */
                @media (max-width: 1600px) {
                    .pc-tiles {
                        max-width: 1200px;
                    }
                }

                /* Tablet Landscape (1024px - 1280px) */
                @media (max-width: 1280px) {
                    .pc-tiles {
                        max-width: 960px;
                    }
                }

                /* Tablet Portrait & Small Laptops (max 1024px) - Перестроение в 2 колонки */
                @media (max-width: 1024px) {
                    .pc-tiles-primary, 
                    .pc-tiles-secondary {
                        grid-template-columns: repeat(2, 1fr) !important;
                        grid-auto-rows: minmax(160px, auto);
                    }

                    /* Сброс и переопределение позиций для 2 колонок */
                    .pc-tile {
                        grid-column: span 1 !important;
                        grid-row: span 1 !important;
                    }

                    /* Специфичные переопределения для сохранения логики */
                    /* Большие блоки на всю ширину (2 колонки) */
                    .pc-tile[style*="gridArea: '2 / 2 / span 2 / span 3'"], /* Main Block */
                    .pc-tile[style*="gridColumn: '1 / span 2'"],
                    .pc-tile[style*="gridColumn: '5'"] { 
                        grid-column: span 2 !important; 
                    }
                    
                    /* Main block height adjustment */
                    .pc-tile[style*="gridArea: '2 / 2 / span 2 / span 3'"] {
                        min-height: 300px !important;
                    }

                    /* Vertical blocks */
                    .pc-tile[style*="gridRow: '1 / span 2'"] { 
                        grid-row: span 2 !important; 
                    }
                }

                /* Mobile (max 640px) - 1 колонка */
                @media (max-width: 640px) {
                    .pc-tiles-primary,
                    .pc-tiles-secondary {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }
                    
                    .pc-tile {
                        width: 100% !important;
                        grid-column: auto !important;
                        grid-row: auto !important;
                        min-height: 140px;
                    }
                    
                    .pc-tile[style*="gridRow: 'span 2'"] { min-height: 200px; }
                }
                
                /* Градиенты */
                .g-gradient-main { background: linear-gradient(135deg, #2fef55ff, #2df5d3ff, #00f9a2ff); }
                .g-blue-light { background-color: #2e6ffb; }
                .g-brown { background-color: #8B4513; }
                .g-green { background-color: #28a745; }
                .g-yellow { background: linear-gradient(135deg, #15140fff, #FDE047); }
                .g-dark { background-color: rgba(30, 30, 30, 1); }
            `}</style >
        </section >
    );
};

export default Hero;