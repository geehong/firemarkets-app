"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFearAndGreed } from '@/hooks/analysis/useFearAndGreed';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// Dynamic imports for widgets
const Speedometer = dynamic(() => import('@/components/widgets/Speedometer'), { ssr: false });
const SolidGauge = dynamic(() => import('@/components/widgets/SolidGauge'), { ssr: false });

const GaugeCard: React.FC<{
    title: string;
    value: number | null;
    min: number;
    max: number;
    label: string;
    unit?: string;
    type: 'speed' | 'solid';
    loading?: boolean;
}> = ({ title, value, min, max, label, unit = '', type, loading }) => {
    return (
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-gray-800 p-2 shadow-sm hover:shadow-md transition-all h-[180px] flex flex-col items-center justify-center overflow-hidden">
             {loading ? (
                 <div className="animate-pulse flex flex-col items-center">
                     <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full mb-2" />
                     <div className="h-4 w-16 bg-gray-50 dark:bg-gray-800/50 rounded" />
                 </div>
             ) : (
                 <div className="w-full flex items-center justify-center -mt-2">
                    {type === 'speed' ? (
                        <Speedometer 
                            value={value} 
                            min={min} 
                            max={max} 
                            title={title} 
                            unit={unit} 
                            height={160} 
                        />
                    ) : (
                        <SolidGauge 
                            value={value} 
                            min={min} 
                            max={max} 
                            title={title} 
                            unit={unit} 
                            height={160} 
                        />
                    )}
                 </div>
             )}
        </div>
    );
};

const OnChainDashboardSummary: React.FC<{ locale: string }> = ({ locale }) => {
    // 1. Fear & Greed Index
    const { fngData, loading: fngLoading } = useFearAndGreed();
    
    // 2. AI News Sentiment (1d)
    const [aiSentiment, setAiSentiment] = useState<{ score: number; label: string; confidence: number } | null>(null);
    const [aiLoading, setAiLoading] = useState(true);

    useEffect(() => {
        const fetchAiSentiment = async () => {
            try {
                const res = await fetch(`/api/v2/assets/analysis/sentiment/history?period=1d&interval=1h`);
                if (!res.ok) return;
                const json = await res.json();
                
                if (Array.isArray(json) && json.length > 0) {
                    let totalPos = 0, totalNeg = 0, totalCount = 0;
                    json.forEach(p => {
                        totalPos += p.sentiment_counts.positive;
                        totalNeg += p.sentiment_counts.negative;
                        totalCount += p.total_count;
                    });
                    
                    if (totalCount > 0) {
                        const net = (totalPos - totalNeg) / totalCount;
                        const score = (net + 1) * 50;
                        const label = score > 60 ? 'Bullish' : score < 40 ? 'Bearish' : 'Neutral';
                        setAiSentiment({ score, label, confidence: 0 });
                    }
                }
            } catch (e) {
                console.error("AI sentiment fetch error", e);
            } finally {
                setAiLoading(false);
            }
        };
        fetchAiSentiment();
    }, []);

    // 3. Bitcoin Quant Score
    const { data: quantData, isLoading: quantLoading } = useQuery({
        queryKey: ['bitcoin', 'quant-timeseries'],
        queryFn: async () => apiClient.request('/crypto/bitcoin/quant-timeseries'),
        staleTime: 1000 * 60 * 60
    });

    const latestQuant = quantData?.timeseries_data?.length > 0 
        ? quantData.timeseries_data[quantData.timeseries_data.length - 1] 
        : null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <GaugeCard 
                title={locale === 'ko' ? "공탐지표" : "Fear & Greed"}
                value={fngData ? parseInt(fngData.value) : null}
                min={0}
                max={100}
                label={fngData?.value_classification || ''}
                type="solid"
                loading={fngLoading}
            />
            
            <GaugeCard 
                title={locale === 'ko' ? "AI 감성 (1일)" : "AI Sentiment (1d)"}
                value={aiSentiment ? aiSentiment.score : null}
                min={0}
                max={100}
                label={aiSentiment?.label || ''}
                type="solid"
                loading={aiLoading}
            />

            <GaugeCard 
                title={locale === 'ko' ? "퀀트 점수" : "Quant Score"}
                value={latestQuant ? latestQuant.normalized_score : null}
                min={0}
                max={100}
                label={latestQuant?.signal || ''}
                type="speed"
                loading={quantLoading}
                unit="pts"
            />
        </div>
    );
};

export default OnChainDashboardSummary;
