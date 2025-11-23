import React from 'react';
import { motion } from 'framer-motion';
import { Section } from './Shared';
import { Zap, Bell, Filter, Shield, Smartphone, Globe, Search, Star, MessageCircle, Clock, CheckCircle } from 'lucide-react';

const BentoGrid = () => {
    return (
        <Section id="features-grid" className="section-compact">
            <div className="container">
                <div className="pc-tiles">
                    {/* Large Hero Block - Left */}
                    <motion.div
                        className="pc-tile w2 h4 g-indigo"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span className="pc-chip">AI Monitoring</span>
                            <Zap color="#fff" size={24} />
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <h3 style={{ fontSize: '32px', lineHeight: '1.1', marginBottom: '10px', color: '#fff' }}>
                                24/7 Поиск<br />кастингов
                            </h3>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '17px' }}>
                                ИИ сканирует 20+ источников каждую секунду, чтобы вы не упустили свой шанс.
                            </p>
                        </div>

                        {/* Abstract UI representation */}
                        <div style={{
                            marginTop: '30px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#30d158' }}></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ width: '60%', height: '10px', background: 'rgba(255,255,255,0.5)', borderRadius: '5px', marginBottom: '8px' }}></div>
                                    <div style={{ width: '40%', height: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '5px' }}></div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0071e3' }}></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ width: '70%', height: '10px', background: 'rgba(255,255,255,0.5)', borderRadius: '5px', marginBottom: '8px' }}></div>
                                    <div style={{ width: '50%', height: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '5px' }}></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Top Right - Notification Block */}
                    <motion.div
                        className="pc-tile w2 h2 g-blue"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
                    >
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '16px'
                        }}>
                            <Bell size={30} color="#fff" />
                        </div>
                        <h4 style={{ color: '#fff', marginBottom: '8px' }}>Мгновенные уведомления</h4>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px' }}>Узнавайте о ролях первыми</p>
                    </motion.div>

                    {/* Middle Right - 2 small blocks */}
                    <motion.div
                        className="pc-tile w1 h2 g-purple"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    >
                        <Filter size={24} color="#fff" />
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>Smart</div>
                            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Фильтры</div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="pc-tile w1 h2 g-pink"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    >
                        <Shield size={24} color="#fff" />
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>No</div>
                            <div style={{ color: 'rgba(255,255,255,0.7)' }}>Spam</div>
                        </div>
                    </motion.div>

                    {/* Bottom Right - Wide Block */}
                    <motion.div
                        className="pc-tile w2 h2 g-orange"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}
                    >
                        <div style={{ zIndex: 2, maxWidth: '60%' }}>
                            <h4 style={{ color: '#fff', fontSize: '22px', marginBottom: '8px' }}>Telegram Bot</h4>
                            <p style={{ color: 'rgba(255,255,255,0.8)' }}>Все управление прямо в мессенджере</p>
                        </div>
                        <div style={{
                            position: 'absolute', right: '-20px', bottom: '-30px',
                            width: '140px', height: '140px', background: 'rgba(255,255,255,0.1)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <MessageCircle size={60} color="rgba(255,255,255,0.3)" />
                        </div>
                    </motion.div>

                    <motion.div
                        className="pc-tile w1 h2 g-green"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 }}
                        style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                    >
                        <CheckCircle size={32} color="#fff" style={{ marginBottom: '12px' }} />
                        <div style={{ fontWeight: '600', color: '#fff' }}>Проверено</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Real Directors</div>
                    </motion.div>

                    <motion.div
                        className="pc-tile w1 h2 g-yellow"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.7 }}
                        style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                    >
                        <Star size={32} color="#fff" style={{ marginBottom: '10px' }} />
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>4.9</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Rating</div>
                    </motion.div>

                </div>
            </div>
        </Section>
    );
};

export default BentoGrid;
