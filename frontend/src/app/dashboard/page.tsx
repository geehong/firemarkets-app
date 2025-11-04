"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import MultiAssetLineChart from "@/components/charts/line/MultiAssetLineChart";
import Link from "next/link";
import { CryptoPriceCard, CryptoMetricCard } from "@/components/widget";

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

export default function DashboardPage() {
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

  return (
    <main className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          FireMarkets 대시보드
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          실시간 시장 데이터와 분석을 한눈에 확인하세요
        </p>
      </div>

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

      {/* 주요 메트릭 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="전체 시가총액"
          value={`$${(totalMarketCap / 1e12).toFixed(2)}T`}
          icon="💰"
          loading={globalLoading}
        />
        <MetricCard
          title="24시간 거래량"
          value={`$${(total24hVolume / 1e9).toFixed(2)}B`}
          icon="📊"
          loading={globalLoading}
        />
        <MetricCard
          title="비트코인 도미넌스"
          value={`${btcDominance.toFixed(2)}%`}
          icon="₿"
          loading={globalLoading}
        />
        <MetricCard
          title="활성 암호화폐"
          value={activeCryptos.toLocaleString()}
          icon="🪙"
          loading={globalLoading}
        />
      </div>

      {/* 비트코인 & 이더리움 가격 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <CryptoPriceCard
          symbol="BTC"
          name="Bitcoin"
          price={btcPrice}
          change24h={btcChange24h}
          icon="₿"
          gradientFrom="from-orange-500"
          gradientTo="to-yellow-500"
          size="medium"
        />

        <CryptoMetricCard
          symbol="ETH"
          name="Ethereum Dominance"
          metricValue={`${ethDominance.toFixed(2)}%`}
          metricLabel="시장 점유율"
          icon="Ξ"
          gradientFrom="from-blue-500"
          gradientTo="to-purple-500"
          size="medium"
        />
      </div>

      {/* 멀티 자산 차트 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            주요 자산 가격 추이 (90일)
          </h2>
          <Link 
            href="/assets"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
          >
            모든 자산 보기 →
          </Link>
        </div>
        <MultiAssetLineChart
          assetIdentifiers={['BTCUSDT', 'ETHUSDT', 'AAPL', 'GOOGL']}
          assetNames={['Bitcoin', 'Ethereum', 'Apple', 'Google']}
          height={400}
        />
      </div>

      {/* 하단 그리드: 상위 크립토 & 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 상위 암호화폐 테이블 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              상위 암호화폐
            </h2>
            <Link 
              href="/assets?type=Crypto"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
            >
              전체 보기 →
            </Link>
          </div>
          
          {cryptoLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-4">#</th>
                    <th className="py-2 px-4">자산</th>
                    <th className="py-2 px-4">가격</th>
                    <th className="py-2 px-4">24h</th>
                    <th className="py-2 px-4">시가총액</th>
                    <th className="py-2 px-4">거래량</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedTopCryptos.slice(0, 10).map((crypto: any, index: number) => (
                    <CryptoRow
                      key={crypto.symbol || index}
                      rank={crypto.rank || index + 1}
                      symbol={crypto.symbol || 'N/A'}
                      name={crypto.name || 'N/A'}
                      price={crypto.price || crypto.current_price || 0}
                      change24h={crypto.price_change_percent_24h || crypto.percent_change_24h || 0}
                      marketCap={crypto.market_cap || 0}
                      volume24h={crypto.volume_24h || 0}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 실시간 시장 활동 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {realtimeError ? '상위 시장 활동' : '실시간 시장 활동'}
            </h2>
            {!realtimeError && (
              <span className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Live
              </span>
            )}
          </div>

          {(realtimeLoading || cryptoLoading) ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 실시간 데이터가 없으면 상위 크립토 데이터 사용 */}
              {(realtimeError || normalizedRealtimeData.length === 0 ? 
                normalizedTopCryptos.slice(0, 5) : 
                normalizedRealtimeData.slice(0, 5)
              ).map((item: any, index: number) => {
                const price = item.price || item.current_price || item.close_price || 0;
                const changePercent = item.price_change_percent_24h || item.percent_change_24h || item.change_percent;
                const ticker = item.symbol || item.ticker || item.asset_identifier || 'N/A';
                const name = item.name || 'Asset';
                
                return (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {ticker}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 dark:text-white">
                        ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {changePercent !== undefined && (
                        <div className={`text-sm font-medium ${changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
    </main>
  );
}

