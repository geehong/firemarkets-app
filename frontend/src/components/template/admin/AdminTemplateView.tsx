'use client'

import React from 'react'
import BaseTemplateView from '../BaseTemplateView'
import { useTranslations } from 'next-intl'

interface AdminTemplateViewProps {
    locale: string;
    title: string;
    description?: string;
    breadcrumbs?: { label: string; href: string }[];
    children: React.ReactNode;
    subtitle?: string; // Optional subtitle for more context
    actions?: React.ReactNode;
    hideHeader?: boolean;
}

const AdminTemplateView: React.FC<AdminTemplateViewProps> = ({
    locale,
    title,
    description,
    breadcrumbs = [],
    children,
    subtitle,
    actions,
    hideHeader = false
}) => {
    const t = useTranslations('Sidebar'); // "Sidebar" has "dashboard", "pages", "admin" etc.
    // Or we might need new keys in "Admin" namespace.

    // Construct default breadcrumbs if not provided or append to them
    const finalBreadcrumbs = [
        { label: 'Admin', href: `/${locale}/admin` },
        ...breadcrumbs
    ];

    const tabs = [
        {
            id: 'content',
            label: t('overview') || 'Overview',
            content: (
                <>
                    {subtitle && (
                        <div className="mb-4 text-gray-500 dark:text-gray-400">
                            {subtitle}
                        </div>
                    )}
                    {children}
                </>
            )
        }
    ];

    return (
        <BaseTemplateView
            locale={locale}
            seo={{
                title: `${title} - Admin`,
                description: description || `Admin management page for ${title}`
            }}
            header={hideHeader ? undefined : {
                title: title,
                category: { name: 'Admin Control' },
                breadcrumbs: finalBreadcrumbs,
                actions: actions
            }}
            tabs={tabs}
        />
    )
}

export default AdminTemplateView
