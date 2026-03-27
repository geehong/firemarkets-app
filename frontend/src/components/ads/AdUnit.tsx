'use client';

import React, { useEffect, useRef } from 'react';

interface AdUnitProps {
    slot: string;
    format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical' | 'autorelaxed';
    layoutKey?: string;
    layout?: string; // For in-article ads (e.g. "in-article")
    responsive?: boolean;
    style?: React.CSSProperties;
    className?: string;
    label?: string; // Optional label like "Advertisement"
}

const AdUnit: React.FC<AdUnitProps> = ({
    slot,
    format = 'auto',
    layoutKey,
    layout,
    responsive = true,
    style,
    className,
    label
}) => {
    const adRef = useRef<HTMLModElement>(null);
    const [mounted, setMounted] = React.useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        
        // Use a small timeout to ensure the DOM is fully updated with the 'ins' tag
        const timer = setTimeout(() => {
            try {
                // Check if the ad unit has already been processed by AdSense
                const adElement = adRef.current;
                if (adElement && (adElement.getAttribute('data-adsbygoogle-status') === 'done')) {
                    // console.log(`[AdUnit Debug] Ad already initialized for slot ${slot}`);
                    return;
                }

                // Ensure window.adsbygoogle is available and then push
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                // console.log(`[AdUnit Debug] Successfully pushed ad request for slot ${slot}`);
            } catch (e: any) {
                // Handle the common error where push is called but tags are not yet ready or already filled
                if (e && e.message && e.message.includes('All \'ins\' elements in the DOM')) {
                    // console.warn(`[AdUnit Info] AdSense reported all units filled for slot ${slot}. This is common during navigation.`);
                } else {
                    console.error('AdSense error:', e);
                }
            }
        }, 100); // 100ms delay to be safe

        return () => clearTimeout(timer);
    }, [mounted, slot]); // Rerun if slot changes or on mount

    // Hydration guard: only render ad units on the client side
    if (!mounted) {
        return (
            <div 
                className={`ad-placeholder w-full flex flex-col items-center ${className}`}
                style={{ minHeight: style?.height || '90px', ...style }}
            />
        );
    }

    // Development mode placeholder
    if (process.env.NODE_ENV === 'development') {
        return (
            <div 
                className={`bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 text-sm p-4 ${className}`}
                style={{ minHeight: '100px', ...style }}
            >
                <div className="font-bold">AdSense Placeholder</div>
                <div>Slot: {slot}</div>
                <div>Format: {format}</div>
            </div>
        );
    }

    return (
        <div className={`ad-container w-full flex flex-col items-center ${className} ${format === 'fluid' ? 'fluid-ad' : ''}`}>
            {label && (
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                    {label}
                </div>
            )}
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', textAlign: layout === 'in-article' ? 'center' : undefined, ...style }}
                data-ad-client="ca-pub-1199110233969910"
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive={responsive}
                data-ad-layout-key={layoutKey}
                data-ad-layout={layout}
            />
        </div>
    );
};

export default AdUnit;
