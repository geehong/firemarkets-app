import React from 'react';
import { getTranslations } from 'next-intl/server';
import AnalyticsDashboardView from '@/components/admin/AnalyticsDashboardView';
import DashBoardTemplateView from '@/components/template/dashboard/DashBoardTemplateView';

export default async function AnalyticsAdminPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    
    // Optional: add translations to 'Dashboard' namespace or use hardcoded for now
    // const t = await getTranslations({ locale, namespace: 'Dashboard' });

    return (
        <DashBoardTemplateView
            locale={locale}
            title="FireMarkets Analytics"
            description="Detailed user engagement and traffic insights from Google Analytics 4."
        >
            <AnalyticsDashboardView />
        </DashBoardTemplateView>
    );
}
