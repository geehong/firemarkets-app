'use client';

import React, { useEffect, useRef } from 'react';

interface AdUnitProps {
    slot: string;
    format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
    layoutKey?: string;
    responsive?: boolean;
    style?: React.CSSProperties;
    className?: string;
    label?: string; // Optional label like "Advertisement"
}

const AdUnit: React.FC<AdUnitProps> = ({
    slot,
    format = 'auto',
    layoutKey,
    responsive = true,
    style,
    className,
    label
}) => {
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        try {
            if (adRef.current) {
                console.log(`[AdUnit Debug] Slot: ${slot}, Width: ${adRef.current.offsetWidth}, Height: ${adRef.current.offsetHeight}, ClientHeight: ${adRef.current.clientHeight}`);
                if (adRef.current.offsetWidth === 0 || adRef.current.offsetHeight === 0) {
                    console.warn(`[AdUnit Warning] AdUnit ${slot} has 0 dimensions! Ads may not load.`);
                }
            }

            // Check if window.adsbygoogle maps to an array before pushing
            console.log(`[AdUnit Debug] Pushing ad request for slot ${slot}`);
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error('AdSense error:', e);
        }
    }, [slot]); // Rerun if slot changes, though usually static

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
        <div className={`ad-container w-full flex flex-col items-center ${className}`}>
            {label && (
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                    {label}
                </div>
            )}
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', ...style }}
                data-ad-client="ca-pub-1199110233969910"
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive={responsive}
                data-ad-layout-key={layoutKey}
            />
        </div>
    );
};

export default AdUnit;
