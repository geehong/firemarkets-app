"use client";

import React, { useState } from 'react';
import { PersonalizedFeedDashboard } from './PersonalizedFeedDashboard';
import { PrismHubDashboard } from './PrismHubDashboard';
import { useTranslations } from 'next-intl';

type DashboardType = 'personalized' | 'prism';

interface TabConfig {
    id: DashboardType;
    label: string;
    icon: React.ReactNode;
}

const DashboardTabs = () => {
    const t = useTranslations('Dashboard');
    const [activeTab, setActiveTab] = useState<DashboardType>('prism');

    const tabs: TabConfig[] = [
        {
            id: 'prism',
            label: 'Prism Hub',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
            ),
        },
        {
            id: 'personalized',
            label: t('personalizedFeed') || 'Personalized Feed',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.id === 'prism' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full">
                                NEW
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Dashboard Content */}
            <div className="min-h-[600px]">
                {activeTab === 'prism' && <PrismHubDashboard />}
                {activeTab === 'personalized' && <PersonalizedFeedDashboard />}
            </div>
        </div>
    );
};

export default DashboardTabs;
