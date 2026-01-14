'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuthNew';
import MenuManager from '@/components/admin/config/ui/MenuManager';

import { useLocale } from 'next-intl';
import AdminConfigTemplateView from '@/components/template/admin/AdminConfigTemplateView';

export default function UIConfigPage() {
    const locale = useLocale();
    const { isAdmin, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('menu');

    if (loading) return <div>Loading...</div>;
    if (!isAdmin) return <div className="p-6 text-red-600">Access Denied</div>;

    return (
        <AdminConfigTemplateView locale={locale} subtitle="Manage UI menus, on-chain settings, and realtime layouts.">

            <div className="flex space-x-4 mb-6 border-b overflow-x-auto">
                {['menu'].map(tab => (
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
            </div>
        </AdminConfigTemplateView>
    );
}
