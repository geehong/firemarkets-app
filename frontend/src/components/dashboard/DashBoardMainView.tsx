import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import DashBoardTemplateView from '@/components/template/dashboard/DashBoardTemplateView';
import { DashBoardPrismHubViewContent } from './DashBoardPrismHubView';
import { DashBoardPersonalizedFeedViewContent } from './DashBoardPersonalizedFeedView';
import { DashBoardLiveMarketViewContent } from './DashBoardLiveMarketView';

const DashBoardMainView = () => {
    const t = useTranslations('Dashboard');
    const locale = useLocale();

    return (
        <DashBoardTemplateView
            locale={locale}
            title={t('dashboard')}
            description={t('homeDesc')}
            tabs={[
                {
                    id: 'live-market',
                    label: t('dashboard'),
                    content: <DashBoardLiveMarketViewContent />
                },
                {
                    id: 'prism',
                    label: 'Prism Hub',
                    content: <DashBoardPrismHubViewContent />
                },
                {
                    id: 'personalized',
                    label: t('personalizedFeed'),
                    content: <DashBoardPersonalizedFeedViewContent />
                }
            ]}
        />
    );
};

export default DashBoardMainView;
