'use client'

import React from 'react'
import AdminTemplateView from './AdminTemplateView'
import { useTranslations } from 'next-intl'

interface AdminPageTemplateViewProps {
    locale: string;
    children: React.ReactNode;
    subtitle?: string;
    actions?: React.ReactNode;
    hideHeader?: boolean;
}

const AdminPageTemplateView: React.FC<AdminPageTemplateViewProps> = ({ locale, children, subtitle, actions, hideHeader }) => {
    const t = useTranslations('Sidebar'); // "pages" key likely exists

    return (
        <AdminTemplateView
            locale={locale}
            title={t('pages') || "Page Management"}
            description="Manage static pages and content."

            subtitle={subtitle}
            actions={actions}
            hideHeader={hideHeader}
        >
            {children}
        </AdminTemplateView>
    )
}

export default AdminPageTemplateView
