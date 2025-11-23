import React from 'react';
import { motion } from 'framer-motion';

/* Apple-style Button Component */
export const Button = ({ children, variant = 'primary', size = 'medium', className = '', style = {}, ...props }) => {
    const baseStyles = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '980px',
        fontWeight: 500,
        fontSize: size === 'large' ? '17px' : '15px',
        padding: size === 'large' ? '16px 32px' : '12px 24px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.28, 0.11, 0.32, 1)',
        whiteSpace: 'nowrap',
    };

    const variants = {
        primary: {
            background: '#0071e3',
            color: '#ffffff',
        },
        secondary: {
            background: 'transparent',
            color: '#0071e3',
            border: '1px solid #0071e3',
        },
        dark: {
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#f5f5f7',
        }
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ ...baseStyles, ...variants[variant], ...style }}
            className={className}
            {...props}
        >
            {children}
        </motion.button>
    );
};

/* Apple-style Card - Now with equal height support */
export const Card = ({ children, className = '', style = {} }) => {
    return (
        <div
            className={`card ${className}`}
            style={style}
        >
            {children}
        </div>
    );
};

/* Badge Component */
export const Badge = ({ children, icon, style = {} }) => {
    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '980px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#f5f5f7',
            ...style
        }}>
            {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
            {children}
        </div>
    );
};

/* Icon Wrapper Component */
export const IconWrapper = ({ icon, color = '#0071e3' }) => {
    return (
        <div className="icon-wrapper" style={{
            background: `${color}15`,
        }}>
            {React.cloneElement(icon, {
                size: 24,
                color: color,
                strokeWidth: 2
            })}
        </div>
    );
};

/* Hero Headline Component */
export const Headline = ({ children, size = 'large', className = '' }) => {
    const Tag = size === 'large' ? 'h1' : 'h2';
    return <Tag className={className}>{children}</Tag>;
};

/* Subtext Component */
export const Subtext = ({ children, className = '' }) => {
    return (
        <p className={`text-secondary ${className}`} style={{ maxWidth: '600px', margin: '0 auto' }}>
            {children}
        </p>
    );
};

/* Section Component */
export const Section = ({ children, compact = false, id, className = '', style = {} }) => {
    return (
        <section id={id} className={`section ${compact ? 'section-compact' : ''} ${className}`} style={style}>
            <div className="container">
                {children}
            </div>
        </section>
    );
};

/* Feature Item for Grid - Equal Height */
export const Feature = ({ icon, title, description }) => {
    return (
        <Card>
            <IconWrapper icon={icon} />
            <h4 style={{ marginBottom: '12px', fontSize: '20px', flex: '0 0 auto' }}>{title}</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '17px', flex: '1 1 auto', margin: 0 }}>{description}</p>
        </Card>
    );
};
