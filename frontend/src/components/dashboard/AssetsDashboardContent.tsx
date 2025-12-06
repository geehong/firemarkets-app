"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useTreemapLive } from "@/hooks/useAssets";
import CompareMultipleAssetsChart from "@/components/charts/line/CompareMultipleAssetsChart";
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
  type
}: AssetRowProps) => {
  const isValidPrice = price > 0;
  const changeColor = change24h >= 0 ? "text-green-500" : "text-red-500";
  const changeSign = change24h >= 0 ? "+" : "";

  // 가격 포맷팅 함수
  const formatPrice = (p: number) => {
    if (!p || p === 0) return '-';
    if (p >= 1000) {
      return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (p >= 1) {
      return `$${p.toFixed(2)}`;
    } else {
      return `$${p.toFixed(6)}`;
    }
  };

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="py-3 px-2 text-gray-600 dark:text-gray-400 text-center">{rank}</td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${type === 'Crypto' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
            type === 'Stock' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
              'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            }`}>
            {type}
          </span>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{symbol}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{name}</span>
          </div>
        </div>
      </td>
      <td className="py-3 px-2 font-medium text-gray-900 dark:text-white text-right">
        {isValidPrice ? formatPrice(price) : <span className="text-gray-400">-</span>}
      </td>
      <td className={`py-3 px-2 font-medium text-right ${isValidPrice ? changeColor : 'text-gray-400'}`}>
        {isValidPrice ? `${changeSign}${change24h.toFixed(2)}%` : '-'}
      </td>
    </tr>
  );
};

export default function AssetsDashboardContent() {
  // 탭 상태 관리
  const [selectedTab, setSelectedTab] = useState<string>("Crypto");

  // 자산 타입별 데이터 조회 - useTreemapLive 사용 (실시간 데이터 포함)
  const { data: cryptoDataRaw, isLoading: cryptoLoading, isError: cryptoError } = useTreemapLive(
    { type_name: 'Crypto', sort_by: 'market_cap', sort_order: 'desc' },
    { staleTime: 2 * 60 * 1000, retry: 1 }
  );

  const { data: stockDataRaw, isLoading: stockLoading, isError: stockError } = useTreemapLive(
    { type_name: 'Stocks', sort_by: 'market_cap', sort_order: 'desc' },
    { staleTime: 2 * 60 * 1000, retry: 1 }
  );

  const { data: etfDataRaw, isLoading: etfLoading, isError: etfError } = useTreemapLive(
    { type_name: 'ETFs', sort_by: 'market_cap', sort_order: 'desc' },
    { staleTime: 2 * 60 * 1000, retry: 1 }
  );

  // 자산 타입 목록 조회
  const { data: assetTypes } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => apiClient.getAssetTypes({ hasData: true }),
    staleTime: 10 * 60 * 1000,
  });

  // 정규화 헬퍼 - treemap_live_view 데이터 구조에 맞게 수정
  const normalizeTreemapData = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  };

  const normalizedCrypto = normalizeTreemapData(cryptoDataRaw);
  const normalizedStock = normalizeTreemapData(stockDataRaw);
  const normalizedEtf = normalizeTreemapData(etfDataRaw);

  // 시가총액 계산 헬퍼
  const calculateTotalMarketCap = (assets: any[]) => {
    return assets.reduce((sum, asset) => sum + (parseFloat(asset.market_cap) || 0), 0);
  };

  // 시가총액 포맷 헬퍼
  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
  };

  const cryptoMarketCap = calculateTotalMarketCap(normalizedCrypto);
  const stockMarketCap = calculateTotalMarketCap(normalizedStock);
  const etfMarketCap = calculateTotalMarketCap(normalizedEtf);

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
              className={`px-4 py-2 font-medium text-sm transition-colors ${selectedTab === tab.id
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <SparklineTable
          typeName={selectedTab}
          maxRows={10}
        />
      </div>

      {/* 주요 자산 타입별 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* 암호화폐 카드 */}
        <div className="bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">₿</div>
            <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">Crypto</span>
          </div>
          <div className="mb-2">
            <div className="text-sm opacity-80">활성 암호화폐</div>
            <div className="text-2xl font-bold">
              {cryptoLoading ? (
                <span className="animate-pulse">로딩 중...</span>
              ) : cryptoError ? (
                <span className="text-white/70">데이터 없음</span>
              ) : (
                `${normalizedCrypto.length}개`
              )}
            </div>
          </div>
          <div className="text-sm text-white/80">
            {normalizedCrypto.length > 0 ? '실시간 데이터 사용 가능' : '데이터 대기 중'}
          </div>
        </div>

        {/* 주식 카드 */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">📈</div>
            <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">Stock</span>
          </div>
          <div className="mb-2">
            <div className="text-sm opacity-80">활성 주식</div>
            <div className="text-2xl font-bold">
              {stockLoading ? (
                <span className="animate-pulse">로딩 중...</span>
              ) : stockError ? (
                <span className="text-white/70">데이터 없음</span>
              ) : (
                `${normalizedStock.length}개`
              )}
            </div>
          </div>
          <div className="text-sm text-white/80">
            {normalizedStock.length > 0 ? '실시간 데이터 사용 가능' : '데이터 대기 중'}
          </div>
        </div>

        {/* ETF 카드 */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl">📊</div>
            <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">ETF</span>
          </div>
          <div className="mb-2">
            <div className="text-sm opacity-80">활성 ETF</div>
            <div className="text-2xl font-bold">
              {etfLoading ? (
                <span className="animate-pulse">로딩 중...</span>
              ) : etfError ? (
                <span className="text-white/70">데이터 없음</span>
              ) : (
                `${normalizedEtf.length}개`
              )}
            </div>
          </div>
          <div className="text-sm text-white/80">
            {normalizedEtf.length > 0 ? '실시간 데이터 사용 가능' : '데이터 대기 중'}
          </div>
        </div>
      </div>

      {/* 멀티 자산 비교 차트 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 mb-8 overflow-hidden">
        <CompareMultipleAssetsChart
          assetIdentifiers={['BTCUSDT', 'ETHUSDT', 'AAPL', 'SPY']}
          assetNames={['Bitcoin', 'Ethereum', 'Apple', 'S&P 500 ETF']}
          height={450}
          title="주요 자산 가격 추이"
          subtitle="백분율 변화 비교"
          showRangeSelector={true}
          showExporting={true}
          showNavigator={true}
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
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : cryptoError ? (
            <div className="text-center py-8">
              <div className="text-red-500 dark:text-red-400 mb-2">⚠️</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">데이터를 불러올 수 없습니다</p>
            </div>
          ) : normalizedCrypto.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">💰</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">암호화폐 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-2 w-8 text-center">#</th>
                    <th className="py-2 px-2">자산</th>
                    <th className="py-2 px-2 text-right">가격</th>
                    <th className="py-2 px-2 text-right">24h</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedCrypto.slice(0, 5).map((crypto: any, index: number) => (
                    <AssetRow
                      key={crypto.asset_id || crypto.ticker || index}
                      rank={index + 1}
                      symbol={crypto.ticker || 'N/A'}
                      name={crypto.name || 'N/A'}
                      price={crypto.current_price || 0}
                      change24h={crypto.price_change_percentage_24h || 0}
                      marketCap={0}
                      volume24h={0}
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
              href="/assets?type_name=Stocks"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
            >
              전체 보기 →
            </Link>
          </div>

          {stockLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : stockError ? (
            <div className="text-center py-8">
              <div className="text-red-500 dark:text-red-400 mb-2">⚠️</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">데이터를 불러올 수 없습니다</p>
            </div>
          ) : normalizedStock.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">📈</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">주식 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-2 w-8 text-center">#</th>
                    <th className="py-2 px-2">자산</th>
                    <th className="py-2 px-2 text-right">가격</th>
                    <th className="py-2 px-2 text-right">24h</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedStock.slice(0, 5).map((stock: any, index: number) => (
                    <AssetRow
                      key={stock.asset_id || stock.ticker || index}
                      rank={index + 1}
                      symbol={stock.ticker || 'N/A'}
                      name={stock.name || 'N/A'}
                      price={stock.current_price || 0}
                      change24h={stock.price_change_percentage_24h || 0}
                      marketCap={0}
                      volume24h={0}
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
              href="/assets?type_name=ETFs"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
            >
              전체 보기 →
            </Link>
          </div>

          {etfLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : etfError ? (
            <div className="text-center py-8">
              <div className="text-red-500 dark:text-red-400 mb-2">⚠️</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">데이터를 불러올 수 없습니다</p>
            </div>
          ) : normalizedEtf.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">📊</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ETF 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-2 w-8 text-center">#</th>
                    <th className="py-2 px-2">자산</th>
                    <th className="py-2 px-2 text-right">가격</th>
                    <th className="py-2 px-2 text-right">24h</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedEtf.slice(0, 5).map((etf: any, index: number) => (
                    <AssetRow
                      key={etf.asset_id || etf.ticker || index}
                      rank={index + 1}
                      symbol={etf.ticker || 'N/A'}
                      name={etf.name || 'N/A'}
                      price={etf.current_price || 0}
                      change24h={etf.price_change_percentage_24h || 0}
                      marketCap={0}
                      volume24h={0}
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
        <h2 className="text-2xl font-bold mb-6">자산 타입별 현황</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Crypto */}
          <div className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-5 transition-colors">
            <div className="text-3xl mb-3">💰</div>
            <div className="text-lg font-bold mb-1">Crypto</div>
            <div className="text-2xl font-bold text-yellow-200 mb-1">
              {normalizedCrypto.length}개
            </div>
            <div className="text-sm text-blue-100">
              시가총액: {formatMarketCap(cryptoMarketCap)}
            </div>
          </div>
          {/* Stocks */}
          <div className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-5 transition-colors">
            <div className="text-3xl mb-3">📈</div>
            <div className="text-lg font-bold mb-1">Stocks</div>
            <div className="text-2xl font-bold text-green-200 mb-1">
              {normalizedStock.length}개
            </div>
            <div className="text-sm text-blue-100">
              시가총액: {formatMarketCap(stockMarketCap)}
            </div>
          </div>
          {/* ETFs */}
          <div className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-5 transition-colors">
            <div className="text-3xl mb-3">📊</div>
            <div className="text-lg font-bold mb-1">ETFs</div>
            <div className="text-2xl font-bold text-purple-200 mb-1">
              {normalizedEtf.length}개
            </div>
            <div className="text-sm text-blue-100">
              시가총액: {formatMarketCap(etfMarketCap)}
            </div>
          </div>
          {/* Commodities */}
          <div className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-5 transition-colors">
            <div className="text-3xl mb-3">🌾</div>
            <div className="text-lg font-bold mb-1">Commodities</div>
            <div className="text-sm text-blue-100 mt-4">
              원자재 데이터
            </div>
          </div>
          {/* Funds */}
          <div className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-5 transition-colors">
            <div className="text-3xl mb-3">🏦</div>
            <div className="text-lg font-bold mb-1">Funds</div>
            <div className="text-sm text-blue-100 mt-4">
              펀드 데이터
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

