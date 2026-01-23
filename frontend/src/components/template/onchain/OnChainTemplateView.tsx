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
    latestValueInfo?: { value: string; date: string } | null;
}

const OnChainTemplateView: React.FC<OnChainTemplateViewProps> = ({
    locale,
    description,
    breadcrumbs = [],
    actions,
    tabs,
    cleanMetricNameValue,
    latestValueInfo
}) => {
    return (
        <BaseTemplateView
            locale={locale}
            seo={{
                title: locale === 'ko' ? `${cleanMetricNameValue} 분석` : `${cleanMetricNameValue} Analysis`,
                description: description
            }}
            header={{
                title: (
                    <div className="relative flex flex-col md:flex-row md:items-center gap-2 md:gap-4 w-full">
                        <span className="flex-shrink-0 z-10">{cleanMetricNameValue || 'OnChain'}</span>
                        {latestValueInfo && (
                            <span className="md:absolute md:left-1/2 md:top-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2 flex items-baseline gap-2 z-0">
                                <span className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400">
                                    {latestValueInfo.value}
                                </span>
                                <span className="text-xs md:text-sm italic text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                                    [{latestValueInfo.date}]
                                </span>
                            </span>
                        )}
                        {/* Empty space to balance flex if needed, but absolute handles it for md */}
                    </div>
                ),
                category: { name: 'On-Chain' },
                breadcrumbs: breadcrumbs,
                actions: actions
            }}
            tabs={tabs}
        />
    )
}

export default OnChainTemplateView
