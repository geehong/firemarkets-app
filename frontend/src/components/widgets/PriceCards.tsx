"use client";

import React from 'react';

// --- Types ---
export interface CryptoPriceCardProps {
    // Data
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    icon?: string;

    // Style Customization
    gradientFrom?: string;
    gradientTo?: string;
    textColor?: string;
    changePositiveColor?: string;
    changeNegativeColor?: string;

    // Layout
    showIcon?: boolean;
    showChangePercent?: boolean;
    size?: 'small' | 'medium' | 'large';
    className?: string;
}

export interface CryptoMetricCardProps {
    // Data
    symbol: string;
    name: string;
    metricValue: string | number;
    metricLabel: string;
    icon?: string;

    // Style Customization
    gradientFrom?: string;
    gradientTo?: string;
    textColor?: string;
    labelColor?: string;

    // Layout
    showIcon?: boolean;
    size?: 'small' | 'medium' | 'large';
    className?: string;
}

// --- Components ---

export const CryptoPriceCard: React.FC<CryptoPriceCardProps> = ({
    symbol,
    name,
    price,
    change24h,
    icon = '₿',
    gradientFrom = 'from-orange-500',
    gradientTo = 'to-yellow-500',
    textColor = 'text-white',
    changePositiveColor = 'text-green-100',
    changeNegativeColor = 'text-red-100',
    showIcon = true,
    showChangePercent = true,
    size = 'medium',
    className = '',
}) => {
    // Size Styles
    const sizeStyles: Record<'small' | 'medium' | 'large', {
        container: string;
        title: string;
        icon: string;
        price: string;
        change: string;
    }> = {
        small: {
            container: 'p-4',
            title: 'text-base font-semibold',
            icon: 'text-2xl',
            price: 'text-2xl font-bold mb-1',
            change: 'text-base font-medium',
        },
        medium: {
            container: 'p-6',
            title: 'text-lg font-semibold',
            icon: 'text-3xl',
            price: 'text-3xl font-bold mb-2',
            change: 'text-lg font-medium',
        },
        large: {
            container: 'p-8',
            title: 'text-xl font-semibold',
            icon: 'text-4xl',
            price: 'text-4xl font-bold mb-3',
            change: 'text-xl font-medium',
        },
    };

    const currentSize = sizeStyles[size];
    const changeColor = change24h >= 0 ? changePositiveColor : changeNegativeColor;

    return (
        <div
            className={`
        bg-gradient-to-br ${gradientFrom} ${gradientTo} 
        rounded-lg shadow-lg ${textColor}
        ${currentSize.container}
        hover:shadow-xl transition-shadow duration-300
        ${className}
      `}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h3 className={currentSize.title}>
                    {name} ({symbol})
                </h3>
                {showIcon && (
                    <span className={currentSize.icon} aria-label={`${name} icon`}>
                        {icon}
                    </span>
                )}
            </div>

            {/* Price */}
            <div className={currentSize.price}>
                ${price.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}
            </div>

            {/* 24h Change */}
            {showChangePercent && (
                <div className={`${currentSize.change} ${changeColor}`}>
                    {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% (24h)
                </div>
            )}
        </div>
    );
};

export const CryptoMetricCard: React.FC<CryptoMetricCardProps> = ({
    symbol,
    name,
    metricValue,
    metricLabel,
    icon = 'Ξ',
    gradientFrom = 'from-blue-500',
    gradientTo = 'to-purple-500',
    textColor = 'text-white',
    labelColor = 'text-blue-100',
    showIcon = true,
    size = 'medium',
    className = '',
}) => {
    // Size Styles
    const sizeStyles: Record<'small' | 'medium' | 'large', {
        container: string;
        title: string;
        icon: string;
        value: string;
        label: string;
    }> = {
        small: {
            container: 'p-4',
            title: 'text-base font-semibold',
            icon: 'text-2xl',
            value: 'text-2xl font-bold mb-1',
            label: 'text-base font-medium',
        },
        medium: {
            container: 'p-6',
            title: 'text-lg font-semibold',
            icon: 'text-3xl',
            value: 'text-3xl font-bold mb-2',
            label: 'text-lg font-medium',
        },
        large: {
            container: 'p-8',
            title: 'text-xl font-semibold',
            icon: 'text-4xl',
            value: 'text-4xl font-bold mb-3',
            label: 'text-xl font-medium',
        },
    };

    const currentSize = sizeStyles[size];

    return (
        <div
            className={`
        bg-gradient-to-br ${gradientFrom} ${gradientTo} 
        rounded-lg shadow-lg ${textColor}
        ${currentSize.container}
        hover:shadow-xl transition-shadow duration-300
        ${className}
      `}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h3 className={currentSize.title}>
                    {name} ({symbol})
                </h3>
                {showIcon && (
                    <span className={currentSize.icon} aria-label={`${name} icon`}>
                        {icon}
                    </span>
                )}
            </div>

            {/* Metric Value */}
            <div className={currentSize.value}>
                {typeof metricValue === 'number'
                    ? metricValue.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })
                    : metricValue
                }
            </div>

            {/* Metric Label */}
            <div className={`${currentSize.label} ${labelColor}`}>
                {metricLabel}
            </div>
        </div>
    );
};
