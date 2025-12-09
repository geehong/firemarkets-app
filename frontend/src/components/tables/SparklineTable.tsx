"use client";

import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import Image from "next/image";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, Area, AreaChart } from "recharts";
import { useQueries } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useTreemapLive } from "@/hooks/useAssets";
import { useRealtimePrices } from "@/hooks/useSocket";
import { useDelayedQuotes } from "@/hooks/useRealtime";
import { filterExcludedAssets } from "@/constants/excludedAssets";

interface SparklineTableProps {
  assetIdentifiers?: string[];
  typeName?: string;
  maxRows?: number;
}

interface AssetData {
  ticker: string;
  assetId?: number;
  name: string;
  logo_url?: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  instrument: string;
  assetType: string;
  timeline: number[];
  subscriptionStatus?: 'loading' | 'error' | 'subscribed' | 'no-data';
}

// 스파클라인 컴포넌트
const SparklineChart = ({ data }: { data: number[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-10 flex items-center justify-center text-gray-400 text-xs">
        No data
      </div>
    );
  }

  // 데이터가 1개만 있어도 차트로 표시 (직선)
  const chartData = data.map((value, index) => ({
    index,
    value,
  }));

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue || 1;
  const firstValue = data[0];
  const lastValue = data[data.length - 1];
  const isPositive = lastValue >= firstValue;

  // Y축 범위를 약간 확장하여 차트가 더 잘 보이도록 함
  // 데이터가 1개인 경우에도 적절한 범위 설정
  const yAxisMin = data.length === 1
    ? minValue - (minValue * 0.05)
    : minValue - (range * 0.1);
  const yAxisMax = data.length === 1
    ? maxValue + (maxValue * 0.05)
    : maxValue + (range * 0.1);

  // 배경색을 위한 색상 결정 (상승: 파란색, 하강: 빨간색)
  const strokeColor = isPositive ? "#3b82f6" : "#ef4444"; // 파란색 또는 빨간색
  const gradientId = `gradient-${isPositive ? 'blue' : 'red'}`;

  return (
    <div className="w-full h-10 min-w-[60px] min-h-[40px] relative rounded overflow-hidden">
      <ResponsiveContainer width="100%" height="100%" minWidth={60} minHeight={40}>
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <YAxis
            domain={[yAxisMin, yAxisMax]}
            hide={true}
            allowDataOverflow={true}
          />
          <Tooltip
            content={() => null}
            cursor={false}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            activeDot={false}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// 미국시장 개장시간 체크 함수 (한국시간 기준)
const checkUSMarketHours = (): boolean => {
  const now = new Date();
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const hour = koreanTime.getHours();
  const minute = koreanTime.getMinutes();
  const currentTime = hour * 60 + minute;

  // 미국시장 개장시간: 한국시간 23:30 - 06:00 (다음날)
  const marketOpenStart = 23 * 60 + 30; // 23:30
  const marketOpenEnd = 6 * 60; // 06:00

  return currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
};

// Price 위젯 (텍스트만 표시, 스타일 제거)
const PriceWidget = ({
  ticker,
  assetType,
  treemapData
}: {
  ticker: string;
  assetType: string;
  treemapData?: any;
}) => {
  const assetTypeLower = assetType?.toLowerCase() || '';
  const isCrypto = assetTypeLower === 'crypto';
  const isStock = assetTypeLower === 'stock' || assetTypeLower === 'equity' || assetTypeLower === 'stocks';
  const isETF = assetTypeLower === 'etf' || assetTypeLower === 'etfs';
  const isFund = assetTypeLower === 'fund' || assetTypeLower === 'funds';
  const isCommodity = assetTypeLower === 'commodity' || assetTypeLower === 'commodities';

  const isMarketOpen = checkUSMarketHours();

  // 코인: 항상 Mini Widgets 사용 (24시간 거래)
  // 주식/ETF/펀드: 개장시간에만 Mini Widgets, 이후는 treemap_live_view 사용
  // 커머디티: treemap_live_view 사용
  const useMiniWidget = isCrypto || ((isStock || isETF || isFund) && isMarketOpen);

  // treemap_live_view에서 해당 자산 찾기
  const treemapAsset = treemapData?.data?.find((a: any) =>
    (a.ticker || a.asset_identifier) === ticker
  );

  // Mini Widget (WebSocket)
  const { latestPrice: realtimePrice } = useRealtimePrices(ticker);

  // 가격 결정: 웹소켓 사용 시 realtimePrice, 없으면 treemap_live_view의 current_price를 fallback으로 사용
  const price = useMiniWidget
    ? (realtimePrice?.price || treemapAsset?.current_price || 0)
    : (treemapAsset?.current_price || 0);

  if (!price) return <span className="text-gray-400">-</span>;

  return <span className="font-medium">${price.toFixed(2)}</span>;
};

// Change Percent 위젯 (리얼타임)
const ChangePercentWidget = ({
  ticker,
  assetType,
  treemapData
}: {
  ticker: string;
  assetType: string;
  treemapData?: any;
}) => {
  const assetTypeLower = assetType?.toLowerCase() || '';
  const isCrypto = assetTypeLower === 'crypto';
  const isStock = assetTypeLower === 'stock' || assetTypeLower === 'equity' || assetTypeLower === 'stocks';
  const isETF = assetTypeLower === 'etf' || assetTypeLower === 'etfs';
  const isFund = assetTypeLower === 'fund' || assetTypeLower === 'funds';
  const isCommodity = assetTypeLower === 'commodity' || assetTypeLower === 'commodities';

  const isMarketOpen = checkUSMarketHours();
  const useMiniWidget = isCrypto || ((isStock || isETF || isFund) && isMarketOpen);

  // treemap_live_view에서 해당 자산 찾기
  const treemapAsset = treemapData?.data?.find((a: any) =>
    (a.ticker || a.asset_identifier) === ticker
  );

  // Mini Widget (WebSocket) - changePercent를 직접 사용
  const { latestPrice: realtimePrice, isConnected } = useRealtimePrices(ticker);

  // 현재 가격
  const currentPrice = useMiniWidget
    ? (realtimePrice?.price || treemapAsset?.current_price || 0)
    : (treemapAsset?.current_price || 0);

  // 변경률: WebSocket에서 받은 changePercent 우선 사용
  // WebSocket에 연결되어 있고 가격을 받았으면 changePercent가 계산될 때까지 기다림
  let changePercent: number | null = null;

  // WebSocket 연결 상태 확인 (useMiniWidget이든 아니든 WebSocket 연결되어 있으면 사용)
  const isWebSocketActive = isConnected && realtimePrice?.price !== undefined && realtimePrice?.price !== null;

  if (useMiniWidget || isWebSocketActive) {
    // WebSocket 사용 시
    // changePercent가 명시적으로 제공되면 사용 (0도 유효한 값)
    if (realtimePrice?.changePercent !== undefined && realtimePrice.changePercent !== null) {
      // WebSocket에서 받은 changePercent 사용 (한국시간 기준 전일 종가 대비 계산된 값)
      changePercent = realtimePrice.changePercent;
    } else if (isWebSocketActive) {
      // WebSocket에 연결되어 있고 가격을 받았지만 changePercent가 아직 계산 중인 경우
      // treemap_live_view 값 절대 사용하지 않음 (계산될 때까지 대기)
      changePercent = null;
    } else {
      // WebSocket 연결 안 됨 또는 가격 데이터 없음 → treemap_live_view 사용
      changePercent = treemapAsset?.price_change_percentage_24h ?? null;
    }
  } else {
    // WebSocket 미사용 시 → treemap_live_view 사용
    changePercent = treemapAsset?.price_change_percentage_24h ?? null;
  }

  if (currentPrice === 0 || changePercent === null) {
    return <span className="text-gray-400">-</span>;
  }

  const isPositive = changePercent >= 0;

  return (
    <Badge size="sm" color={isPositive ? "success" : "error"}>
      {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
    </Badge>
  );
};

// Volume 위젯 (리얼타임)
const VolumeWidget = ({
  ticker,
  assetType,
  treemapData
}: {
  ticker: string;
  assetType: string;
  treemapData?: any;
}) => {
  const assetTypeLower = assetType?.toLowerCase() || '';
  const isCrypto = assetTypeLower === 'crypto';
  const isStock = assetTypeLower === 'stock' || assetTypeLower === 'equity' || assetTypeLower === 'stocks';
  const isETF = assetTypeLower === 'etf' || assetTypeLower === 'etfs';
  const isFund = assetTypeLower === 'fund' || assetTypeLower === 'funds';
  const isCommodity = assetTypeLower === 'commodity' || assetTypeLower === 'commodities';

  const isMarketOpen = checkUSMarketHours();
  const useMiniWidget = isCrypto || ((isStock || isETF || isFund) && isMarketOpen);

  // treemap_live_view에서 해당 자산 찾기
  const treemapAsset = treemapData?.data?.find((a: any) =>
    (a.ticker || a.asset_identifier) === ticker
  );

  // Mini Widget (WebSocket)
  const { latestPrice: realtimePrice } = useRealtimePrices(ticker);

  // Volume 결정: 웹소켓 사용 시 realtimePrice?.volume, 없으면 treemap_live_view의 volume을 fallback으로 사용
  const volume = useMiniWidget
    ? (realtimePrice?.volume || treemapAsset?.volume || 0)
    : (treemapAsset?.volume || 0);

  if (!volume) return <span className="text-gray-400">-</span>;

  return <span>{volume.toLocaleString('en-US')}</span>;
};

export default function SparklineTable({
  assetIdentifiers,
  typeName,
  maxRows = 20,
}: SparklineTableProps) {
  // 자산 목록 조회
  const { data: treemapData, isLoading } = useTreemapLive(
    typeName
      ? {
        type_name: typeName,
        sort_by: "market_cap",
        sort_order: "desc",
      }
      : {
        sort_by: "market_cap",
        sort_order: "desc",
      }
  );

  // 필터링된 자산 목록 (delayed quotes 조회용)
  const filteredAssetIdentifiers = useMemo(() => {
    if (isLoading || !treemapData) {
      return [];
    }

    const assets = (treemapData as any)?.data || [];

    // 제외 목록 필터링
    let filteredByExclusion = filterExcludedAssets(assets)

    // assetIdentifiers가 제공된 경우 해당 자산만 필터링, 아니면 전체 자산 사용
    let filteredAssets = assetIdentifiers && assetIdentifiers.length > 0
      ? filteredByExclusion.filter((asset: any) =>
        assetIdentifiers.includes(asset.ticker || asset.asset_identifier)
      )
      : filteredByExclusion;

    // 시가 총액으로 정렬 (내림차순)
    filteredAssets = filteredAssets.sort((a: any, b: any) => {
      const marketCapA = parseFloat(a.market_cap) || 0;
      const marketCapB = parseFloat(b.market_cap) || 0;
      return marketCapB - marketCapA;
    });

    // 상위 maxRows개만 사용
    filteredAssets = filteredAssets.slice(0, maxRows);

    return filteredAssets.map((asset: any) => ({
      identifier: asset.ticker || asset.asset_identifier,
      assetType: asset.asset_type || asset.type_name || "Asset",
      assetId: asset.asset_id,
    }));
  }, [treemapData, assetIdentifiers, maxRows, isLoading]);

  // 각 자산별 delayed quotes 데이터 조회 (개별 호출)
  const delayedQuotesQueries = useQueries({
    queries: filteredAssetIdentifiers.map((item) => {
      const assetTypeLower = item.assetType?.toLowerCase() || '';
      const isCrypto = assetTypeLower === 'crypto';
      const isStocksOrEtf = assetTypeLower === 'stocks' || assetTypeLower === 'etfs';
      // USDT, USDC 같은 stablecoin은 coinbase 사용, 나머지는 binance 사용
      const isStablecoin = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD'].includes(item.identifier.toUpperCase());

      // crypto인 경우 data_source 결정
      // stablecoin은 coinbase, 나머지는 binance
      const dataSource = isCrypto ? (isStablecoin ? 'coinbase' : 'binance') : undefined;

      return {
        queryKey: ['delayed-quotes-sparkline', item.identifier, dataSource, isStocksOrEtf],
        queryFn: async () => {
          const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1';

          // 주식/ETF인 경우 sparkline-price 사용, 그 외에는 기존 quotes-delay-price 사용
          const endpoint = isStocksOrEtf ? '/realtime/sparkline-price' : '/realtime/pg/quotes-delay-price';

          const search = new URLSearchParams();
          search.append('asset_identifier', item.identifier);
          search.append('data_interval', '15m');
          search.append('days', '1');
          if (dataSource) {
            search.append('data_source', dataSource);
          }
          const url = `${BACKEND_BASE}${endpoint}?${search.toString()}`;

          try {
            const response = await fetch(url);
            if (!response.ok) {
              // 404 에러는 데이터가 없는 것으로 간주하고 빈 배열 반환
              if (response.status === 404) {
                console.warn(`[SparklineTable] No delayed quotes data for ${item.identifier}, returning empty array`);
                return { quotes: [] };
              }
              throw new Error(`Failed to fetch delayed quotes for ${item.identifier}: ${response.status}`);
            }
            return response.json();
          } catch (error) {
            // 네트워크 에러나 기타 에러는 빈 배열 반환하여 앱이 계속 작동하도록 함
            console.warn(`[SparklineTable] Error fetching delayed quotes for ${item.identifier}:`, error);
            return { quotes: [] };
          }
        },
        enabled: !!item.identifier && !isLoading && !!treemapData,
        refetchInterval: 15 * 60 * 1000, // 15분마다 자동 갱신
        staleTime: 15 * 60 * 1000, // 15분간 데이터를 신선하게 유지
        retry: 1, // 재시도 횟수 제한 (404 에러는 재시도 불필요)
      };
    }),
  });

  // delayed quotes 데이터를 맵으로 변환
  const delayedQuotesMap = useMemo(() => {
    const map: Record<string, number[]> = {};

    delayedQuotesQueries.forEach((query, index) => {
      const item = filteredAssetIdentifiers[index];
      if (!item || !query.data) return;

      const identifier = item.identifier;
      const response = query.data as any;

      // 응답 형식에 따라 quotes 배열 추출
      let quotes: any[] = [];
      if (response?.quotes && Array.isArray(response.quotes)) {
        quotes = response.quotes;
      } else if (Array.isArray(response)) {
        // 배열인 경우 첫 번째 요소의 quotes 사용
        const firstItem = response[0];
        if (firstItem?.quotes) {
          quotes = firstItem.quotes;
        }
      }

      // 타임스탬프 순으로 정렬하고 가격만 추출
      const timeline = quotes
        .sort((a: any, b: any) =>
          new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime()
        )
        .map((quote: any) => parseFloat(quote.price) || 0)
        .filter((price: number) => price > 0);

      if (timeline.length > 0) {
        map[identifier] = timeline;
      }
    });

    return map;
  }, [delayedQuotesQueries, filteredAssetIdentifiers]);

  // 행 데이터 생성
  const tableData = useMemo<AssetData[]>(() => {
    if (isLoading || !treemapData) {
      return [];
    }

    const assets = (treemapData as any)?.data || [];

    // 제외 목록 필터링
    let filteredByExclusion = filterExcludedAssets(assets)

    // assetIdentifiers가 제공된 경우 해당 자산만 필터링, 아니면 전체 자산 사용
    let filteredAssets = assetIdentifiers && assetIdentifiers.length > 0
      ? filteredByExclusion.filter((asset: any) =>
        assetIdentifiers.includes(asset.ticker || asset.asset_identifier)
      )
      : filteredByExclusion;

    // 시가 총액으로 정렬 (내림차순) - AssetsList.tsx와 동일한 로직
    filteredAssets = filteredAssets.sort((a: any, b: any) => {
      const marketCapA = parseFloat(a.market_cap) || 0;
      const marketCapB = parseFloat(b.market_cap) || 0;
      return marketCapB - marketCapA;
    });

    // 상위 maxRows개만 사용
    filteredAssets = filteredAssets.slice(0, maxRows);

    return filteredAssets
      .map((asset: any) => {
        // 현재 가격
        const currentPrice = asset.current_price || 0;
        const identifier = asset.ticker || asset.asset_identifier;

        // delayed quotes에서 타임라인 가져오기
        let timeline: number[] = delayedQuotesMap[identifier] || [];

        // delayed quotes 데이터가 없으면 현재 가격으로 fallback
        if (timeline.length === 0 && currentPrice > 0) {
          timeline = [currentPrice * 0.99, currentPrice];
        } else if (timeline.length === 0) {
          timeline = [currentPrice, currentPrice];
        }

        // 해당 자산의 구독 상태 확인
        const queryIndex = filteredAssetIdentifiers.findIndex((item) => item.identifier === identifier);
        const query = queryIndex >= 0 ? delayedQuotesQueries[queryIndex] : null;
        const isSubscribed = query?.isSuccess && timeline.length > 0;
        const subscriptionStatus = query?.isLoading
          ? 'loading'
          : query?.isError
            ? 'error'
            : isSubscribed
              ? 'subscribed'
              : 'no-data';

        return {
          ticker: identifier,
          assetId: asset.asset_id,
          name: asset.name || "",
          logo_url: asset.logo_url,
          instrument: asset.asset_type || "Asset",
          assetType: asset.asset_type || asset.type_name || "Asset",
          price: currentPrice,
          timeline: timeline,
          change24h: asset.price_change_percentage_24h || 0,
          volume: asset.volume || 0,
          marketCap: asset.market_cap || 0,
          subscriptionStatus: subscriptionStatus,
        };
      })
      .filter((item): item is AssetData => item !== null);
  }, [treemapData, assetIdentifiers, maxRows, isLoading, delayedQuotesMap, delayedQuotesQueries, filteredAssetIdentifiers]);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-gray-400">
            Loading assets data...
          </div>
        </div>
      </div>
    );
  }

  if (!tableData || tableData.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-gray-400">
            No data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-0 md:min-w-[1100px]">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 md:w-auto w-[40%]"
                >
                  Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 hidden md:table-cell"
                >
                  Chart (1Day)
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 md:hidden w-[60%]"
                >
                  Price
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 hidden md:table-cell"
                >
                  Price
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 hidden md:table-cell"
                >
                  Change (%)
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-32 hidden md:table-cell"
                >
                  Volume
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 hidden md:table-cell"
                >
                  Market Cap
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {tableData.map((asset) => (
                <TableRow key={asset.ticker}>
                  {/* Name - 모바일: 티커만, 데스크톱: 로고+티커+이름 */}
                  <TableCell className="px-5 py-4 sm:px-6 text-start md:w-auto w-[40%]">
                    <Link
                      href={`/assets/${asset.ticker || asset.assetId}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      {/* 로고 - 데스크톱에서만 표시 */}
                      {asset.logo_url ? (
                        <div className="w-10 h-10 overflow-hidden rounded-full hidden md:block">
                          <Image
                            width={40}
                            height={40}
                            src={asset.logo_url}
                            alt={`${asset.ticker} logo`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full hidden md:block">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                            {asset.ticker.substring(0, 1)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {asset.ticker}
                          </span>
                          {/* 구독 상태 표시 */}
                          {asset.subscriptionStatus && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${asset.subscriptionStatus === 'subscribed'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                  : asset.subscriptionStatus === 'loading'
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                                    : asset.subscriptionStatus === 'error'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                              title={
                                asset.subscriptionStatus === 'subscribed'
                                  ? '구독됨'
                                  : asset.subscriptionStatus === 'loading'
                                    ? '로딩 중'
                                    : asset.subscriptionStatus === 'error'
                                      ? '에러'
                                      : '데이터 없음'
                              }
                            >
                              {asset.subscriptionStatus === 'subscribed'
                                ? '✓'
                                : asset.subscriptionStatus === 'loading'
                                  ? '⋯'
                                  : asset.subscriptionStatus === 'error'
                                    ? '✗'
                                    : '○'}
                            </span>
                          )}
                        </div>
                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400 hidden md:block">
                          {asset.name}
                        </span>
                      </div>
                    </Link>
                  </TableCell>
                  {/* Chart - 데스크톱에서만 표시 */}
                  <TableCell className="px-4 py-3 text-start hidden md:table-cell">
                    <SparklineChart data={asset.timeline} />
                  </TableCell>
                  {/* Price + Change - 모바일 전용 */}
                  <TableCell className="px-4 py-3 text-start text-theme-sm dark:text-gray-400 md:hidden w-[60%]">
                    <div className="flex items-center gap-2">
                      <PriceWidget ticker={asset.ticker} assetType={asset.assetType} treemapData={treemapData} />
                      <ChangePercentWidget ticker={asset.ticker} assetType={asset.assetType} treemapData={treemapData} />
                    </div>
                  </TableCell>
                  {/* Price - 데스크톱 전용 */}
                  <TableCell className="px-4 py-3 text-start text-theme-sm dark:text-gray-400 hidden md:table-cell">
                    <PriceWidget ticker={asset.ticker} assetType={asset.assetType} treemapData={treemapData} />
                  </TableCell>
                  {/* Change - 데스크톱 전용 */}
                  <TableCell className="px-4 py-3 text-start text-theme-sm dark:text-gray-400 hidden md:table-cell">
                    <ChangePercentWidget ticker={asset.ticker} assetType={asset.assetType} treemapData={treemapData} />
                  </TableCell>
                  {/* Volume - 데스크톱에서만 표시 */}
                  <TableCell className="px-4 py-3 text-start text-theme-sm dark:text-gray-400 w-32 hidden md:table-cell">
                    <VolumeWidget ticker={asset.ticker} assetType={asset.assetType} treemapData={treemapData} />
                  </TableCell>
                  {/* Market Cap - 데스크톱에서만 표시 */}
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 hidden md:table-cell">
                    {asset.marketCap >= 1e9
                      ? `$${(asset.marketCap / 1e9).toFixed(2)}B`
                      : asset.marketCap >= 1e6
                        ? `$${(asset.marketCap / 1e6).toFixed(2)}M`
                        : `$${asset.marketCap.toFixed(2)}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

