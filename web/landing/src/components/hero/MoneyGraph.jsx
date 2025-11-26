import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

const MoneyGraph = ({ tileStyle }) => {
    const progress = useMotionValue(0);
    const count = useTransform(progress, [0, 1], [0, 480]);
    const rounded = useTransform(count, (latest) => Math.round(latest));
    const numberRef = useRef(null);

    useEffect(() => {
        const unsubscribe = rounded.on("change", (latest) => {
            if (numberRef.current) {
                numberRef.current.textContent = latest;
            }
        });
        return unsubscribe;
    }, [rounded]);

    useEffect(() => {
        const controls = animate(progress, 1, {
            duration: 3,
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: 1
        });
        return controls.stop;
    }, []);

    return (
        <motion.div
            className="pc-tile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
                gridColumn: '1',
                gridRow: '3',
                ...tileStyle,
                background: '#0a0a0a', // Dark background for neon contrast
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #3ec082'
            }}
        >
            {/* Background Grid */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                opacity: 0.3
            }} />

            {/* Graph Container */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end' }}>
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '70%', marginBottom: '0' }}>
                    <defs>
                        <linearGradient id="graphFillGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(62, 192, 130, 0.4)" />
                            <stop offset="100%" stopColor="rgba(62, 192, 130, 0)" />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#32CD32" />
                            <stop offset="50%" stopColor="#48D1CC" />
                            <stop offset="100%" stopColor="#5F9EA0" />
                        </linearGradient>
                    </defs>
                    {/* Area Fill - also animated to match */}
                    <motion.path
                        d="M0,50 L0,45 C20,45 30,35 50,25 C70,15 80,10 100,0 L100,50 Z"
                        fill="url(#graphFillGradient)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.5 }}
                    />
                    {/* Line */}
                    <motion.path
                        d="M0,45 C20,45 30,35 50,25 C70,15 80,10 100,0"
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        style={{ pathLength: progress }}
                    />
                </svg>
            </div>

            {/* Floating Money Signs (Sequential to Line) */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 30, opacity: 1 }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 0.2,
                        delay: i * 0.5,
                        ease: "easeOut"
                    }}
                    style={{
                        position: 'absolute',
                        left: `${10 + Math.random() * 80}%`,
                        color: '#3ec082',
                        fontSize: `${10 + Math.random() * 6}px`,
                        fontWeight: 'bold',
                        zIndex: 1,
                        textShadow: '0 0 4px rgba(62, 192, 130, 0.4)'
                    }}
                >
                    $
                </motion.div>
            ))}

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 2 }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 3, ease: "easeOut" }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                    <TrendingUp size={20} color="#3ec082" />
                    <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '0', fontFamily: 'Alro, sans-serif' }}>Зарабатывай больше на</h3>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff', textShadow: '0 0 10px rgba(62, 192, 130, 0.5)' }}>
                        <span ref={numberRef}>0</span>%
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default React.memo(MoneyGraph);
