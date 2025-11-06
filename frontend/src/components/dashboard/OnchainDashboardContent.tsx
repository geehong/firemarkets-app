"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { CryptoPriceCard, CryptoMetricCard } from "@/components/widget";
import Link from "next/link";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  trend,
  loading,
}: MetricCardProps) => {
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{title}</h3>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          {description && (
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          )}
        </div>
      ) : (
        <>
          <div className={`text-2xl font-bold ${trendColor} mb-1`}>
            {value}
          </div>
          {description && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface MetricDataRowProps {
  metricName: string;
  currentValue: number;
  description: string;
}

const MetricDataRow: React.FC<MetricDataRowProps> = ({
  metricName,
  currentValue,
  description,
}: MetricDataRowProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
      <div className="flex-1">
        <div className="font-semibold text-gray-900 dark:text-white">
          {metricName}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-gray-900 dark:text-white">
          {typeof currentValue === 'number' ? currentValue.toLocaleString() : currentValue}
        </div>
      </div>
    </div>
  );
};

export default function OnchainDashboardContent() {
  // 비트코인 가격 조회
  const { data: btcData } = useQuery({
    queryKey: ['btc-price'],
    queryFn: () => apiClient.getCryptoDataByAsset('BTCUSDT'),
    staleTime: 2 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
  });

  // 온체인 메트릭 목록 조회
  const { data: metrics } = useQuery({
    queryKey: ['onchain-metrics'],
    queryFn: () => apiClient.getOnchainMetrics(),
    staleTime: 30 * 60 * 1000,
    retry: 0,
  });

  // 주요 온체인 메트릭 데이터 조회
  const { data: mvrvData, isLoading: mvrvLoading } = useQuery({
    queryKey: ['onchain-metric', 'mvrv_z_score'],
    queryFn: () => apiClient.getOnchainMetricData('mvrv_z_score', { limit: 1 }),
    staleTime: 5 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
    enabled: !!metrics,
  });

  const { data: soprData, isLoading: soprLoading } = useQuery({
    queryKey: ['onchain-metric', 'sopr'],
    queryFn: () => apiClient.getOnchainMetricData('sopr', { limit: 1 }),
    staleTime: 5 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
    enabled: !!metrics,
  });

  const { data: nuplData, isLoading: nuplLoading } = useQuery({
    queryKey: ['onchain-metric', 'nupl'],
    queryFn: () => apiClient.getOnchainMetricData('nupl', { limit: 1 }),
    staleTime: 5 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
    enabled: !!metrics,
  });

  const { data: hashrateData, isLoading: hashrateLoading } = useQuery({
    queryKey: ['onchain-metric', 'hashrate'],
    queryFn: () => apiClient.getOnchainMetricData('hashrate', { limit: 1 }),
    staleTime: 5 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
    enabled: !!metrics,
  });

  // 정규화 헬퍼
  const getLatestValue = (data: any) => {
    if (!data) return null;
    if (Array.isArray(data) && data.length > 0) {
      return data[data.length - 1];
    }
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data[data.data.length - 1];
    }
    return null;
  };

  const btcPrice = btcData?.current_price || btcData?.price || 0;
  const btcChange24h = btcData?.percent_change_24h || btcData?.price_change_percent_24h || 0;

  const mvrvLatest = getLatestValue(mvrvData);
  const soprLatest = getLatestValue(soprData);
  const nuplLatest = getLatestValue(nuplData);
  const hashrateLatest = getLatestValue(hashrateData);

  return (
    <>
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          온체인 분석 대시보드
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          블록체인 메트릭과 시장 상관관계를 분석하세요
        </p>
      </div>

      {/* 비트코인 가격 카드 */}
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
          symbol="ONCHAIN"
          name="온체인 메트릭"
          metricValue={metrics?.metrics?.length || 0}
          metricLabel="추적 중인 메트릭 수"
          icon="🔗"
          gradientFrom="from-blue-500"
          gradientTo="to-purple-500"
          size="medium"
        />
      </div>

      {/* 주요 온체인 메트릭 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          주요 온체인 메트릭
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="MVRV Z-Score"
            value={mvrvLatest?.mvrv_z_score?.toFixed(2) || 'N/A'}
            description="시장 가치 대비 실현 가치"
            trend={mvrvLatest?.mvrv_z_score > 7 ? 'up' : mvrvLatest?.mvrv_z_score < 0 ? 'down' : 'neutral'}
            loading={mvrvLoading}
          />
          <MetricCard
            title="SOPR"
            value={soprLatest?.sopr?.toFixed(4) || 'N/A'}
            description="Spent Output Profit Ratio"
            trend={soprLatest?.sopr > 1 ? 'up' : 'down'}
            loading={soprLoading}
          />
          <MetricCard
            title="NUPL"
            value={nuplLatest?.nupl?.toFixed(4) || 'N/A'}
            description="Net Unrealized Profit/Loss"
            trend={nuplLatest?.nupl > 0.5 ? 'up' : 'down'}
            loading={nuplLoading}
          />
          <MetricCard
            title="Hashrate"
            value={hashrateLatest?.hashrate ? `${(hashrateLatest.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}
            description="네트워크 해시레이트"
            trend="neutral"
            loading={hashrateLoading}
          />
        </div>
      </div>

      {/* 메트릭 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            모든 온체인 메트릭
          </h2>
          <Link 
            href="/onchain"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
          >
            상세 분석 보기 →
          </Link>
        </div>
        
        {metrics?.metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.metrics.slice(0, 9).map((metric: any) => (
              <MetricDataRow
                key={metric.id || metric.metric_id}
                metricName={metric.name || metric.metric_id || 'Unknown'}
                currentValue={0}
                description={metric.description || '온체인 메트릭 데이터'}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            메트릭 데이터를 불러오는 중...
          </div>
        )}
      </div>

      {/* 메트릭 설명 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 shadow-lg text-white">
        <h2 className="text-2xl font-bold mb-4">온체인 메트릭이란?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">MVRV Z-Score</h3>
            <p className="text-blue-100 text-sm">
              시장 가치와 실현 가치의 차이를 표준화한 지표입니다. 높은 값은 과매수, 낮은 값은 과매도를 나타냅니다.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">SOPR</h3>
            <p className="text-blue-100 text-sm">
              Spent Output Profit Ratio는 코인이 이동할 때의 평균 수익률을 나타냅니다. 1보다 크면 이익 실현이 많습니다.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">NUPL</h3>
            <p className="text-blue-100 text-sm">
              Net Unrealized Profit/Loss는 전체 네트워크의 미실현 손익을 나타냅니다. 시장 심리를 파악하는 데 유용합니다.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Hashrate</h3>
            <p className="text-blue-100 text-sm">
              네트워크의 총 계산 능력을 나타냅니다. 높은 해시레이트는 네트워크 보안이 강하다는 의미입니다.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

