'use client'

import React from 'react'
import BaseTemplateView from '../BaseTemplateView'
import { useTranslations } from 'next-intl'

interface DashBoardTemplateViewProps {
    title: string;
    description: string;
    children?: React.ReactNode;
    locale: string;
    tabs?: {
        id: string;
        label: string;
        content: React.ReactNode;
    }[];
}

const DashBoardTemplateView: React.FC<DashBoardTemplateViewProps> = ({
    title,
    description,
    children,
    locale,
    tabs = []
}) => {
    const t = useTranslations('Dashboard');

    // If no tabs are provided, we'll create a single "Overview" tab containing children
    const finalTabs = tabs.length > 0 ? tabs : [
        {
            id: 'overview',
            label: t('overview') || 'Overview',
            content: children
        }
    ];

    return (
        <BaseTemplateView
            locale={locale}
            seo={{
                title: title,
                description: description
            }}
            header={{
                title: title,
                category: { name: t('dashboard') || 'Dashboard' },
            }}
            tabs={finalTabs}
        />
    )
}

export default DashBoardTemplateView
