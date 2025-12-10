"use client";

import React, { useState, useMemo } from "react";
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
import { useTreemapLive } from "@/hooks/useAssets";
import { useRealtimePrices } from "@/hooks/useSocket";
import { filterExcludedAssets } from "@/constants/excludedAssets";

interface RealtimePriceTableProps {
    typeName?: string;
    showFilter?: boolean;  // 필터 드롭다운 표시 여부
    maxRows?: number;      // 최대 행 수 제한 (페이지네이션 없이)
    title?: string;        // 테이블 타이틀
    showPagination?: boolean;  // 페이지네이션 표시 여부
}

// 미국시장 개장시간 체크 함수 (한국시간 기준)
const checkUSMarketHours = (): boolean => {
    const now = new Date();
    const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const hour = koreanTime.getHours();
    const minute = koreanTime.getMinutes();
    const currentTime = hour * 60 + minute;
    const marketOpenStart = 23 * 60 + 30;
    const marketOpenEnd = 6 * 60;
    return currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
};

// 테이블 행 컴포넌트 - useRealtimePrices를 한 번만 호출
const TableRowComponent = ({
    asset,
    treemapData,
}: {
    asset: {
        assetId: number;
        ticker: string;
        name: string;
        logo_url?: string;
        assetType: string;
        price: number;
        change24h: number;
        volume: number;
        marketCap: number;
    };
    treemapData: any;
}) => {
    const assetTypeLower = asset.assetType?.toLowerCase() || '';
    const isCrypto = assetTypeLower.includes('crypto');
    const isStock = assetTypeLower.includes('stock') || assetTypeLower === 'equity';
    const isETF = assetTypeLower.includes('etf');
    const isFund = assetTypeLower.includes('fund');

    const isMarketOpen = checkUSMarketHours();
    const useWebSocket = isCrypto || ((isStock || isETF || isFund) && isMarketOpen);

    // useRealtimePrices를 행 단위로 한 번만 호출
    const { latestPrice, isConnected } = useRealtimePrices(asset.ticker);


    // treemap_live_view에서 해당 자산 찾기
    const treemapAsset = treemapData?.data?.find((a: any) =>
        (a.ticker || a.asset_identifier) === asset.ticker
    );

    // 가격 결정
    const price = useWebSocket
        ? (latestPrice?.price || treemapAsset?.current_price || asset.price || 0)
        : (treemapAsset?.current_price || asset.price || 0);

    // 변경률 결정
    let changePercent: number | null = null;
    const isWebSocketActive = isConnected && latestPrice?.price !== undefined && latestPrice?.price !== null;

    if (useWebSocket || isWebSocketActive) {
        if (latestPrice?.changePercent !== undefined && latestPrice.changePercent !== null) {
            changePercent = latestPrice.changePercent;
        } else if (isWebSocketActive) {
            changePercent = null;
        } else {
            changePercent = treemapAsset?.price_change_percentage_24h ?? asset.change24h ?? null;
        }
    } else {
        changePercent = treemapAsset?.price_change_percentage_24h ?? asset.change24h ?? null;
    }

    // 볼륨 결정
    const volume = useWebSocket
        ? (latestPrice?.volume || treemapAsset?.volume || asset.volume || 0)
        : (treemapAsset?.volume || asset.volume || 0);

    // 마켓캡
    const marketCap = treemapAsset?.market_cap || asset.marketCap || 0;

    const isPositive = (changePercent ?? 0) >= 0;

    const formatPrice = (p: number) => {
        if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (p >= 1) return `$${p.toFixed(2)}`;
        if (p >= 0.01) return `$${p.toFixed(4)}`;
        return `$${p.toFixed(8)}`;
    };

    const formatVolume = (v: number) => {
        if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
        if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
        if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
        return v.toLocaleString('en-US');
    };

    const formatMarketCap = (mc: number) => {
        if (mc >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`;
        if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`;
        if (mc >= 1e6) return `$${(mc / 1e6).toFixed(2)}M`;
        return `$${mc.toLocaleString('en-US')}`;
    };

    return (
        <TableRow>
            {/* Name (Logo + Name with Link) */}
            <TableCell className="px-2 py-1.5 text-start">
                <Link
                    href={`/assets/${asset.ticker}`}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                >
                    {asset.logo_url ? (
                        <div className="w-4 h-4 overflow-hidden rounded-full flex-shrink-0">
                            <Image
                                width={16}
                                height={16}
                                src={asset.logo_url}
                                alt={`${asset.ticker} logo`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-4 h-4 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0">
                            <span className="text-[8px] font-bold text-gray-600 dark:text-gray-300">
                                {asset.ticker.substring(0, 1)}
                            </span>
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium text-gray-800 text-xs dark:text-white/90">
                            {asset.ticker}
                        </span>
                        <span className="text-gray-500 text-[10px] dark:text-gray-400 truncate max-w-[80px]">
                            {asset.name}
                        </span>
                    </div>
                </Link>
            </TableCell>
            {/* Price */}
            <TableCell className="px-1 py-1.5 text-start text-xs dark:text-gray-400">
                {price > 0 ? (
                    <span className="font-medium text-gray-800 dark:text-white/90">{formatPrice(price)}</span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </TableCell>
            {/* Change (%) */}
            <TableCell className="px-1 py-1.5 text-start text-xs dark:text-gray-400">
                {changePercent !== null ? (
                    <Badge size="sm" color={isPositive ? "success" : "error"}>
                        {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
                    </Badge>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </TableCell>
            {/* Volume */}
            <TableCell className="px-1 py-1.5 text-gray-500 text-start text-xs dark:text-gray-400">
                {volume > 0 ? formatVolume(volume) : "-"}
            </TableCell>
            {/* Market Cap */}
            <TableCell className="px-1 py-1.5 text-gray-500 text-start text-xs dark:text-gray-400">
                {marketCap > 0 ? formatMarketCap(marketCap) : "-"}
            </TableCell>
        </TableRow>
    );
};

export default function RealtimePriceTable({
    typeName,
    showFilter = true,
    maxRows,
    title,
    showPagination = true,
}: RealtimePriceTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(maxRows || 20);
    const [selectedAssetType, setSelectedAssetType] = useState<string>('all');

    // 자산 타입 옵션
    const assetTypeOptions = [
        { value: 'all', label: 'All Assets' },
        { value: 'crypto', label: 'Crypto' },
        { value: 'stocks', label: 'Stocks' },
        { value: 'etf', label: 'ETFs' },
        { value: 'commodities', label: 'Commodities' },
        { value: 'fund', label: 'Funds' },
    ];

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

    // 필터링 및 정렬된 자산 목록
    const allAssets = useMemo(() => {
        if (isLoading || !treemapData) return [];

        const assets = (treemapData as any)?.data || [];
        let filteredAssets = filterExcludedAssets(assets);

        // 자산 타입으로 필터링
        if (selectedAssetType !== 'all') {
            filteredAssets = filteredAssets.filter((asset: any) => {
                const assetType = (asset.asset_type || asset.type_name || '').toLowerCase();

                switch (selectedAssetType) {
                    case 'crypto':
                        return assetType.includes('crypto');
                    case 'stocks':
                        return assetType.includes('stock') || assetType === 'equity';
                    case 'etf':
                        return assetType.includes('etf');
                    case 'commodities':
                        return assetType.includes('commodit');
                    case 'fund':
                        return assetType.includes('fund');
                    default:
                        return true;
                }
            });
        }

        // 시가 총액으로 정렬 (내림차순)
        filteredAssets = filteredAssets.sort((a: any, b: any) => {
            const marketCapA = parseFloat(a.market_cap) || 0;
            const marketCapB = parseFloat(b.market_cap) || 0;
            return marketCapB - marketCapA;
        });

        return filteredAssets.map((asset: any) => ({
            assetId: asset.asset_id,
            ticker: asset.ticker || asset.asset_identifier,
            name: asset.name || "",
            logo_url: asset.logo_url,
            assetType: asset.asset_type || asset.type_name || "Asset",
            price: asset.current_price || 0,
            change24h: asset.price_change_percentage_24h || 0,
            volume: asset.volume || 0,
            marketCap: asset.market_cap || 0,
        }));
    }, [treemapData, isLoading, selectedAssetType]);

    // 페이지네이션 계산
    const totalPages = Math.ceil(allAssets.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedAssets = allAssets.slice(startIndex, endIndex);

    // 페이지 변경 핸들러
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // 페이지 사이즈 변경 핸들러
    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setCurrentPage(1); // 페이지 사이즈 변경 시 첫 페이지로 이동
    };

    // 자산 타입 변경 핸들러
    const handleAssetTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedAssetType(e.target.value);
        setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
    };

    // 페이지 번호 배열 생성
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    if (isLoading) {
        return (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-600 dark:text-gray-400">Loading assets data...</div>
                </div>
            </div>
        );
    }

    if (!paginatedAssets || paginatedAssets.length === 0) {
        return (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-600 dark:text-gray-400">No data available</div>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            {/* 타이틀 + 페이지 사이즈 선택 */}
            {title && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-white/[0.05]">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
                    <select
                        value={pageSize}
                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        className="px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {[10, 20, 50, 100, 200].map((size) => (
                            <option key={size} value={size}>
                                {size}개
                            </option>
                        ))}
                    </select>
                </div>
            )}
            {/* 필터 및 페이지 사이즈 선택 (showFilter 또는 showPagination이 true일 때만) */}
            {(showFilter || showPagination) && (
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/[0.05]">
                    <div className="flex items-center gap-4">
                        {/* 자산 타입 필터 드롭다운 */}
                        {showFilter && (
                            <select
                                value={selectedAssetType}
                                onChange={handleAssetTypeChange}
                                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {assetTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        )}
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Showing {startIndex + 1}-{Math.min(endIndex, allAssets.length)} of {allAssets.length} assets
                        </div>
                    </div>
                    {showPagination && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Show:</span>
                            {[20, 50, 100].map((size) => (
                                <button
                                    key={size}
                                    onClick={() => handlePageSizeChange(size)}
                                    className={`px-3 py-1 text-sm rounded-md transition-colors ${pageSize === size
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 테이블 */}
            <div className="max-w-full overflow-x-auto">
                <div className="min-w-[800px]">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell isHeader className="px-2 py-1.5 font-medium text-gray-500 text-start text-xs dark:text-gray-400">
                                    Name
                                </TableCell>
                                <TableCell isHeader className="px-1 py-1.5 font-medium text-gray-500 text-start text-xs dark:text-gray-400">
                                    Price
                                </TableCell>
                                <TableCell isHeader className="px-1 py-1.5 font-medium text-gray-500 text-start text-xs dark:text-gray-400">
                                    Change
                                </TableCell>
                                <TableCell isHeader className="px-1 py-1.5 font-medium text-gray-500 text-start text-xs dark:text-gray-400">
                                    Volume
                                </TableCell>
                                <TableCell isHeader className="px-1 py-1.5 font-medium text-gray-500 text-start text-xs dark:text-gray-400">
                                    M.Cap
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {paginatedAssets.map((asset: any) => (
                                <TableRowComponent
                                    key={asset.assetId || asset.ticker}
                                    asset={asset}
                                    treemapData={treemapData}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* 페이지네이션 */}
            {showPagination && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 px-5 py-4 border-t border-gray-100 dark:border-white/[0.05]">
                    <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        First
                    </button>
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Prev
                    </button>

                    {getPageNumbers().map((page, idx) => (
                        typeof page === 'number' ? (
                            <button
                                key={idx}
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${currentPage === page
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {page}
                            </button>
                        ) : (
                            <span key={idx} className="px-2 text-gray-400">...</span>
                        )
                    ))}

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                    <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Last
                    </button>
                </div>
            )}
        </div>
    );
}
