"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import MultiAssetLineChart from "@/components/charts/line/MultiAssetLineChart";
import { CryptoPriceCard, CryptoMetricCard } from "@/components/widget";
import Link from "next/link";
import SparklineTable from "@/components/tables/SparklineTable";

interface AssetRowProps {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  type: string;
}

const AssetRow: React.FC<AssetRowProps> = ({ 
  rank, 
  symbol, 
  name, 
  price, 
  change24h, 
  marketCap, 
  volume24h,
  type 
}: AssetRowProps) => {
  const changeColor = change24h >= 0 ? "text-green-500" : "text-red-500";
  const changeSign = change24h >= 0 ? "+" : "";

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{rank}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {type}
          </span>
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

export default function AssetsDashboardContent() {
  // 탭 상태 관리
  const [selectedTab, setSelectedTab] = useState<string>("Crypto");

  // 자산 타입별 데이터 조회 (기존 코드 유지)
  const { data: cryptoDataOld, isLoading: cryptoLoading } = useQuery({
    queryKey: ['assets-list', 'Crypto'],
    queryFn: () => apiClient.getAssetsList({ type_name: 'Crypto', limit: 10, has_ohlcv_data: true }),
    staleTime: 2 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
  });

  const { data: stockDataOld, isLoading: stockLoading } = useQuery({
    queryKey: ['assets-list', 'Stock'],
    queryFn: () => apiClient.getAssetsList({ type_name: 'Stock', limit: 10, has_ohlcv_data: true }),
    staleTime: 2 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
  });

  const { data: etfDataOld, isLoading: etfLoading } = useQuery({
    queryKey: ['assets-list', 'ETF'],
    queryFn: () => apiClient.getAssetsList({ type_name: 'ETF', limit: 10, has_ohlcv_data: true }),
    staleTime: 2 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
  });

  // 자산 타입 목록 조회
  const { data: assetTypes } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => apiClient.getAssetTypes({ hasData: true }),
    staleTime: 10 * 60 * 1000,
  });

  // 정규화 헬퍼
  const normalizeArrayData = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.assets && Array.isArray(data.assets)) return data.assets;
    return [];
  };

  const normalizedCrypto = normalizeArrayData(cryptoDataOld);
  const normalizedStock = normalizeArrayData(stockDataOld);
  const normalizedEtf = normalizeArrayData(etfDataOld);

  // 탭 목록
  const tabs = [
    { id: "Crypto", label: "암호화폐" },
    { id: "Stocks", label: "주식" },
    { id: "ETFs", label: "ETF" },
    { id: "Commodities", label: "원자재" },
  ];

  return (
    <>
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          자산 대시보드
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          모든 자산 유형의 실시간 데이터를 한눈에 확인하세요
        </p>
      </div>

      {/* 스파클라인 테이블 - 최상위 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            실시간 자산 스파클라인
          </h2>
        </div>
        
        {/* 탭 메뉴 */}
        <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                selectedTab === tab.id
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <SparklineTable 
          typeName={selectedTab === "Stocks" ? "Stocks" : selectedTab === "ETFs" ? "ETFs" : selectedTab}
          maxRows={10}
        />
      </div>

      {/* 주요 자산 타입별 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <CryptoPriceCard
          symbol="BTC"
          name="Bitcoin"
          price={normalizedCrypto[0]?.price || normalizedCrypto[0]?.current_price || 0}
          change24h={normalizedCrypto[0]?.price_change_percent_24h || normalizedCrypto[0]?.change_percent_today || 0}
          icon="₿"
          gradientFrom="from-orange-500"
          gradientTo="to-yellow-500"
          size="medium"
        />
        <CryptoMetricCard
          symbol="S&P 500"
          name="대표 주식 지수"
          metricValue={normalizedStock.length > 0 ? `${normalizedStock.length}` : '0'}
          metricLabel="활성 주식 수"
          icon="📈"
          gradientFrom="from-green-500"
          gradientTo="to-emerald-500"
          size="medium"
        />
        <CryptoMetricCard
          symbol="ETF"
          name="Exchange Traded Fund"
          metricValue={normalizedEtf.length > 0 ? `${normalizedEtf.length}` : '0'}
          metricLabel="활성 ETF 수"
          icon="📊"
          gradientFrom="from-purple-500"
          gradientTo="to-pink-500"
          size="medium"
        />
      </div>

      {/* 멀티 자산 차트 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          주요 자산 가격 추이 (90일)
        </h2>
        <MultiAssetLineChart
          assetIdentifiers={['BTCUSDT', 'ETHUSDT', 'AAPL', 'SPY']}
          assetNames={['Bitcoin', 'Ethereum', 'Apple', 'S&P 500 ETF']}
          height={400}
        />
      </div>

      {/* 자산 타입별 테이블 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* 암호화폐 테이블 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              상위 암호화폐
            </h2>
            <Link 
              href="/assets?type_name=Crypto"
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
                  <tr className="text-left text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">자산</th>
                    <th className="py-2 px-2">가격</th>
                    <th className="py-2 px-2">24h</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedCrypto.slice(0, 5).map((crypto: any, index: number) => (
                    <AssetRow
                      key={crypto.asset_id || crypto.ticker || index}
                      rank={index + 1}
                      symbol={crypto.ticker || crypto.symbol || 'N/A'}
                      name={crypto.name || 'N/A'}
                      price={crypto.price || crypto.current_price || 0}
                      change24h={crypto.price_change_percent_24h || crypto.change_percent_today || 0}
                      marketCap={crypto.market_cap || 0}
                      volume24h={crypto.volume_24h || 0}
                      type="Crypto"
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 주식 테이블 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              상위 주식
            </h2>
            <Link 
              href="/assets?type_name=Stock"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
            >
              전체 보기 →
            </Link>
          </div>
          
          {stockLoading ? (
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
                  <tr className="text-left text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">자산</th>
                    <th className="py-2 px-2">가격</th>
                    <th className="py-2 px-2">24h</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedStock.slice(0, 5).map((stock: any, index: number) => (
                    <AssetRow
                      key={stock.asset_id || stock.ticker || index}
                      rank={index + 1}
                      symbol={stock.ticker || stock.symbol || 'N/A'}
                      name={stock.name || 'N/A'}
                      price={stock.price || stock.current_price || 0}
                      change24h={stock.price_change_percent_24h || stock.change_percent_today || 0}
                      marketCap={stock.market_cap || 0}
                      volume24h={stock.volume_24h || 0}
                      type="Stock"
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ETF 테이블 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              상위 ETF
            </h2>
            <Link 
              href="/assets?type_name=ETF"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
            >
              전체 보기 →
            </Link>
          </div>
          
          {etfLoading ? (
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
                  <tr className="text-left text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">자산</th>
                    <th className="py-2 px-2">가격</th>
                    <th className="py-2 px-2">24h</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedEtf.slice(0, 5).map((etf: any, index: number) => (
                    <AssetRow
                      key={etf.asset_id || etf.ticker || index}
                      rank={index + 1}
                      symbol={etf.ticker || etf.symbol || 'N/A'}
                      name={etf.name || 'N/A'}
                      price={etf.price || etf.current_price || 0}
                      change24h={etf.price_change_percent_24h || etf.change_percent_today || 0}
                      marketCap={etf.market_cap || 0}
                      volume24h={etf.volume_24h || 0}
                      type="ETF"
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 자산 타입 통계 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 shadow-lg text-white">
        <h2 className="text-2xl font-bold mb-4">자산 타입 통계</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {assetTypes?.asset_types?.map((type: any) => (
            <div key={type.type_name} className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl mb-2">{type.type_name}</div>
              <div className="text-sm text-blue-100">
                {type.asset_count || 0}개 자산
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

