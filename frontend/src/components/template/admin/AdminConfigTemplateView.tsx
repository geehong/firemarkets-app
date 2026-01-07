'use client'

import React from 'react'
import AdminTemplateView from './AdminTemplateView'
import { useTranslations } from 'next-intl'

interface AdminConfigTemplateViewProps {
    locale: string;
    children: React.ReactNode;
    subtitle?: string;
}

const AdminConfigTemplateView: React.FC<AdminConfigTemplateViewProps> = ({ locale, children, subtitle }) => {
    // We might not have a sidebar translation for 'config' specifically, check keys later.
    // Assuming 'settings' might be close or we add new keys.
    const t = useTranslations('Sidebar');

    return (
        <AdminTemplateView
            locale={locale}
            title={t('settings') || "Configuration"}
            description="Manage application settings and configurations."

            subtitle={subtitle}
        >
            {children}
        </AdminTemplateView>
    )
}

export default AdminConfigTemplateView
