'use client'

import React from 'react'
import AdminTemplateView from './AdminTemplateView'
import { useTranslations } from 'next-intl'

interface AdminPostTemplateViewProps {
    locale: string;
    children: React.ReactNode;
    subtitle?: string;
    actions?: React.ReactNode;
    hideHeader?: boolean;
}

const AdminPostTemplateView: React.FC<AdminPostTemplateViewProps> = ({ locale, children, subtitle, actions, hideHeader }) => {
    const t = useTranslations('Sidebar'); // Assuming 'blog', 'news', 'admin' keys exist here or we add them

    return (
        <AdminTemplateView
            locale={locale}
            title={t('blog') || "Post Management"} // Fallback to "Post Management"
            description="Manage blog posts, news, and articles."

            subtitle={subtitle}
            actions={actions}
            hideHeader={hideHeader}
        >
            {children}
        </AdminTemplateView>
    )
}

export default AdminPostTemplateView
