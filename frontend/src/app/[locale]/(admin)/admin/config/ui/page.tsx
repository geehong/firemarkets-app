'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuthNew';
import MenuManager from '@/components/admin/menu/MenuManager';
import RealtimeWebSocketSettings from '@/components/admin/config/ui/RealtimeWebSocketSettings';
import OnChainSettings from '@/components/admin/onchain/OnChainSettings';
import ConfigReadMe from '@/components/admin/common/ConfigReadMe';

export default function UIConfigPage() {
    const { isAdmin, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('menu');

    if (loading) return <div>Loading...</div>;
    if (!isAdmin) return <div className="p-6 text-red-600">Access Denied</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">UI Configuration</h1>

            <div className="flex space-x-4 mb-6 border-b overflow-x-auto">
                {['menu', 'onchain', 'realtime', 'guide'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2 px-4 whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-600'}`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                {activeTab === 'menu' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Menu Management</h2>
                        <MenuManager />
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
        </div>
    );
}
