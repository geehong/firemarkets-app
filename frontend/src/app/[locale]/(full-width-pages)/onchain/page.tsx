import React from 'react'
import OnChainOverview from '@/components/template/OnChainOverview'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'On-Chain Analysis | FireMarkets',
    description: 'Bitcoin on-chain metrics analysis and historical data.',
}

export default async function OnchainPage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    return (
        <div className="container mx-auto px-4 py-8">
            <OnChainOverview locale={locale} />
        </div>
    )
}
