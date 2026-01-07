import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import DashBoardTemplateView from '@/components/template/dashboard/DashBoardTemplateView';
import { DashBoardPrismHubViewContent } from './DashBoardPrismHubView';
import { DashBoardPersonalizedFeedViewContent } from './DashBoardPersonalizedFeedView';

const DashBoardMainView = () => {
    const t = useTranslations('Dashboard');
    const locale = useLocale();

    return (
        <DashBoardTemplateView
            locale={locale}
            title={t('prismTitle')}
            description={t('prismDesc')}
            tabs={[
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
