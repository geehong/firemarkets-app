"use client";

import React, { Suspense } from "react";
import { useSearchParams } from 'next/navigation'
import ComponentCard from '@/components/common/ComponentCard'
import Badge from '@/components/ui/badge/Badge'
import Button from '@/components/ui/button/Button'
import { 
  BoltIcon, 
  PieChartIcon, 
  ArrowUpIcon, 
  InfoIcon,
  ArrowRightIcon,
  DollarLineIcon
} from '@/icons'
import Link from 'next/link'
import OnchainDashboardContent from '@/components/dashboard/OnchainDashboardContent'

// 정적 메타데이터는 클라이언트 컴포넌트에서 제거됨

// 구조화된 데이터 (JSON-LD) 생성
function generateStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Bitcoin Onchain Analysis',
    description: 'Comprehensive Bitcoin onchain metrics analysis and blockchain data insights',
    url: 'https://firemarkets.net/onchain',
    provider: {
      '@type': 'Organization',
      name: 'FireMarkets',
      url: 'https://firemarkets.net'
    },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Onchain Metrics',
      description: 'List of available Bitcoin onchain metrics for analysis',
      numberOfItems: 10,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'MVRV Z-Score',
          description: 'Market Value to Realized Value Z-Score analysis'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'NVT Ratio',
          description: 'Network Value to Transactions ratio'
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Realized Price',
          description: 'Bitcoin realized price analysis'
        }
      ]
    }
  }
}

// 인기 온체인 메트릭들
const popularMetrics = [
  {
    id: 'mvrv_z_score',
    name: 'MVRV Z-Score',
    description: 'Market Value to Realized Value Z-Score',
    category: 'Valuation',
    color: 'bg-blue-500',
  },
  {
    id: 'nvt_ratio',
    name: 'NVT Ratio',
    description: 'Network Value to Transactions ratio',
    category: 'Network',
    color: 'bg-green-500',
  },
  {
    id: 'realized_price',
    name: 'Realized Price',
    description: 'Bitcoin realized price analysis',
    category: 'Price',
    color: 'bg-purple-500',
  },
  {
    id: 'market_cap',
    name: 'Market Cap',
    description: 'Bitcoin market capitalization',
    category: 'Market',
    color: 'bg-orange-500',
  },
  {
    id: 'active_addresses',
    name: 'Active Addresses',
    description: 'Daily active Bitcoin addresses',
    category: 'Network',
    color: 'bg-red-500',
  },
  {
    id: 'transaction_count',
    name: 'Transaction Count',
    description: 'Daily Bitcoin transaction count',
    category: 'Network',
    color: 'bg-indigo-500',
  },
]

function OnchainPageContent() {
  const searchParams = useSearchParams()
  const hasMetricId = searchParams?.has('metric') || false
  
  // 메트릭 ID가 있으면 기존 상세 페이지 표시 (onchain/[metric] 경로로 처리되므로 여기서는 대시보드만)
  // 메인 onchain 페이지는 대시보드 표시
  return (
    <>
      {/* 구조화된 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData()),
        }}
      />
      
      {/* 메인 콘텐츠 - 대시보드 표시 */}
      <main className="container mx-auto px-4 py-8">
        <OnchainDashboardContent />
      </main>
    </>
  )
}

export default function OnchainPage() {
  return (
    <Suspense fallback={
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-gray-500">Loading...</div>
        </div>
      </main>
    }>
      <OnchainPageContent />
    </Suspense>
  )
}
