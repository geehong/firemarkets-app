import React from 'react';
import { BitcoinMonthlyReturns } from '@/components/widgets/BitcoinMonthlyReturns';
import { useTranslations } from 'next-intl';

export default function MonthlyReturnsPage() {
    const t = useTranslations('OnChain');

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {t('monthlyReturns', { defaultMessage: 'Bitcoin Monthly Returns' })}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    {t('monthlyReturnsDesc', { defaultMessage: 'Historical monthly percentage returns of Bitcoin.' })}
                </p>
            </div>

            <BitcoinMonthlyReturns />
        </div>
    );
}
