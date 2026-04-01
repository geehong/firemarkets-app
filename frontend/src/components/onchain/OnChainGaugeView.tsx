"use client"

import React from 'react';
import { useOnchainDashboard } from '@/hooks/useOnchain';
import Speedometer from '@/components/widgets/Speedometer';
import SolidGauge from '@/components/widgets/SolidGauge';
import ComponentCard from '@/components/common/ComponentCard';
import Alert from '@/components/ui/alert/Alert';

interface OnChainGaugeViewProps {
    locale?: string;
    ticker?: string;
    onSelect?: (metricId: string) => void;
}

const OnChainGaugeView: React.FC<OnChainGaugeViewProps> = ({ locale = 'en', ticker = 'BTCUSDT', onSelect }) => {
    const { data, loading, error } = useOnchainDashboard(ticker);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-500">Loading gauges...</span>
            </div>
        );
    }

    if (error) {
        return <Alert variant="error" title="Error" message="Failed to load gauge data" />;
    }

    const latestUpdates = data?.latest_updates || [];

    // Define specific configurations for metrics (min, max, etc.)
    const metricConfigs: Record<string, any> = {
        'mvrv_z_score': { min: -1, max: 8, title: 'MVRV Z-Score', type: 'speedometer' },
        'nupl': { min: -50, max: 100, unit: '%', title: 'NUPL', type: 'solid' },
        'sopr': { min: 0.8, max: 1.2, title: 'SOPR', type: 'speedometer' },
        'mvrv': { min: 0, max: 6, title: 'MVRV Ratio', type: 'speedometer' },
        'sth_mvrv': { min: 0, max: 3, title: 'STH MVRV', type: 'solid' },
        'lth_mvrv': { min: 0, max: 20, title: 'LTH MVRV', type: 'solid' },
        'utxos_in_profit_pct': { min: 0, max: 100, unit: '%', title: 'UTXOs in Profit', type: 'solid' },
        'utxos_in_loss_pct': { min: 0, max: 100, unit: '%', title: 'UTXOs in Loss', type: 'solid' },
        'rhodl_ratio': { min: 0, max: 30000, title: 'RHODL Ratio', type: 'speedometer' },
        'reserve_risk': { min: 0, max: 0.05, title: 'Reserve Risk', type: 'solid' },
        'puell_multiple': { min: 0, max: 10, title: 'Puell Multiple', type: 'speedometer' },
        'nvts': { min: 0, max: 180, title: 'NVT Signal', type: 'speedometer' },
        'funding_rate': { min: -0.05, max: 0.05, unit: '%', title: 'Funding Rate', type: 'speedometer' },
        'bitcoin_dominance': { min: 30, max: 70, unit: '%', title: 'BTC Dominance', type: 'solid' },
        'aviv': { min: 0, max: 4, title: 'AVIV Ratio', type: 'speedometer' },
        'lth_nupl': { min: -50, max: 100, unit: '%', title: 'LTH NUPL', type: 'solid' },
        'sth_nupl': { min: -50, max: 100, unit: '%', title: 'STH NUPL', type: 'solid' },
        'nvt': { min: 0, max: 100, title: 'NVT Ratio', type: 'speedometer' },
    };

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 p-2">
            {latestUpdates.map((update: any) => {
                // Get config or use dynamic fallback
                const config = metricConfigs[update.metric_id] || {
                    min: 0,
                    max: update.latest_value > 100 ? update.latest_value * 1.5 : 100,
                    title: update.metric_name || update.metric_id,
                    type: (update.metric_name || '').toLowerCase().includes('pct') || update.metric_id.includes('pct') ? 'solid' : 'speedometer',
                    unit: (update.metric_name || '').includes('%') ? '%' : ''
                };

                return (
                    <div 
                        key={update.metric_id} 
                        onClick={onSelect ? () => onSelect(update.metric_id) : undefined}
                        className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col items-center justify-between hover:shadow-xl transition-all cursor-pointer min-h-[220px] shadow-sm relative overflow-hidden"
                    >
                        <div className="w-full flex items-center justify-center">
                            {config.type === 'speedometer' ? (
                                <Speedometer
                                    value={update.latest_value}
                                    min={config.min}
                                    max={config.max}
                                    title={config.title}
                                    unit={config.unit}
                                    height={150}
                                />
                            ) : (
                                <SolidGauge
                                    value={update.latest_value}
                                    min={config.min}
                                    max={config.max}
                                    title={config.title}
                                    unit={config.unit}
                                    height={150}
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default OnChainGaugeView;
