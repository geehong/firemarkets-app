'use client'

import React from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import AssetsTemplateView from '@/components/template/assets/AssetsTemplateView'
import { useTranslations } from 'next-intl'
import AssetsList from '@/components/lists/AssetsList'
import RealtimePriceTable from '@/components/tables/RealtimePriceTable'

interface AssetsTemplateViewProps {
    locale: string;
}

const AssetsMainView: React.FC<AssetsTemplateViewProps> = ({ locale }) => {
    const t = useTranslations('Dashboard'); // Using 'Dashboard' for common terms or create new 'Assets'
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const typeName = searchParams?.get('type_name') || undefined;

    // Determine active tab based on query param or state? 
    // The original page used local state. To make it linkable, we might want to use query params, 
    // but the original page implementation used simple state. 
    // The BaseTemplateView supports tabs. We can use the 'activeTab' prop of BaseTemplateView if we implement it, 
    // or just let the tabs handle their content. 
    // The BaseTemplateView documentation implies we pass a list of tabs.
    // Let's implement the tabs logic.

    const tabs = [
        {
            id: 'list',
            label: t('viewAllAssets') || 'Assets List',
            content: (
                <AssetsList />
            )
        },
        {
            id: 'realtime',
            label: t('live') || 'Realtime Prices',
            content: (
                <div className="space-y-6">
                    <RealtimePriceTable
                        title={t('live') || "Realtime Asset Prices"}
                        showFilter={true}
                        showPagination={true}
                        typeName={typeName}
                    />
                </div>
            )
        }
    ];

    return (
        <AssetsTemplateView
            locale={locale}
            seo={{
                title: t('exploreAssets') || 'Assets',
                description: 'Explore all available assets and realtime prices.'
            }}
            header={{
                title: t('exploreAssets') || 'Assets',
                category: { name: 'Market' },
            }}
            tabs={tabs}
        />
    )
}

export default AssetsMainView
