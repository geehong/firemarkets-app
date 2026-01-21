"use client"

import React from 'react'
import { useParams } from 'next/navigation'
import OnChainMainView from '@/components/onchain/OnChainMainView'

export default function MovingAveragesPage() {
    const params = useParams()
    const locale = (params.locale as string) || 'en'

    return (
        <OnChainMainView locale={locale} />
    )
}
