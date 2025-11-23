import React from 'react';
import { motion } from 'framer-motion';
import { Section, Headline, Subtext, Badge } from './Shared';
import { Check, Sparkles, Gift, Star, Crown } from 'lucide-react';

const PricingCard = ({ title, price, afterPrice, features, recommended, isFree, gradientColor, icon: Icon, delay, onSubscribe }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, type: "spring", stiffness: 100 }}
            style={{ position: 'relative', height: '100%' }}
        >
            {recommended && (
                <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: '#fff',
                    padding: '5px 16px',
                    borderRadius: '980px',
                    fontSize: 'clamp(10px, 1vw, 12px)',
                    fontWeight: 700,
                    zIndex: 10,
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.6)',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap'
                }}>
                    Рекомендуем
                </div>
            )}

            <div style={{
                background: 'rgba(22, 22, 23, 0.6)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: 'clamp(18px, 2vw, 24px)',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: recommended ? '2px solid rgba(102, 126, 234, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: recommended
                    ? '0 10px 40px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(102, 126, 234, 0.2)'
                    : '0 10px 40px rgba(0,0,0,0.4)',
                transition: 'all 0.4s cubic-bezier(0.28, 0.11, 0.32, 1)'
            }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                    if (recommended) {
                        e.currentTarget.style.boxShadow = '0 20px 60px rgba(102, 126, 234, 0.6), 0 0 0 1px rgba(102, 126, 234, 0.4)';
                    } else {
                        e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.6)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    if (recommended) {
                        e.currentTarget.style.boxShadow = '0 10px 40px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(102, 126, 234, 0.2)';
                    } else {
                        e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.4)';
                    }
                }}
            >
                {/* Header with gradient - CENTERED */}
                <div style={{
                    background: gradientColor,
                    padding: 'clamp(32px, 5vw, 64px) clamp(16px, 2vw, 24px)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 'clamp(160px, 20vw, 220px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                }}>
                    {/* Multiple decorative glow blobs */}
                    <div style={{
                        position: 'absolute',
                        top: '-30%',
                        right: '-20%',
                        width: 'clamp(120px, 20vw, 200px)',
                        height: 'clamp(120px, 20vw, 200px)',
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: '50%',
                        filter: 'blur(60px)'
                    }} />
                    <div style={{
                        position: 'absolute',
                        bottom: '-20%',
                        left: '-15%',
                        width: 'clamp(100px, 18vw, 150px)',
                        height: 'clamp(100px, 18vw, 150px)',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '50%',
                        filter: 'blur(50px)'
                    }} />

                    {/* Icon - Centered & Responsive */}
                    <div style={{
                        width: 'clamp(56px, 8vw, 72px)',
                        height: 'clamp(56px, 8vw, 72px)',
                        background: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 'clamp(14px, 2vw, 18px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 'clamp(12px, 2vw, 20px)',
                        position: 'relative',
                        zIndex: 1,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
                    }}>
                        <Icon size={window.innerWidth >= 1440 ? 36 : window.innerWidth >= 768 ? 32 : 28} color="#fff" strokeWidth={2} />
                    </div>

                    {/* Title - Centered & Responsive */}
                    <h3 style={{
                        fontSize: 'clamp(26px, 4vw, 36px)',
                        fontWeight: 800,
                        color: '#fff',
                        position: 'relative',
                        zIndex: 1,
                        lineHeight: 1.1,
                        margin: 0
                    }}>
                        {title}
                    </h3>
                </div>

                {/* Glass panel content section */}
                <div style={{
                    padding: 'clamp(16px, 2.5vw, 24px)',
                    flex: '1 1 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(29, 29, 31, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                }}>
                    <div style={{ marginBottom: 'clamp(16px, 2vw, 24px)' }}>
                        <div style={{
                            fontSize: 'clamp(36px, 5vw, 48px)',
                            fontWeight: 900,
                            lineHeight: 1,
                            color: '#f5f5f7',
                            marginBottom: '4px'
                        }}>
                            {price}
                        </div>
                        {afterPrice && (
                            <div style={{ fontSize: 'clamp(12px, 1.2vw, 14px)', color: 'var(--text-secondary)' }}>{afterPrice}</div>
                        )}
                    </div>

                    <ul style={{
                        listStyle: 'none',
                        marginBottom: 'clamp(20px, 3vw, 32px)',
                        display: 'grid',
                        gap: 'clamp(10px, 1.5vw, 12px)',
                        flex: '1 1 auto',
                        padding: 0
                    }}>
                        {features.map((f, i) => {
                            const isActive = typeof f === 'object' ? f.active !== false : true;
                            const text = typeof f === 'object' ? f.text : f;

                            return (
                                <li key={i} style={{
                                    display: 'flex',
                                    gap: '10px',
                                    fontSize: 'clamp(14px, 1.3vw, 15px)',
                                    color: isActive ? '#f5f5f7' : '#4a4a4a',
                                    alignItems: 'flex-start',
                                    lineHeight: 1.5
                                }}>
                                    <Check
                                        size={18}
                                        color={isActive ? 'var(--success)' : '#2a2a2a'}
                                        style={{ flexShrink: 0, marginTop: '3px' }}
                                    />
                                    <span>{text}</span>
                                </li>
                            );
                        })}
                    </ul>

                    <div style={{ flex: '0 0 auto' }}>
                        {!isFree && (
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onSubscribe(recommended ? 'premium' : 'pro')}
                                style={{
                                    width: '100%',
                                    padding: 'clamp(14px, 2vw, 16px) clamp(24px, 3vw, 32px)',
                                    fontSize: 'clamp(15px, 1.5vw, 17px)',
                                    fontWeight: 700,
                                    borderRadius: '980px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: recommended
                                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                        : 'linear-gradient(135deg, #0071e3 0%, #00a3ff 100%)',
                                    color: '#fff',
                                    boxShadow: recommended
                                        ? '0 8px 24px rgba(102, 126, 234, 0.5)'
                                        : '0 8px 24px rgba(0, 113, 227, 0.4)',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = recommended
                                        ? '0 12px 32px rgba(102, 126, 234, 0.7)'
                                        : '0 12px 32px rgba(0, 113, 227, 0.6)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = recommended
                                        ? '0 8px 24px rgba(102, 126, 234, 0.5)'
                                        : '0 8px 24px rgba(0, 113, 227, 0.4)';
                                }}
                            >
                                Начать сейчас
                            </motion.button>
                        )}
                        {isFree && (
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => window.open('https://t.me/caster_ai_bot', '_blank')}
                                style={{
                                    width: '100%',
                                    padding: 'clamp(14px, 2vw, 16px) clamp(24px, 3vw, 32px)',
                                    fontSize: 'clamp(15px, 1.5vw, 17px)',
                                    fontWeight: 700,
                                    borderRadius: '980px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(10px)',
                                    color: '#f5f5f7',
                                    boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                    e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.2)';
                                }}
                            >
                                Создать анкету
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const Pricing = ({ onSubscribe }) => {
    return (
        <Section id="pricing" style={{
            background: 'var(--bg)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background decorative glows */}
            <div style={{
                position: 'absolute',
                top: '10%',
                left: '5%',
                width: 'clamp(250px, 30vw, 400px)',
                height: 'clamp(250px, 30vw, 400px)',
                background: 'radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)',
                filter: 'blur(100px)',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute',
                bottom: '10%',
                right: '5%',
                width: 'clamp(200px, 25vw, 350px)',
                height: 'clamp(200px, 25vw, 350px)',
                background: 'radial-gradient(circle, rgba(118, 75, 162, 0.12) 0%, transparent 70%)',
                filter: 'blur(100px)',
                pointerEvents: 'none'
            }} />

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: 'clamp(40px, 8vw, 80px)' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{ marginBottom: '16px' }}
                    >
                        <Badge
                            icon={<Sparkles size={14} />}
                            style={{
                                background: 'rgba(102, 126, 234, 0.15)',
                                color: '#a8b5ff',
                                border: '1px solid rgba(102, 126, 234, 0.3)',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            Наши тарифы
                        </Badge>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                    >
                        <Headline size="medium" className="mb-md">
                            Простые <span className="text-gradient">цены</span>
                        </Headline>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <Subtext>
                            Выберите из трёх планов — Бесплатный, Стандарт и Профессионал
                        </Subtext>
                    </motion.div>
                </div>

                <div className="grid grid-3" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <PricingCard
                        title="Бесплатный"
                        price="0 ₸"
                        icon={Gift}
                        gradientColor="linear-gradient(135deg, #a8b5ff 0%, #8fa0ff 100%)"
                        features={[
                            'Размещение анкеты в базе',
                            'Видимость для кастинг-директоров',
                            { text: 'Автоподбор кастингов', active: false },
                            { text: 'Уведомления в Telegram', active: false },
                            { text: 'Отклик в 1 клик', active: false }
                        ]}
                        isFree={true}
                        recommended={false}
                        delay={0}
                        onSubscribe={onSubscribe}
                    />

                    <PricingCard
                        title="Стандарт"
                        price="30 ₸"
                        afterPrice="первый месяц, далее 3 490 ₸/мес"
                        icon={Star}
                        gradientColor="linear-gradient(135deg, #0071e3 0%, #00a3ff 100%)"
                        features={[
                            'Всё из тарифа «Бесплатный»',
                            'Сборка из 30+ WA/TG чатов',
                            'Автоподбор по профилю',
                            'Моментальные уведомления',
                            'Отклик в 1 клик'
                        ]}
                        recommended={false}
                        delay={0.1}
                        onSubscribe={onSubscribe}
                    />

                    <PricingCard
                        title="Профессионал"
                        price="30 ₸"
                        afterPrice="первый месяц, далее 4 490 ₸/мес"
                        icon={Crown}
                        gradientColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        features={[
                            'Всё из тарифа «Стандарт»',
                            'Фильтр: массовка / роль / реклама',
                            'Приоритетная поддержка',
                            'Ранний доступ к новым функциям'
                        ]}
                        recommended={true}
                        delay={0.2}
                        onSubscribe={onSubscribe}
                    />
                </div>
            </div>
        </Section>
    );
};

export default Pricing;
