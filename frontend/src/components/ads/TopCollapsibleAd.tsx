"use client";

import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import AdUnit from './AdUnit';

interface TopCollapsibleAdProps {
    slot: string;
    format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical'; // AdUnit supports these
    layoutKey?: string;
    label?: string;
    className?: string; // Additional classes for the wrapper
}

const TopCollapsibleAd: React.FC<TopCollapsibleAdProps> = ({
    slot,
    format = 'fluid',
    layoutKey,
    label,
    className
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isVisible, setIsVisible] = useState(true); // For animation handling

    useEffect(() => {
        // Random duration between 5000ms (5s) and 10000ms (10s)
        const delay = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
        
        console.log(`[TopCollapsibleAd] Auto-collapse scheduled in ${delay}ms`);

        const timer = setTimeout(() => {
            setIsCollapsed(true);
        }, delay);

        return () => clearTimeout(timer);
    }, []);

    // Handle animation visibility sync
    useEffect(() => {
        if (isCollapsed) {
            const timer = setTimeout(() => setIsVisible(false), 500); // Wait for transition
            return () => clearTimeout(timer);
        } else {
            setIsVisible(true);
        }
    }, [isCollapsed]);

    return (
        <div className={`w-full flex flex-col items-center bg-transparent transition-all duration-300 ${className}`}>
            {/* Ad Content Container */}
            <div 
                className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${
                    isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'
                }`}
            >
                {/* 
                   Centering Wrapper: 
                   We use 'flex justify-center' to ensure the inner AdUnit is centered.
                   We also pass textAlign: center to AdUnit's style to force internal text alignment.
                */}
                <div className="w-full flex justify-center py-4">
                    <div className="w-full max-w-[1200px] flex justify-center"> {/* Constrain max width if needed */}
                         <AdUnit 
                            slot={slot} 
                            format={format} 
                            layoutKey={layoutKey} 
                            label={label}
                            style={{ display: 'block', textAlign: 'center' }}
                        />
                    </div>
                </div>
            </div>

            {/* Toggle Button (Anchor-style) */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-center py-1.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border-y border-gray-100 dark:border-gray-700/50 transition-colors cursor-pointer group"
                title={isCollapsed ? "광고 펼치기" : "광고 접기"}
                aria-label={isCollapsed ? "Expand advertisement" : "Collapse advertisement"}
            >
                {isCollapsed ? (
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Advertisement (Click to Expand)</span>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                ) : (
                    <ChevronUp className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                )}
            </button>
        </div>
    );
};

export default TopCollapsibleAd;
