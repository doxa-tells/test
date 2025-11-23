import React from 'react';
import { motion } from 'framer-motion';

const DemoAnimation = () => {
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px', perspective: '1000px' }}>
            {/* Phone Frame */}
            <motion.div
                initial={{ rotateX: 10, rotateY: -10, y: 20 }}
                animate={{ rotateX: 5, rotateY: -5, y: 0 }}
                transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                style={{
                    width: '280px', height: '560px', background: '#000', borderRadius: '40px', border: '8px solid #333',
                    margin: '0 auto', position: 'relative', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}
            >
                {/* Screen Content */}
                <div style={{ background: '#0f172a', height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* Notification Pop */}
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        style={{
                            background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '10px', borderRadius: '12px',
                            display: 'flex', gap: '10px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Telegram • Now</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>New Casting Match! 🎬</div>
                        </div>
                    </motion.div>

                    {/* Casting Card */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 1.5 }}
                        style={{
                            background: '#1e293b', borderRadius: '16px', padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}
                    >
                        <div style={{ height: '120px', background: '#334155', borderRadius: '8px' }}></div>
                        <div style={{ height: '16px', width: '70%', background: '#475569', borderRadius: '4px' }}></div>
                        <div style={{ height: '12px', width: '40%', background: '#475569', borderRadius: '4px' }}></div>
                        <div style={{ height: '12px', width: '90%', background: '#334155', borderRadius: '4px', marginTop: '10px' }}></div>
                        <div style={{ height: '12px', width: '80%', background: '#334155', borderRadius: '4px' }}></div>

                        <motion.button
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 0.95, 1] }}
                            transition={{ delay: 3, duration: 0.3 }}
                            style={{
                                marginTop: 'auto', background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold'
                            }}
                        >
                            Apply in 1-Click
                        </motion.button>
                    </motion.div>

                </div>
            </motion.div>
        </div>
    );
};

export default DemoAnimation;
