import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge } from '../Shared';
// Иконки
import { Bell, Zap, Calendar, FileText, Send, MessageCircle, Mail, Instagram, Twitter, Facebook } from 'lucide-react';
import { prefersReducedMotion } from '../../utils/performanceUtils';
import avatar1 from '../../assets/avatar1.svg';
import partner1 from '../../assets/partners/9.svg';
import partner2 from '../../assets/partners/2.svg';
import partner3 from '../../assets/partners/3.svg';
import partner4 from '../../assets/partners/4.svg';
import partner5 from '../../assets/partners/5.svg';
import partner6 from '../../assets/partners/6.svg';
import partner7 from '../../assets/partners/7.svg';
import partner8 from '../../assets/partners/8.svg';

import leoImage from '../../assets/photosmobile/leonardo dicaprio.jpg';
import extrasImage from '../../assets/photosmobile/ams.jpg';
import dramaImage from '../../assets/photosmobile/Gemini_Generated_Image_fq0npifq0npifq0n.png';
import likeIcon from '../../assets/photosmobile/like.svg';
import dislikeIcon from '../../assets/photosmobile/dislike.svg';

// Sub-components
import ParticleMorph from './ParticleMorph';
import StatCarousel from './StatCarousel';
import CubeText from './CubeText';
// Heavy components: lazy-load
const WorldGlobeLazy = React.lazy(() => import('./WorldGlobe'));
const MoneyGraphLazy = React.lazy(() => import('./MoneyGraph'));

// Lazy load heavy 3D component
const CarouselScene = React.lazy(() => import('./ThreeCarousel'));

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
        { id: 1, title: 'Сериал на Netflix', role: 'Главная роль', action: 'like', color: '#30d158', image: leoImage },
        { id: 2, title: 'Реклама Йогурта', role: 'Массовка', action: 'dislike', color: '#ff3b30', image: extrasImage },
        { id: 3, title: 'Драма HBO', role: 'Второй план', action: 'like', color: '#30d158', image: dramaImage },
        { id: 4, title: 'Студенческий метр', role: 'Эпизод', action: 'dislike', color: '#ff3b30', image: extrasImage },
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

    // Проверка на уменьшенную анимацию
    const shouldReduceMotion = prefersReducedMotion();

    const carouselRef = React.useRef(null);
    const globeRef = React.useRef(null);
    const [carouselVisible, setCarouselVisible] = useState(false);
    const [globeVisible, setGlobeVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // simple mobile check
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        const el = carouselRef.current;
        if (!el) return;
        const obs = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (entry && entry.isIntersecting) {
                setCarouselVisible(true);
                obs.disconnect();
            }
        }, { root: null, rootMargin: '200px', threshold: 0.1 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        const el = globeRef.current;
        if (!el) return;
        const obs = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (entry && entry.isIntersecting) {
                setGlobeVisible(true);
                obs.disconnect();
            }
        }, { root: null, rootMargin: '200px', threshold: 0.1 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    // Оптимизированные константы стилей
    const tileStyle = React.useMemo(() => ({
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden'
    }), []);

    return (
        <section className="section section-full" style={{ padding: '40px 0' }}>
            <div className="container-fluid">
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
                            padding: '20px',
                            overflow: 'hidden',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <div style={{ zIndex: 2, position: 'relative', marginBottom: '15px' }}>
                            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '0', fontFamily: 'Alro, sans-serif', lineHeight: '1.2' }}>Откликайся на кастинги в 1 клик</h3>
                        </div>

                        {/* Рамка телефона */}
                        <div style={{
                            flex: 1,
                            position: 'relative',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            perspective: '1000px'
                        }}>
                            {/* iPhone */}
                            <div style={{
                                width: '180px',
                                height: '340px',
                                background: 'linear-gradient(145deg, #0a0a0a, #1a1a1a)',
                                borderRadius: '32px',
                                padding: '8px',
                                boxShadow: '0 25px 70px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
                                position: 'relative',
                                border: '3px solid #000'
                            }}>
                                {/* Кнопка питания */}
                                <div style={{
                                    position: 'absolute',
                                    right: '-3px',
                                    top: '70px',
                                    width: '3px',
                                    height: '50px',
                                    background: '#0a0a0a',
                                    borderRadius: '0 2px 2px 0'
                                }} />

                                {/* Dynamic Island */}
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '70px',
                                    height: '22px',
                                    background: '#000',
                                    borderRadius: '16px',
                                    zIndex: 100,
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
                                }}>
                                    {/* Камера */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: 'radial-gradient(circle, #1a2a3a 0%, #0a0a0a 70%)',
                                        border: '1px solid #0a1a2a'
                                    }} />
                                </div>

                                {/* Экран iPhone */}
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(180deg, #f8f8f8 0%, #ececec 100%)',
                                    borderRadius: '26px',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
                                    padding: '10px' // Отступы от краев экрана
                                }}>
                                    {/* Индикаторы свайпа */}
                                    <motion.div
                                        animate={{ opacity: [0.3, 0.6, 0.3], x: [-3, 0, -3] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        style={{
                                            position: 'absolute',
                                            left: '5px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: '#ff3b30',
                                            fontSize: '20px',
                                            fontWeight: '900',
                                            zIndex: 1
                                        }}
                                    >
                                        ←
                                    </motion.div>
                                    <motion.div
                                        animate={{ opacity: [0.3, 0.6, 0.3], x: [3, 0, 3] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                        style={{
                                            position: 'absolute',
                                            right: '5px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: '#30d158',
                                            fontSize: '20px',
                                            fontWeight: '900',
                                            zIndex: 1
                                        }}
                                    >
                                        →
                                    </motion.div>

                                    {/* Карточки внутри экрана */}
                                    <AnimatePresence mode="popLayout">
                                        {swipeCards.map((card, index) => {
                                            if (index !== swipeIndex) return null;

                                            return (
                                                <React.Fragment key={card.id}>
                                                    {/* Следующая карточка (фон) */}
                                                    <motion.div
                                                        initial={{ scale: 0.9, opacity: 0.5 }}
                                                        animate={{ scale: 0.95, opacity: 0.7 }}
                                                        style={{
                                                            position: 'absolute',
                                                            width: '100%',
                                                            height: '100%',
                                                            background: '#fff',
                                                            borderRadius: '18px',
                                                            boxShadow: '0 5px 15px rgba(0,0,0,0.15)',
                                                            zIndex: 1
                                                        }}
                                                    />

                                                    {/* Текущая карточка */}
                                                    <motion.div
                                                        key={card.id}
                                                        initial={{ scale: 0.8, opacity: 0, y: 50 }}
                                                        animate={{ scale: 1, opacity: 1, y: 0, x: 0, rotate: 0 }}
                                                        exit={{
                                                            x: card.action === 'like' ? 200 : -200,
                                                            rotate: card.action === 'like' ? 35 : -35,
                                                            opacity: 0,
                                                            scale: 0.8,
                                                            transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
                                                        }}
                                                        transition={{
                                                            duration: 0.5,
                                                            type: "spring",
                                                            bounce: 0.4,
                                                            delay: 0.1
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            width: '100%',
                                                            height: '100%',
                                                            background: '#fff',
                                                            borderRadius: '18px',
                                                            boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
                                                            padding: '12px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            transformOrigin: 'bottom center',
                                                            zIndex: 2
                                                        }}
                                                    >
                                                        {/* Затемнение при свайпе */}
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            exit={{
                                                                opacity: card.action === 'like' ? 0.2 : 0.2,
                                                                background: card.action === 'like'
                                                                    ? 'linear-gradient(90deg, transparent, rgba(48, 209, 88, 0.3))'
                                                                    : 'linear-gradient(90deg, rgba(255, 59, 48, 0.3), transparent)'
                                                            }}
                                                            transition={{ duration: 0.3 }}
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                borderRadius: '18px',
                                                                pointerEvents: 'none',
                                                                zIndex: 1
                                                            }}
                                                        />

                                                        {/* Stamp Overlay */}
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
                                                            exit={{
                                                                opacity: 1,
                                                                scale: 1.2,
                                                                rotate: card.action === 'like' ? -15 : 15,
                                                                transition: { duration: 0.2, delay: 0.1 }
                                                            }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '50px',
                                                                left: card.action === 'like' ? '20px' : 'auto',
                                                                right: card.action === 'dislike' ? '20px' : 'auto',
                                                                border: `4px solid ${card.action === 'like' ? '#30d158' : '#ff3b30'}`,
                                                                color: card.action === 'like' ? '#30d158' : '#ff3b30',
                                                                padding: '5px 12px',
                                                                borderRadius: '8px',
                                                                fontSize: '22px',
                                                                fontWeight: '900',
                                                                zIndex: 20,
                                                                pointerEvents: 'none',
                                                                background: 'rgba(255,255,255,0.9)'
                                                            }}
                                                        >
                                                            {card.action === 'like' ? 'LIKE' : 'NOPE'}
                                                        </motion.div>

                                                        {/* Серое окошко с фото */}
                                                        <div style={{ width: '100%', height: '150px', background: '#333', borderRadius: '12px', marginTop: '30px', marginBottom: '6px', position: 'relative', overflow: 'hidden' }}>
                                                            <img src={card.image} alt="Casting" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        </div>
                                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000', marginBottom: '1px', textAlign: 'center' }}>{card.role}</div>
                                                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px', textAlign: 'center' }}>{card.title}</div>

                                                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                                                            <motion.div
                                                                animate={card.action === 'dislike' ? {
                                                                    scale: [1, 1.2, 1],
                                                                    rotate: [0, -10, 0]
                                                                } : {}}
                                                                transition={{ delay: 0.15, duration: 0.5 }}
                                                                style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '10px' }}
                                                            >
                                                                <img src={dislikeIcon} alt="Dislike" style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
                                                            </motion.div>
                                                            <motion.div
                                                                animate={card.action === 'like' ? {
                                                                    scale: [1, 1.2, 1],
                                                                    rotate: [0, 10, 0]
                                                                } : {}}
                                                                transition={{ delay: 0.15, duration: 0.5 }}
                                                                style={{ width: '54px', height: '54px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            >
                                                                <img src={likeIcon} alt="Like" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                            </motion.div>
                                                        </div>
                                                    </motion.div>
                                                </React.Fragment>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>



                    {/* --- ЦЕНТРАЛЬНАЯ ЧАСТЬ (3 колонки) --- */}



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

                    {/* Наши партнеры */}
                    <motion.div
                        className="pc-tile g-green"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.85 }}
                        style={{
                            gridColumn: '3',
                            gridRow: '1',
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

                        <div style={{
                            display: 'flex',
                            gap: '16px',
                            animation: 'scroll 20s linear infinite',
                            width: 'max-content'
                        }}>
                            {/* Duplicate logos for seamless loop */}
                            {[...Array(2)].map((_, setIndex) => (
                                <div key={setIndex} style={{ display: 'contents' }}>
                                    {[partner1, partner2, partner3, partner4, partner5, partner6, partner7, partner8].map((partnerImg, i) => (
                                        <div
                                            key={`${setIndex}-${i}`}
                                            style={{
                                                minWidth: '140px',
                                                height: '120px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '4px',
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
                                </div>
                            ))}
                        </div>

                        <style>{`
                            @keyframes scroll {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                        `}</style>
                    </motion.div>

                    {/* 5. High Income / Money Graph */}
                    <React.Suspense fallback={<div className="pc-tile" style={{ gridColumn: '2', gridRow: '2', minHeight: '180px' }} />}>
                        <MoneyGraphLazy tileStyle={tileStyle} />
                    </React.Suspense>

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
                        ref={globeRef}
                    >
                        {/* Canvas (Absolute, full size) */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                            {globeVisible && !shouldReduceMotion && (
                                <React.Suspense fallback={null}>
                                    <WorldGlobeLazy />
                                </React.Suspense>
                            )}
                        </div>

                        {/* Text (Left side, relative z-index higher) */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: 2,
                            paddingLeft: '0',
                            width: '100%',
                            maxWidth: '100%',
                            pointerEvents: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%'
                        }}>
                            <CubeText />
                        </div>
                    </motion.div>

                    {/* --- ПРАВАЯ КОЛОНКА (2 блока) --- */}

                    {/* 10. Unified Communications (OPTIMIZED: GPU ACCELERATED) */}
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
                            position: 'relative',
                            background: '#0f172a',
                            overflow: 'hidden',
                            // Оптимизация контейнера
                            transform: 'translateZ(0)'
                        }}
                    >
                        {/* --- СЛОЙ 1: ТЕКСТ --- */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
                            <motion.div
                                animate={{
                                    opacity: [0, 1, 1, 0, 0],
                                    scale: [0.9, 1, 1, 0.5, 0],
                                    // ❌ УБРАЛ FILTER (BLUR) — это главная причина лагов
                                }}
                                transition={{
                                    duration: 6,
                                    times: [0, 0.05, 0.25, 0.45, 1],
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                style={{
                                    textAlign: 'center',
                                    willChange: 'transform, opacity' // ✅ ВКЛЮЧАЕМ ВИДЕОКАРТУ
                                }}
                            >
                                <h3 style={{ fontSize: '34px', fontWeight: '900', color: '#fff', lineHeight: '1', marginBottom: '6px' }}>
                                    ALL IN ONE
                                </h3>
                                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', display: 'inline-block' }}>
                                    Direct Casting
                                </div>
                            </motion.div>
                        </div>

                        {/* --- СЛОЙ 2: ИКОНКИ --- */}
                        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, zIndex: 20 }}>
                            {[
                                { Icon: Send, color: '#0088cc' },
                                { Icon: MessageCircle, color: '#25D366' },
                                { Icon: Mail, color: '#EA4335' },
                                { Icon: Instagram, color: '#E4405F' },
                                { Icon: Twitter, color: '#1DA1F2' },
                                { Icon: Facebook, color: '#1877F2' }
                            ].map(({ Icon, color }, i) => (
                                <motion.div
                                    key={i}
                                    style={{
                                        position: 'absolute', top: -30, left: -30, width: '60px', height: '60px',
                                        rotate: i * 60,
                                        transformOrigin: 'center center',
                                        willChange: 'transform' // ✅ ОПТИМИЗАЦИЯ ВРАЩЕНИЯ
                                    }}
                                >
                                    <motion.div
                                        animate={{
                                            x: [180, 180, 0, 0, 180],
                                            rotate: [0, 0, 360, 360, 0],
                                            scale: [0, 1, 0, 0, 0],
                                            opacity: [0, 1, 1, 0, 0]
                                        }}
                                        transition={{
                                            duration: 6,
                                            times: [0, 0.2, 0.45, 0.5, 1],
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                        style={{
                                            width: '100%', height: '100%', borderRadius: '16px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                            willChange: 'transform, opacity' // ✅ ОПТИМИЗАЦИЯ ПОЛЕТА
                                        }}
                                    >
                                        <Icon size={28} color="#fff" />
                                    </motion.div>
                                </motion.div>
                            ))}
                        </div>

                        {/* --- СЛОЙ 3: ЛОГОТИП --- */}
                        <motion.div
                            animate={{
                                scale: [0, 0, 1.1, 1, 1, 0],
                                opacity: [0, 0, 1, 1, 1, 0],
                                rotate: [0, 0, 0, 0, 0, -5]
                            }}
                            transition={{
                                duration: 6,
                                times: [0, 0.4, 0.45, 0.98, 0.99, 1],
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: '110px',
                                height: '110px',
                                marginLeft: '-55px',
                                marginTop: '-55px',
                                borderRadius: '28px',
                                background: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 50,
                                boxShadow: '0 0 50px rgba(255, 255, 255, 0.3)',
                                willChange: 'transform, opacity' // ✅ ОПТИМИЗАЦИЯ ЛОГОТИПА
                            }}
                        >
                            <img
                                src={avatar1}
                                alt="Logo"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '28px',
                                    display: 'block'
                                }}
                            />
                        </motion.div>

                    </motion.div>

                    {/* Пустой блок */}
                    <motion.div
                        className="pc-tile"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.65 }}
                        style={{
                            gridColumn: '5',
                            gridRow: '3',
                            ...tileStyle,
                            background: '#1a1a1a',
                            overflow: 'hidden',
                            position: 'relative'
                        }}
                    >
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

                    {/* 12b. Locations - Правый блок (Статистика - Карусель) */}
                    <motion.div
                        className="pc-tile g-brown"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.75 }}
                        style={{
                            gridColumn: 'span 1',
                            gridRow: 'span 1',
                            ...tileStyle,
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'column',
                            padding: '20px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <StatCarousel />
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
                                            width: '95%',
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
                                            left: 0,
                                            right: 0,
                                            margin: '-30px auto 0 auto'
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

                    {/* 11. 3D Logo Carousel (Чистая сцена) */}
                    <motion.div
                        className="pc-tile"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.85 }}
                        style={{
                            gridColumn: 'span 2',
                            gridRow: 'span 1',
                            ...tileStyle,
                            padding: 0,
                            background: '#000000',
                            overflow: 'hidden',
                            position: 'relative',
                            border: '1px solid #333'
                        }}
                        ref={carouselRef}
                    >
                        {/* Текст поверх 3D сцены */}
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            left: '20px',
                            zIndex: 10,
                            pointerEvents: 'none'
                        }}>
                            <h3 style={{
                                fontSize: '24px',
                                color: '#fff',
                                fontFamily: 'Alro, sans-serif',
                                fontWeight: 'bold',
                                margin: 0,
                                textShadow: '0 2px 8px rgba(0,0,0,0.5)'
                            }}>Наши партнеры</h3>
                        </div>

                        <div style={{ width: '100%', height: '100%', cursor: 'grab' }}>
                            {carouselVisible && !shouldReduceMotion && !isMobile && (
                                <React.Suspense fallback={<div style={{ width: '100%', height: '100%', background: '#000' }} />}>
                                    <CarouselScene />
                                </React.Suspense>
                            )}
                        </div>
                    </motion.div>


                </div> {/* ⬅️ ЗАКРЫВАЕМ НИЖНЮЮ СЕТКУ (SECONDARY) */}
            </div> {/* ⬅️ ЗАКРЫВАЕМ CONTAINER-FLUID */}

            <style>{`
                /* === BASE STYLES === */
                .pc-tiles { 
                    display: grid; 
                    gap: 20px; 
                    width: 100%; 
                    margin: 0 auto; 
                    max-width: 1600px;
                    padding: 0 20px;
                }
                
                .pc-tiles-primary { 
                    grid-template-columns: repeat(5, 1fr); 
                    grid-auto-rows: minmax(clamp(140px, 12vh, 220px), auto); 
                }
                
                .pc-tiles-secondary { 
                    grid-template-columns: repeat(8, 1fr); 
                    grid-auto-rows: minmax(clamp(140px, 12vh, 220px), auto); 
                    margin-top: 20px; 
                }

                .pc-tile {
                    border-radius: 20px;
                    transition: transform 0.3s ease;
                }

                /* === COLOR CLASSES === */
                .g-blue { background-color: #2e6ffb; }
                .g-indigo { background-color: #6366f1; }
                .g-lime { background-color: #84cc16; }
                .g-teal { background-color: #14b8a6; }
                .g-pink { background-color: #ec4899; }
                .g-purple { background-color: #a855f7; }
                .g-green { background-color: #22c55e; }
                .g-magenta { background-color: #d946ef; }
                .g-brown { 
                    background: linear-gradient(135deg, rgba(74, 148, 199, 0.25), rgba(46, 84, 166, 0.80)); 
                    backdrop-filter: blur(20px); 
                    border: 1px solid rgba(255, 255, 255, 0.18); 
                }
                .g-gradient-main { 
                    background: linear-gradient(135deg, #2fef55ff, #2df5d3ff, #00f9a2ff); 
                }

                /* === ULTRA-WIDE DESKTOPS (2K+) === */
                @media (min-width: 2560px) {
                    .pc-tiles { 
                        max-width: 2400px; 
                        gap: 28px;
                        padding: 0 40px;
                    }
                    .pc-tiles-primary, .pc-tiles-secondary { 
                        grid-auto-rows: minmax(200px, auto); 
                    }
                }

                /* === LARGE DESKTOPS (1920px - 2559px) === */
                @media (min-width: 1920px) and (max-width: 2559px) {
                    .pc-tiles { 
                        max-width: 2000px; 
                        gap: 24px;
                        padding: 0 32px;
                    }
                    .pc-tiles-primary, .pc-tiles-secondary { 
                        grid-auto-rows: minmax(180px, auto); 
                    }
                }

                /* === STANDARD DESKTOPS (1600px - 1919px) === */
                @media (min-width: 1600px) and (max-width: 1919px) {
                    .pc-tiles { 
                        max-width: 1600px; 
                        gap: 20px;
                    }
                    .pc-tiles-primary, .pc-tiles-secondary { 
                        grid-auto-rows: minmax(160px, auto); 
                    }
                }

                /* === MEDIUM DESKTOPS (1440px - 1599px) === */
                @media (min-width: 1440px) and (max-width: 1599px) {
                    .pc-tiles { 
                        max-width: 1400px; 
                        gap: 18px;
                    }
                    .pc-tiles-primary { 
                        grid-template-columns: repeat(5, 1fr);
                        grid-auto-rows: minmax(150px, auto); 
                    }
                    .pc-tiles-secondary { 
                        grid-template-columns: repeat(6, 1fr);
                        grid-auto-rows: minmax(150px, auto); 
                    }
                }

                /* === SMALL DESKTOPS / LARGE LAPTOPS (1280px - 1439px) === */
                @media (min-width: 1280px) and (max-width: 1439px) {
                    .pc-tiles { 
                        max-width: 1200px; 
                        gap: 16px;
                    }
                    .pc-tiles-primary { 
                        grid-template-columns: repeat(4, 1fr);
                        grid-auto-rows: minmax(140px, auto); 
                    }
                    .pc-tiles-secondary { 
                        grid-template-columns: repeat(4, 1fr);
                        grid-auto-rows: minmax(140px, auto); 
                    }
                    /* Adjust main block to span less */
                    .pc-tile[style*="gridArea"] {
                        grid-area: auto !important;
                        grid-column: span 2 !important;
                        grid-row: span 2 !important;
                    }
                }

                /* === LAPTOPS (1024px - 1279px) === */
                @media (min-width: 1024px) and (max-width: 1279px) {
                    .pc-tiles { 
                        max-width: 1000px; 
                        gap: 16px;
                    }
                    .pc-tiles-primary { 
                        grid-template-columns: repeat(3, 1fr);
                        grid-auto-rows: minmax(160px, auto); 
                    }
                    .pc-tiles-secondary { 
                        grid-template-columns: repeat(3, 1fr);
                        grid-auto-rows: minmax(160px, auto); 
                    }
                    /* Reset inline grid styles */
                    .pc-tile {
                        grid-column: span 1 !important;
                        grid-row: span 1 !important;
                    }
                    /* Main block adjustments */
                    .pc-tile.g-gradient-main {
                        grid-column: span 3 !important;
                        grid-row: span 1 !important;
                    }
                }

                /* === TABLETS LANDSCAPE (768px - 1023px) === */
                @media (min-width: 768px) and (max-width: 1023px) {
                    .pc-tiles { 
                        max-width: 100%; 
                        gap: 14px;
                        padding: 0 16px;
                    }
                    .pc-tiles-primary, .pc-tiles-secondary { 
                        grid-template-columns: repeat(2, 1fr);
                        grid-auto-rows: minmax(180px, auto); 
                    }
                    .pc-tile {
                        grid-column: span 1 !important;
                        grid-row: span 1 !important;
                    }
                    /* Main block full width */
                    .pc-tile.g-gradient-main {
                        grid-column: span 2 !important;
                        grid-row: span 1 !important;
                    }
                    /* Adjust font sizes */
                    .pc-tile h1 {
                        font-size: 3rem !important;
                    }
                    .pc-tile h3 {
                        font-size: 14px !important;
                    }
                    .pc-tile p {
                        font-size: 12px !important;
                    }
                }

                /* === TABLETS PORTRAIT (640px - 767px) === */
                @media (min-width: 640px) and (max-width: 767px) {
                    .pc-tiles { 
                        gap: 12px;
                        padding: 0 12px;
                    }
                    .pc-tiles-primary, .pc-tiles-secondary { 
                        grid-template-columns: 1fr;
                        grid-auto-rows: minmax(160px, auto); 
                    }
                    .pc-tile {
                        grid-column: span 1 !important;
                        grid-row: span 1 !important;
                        min-height: 160px;
                    }
                    /* Stack everything vertically */
                    .pc-tile.g-gradient-main {
                        grid-column: span 1 !important;
                        grid-row: span 1 !important;
                    }
                }

                /* === MOBILE (< 640px) === */
                @media (max-width: 639px) {
                    .pc-tiles-primary, .pc-tiles-secondary { 
                        display: flex; 
                        flex-direction: column; 
                        gap: 12px;
                    }
                    .pc-tile { 
                        width: 100% !important; 
                        min-height: 140px;
                        grid-column: auto !important;
                        grid-row: auto !important;
                    }
                    .pc-tile h1 {
                        font-size: 2.5rem !important;
                    }
                }

                /* === PRINT STYLES === */
                @media print {
                    .pc-tiles {
                        grid-template-columns: 1fr !important;
                    }
                    .pc-tile {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }

                /* === HOVER EFFECTS (NON-TOUCH DEVICES) === */
                @media (hover: hover) and (pointer: fine) {
                    .pc-tile:hover {
                        transform: translateY(-2px);
                    }
                }

                /* === HIGH DPI SCREENS === */
                @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
                    .pc-tile {
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    }
                }
            `}</style>
        </section>
    );
};

export default Hero;