'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import AdminConfigTemplateView from '@/components/template/admin/AdminConfigTemplateView';
import { useGroupedConfigs } from '@/hooks/admin/useGroupedConfigs';
import Link from 'next/link';
import { Settings, Cpu, Clock, Layout, Users } from 'lucide-react';

export default function AdminConfigDashboard() {
    const t = useTranslations('Admin');
    const locale = useLocale();
    const { data: configs, loading: configLoading } = useGroupedConfigs();

    // Config Summary Logic
    const aiConfig = configs.find(c => c.config_key === 'ai_provider_config');
    const schedulerConfig = configs.find(c => c.config_key === 'SCHEDULER_CONFIG');

    // Helper to determine active AI
    const activeAIProvider = (() => {
        if (!aiConfig?.config_value) return 'None';
        for (const [key, item] of Object.entries(aiConfig.config_value)) {
            if (item.is_active && (key !== 'default' && key !== 'system')) return key;
        }
        return 'Auto';
    })();

    const schedulerStatus = (() => {
        if (!schedulerConfig?.config_value) return 'Unknown';
        if (schedulerConfig.config_value.is_active?.value === true) return 'Active';
        if (schedulerConfig.config_value.is_active?.value === false) return 'Paused';
        return 'Ready';
    })();

    const configSections = [
        {
            title: 'Application Config',
            desc: 'System-wide settings, AI providers, Schedulers',
            icon: <Cpu className="w-6 h-6 text-blue-600" />,
            href: `/${locale}/admin/config/app`
        },
        {
            title: 'UI Configuration',
            desc: 'Layouts, Themes, Menus, Home Page settings',
            icon: <Layout className="w-6 h-6 text-purple-600" />,
            href: `/${locale}/admin/config/ui`
        },
        {
            title: 'User Management',
            desc: 'User roles, permissions, access logs',
            icon: <Users className="w-6 h-6 text-green-600" />,
            href: `/${locale}/admin/config/user`
        }
    ];

    return (
        <AdminConfigTemplateView locale={locale}>
            <div className="space-y-8">
                {/* System Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Scheduler Status</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{configLoading ? '...' : schedulerStatus}</h3>
                        </div>
                        <div className={`p-3 rounded-full ${schedulerStatus === 'Active' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Active AI Provider</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 uppercase">{configLoading ? '...' : activeAIProvider}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                            <Cpu className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Config Sections Grid */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Configuration Areas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {configSections.map((section, idx) => (
                            <Link key={idx} href={section.href} className="group block bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-200 transition-all">
                                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg w-fit group-hover:scale-110 transition-transform">
                                    {section.icon}
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                                    {section.title}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {section.desc}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </AdminConfigTemplateView>
    );
}
