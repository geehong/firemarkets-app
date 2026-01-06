'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuthNew';
import { useScheduler } from '@/hooks/admin/useScheduler';
import SchedulerControls from '@/components/admin/config/ui/SchedulerControls';
import SchedulerSettings from '@/components/admin/config/ui/SchedulerSettings';
import TickerTableAgGrid from '@/components/admin/ticker/TickerTableAgGrid';
import LogsTable from '@/components/admin/logs/LogsTable';
import RealTimeLogs from '@/components/admin/logs/RealTimeLogs';

export default function AppConfigPage() {
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
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">App Configuration</h1>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b overflow-x-auto">
                {['scheduler', 'ticker', 'logs', 'optimization'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2 px-4 whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-600'}`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
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

                {activeTab === 'optimization' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Database Optimization</h2>
                        <p className="text-gray-500">Coming soon through admin.py endpoints.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
