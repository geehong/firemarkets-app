"use client";

import React from "react";
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

export default function OnchainPage() {
  return (
    <>
      {/* 구조화된 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData()),
        }}
      />
      
      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* 헤더 */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <DollarLineIcon className="h-8 w-8 text-orange-500" />
              <h1 className="text-4xl font-bold">Bitcoin Onchain Analysis</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Explore comprehensive Bitcoin blockchain metrics and their correlation with market movements. 
              Advanced onchain data analysis for informed trading decisions.
            </p>
          </div>

          {/* 주요 메트릭 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularMetrics.map((metric) => (
              <ComponentCard key={metric.id} title={metric.name}>
                <div className="flex items-center justify-between mb-2">
                  <Badge color="info">{metric.category}</Badge>
                  <div className={`w-3 h-3 rounded-full ${metric.color}`} />
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {metric.description}
                </p>
                <Link href={`/onchain/${metric.id}`}>
                  <Button className="w-full" variant="outline">
                    View Analysis
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </ComponentCard>
            ))}
          </div>

          {/* 특별 기능 섹션 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 반감기 분석 */}
            <ComponentCard title="Bitcoin Halving Analysis">
              <p className="text-gray-500 mb-4">
                Explore historical Bitcoin halving cycles and their impact on price movements. 
                Compare different halving periods and analyze market behavior.
              </p>
              <Link href="/onchain/halving">
                <Button className="w-full">
                  View Halving Analysis
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </ComponentCard>

            {/* 상관관계 분석 */}
            <ComponentCard title="Correlation Analysis">
              <p className="text-gray-500 mb-4">
                Analyze the correlation between Bitcoin price and various onchain metrics. 
                Understand market dynamics through statistical analysis.
              </p>
              <Link href="/onchain/mvrv_z_score">
                <Button className="w-full" variant="outline">
                  Start Analysis
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </ComponentCard>
          </div>

          {/* 정보 섹션 */}
          <ComponentCard title="About Onchain Analysis">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">What is Onchain Analysis?</h4>
                <p className="text-sm text-gray-500">
                  Onchain analysis examines blockchain data to understand market behavior, 
                  network health, and price movements. It provides insights that traditional 
                  market analysis cannot capture.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Key Benefits</h4>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Real-time network activity monitoring</li>
                  <li>• Market sentiment analysis</li>
                  <li>• Price prediction insights</li>
                  <li>• Risk assessment tools</li>
                </ul>
              </div>
            </div>
          </ComponentCard>

          {/* Halving Bull Chart 바로가기 */}
          <ComponentCard title="Halving Bull Chart">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Explore a dedicated visualization focused on bull market structures across Bitcoin halving cycles.
                </p>
                <Link href="/onchain/halving/halving-bull-chart">
                  <Button className="w-full">
                    Open Halving Bull Chart
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </ComponentCard>
        </div>
      </main>
    </>
  )
}
