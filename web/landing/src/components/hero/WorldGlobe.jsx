import React, { useEffect, useRef } from 'react';
import { getAnimationConfig } from '../../utils/performanceUtils';

const WorldGlobe = () => {
    const canvasRef = useRef(null);

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

        // Получаем оптимальные настройки для устройства
        const animConfig = getAnimationConfig();

        // Если анимации отключены, не рисуем
        if (!animConfig.enableAnimations) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);
            return;
        }

        // --- КОНФИГУРАЦИЯ ---
        const GLOBE_RADIUS_RATIO = 0.42; // Чуть крупнее
        const DOT_COUNT = animConfig.particleCount; // Адаптивное количество точек
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
            const projectedParticles = [];
            const cosRot = Math.cos(rotation);
            const sinRot = Math.sin(rotation);

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                // Вращение вокруг Y
                const rx = p.x * cosRot - p.z * sinRot;
                const rz = p.x * sinRot + p.z * cosRot;

                // Перспектива
                // Сделали затухание мягче: задняя часть (rz=-1) будет иметь alpha ~0.2, передняя (rz=1) ~1.0
                const alpha = (rz + 1.5) / 2.5;

                if (alpha < 0.05) continue; // Skip invisible particles early

                const scale = (rz + 2.5) / 3.5;

                projectedParticles.push({
                    ...p,
                    px: cx + rx * globeRadius,
                    py: cy + p.y * globeRadius,
                    rz, // Z-depth
                    scale,
                    alpha
                });
            }

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
                // if (p.alpha < 0.05) return; // Moved to projection loop

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

export default React.memo(WorldGlobe);
