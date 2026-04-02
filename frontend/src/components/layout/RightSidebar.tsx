'use client';

import React, { useState, useEffect } from 'react';
import SidebarAdsWidget from './SidebarAdsWidget';
import { ChevronRight, ChevronLeft, ChevronUp, PanelRightClose, PanelRightOpen } from 'lucide-react';

const RightSidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showButton, setShowButton] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        // Toggle button appears after 10s
        const timer = setTimeout(() => {
            setShowButton(true);
        }, 10000);

        const handleScroll = () => {
            setIsScrolled(window.scrollY > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div 
            className="hidden lg:block relative transition-all duration-700 ease-in-out"
            style={{ 
                width: isCollapsed ? '0px' : '300px', 
                minWidth: isCollapsed ? '0px' : '300px',
                marginLeft: isCollapsed ? '-32px' : '0px'
            }}
        >
            {/* Floating Action Buttons at Bottom Right */}
            <div 
                className={`fixed bottom-8 right-8 z-[100] flex flex-col gap-2 transition-all duration-500 ${
                    showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
                }`}
            >
                {/* Scroll to Top - Only show if scrolled */}
                <button 
                    onClick={scrollToTop}
                    className={`w-12 h-12 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        isScrolled ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
                    }`}
                    title="맨 위로 (Scroll to Top)"
                >
                    <ChevronUp className="w-6 h-6 text-gray-500" />
                </button>

                {/* Sidebar Toggle - Primary Controller */}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 group relative overflow-hidden"
                    title={isCollapsed ? "사이드바 펼치기 (Expand Sidebar)" : "사이드바 접기 (Collapse Sidebar)"}
                >
                    {isCollapsed ? (
                        <PanelRightOpen className="w-6 h-6 text-blue-500" />
                    ) : (
                        <PanelRightClose className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                    )}
                    {/* Pulsing indicator when collapsed */}
                    {isCollapsed && (
                        <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
                    )}
                </button>
            </div>

            {/* Sidebar Content */}
            <div className={`sticky top-28 space-y-6 transition-all duration-700 ${isCollapsed ? 'opacity-0 pointer-events-none scale-95 translate-x-10' : 'opacity-100 scale-100 translate-x-0'}`}>
                <div className="w-[300px]">
                    <SidebarAdsWidget />
                </div>
            </div>
        </div>
    );
};

export default RightSidebar;
