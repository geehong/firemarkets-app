'use client'

import React from 'react'
import BaseTemplateView from '../BaseTemplateView'

interface OnChainTemplateViewProps {
    locale: string;
    description?: string;
    breadcrumbs?: { label: string; href: string }[];
    actions?: React.ReactNode;
    tabs: {
        id: string;
        label: string;
        content: React.ReactNode;
    }[];
    cleanMetricNameValue?: string;
}

const OnChainTemplateView: React.FC<OnChainTemplateViewProps> = ({
    locale,
    description,
    breadcrumbs = [],
    actions,
    tabs,
    cleanMetricNameValue
}) => {
    return (
        <BaseTemplateView
            locale={locale}
            seo={{
                title: locale === 'ko' ? `${cleanMetricNameValue} 분석` : `${cleanMetricNameValue} Analysis`,
                description: description
            }}
            header={{
                title: cleanMetricNameValue || 'OnChain',
                category: { name: 'On-Chain' },
                breadcrumbs: breadcrumbs,
                actions: actions
            }}
            tabs={tabs}
        />
    )
}

export default OnChainTemplateView
