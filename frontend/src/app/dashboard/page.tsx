"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import CompareMultipleAssetsChart from "@/components/charts/line/CompareMultipleAssetsChart";
import AssetsList from "@/components/lists/AssetsList";
import { useSearchParams, usePathname } from "next/navigation";
import { useTreemapLive } from "@/hooks/useAssets";
import { useRealtimePrices } from "@/hooks/useSocket";
import Badge from "@/components/ui/badge/Badge";
import LivePriceCryptoChart from "@/components/charts/live/LivePriceCryptoChart";
import LivePriceStocksEtfChart from "@/components/charts/live/LivePriceStocksEtfChart";
import LivePriceCommoditiesChart from "@/components/charts/live/LivePriceCommoditiesChart";

// 동적 import로 각 페이지 컴포넌트 로드
const AssetsDashboard = dynamic(() => import("./assets/page"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading...</div>
});
const BlogDashboard = dynamic(() => import("./blog/page"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading...</div>
});
const OnchainDashboard = dynamic(() => import("./onchain/page"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading...</div>
});
const PerformanceTreeMapToday = dynamic(() => import("@/components/charts/treemap/PerformanceTreeMapToday"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading chart...</div>
});

type TabType = 'overview' | 'assets' | 'blog' | 'onchain';

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeNameFromQuery = searchParams?.get('type_name');

  // 경로 변경 시 activeTab 초기화
  useEffect(() => {
    setActiveTab('overview');
  }, [pathname]);

  // AssetsList 헤더 정보를 위한 데이터 조회
  const { data: treemapData } = useTreemapLive(
    typeNameFromQuery 
      ? { 
          type_name: typeNameFromQuery,
          sort_by: 'market_cap',
          sort_order: 'desc'
        } 
      : {
          sort_by: 'market_cap',
          sort_order: 'desc'
        }
  );
  
  const firstAsset = (treemapData as any)?.data?.[0];
  const { isConnected } = useRealtimePrices(firstAsset?.ticker || '');

  // 필터링된 자산 수 계산
  const filteredAssetsCount = React.useMemo(() => {
    const anyData: any = treemapData as any;
    let arr = Array.isArray(anyData?.data) ? (anyData.data as any[]) : [];
    if (typeNameFromQuery) {
      const wanted = String(typeNameFromQuery);
      arr = arr.filter((asset: any) => (asset.type_name || asset.asset_type || asset.category) === wanted);
    }
    return arr.length;
  }, [treemapData, typeNameFromQuery]);

  const tabs = [
    { id: 'overview' as TabType, label: '개요', icon: '📊' },
    { id: 'assets' as TabType, label: '자산', icon: '📈' },
    { id: 'blog' as TabType, label: '블로그', icon: '📝' },
    { id: 'onchain' as TabType, label: '온체인', icon: '🔗' },
  ];

  // 개요 탭 내용 렌더링
  return (
    <main className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              FireMarkets 대시보드
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              실시간 시장 데이터와 분석을 한눈에 확인하세요
            </p>
          </div>
          {/* AssetsList 헤더 정보 */}
          {activeTab === 'overview' && (
            <div className="flex flex-col items-end gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {typeNameFromQuery ? `${typeNameFromQuery} Assets` : 'All Assets'}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredAssetsCount} assets found
                </p>
                {isConnected && (
                  <Badge color="success">
                    Live Data
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 탭별 콘텐츠 */}
      {activeTab === 'overview' && <OverviewContent />}
      {activeTab === 'assets' && <AssetsDashboard />}
      {activeTab === 'blog' && <BlogDashboard />}
      {activeTab === 'onchain' && <OnchainDashboard />}
    </main>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}

function OverviewContent() {
  // 현재년도 1월 1일부터 오늘까지 날짜 계산
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식

  return (
    <>
      {/* 미니 차트 섹션 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          실시간 자산 차트
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 비트코인 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LivePriceCryptoChart
              containerId="dashboard-btc-live"
              height={300}
              updateInterval={100}
              assetIdentifier="BTCUSDT"
            />
          </div>

          {/* 이더리움 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LivePriceCryptoChart
              containerId="dashboard-eth-live"
              height={300}
              updateInterval={100}
              assetIdentifier="ETHUSDT"
            />
          </div>

          {/* SPY 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LivePriceStocksEtfChart
              containerId="dashboard-spy-live"
              height={300}
              updateInterval={100}
              assetIdentifier="SPY"
            />
          </div>

          {/* QQQ 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LivePriceStocksEtfChart
              containerId="dashboard-qqq-live"
              height={300}
              updateInterval={100}
              assetIdentifier="QQQ"
            />
          </div>

          {/* GCUSD 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LivePriceCommoditiesChart
              containerId="dashboard-gcusd-live"
              height={300}
              updateInterval={100}
              assetIdentifier="GCUSD"
            />
          </div>

          {/* SIUSD 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LivePriceCommoditiesChart
              containerId="dashboard-siusd-live"
              height={300}
              updateInterval={100}
              assetIdentifier="SIUSD"
            />
          </div>

          {/* NVDA 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LivePriceStocksEtfChart
              containerId="dashboard-nvda-live"
              height={300}
              updateInterval={100}
              assetIdentifier="NVDA"
            />
          </div>

          {/* AAPL 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LivePriceStocksEtfChart
              containerId="dashboard-aapl-live"
              height={300}
              updateInterval={100}
              assetIdentifier="AAPL"
            />
          </div>
        </div>
      </div>

      {/* 퍼포먼스 맵 */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <PerformanceTreeMapToday height={650} autoRefresh={true} refreshInterval={900000} />
        </div>
      </div>
      {/* 자산 비교 차트 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            주요 자산 가격 추이 ({currentYear}년)
          </h2>
          <Link 
            href="/assets"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
          >
            모든 자산 보기 →
          </Link>
        </div>
        <CompareMultipleAssetsChart
          assetIdentifiers={['BTCUSDT', 'SPY', 'NVDA', 'GCUSD']}
          assetNames={['Bitcoin', 'S&P 500', 'NVIDIA', 'Gold']}
          dataInterval="1d"
          height={400}
          startDate={startDate}
          endDate={endDate}
          title=""
          subtitle=""
        />
      </div>

      {/* 자산 리스트 */}
      <div className="mb-8">
        <AssetsList showHeader={false} />
      </div>

      {/* 빠른 링크 섹션 */}
      <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 shadow-lg text-white">
        <h2 className="text-2xl font-bold mb-4">더 많은 기능 탐색하기</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            href="/assets"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 transition-all hover:scale-105"
          >
            <div className="text-3xl mb-2">📈</div>
            <div className="font-semibold mb-1">자산 탐색</div>
            <div className="text-sm text-blue-100">모든 주식, 암호화폐, ETF 보기</div>
          </Link>
          
          <Link 
            href="/onchain"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 transition-all hover:scale-105"
          >
            <div className="text-3xl mb-2">🔗</div>
            <div className="font-semibold mb-1">온체인 분석</div>
            <div className="text-sm text-blue-100">블록체인 메트릭 및 상관관계</div>
          </Link>
          
          <Link 
            href="/blog"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 transition-all hover:scale-105"
          >
            <div className="text-3xl mb-2">📝</div>
            <div className="font-semibold mb-1">블로그</div>
            <div className="text-sm text-blue-100">시장 인사이트 및 분석</div>
          </Link>
        </div>
      </div>
    </>
  );
}

