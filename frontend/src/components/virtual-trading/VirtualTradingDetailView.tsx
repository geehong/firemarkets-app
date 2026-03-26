"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { 
  BoltIcon, 
  DollarLineIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  ChevronLeftIcon,
  TimeIcon
} from "../../icons/index";
import { Link } from "@/i18n/navigation";
import { Zap, Shield, Info, TrendingUp, TrendingDown, Settings, History, BarChart3, Wallet, Activity, Calendar } from "lucide-react";
import { useRealtimePrices } from "@/hooks/data/useSocket";
import { useAuth } from "@/hooks/auth/useAuthNew";
import { useVirtualPositions, useVirtualTradeHistory } from "@/hooks/virtual-trading/useVirtualTrading";
import LiveCandleChart from "@/components/charts/live/LiveCandleChart";
import LineChartOne from "@/components/charts/line/LineChartOne";

const VirtualTradingDetailView: React.FC = () => {
  const params = useParams();
  const symbol = params.symbol as string;
  const { isAuthenticated } = useAuth();
  
  const { latestPrice } = useRealtimePrices(symbol);
  
  const currentPrice = latestPrice?.price || 0;
  const change24h = latestPrice?.changePercent || 0;

  // Backend Data Hooks
  const { data: positionsData } = useVirtualPositions({ enabled: isAuthenticated });
  const { data: historyData } = useVirtualTradeHistory({ enabled: isAuthenticated });
  
  // Find current position for this symbol
  const activePosition = useMemo(() => {
    if (!positionsData) return null;
    return positionsData.find(p => p.symbol === symbol && p.is_active);
  }, [positionsData, symbol]);

  // Real-time PnL Calculation based on currentPrice
  const { pnl, pnlPercent } = useMemo(() => {
    if (!activePosition || !currentPrice) {
      return { pnl: 0, pnlPercent: 0 };
    }
    const entryPrice = activePosition.entry_price || 0;
    const quantity = activePosition.quantity || 0;
    const leverage = activePosition.leverage || 1;
    const isLong = (activePosition.side as string) === 'BUY' || (activePosition.side as string) === 'LONG';
    
    const currentPnl = isLong ? (currentPrice - entryPrice) * quantity : (entryPrice - currentPrice) * quantity;
    const margin = (entryPrice * quantity) / leverage;
    const currentPnlPercent = margin > 0 ? (currentPnl / margin) * 100 : 0;
    
    return { pnl: currentPnl, pnlPercent: currentPnlPercent };
  }, [activePosition, currentPrice]);

  // Filter history for this symbol
  const displayHistory = useMemo(() => {
    if (!historyData) return [];
    return historyData.filter(h => h.symbol === symbol).slice(0, 5);
  }, [historyData, symbol]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/virtual-trading" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-200 dark:border-gray-700">
            <ChevronLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {symbol} <span className="text-xs font-medium text-blue-500 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">Detail Status</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono font-bold text-lg text-gray-900 dark:text-white">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-bold flex items-center gap-1 ${change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {change24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {Math.abs(change24h).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-2xl shadow-sm hidden sm:flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-xs font-bold text-gray-500">Live Simulation</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Charts (Takes 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Candle Chart */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[32px] p-6 shadow-sm overflow-hidden min-h-[500px]">
             <LiveCandleChart 
               assetIdentifier={symbol} 
               title={`${symbol} Trading Chart`} 
               height={450} 
               mode="rolling" 
               lookbackHours={24}
             />
          </div>

          {/* Investment Price Flow (PnL History) */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[32px] p-6 shadow-sm space-y-4">
             <div className="flex items-center justify-between px-2">
               <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                 <Activity size={18} className="text-blue-500" /> 투자 가격 흐름 (PnL History)
               </h3>
               <div className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">Last 7 Days</div>
             </div>
             <div className="h-[350px]">
               <LineChartOne />
             </div>
          </div>
        </div>

        {/* Right: Position Status & History (Takes 1/3) */}
        <div className="space-y-6">
          {/* Current Position Highlights */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-[32px] p-8 shadow-xl relative overflow-hidden ring-1 ring-gray-200/50 dark:ring-white/5">
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">현재 포지션 결과</h3>
                {activePosition && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${activePosition.side === 'BUY' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {activePosition.side === 'BUY' ? 'LONG' : 'SHORT'}
                  </span>
                )}
              </div>

              {activePosition ? (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">진입 시점</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(activePosition.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">레버리지</p>
                      <p className="text-sm font-black text-blue-500">{activePosition.leverage}x</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">진입 가격</p>
                      <p className="text-sm font-bold font-mono text-gray-900 dark:text-white">${(activePosition?.entry_price || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">진입 수량</p>
                      <p className="text-sm font-bold font-mono text-gray-900 dark:text-white">{activePosition.quantity} {symbol.replace('USDT', '')}</p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">현재 손익 (PnL)</p>
                      <div className={`text-3xl font-black font-mono tracking-tighter ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pnl >= 0 ? '+' : ''}${(pnl || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl">
                       <p className="text-xs font-bold text-gray-500">ROI (%)</p>
                       <div className={`text-xl font-black font-mono ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                         {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                       </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-300 dark:text-gray-700">
                    <Activity size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">보유 포지션 없음</p>
                    <p className="text-xs text-gray-500">현재 {symbol}에 대한 가상 거래 포지션이 없습니다.</p>
                  </div>
                  <Link 
                    href="/virtual-trading"
                    className="mt-2 text-xs font-bold text-blue-500 hover:underline"
                  >
                    가상 거래 시작하기
                  </Link>
                </div>
              )}
            </div>
            {/* Background Accent */}
            <div className={`absolute -right-10 -bottom-10 w-40 h-40 blur-3xl opacity-10 rounded-full ${pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>

          {/* Investment History Section */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[32px] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <History size={18} className="text-gray-400" /> 
                {isAuthenticated ? '전체 투자 내역' : '최근 거래 내역'}
              </h3>
              {!isAuthenticated && <span className="text-[9px] font-bold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500">GUEST MODE</span>}
            </div>
            
            <div className="space-y-3">
              {displayHistory.length > 0 ? (
                displayHistory.map(h => (
                  <div key={h.id} className="group p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{new Date(h.timestamp).toLocaleString()}</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{h.trade_type} {h.side}</span>
                      </div>
                      <span className={`text-xs font-black ${ (parseFloat(String(h.pnl)) || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {(parseFloat(String(h.pnl)) || 0) >= 0 ? '+' : ''}{(parseFloat(String(h.pnl)) || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Price: ${(h.price || 0).toLocaleString()}</span>
                      <span>Qty: {h.quantity}</span>
                      <span className="font-bold text-gray-400">{h.leverage}x</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-gray-500">
                  표시할 거래 내역이 없습니다.
                </div>
              )}
              
              {isAuthenticated && (
                <button className="w-full py-4 text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/10 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all">
                  전체 기록 보기
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualTradingDetailView;
