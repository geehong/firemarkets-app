"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import MultiAssetLineChart from "@/components/charts/line/MultiAssetLineChart";
import Link from "next/link";
import { CryptoPriceCard, CryptoMetricCard } from "@/components/widget";
import dynamic from "next/dynamic";
import ClientOnlyChart from "@/components/charts/minicharts/ClientOnlyChart";
import CompareMultipleAssetsChart from "@/components/charts/line/CompareMultipleAssetsChart";
import AssetsList from "@/components/lists/AssetsList";
import { useSearchParams, usePathname } from "next/navigation";
import { useTreemapLive } from "@/hooks/useAssets";
import { useRealtimePrices } from "@/hooks/useSocket";
import Badge from "@/components/ui/badge/Badge";
import LiveChart from "@/components/charts/live/livechart";

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

// 메트릭 카드 컴포넌트
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  loading 
}: MetricCardProps) => {
  const changeColor = change && change > 0 ? "text-green-500" : "text-red-500";
  const changeSign = change && change > 0 ? "+" : "";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {value}
          </div>
          {change !== undefined && (
            <div className={`text-sm font-medium ${changeColor}`}>
              {changeSign}{change.toFixed(2)}%
            </div>
          )}
        </>
      )}
    </div>
  );
};

// 테이블 행 컴포넌트
interface CryptoRowProps {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

const CryptoRow: React.FC<CryptoRowProps> = ({ 
  rank, 
  symbol, 
  name, 
  price, 
  change24h, 
  marketCap, 
  volume24h 
}: CryptoRowProps) => {
  const changeColor = change24h >= 0 ? "text-green-500" : "text-red-500";
  const changeSign = change24h >= 0 ? "+" : "";

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{rank}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">{symbol}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{name}</span>
        </div>
      </td>
      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
        ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className={`py-3 px-4 font-medium ${changeColor}`}>
        {changeSign}{change24h.toFixed(2)}%
      </td>
      <td className="py-3 px-4 text-gray-900 dark:text-white">
        ${(marketCap / 1e9).toFixed(2)}B
      </td>
      <td className="py-3 px-4 text-gray-900 dark:text-white">
        ${(volume24h / 1e6).toFixed(2)}M
      </td>
    </tr>
  );
};

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
  return (
    <Suspense fallback={
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-gray-400">Loading dashboard...</div>
        </div>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function OverviewContent() {
  // 글로벌 크립토 메트릭 조회
  const { data: globalMetrics, isLoading: globalLoading, isError: globalError } = useQuery({
    queryKey: ['global-crypto-metrics'],
    queryFn: () => apiClient.getGlobalCryptoMetrics(),
    staleTime: 5 * 60 * 1000, // 5분
    retry: 0,
    refetchOnWindowFocus: false,
    onError: (error: any) => {
      console.warn('Global metrics fetch failed:', error.message);
    },
  });

  // 상위 크립토 조회
  const { data: topCryptos, isLoading: cryptoLoading, isError: cryptoError } = useQuery({
    queryKey: ['top-cryptos', 10],
    queryFn: () => apiClient.getTopCryptos(10),
    staleTime: 2 * 60 * 1000, // 2분
    retry: 0,
    refetchOnWindowFocus: false,
    onError: (error: any) => {
      console.warn('Top cryptos fetch failed:', error.message);
    },
  });

  // 실시간 테이블 데이터 조회 - 에러 시 대체 데이터 사용
  const { data: realtimeData, isLoading: realtimeLoading, isError: realtimeError } = useQuery({
    queryKey: ['realtime-table', { limit: 5 }],
    queryFn: () => apiClient.getRealtimeTable({ limit: 5 }),
    staleTime: 1 * 60 * 1000, // 1분
    retry: 0, // 재시도 안함
    refetchOnWindowFocus: false,
    // 에러 발생 시 콘솔에만 로그
    onError: (error: any) => {
      console.warn('Realtime table data fetch failed, using fallback data:', error.message);
    },
  });

  // 비트코인 데이터 조회
  const { data: btcData, isError: btcError } = useQuery({
    queryKey: ['crypto-data', 'BTCUSDT'],
    queryFn: () => apiClient.getCryptoDataByAsset('BTCUSDT'),
    staleTime: 2 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
    onError: (error: any) => {
      console.warn('BTC data fetch failed:', error.message);
    },
  });

  // 글로벌 메트릭 추출
  const totalMarketCap = globalMetrics?.total_market_cap || 0;
  const total24hVolume = globalMetrics?.total_24h_volume || 0;
  const btcDominance = globalMetrics?.btc_dominance || 0;
  const ethDominance = globalMetrics?.eth_dominance || 0;
  const activeCryptos = globalMetrics?.active_cryptocurrencies || 0;

  // 비트코인 가격 및 변화율
  const btcPrice = btcData?.current_price || btcData?.price || 0;
  const btcChange24h = btcData?.percent_change_24h || btcData?.price_change_percent_24h || 0;

  // 전체 에러 상태 확인
  const hasApiErrors = globalError || cryptoError || realtimeError || btcError;

  // 데이터 정규화 헬퍼
  const normalizeArrayData = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  };

  // 정규화된 데이터
  const normalizedTopCryptos = normalizeArrayData(topCryptos);
  const normalizedRealtimeData = normalizeArrayData(realtimeData);

  // 현재년도 1월 1일부터 오늘까지 날짜 계산
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식

  return (
    <>
      {/* API 에러 알림 */}
      {hasApiErrors && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                일부 데이터를 불러올 수 없습니다
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                백엔드 서버에 일시적인 문제가 발생했습니다. 사용 가능한 데이터만 표시됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 미니 차트 섹션 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          실시간 자산 차트
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 비트코인 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LiveChart
              containerId="dashboard-btc-live"
              height={300}
              updateInterval={100}
            />
          </div>

          {/* 이더리움 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LiveChart
              containerId="dashboard-eth-live"
              height={300}
              updateInterval={100}
              assetIdentifier="ETHUSDT"
              dataSource="binance"
            />
          </div>

          {/* SPY 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LiveChart
              containerId="dashboard-spy-live"
              height={300}
              updateInterval={100}
              assetIdentifier="SPY"
            />
          </div>

          {/* QQQ 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LiveChart
              containerId="dashboard-qqq-live"
              height={300}
              updateInterval={100}
              assetIdentifier="QQQ"
            />
          </div>

          {/* GCUSD 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LiveChart
              containerId="dashboard-gcusd-live"
              height={300}
              updateInterval={100}
              assetIdentifier="GCUSD"
            />
          </div>

          {/* SIUSD 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LiveChart
              containerId="dashboard-siusd-live"
              height={300}
              updateInterval={100}
              assetIdentifier="SIUSD"
            />
          </div>

          {/* NVDA 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LiveChart
              containerId="dashboard-nvda-live"
              height={300}
              updateInterval={100}
              assetIdentifier="NVDA"
            />
          </div>

          {/* AAPL 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700">
            <LiveChart
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

