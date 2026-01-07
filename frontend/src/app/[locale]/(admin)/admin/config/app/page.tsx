'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuthNew';
import { useScheduler } from '@/hooks/admin/useScheduler';
import SchedulerControls from '@/components/admin/config/ui/SchedulerControls';
import SchedulerSettings from '@/components/admin/config/ui/SchedulerSettings';
import TickerTableAgGrid from '@/components/admin/ticker/TickerTableAgGrid';
import LogsTable from '@/components/admin/logs/LogsTable';
import RealTimeLogs from '@/components/admin/logs/RealTimeLogs';
import RealtimeWebSocketSettings from '@/components/admin/config/ui/RealtimeWebSocketSettings';
import OnChainSettings from '@/components/admin/onchain/OnChainSettings';
import ConfigReadMe from '@/components/admin/common/ConfigReadMe';

import { useLocale } from 'next-intl';
import AdminConfigTemplateView from '@/components/template/admin/AdminConfigTemplateView';

import AdvancedConfigList from '@/components/admin/config/ui/AdvancedConfigList';

export default function AppConfigPage() {
    const locale = useLocale();
    const { isAdmin, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('scheduler');
    const [schedulerPeriod, setSchedulerPeriod] = useState('day');

    // Ticker states
    const [tickerActiveTab, setTickerActiveTab] = useState('Stocks');
    const [tickerSearchTerm, setTickerSearchTerm] = useState('');

    const { data: schedulerStatus, refetch: refetchScheduler } = useScheduler({ period: schedulerPeriod, enabled: isAdmin });

    if (loading) return <div>Loading...</div>;
    if (!isAdmin) return <div className="p-6 text-red-600">Access Denied</div>;

    const handleSchedulerStart = async () => { /* Implement API call or move to hook */ refetchScheduler(); };
    const handleSchedulerStop = async () => { /* ... */ refetchScheduler(); };
    const handleSchedulerPause = async () => { /* ... */ refetchScheduler(); };
    const handleSchedulerTrigger = async () => { /* ... */ refetchScheduler(); };

    return (
        <AdminConfigTemplateView locale={locale} subtitle="Application schedules, tickers, logs, and system configurations.">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex flex-wrap gap-2">
                    {['scheduler', 'ticker', 'logs', 'advanced', 'onchain', 'realtime', 'guide'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-2 px-4 whitespace-nowrap text-sm font-medium transition-colors ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg shadow p-6">
                {activeTab === 'scheduler' && (
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-xl font-semibold mb-4">Scheduler Controls</h2>
                            <SchedulerControls
                                period={schedulerPeriod}
                                onPeriodChange={setSchedulerPeriod}
                                schedulerStatus={schedulerStatus || {}}
                                isRunning={schedulerStatus?.isRunning || false}
                                status={schedulerStatus?.status || 'Unknown'}
                                onStart={handleSchedulerStart}
                                onStop={handleSchedulerStop}
                                onPause={handleSchedulerPause}
                                onTrigger={handleSchedulerTrigger}
                            />
                        </section>
                        <section>
                            <h2 className="text-xl font-semibold mb-4">Scheduler Settings</h2>
                            <SchedulerSettings />
                        </section>
                    </div>
                )}

                {activeTab === 'ticker' && (
                    <div className="h-[600px]">
                        <TickerTableAgGrid
                            assetType={tickerActiveTab}
                            onAssetTypeChange={setTickerActiveTab}
                            searchTerm={tickerSearchTerm}
                            onSearchChange={setTickerSearchTerm}
                            isTabActive={activeTab === 'ticker'}
                            height={550}
                            // Mock handlers
                            onSettingChange={() => { }}
                            onExecute={() => { }}
                            onDelete={() => { }}
                            isExecuting={false}
                            executingTickers={[]}
                            onExecutePerAsset={() => { }}
                            onBulkSave={() => { }}
                            isBulkUpdatingSettings={false}
                        />
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-xl font-semibold mb-4">System Logs</h2>
                            <LogsTable />
                        </section>
                        <section>
                            <h2 className="text-xl font-semibold mb-4">Real-time Logs</h2>
                            <RealTimeLogs />
                        </section>
                    </div>
                )}

                {activeTab === 'advanced' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">System Configurations</h2>
                            <span className="text-sm text-gray-500">Manage all JSON-based system settings directly.</span>
                        </div>
                        <AdvancedConfigList />
                    </div>
                )}

                {activeTab === 'onchain' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">OnChain Settings</h2>
                        <OnChainSettings />
                    </div>
                )}

                {activeTab === 'realtime' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Realtime & WebSocket Layout</h2>
                        <RealtimeWebSocketSettings />
                    </div>
                )}

                {activeTab === 'guide' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Configuration Guide</h2>
                        <ConfigReadMe />
                    </div>
                )}
            </div>
        </AdminConfigTemplateView>
    );
}
