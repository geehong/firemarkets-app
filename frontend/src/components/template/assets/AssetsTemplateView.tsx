'use client'

import React from 'react'
import BaseTemplateView from '../BaseTemplateView'

interface AssetsTemplateViewProps {
    locale: string;
    seo: { title: string; description: string };
    header: { title: string; category: { name: string }; breadcrumbs?: { label: string; href: string }[] };
    tabs: { id: string; label: string; content: React.ReactNode }[];
}

const AssetsTemplateView: React.FC<AssetsTemplateViewProps> = ({ locale, seo, header, tabs }) => {
    return (
        <BaseTemplateView
            locale={locale}
            seo={seo}
            header={header}
            tabs={tabs}
        />
    )
}

export default AssetsTemplateView
