"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
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
// import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, Area, AreaChart } from "recharts";
import { useQueries } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useTreemapLive } from "@/hooks/assets/useAssets";
import { useRealtimePrices } from "@/hooks/data/useSocket";
import { useDelayedQuotes } from "@/hooks/data/useRealtime";
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
  subscriptionStatus?: 'loading' | 'error' | 'subscribed' | 'no-data' | string;
}

// 스파클라인 컴포넌트 - 순수 SVG로 경량화 및 React.memo 적용
const SparklineChart = React.memo(({ data }: { data: number[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-10 flex items-center justify-center text-gray-400 text-xs">
        No data
      </div>
    );
  }

  // 데이터 가공 및 경로 생성 (ViewBox 0 0 100 100 기준)
  const { pathString, areaPath, strokeColor, gradientId } = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((val, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 98 - ((val - min) / range) * 96; // 상하 2% 여백
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    const isPositive = data[data.length - 1] >= data[0];
    const color = isPositive ? "#3b82f6" : "#ef4444";
    const gId = `grad-${isPositive ? 'up' : 'down'}-${Math.random().toString(36).substr(2, 9)}`;
    
    const pString = `M ${points.join(' L ')}`;
    const aPath = `${pString} L 100,100 L 0,100 Z`;

    return { 
      pathString: pString, 
      areaPath: aPath, 
      strokeColor: color, 
      gradientId: gId 
    };
  }, [data]);

  return (
    <div className="w-full h-10 min-w-[60px] min-h-[40px] relative rounded overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="block"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
        <path
          d={pathString}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
});

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
  treemapData,
  realtimeData,
}: {
  ticker: string;
  assetType: string;
  treemapData?: any;
  realtimeData?: { price: number | null; volume?: number | null; changePercent?: number | null; isConnected: boolean };
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

  // 가격 결정: realtimeData 사용 시 price, 없으면 treemap_live_view의 current_price를 fallback으로 사용
  const price = useMiniWidget
    ? (realtimeData?.price || treemapAsset?.current_price || 0)
    : (treemapAsset?.current_price || 0);

  if (!price) return <span className="text-gray-400">-</span>;

  return <span className="font-medium">${price.toFixed(2)}</span>;
};

// Change Percent 위젯 (리얼타임)
const ChangePercentWidget = ({
  ticker,
  assetType,
  treemapData,
  realtimeData,
}: {
  ticker: string;
  assetType: string;
  treemapData?: any;
  realtimeData?: { price: number | null; volume?: number | null; changePercent?: number | null; isConnected: boolean };
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

  // 현재 가격
  const currentPrice = useMiniWidget
    ? (realtimeData?.price || treemapAsset?.current_price || 0)
    : (treemapAsset?.current_price || 0);

  // 변경률: realtimeData에서 받은 changePercent 우선 사용
  let changePercent: number | null = null;

  // WebSocket 연결 상태 확인
  const isWebSocketActive = realtimeData?.isConnected && realtimeData?.price !== undefined && realtimeData?.price !== null;

  if (useMiniWidget || isWebSocketActive) {
    // WebSocket 사용 시
    if (realtimeData?.changePercent !== undefined && realtimeData.changePercent !== null) {
      changePercent = realtimeData.changePercent;
    } else if (isWebSocketActive) {
      changePercent = null;
    } else {
      changePercent = treemapAsset?.price_change_percentage_24h ?? null;
    }
  } else {
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
  treemapData,
  realtimeData,
}: {
  ticker: string;
  assetType: string;
  treemapData?: any;
  realtimeData?: { price: number | null; volume?: number | null; changePercent?: number | null; isConnected: boolean };
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

  // Volume 결정: realtimeData 사용 시 volume, 없으면 treemap_live_view의 volume_24h 또는 volume을 fallback으로 사용
  const volume = useMiniWidget
    ? (realtimeData?.volume || treemapAsset?.volume_24h || treemapAsset?.volume || 0)
    : (treemapAsset?.volume_24h || treemapAsset?.volume || 0);

  if (!volume) return <span className="text-gray-400">-</span>;

  return <span>{volume.toLocaleString('en-US')}</span>;
};

// 테이블 행 컴포넌트 - useRealtimePrices를 한 번만 호출하고 위젯들에 전달
// ... (add hook at top level, maybe before SparklineChart or after imports)

// Hook to check for desktop view
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isDesktop;
};

// ... SparklineChart (unchanged) ...

// ... PriceWidget, ChangePercentWidget, VolumeWidget (unchanged) ...

// Updated SparklineTableRow
const SparklineTableRow = ({
  asset,
  treemapData,
  isDesktop,
}: {
  asset: AssetData;
  treemapData: any;
  isDesktop: boolean;
}) => {
  // useRealtimePrices를 행 단위로 한 번만 호출
  const { latestPrice, isConnected } = useRealtimePrices(asset.ticker);

  // realtimeData 객체 생성 (위젯에 전달)
  const realtimeData = {
    price: latestPrice?.price ?? null,
    volume: latestPrice?.volume ?? null,
    changePercent: latestPrice?.changePercent ?? null,
    isConnected,
  };

  return (
    <TableRow key={asset.ticker} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.05]">
      {/* 상징 (Ticker) */}
      <TableCell className="px-3 py-2 text-start font-bold text-blue-600 dark:text-blue-400 text-sm">
        <Link href={`/assets/${asset.ticker || asset.assetId}`}>
          {asset.ticker}
        </Link>
      </TableCell>
      
      {/* 이름 (Name) */}
      <TableCell className="px-3 py-2 text-start text-gray-700 dark:text-gray-300 min-w-[150px] text-xs">
        <div className="flex items-center gap-2">
          {asset.logo_url && (
            <div className="w-5 h-5 relative overflow-hidden rounded-full shrink-0">
              <Image
                fill
                src={asset.logo_url}
                alt={`${asset.ticker} logo`}
                className="object-cover"
                sizes="20px"
              />
            </div>
          )}
          <span className="truncate max-w-[180px]">{asset.name}</span>
        </div>
      </TableCell>

      {/* 미니 차트 (Sparkline) */}
      <TableCell className="px-3 py-2 w-24">
        <SparklineChart data={asset.timeline} />
      </TableCell>

      {/* 가격 (Price) */}
      <TableCell className="px-3 py-2 text-end font-semibold text-sm">
        <PriceWidget ticker={asset.ticker} assetType={asset.assetType} treemapData={treemapData} realtimeData={realtimeData} />
      </TableCell>

      {/* 변화 (Change Abs) */}
      <TableCell className="px-3 py-2 text-end text-sm">
         <span className={asset.change24h >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
           {asset.change24h >= 0 ? "+" : ""}{(asset.price * (asset.change24h / 100)).toFixed(2)}
         </span>
      </TableCell>

      {/* 변화 % (Change %) */}
      <TableCell className="px-3 py-2 text-end text-sm">
        <ChangePercentWidget ticker={asset.ticker} assetType={asset.assetType} treemapData={treemapData} realtimeData={realtimeData} />
      </TableCell>

      {/* 용량 (Volume) */}
      <TableCell className="px-3 py-2 text-end text-gray-600 dark:text-gray-400 text-xs">
        <VolumeWidget ticker={asset.ticker} assetType={asset.assetType} treemapData={treemapData} realtimeData={realtimeData} />
      </TableCell>

      {/* 평균 거래량 */}
      <TableCell className="px-3 py-2 text-end text-gray-500 text-xs">
        {asset.marketCap >= 1e9
          ? `${(asset.marketCap / 1e9).toFixed(1)}B`
          : asset.marketCap >= 1e6
            ? `${(asset.marketCap / 1e6).toFixed(1)}M`
            : `${asset.marketCap.toLocaleString()}`}
      </TableCell>

      {/* 시가총액 (Market Cap) */}
      <TableCell className="px-3 py-2 text-end text-gray-500 text-xs">
        {asset.marketCap >= 1e9
          ? `${(asset.marketCap / 1e9).toFixed(2)}B`
          : asset.marketCap >= 1e6
            ? `${(asset.marketCap / 1e6).toFixed(2)}M`
            : `${asset.marketCap.toLocaleString()}`}
      </TableCell>
    </TableRow>
  );
};

export default function SparklineTable({
  assetIdentifiers,
  typeName,
  maxRows = 20,
}: SparklineTableProps) {
  const isDesktop = useIsDesktop();
  // ... (rest of the code)
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
          // 로컬 개발 환경 우선
          const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8001/api/v1';
          // V2 Migration: Use V2 base
          const V2_BASE = BACKEND_BASE.replace('/api/v1', '/api/v2');

          // 통합된 ohlcv 엔드포인트 사용
          const endpoint = `/assets/market/${item.identifier}/ohlcv`;

          const search = new URLSearchParams();
          search.append('data_interval', '15m');
          // V2 uses limit to control amount. 1 day of 15m = 96 points.
          search.append('limit', '96'); 
          
          if (dataSource) {
             // V2 currently doesn't strictly require data_source for ohlcv aggregation unless specified in market.py filtering? 
             // market.py doesn't seem to filter by data_source in get_ohlcv_data_v2 explicitly, it aggregates.
             // But let's check market.py... it uses db_get_intraday_data.
          }
          const url = `${V2_BASE}${endpoint}?${search.toString()}`;

          try {
            const response = await fetch(url);
            if (!response.ok) {
              if (response.status === 404) {
                console.warn(`[SparklineTable] No delayed quotes data for ${item.identifier}, returning empty array`);
                return { data: [] }; // V2 return structure empty
              }
              throw new Error(`Failed to fetch delayed quotes for ${item.identifier}: ${response.status}`);
            }
            return response.json();
          } catch (error) {
            console.warn(`[SparklineTable] Error fetching delayed quotes for ${item.identifier}:`, error);
            return { data: [] };
          }
        },
        enabled: !!item.identifier && !isLoading && !!treemapData,
        refetchInterval: 15 * 60 * 1000,
        staleTime: 15 * 60 * 1000,
        retry: 1,
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

      // V2 Response: { data: [ { timestamp_utc, close_price, ... } ], ... }
      let quotes: any[] = [];
      if (response?.data && Array.isArray(response.data)) {
        quotes = response.data;
      } else if (response?.quotes) {
        // Fallback for V1 if rollback happens? or mixed env?
        quotes = response.quotes;
      }

      // 타임스탬프 순으로 정렬하고 가격만 추출
      const timeline = quotes
        .sort((a: any, b: any) =>
          new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime()
        )
        .map((quote: any) => {
             // V2: close_price, V1: price
             const val = quote.close_price !== undefined ? quote.close_price : quote.price;
             return parseFloat(val) || 0;
        })
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
          volume: asset.volume_24h || asset.volume || 0,
          marketCap: asset.market_cap || 0,
          subscriptionStatus: subscriptionStatus as AssetData['subscriptionStatus'],
        } as AssetData;
      })
      .filter((item) => item !== null);
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
              <TableRow className="bg-gray-50/50 dark:bg-white/[0.01]">
                <TableCell isHeader className="px-3 py-2 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wider">
                  Symbol
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wider">
                  Name
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wider">
                  Intraday
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wider">
                  Price
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wider">
                  Change
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wider">
                  Change %
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wider">
                  Volume
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wider">
                  Avg Vol(3m)
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wider">
                  Market Cap
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {tableData.map((asset) => (
                <SparklineTableRow
                  key={asset.ticker}
                  asset={asset}
                  treemapData={treemapData}
                  isDesktop={isDesktop}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

