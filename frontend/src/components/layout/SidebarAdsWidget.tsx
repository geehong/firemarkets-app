import React from 'react';
import AdUnit from '@/components/ads/AdUnit';

const SidebarAdsWidget = () => {
    return (
        <div className="space-y-6">
            {/* Right Ad Unit */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 p-4 min-h-[300px] flex items-center justify-center">
                <AdUnit 
                    slot="6125039237" 
                    format="vertical" 
                    style={{ height: '600px', width: '100%' }}
                    label="Advertisement"
                />
            </div>

            {/* Premium Features Widget */}
            <div className="bg-gradient-to-b from-slate-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 text-center border border-slate-100 dark:border-gray-700">
                    <h4 className="font-bold text-slate-800 dark:text-gray-200 mb-2">Unlock Premium Features</h4>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">Get access to real-time advanced charts and on-chain metrics.</p>
                    <button className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full">Coming Soon</button>
            </div>
        </div>
    );
};

export default SidebarAdsWidget;
