"use client";

import React, { useMemo } from "react";
import { 
  BoltIcon, 
  DollarLineIcon, 
  PieChartIcon, 
  GridIcon,
  BoxCubeIcon
} from "../../icons/index";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  History, 
  BarChart3,
  Clock,
  ArrowRight,
  Activity
} from "lucide-react";
import { useTreemapLive } from "@/hooks/assets/useAssets";
import { useRealtimePrices } from "@/hooks/data/useSocket";

interface AssetData {
  ticker: string;
  name: string;
  logo_url?: string;
  current_price: number;
  price_change_percentage_24h: number;
}

const BacktestRow = ({ 
  asset,
}: { 
  asset: AssetData,
}) => {
  const { latestPrice } = useRealtimePrices(asset.ticker);
  const currentPrice = latestPrice?.price || asset.current_price;
  const change24h = latestPrice?.changePercent || asset.price_change_percentage_24h;

  return (
    <tr 
      className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all border-none"
    >
      <td className="px-6 py-8">
        <Link href={`/backtest/${asset.ticker.toLowerCase()}`} className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-105 transition-transform">
            {asset.logo_url ? (
              <Image src={asset.logo_url} alt={asset.ticker} width={48} height={48} className="object-cover" />
            ) : (
              <span className="font-bold text-sm">{asset.ticker.substring(0, 3)}</span>
            )}
          </div>
          <div>
            <div className="font-black text-gray-900 dark:text-white text-lg group-hover:text-blue-500 transition-colors uppercase">{asset.ticker}USDT</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{asset.name}</div>
          </div>
        </Link>
      </td>
      
      <td className="px-6 py-8">
        <div className="font-mono font-black text-gray-900 dark:text-white text-lg tracking-tight">
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`text-xs flex items-center gap-1 font-black ${change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change24h).toFixed(2)}%
        </div>
      </td>

      <td className="px-6 py-8">
          <div className="flex items-center">
              <div className="bg-gray-50 dark:bg-gray-800/80 px-5 py-3 rounded-2xl flex items-center gap-4 border border-gray-100 dark:border-gray-700 shadow-inner group-hover:border-blue-500/30 transition-all">
                  <div className="flex -space-x-2">
                     <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[8px] font-black text-blue-600 border border-white dark:border-gray-800">1H</div>
                     <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[8px] font-black text-gray-400 border border-white dark:border-gray-800">4H</div>
                  </div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">High Fidelity Data Ready</span>
              </div>
          </div>
      </td>

      <td className="px-6 py-8 text-right">
           <Link 
              href={`/backtest/${asset.ticker.toLowerCase()}`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-blue-500/20 transition-all text-sm tracking-tight"
           >
              STRATEGY SETUP
              <ArrowRight size={16} />
           </Link>
      </td>
    </tr>
  );
};

const BacktestMainView: React.FC = () => {
  const { data: treemapData, isLoading } = useTreemapLive({
    type_name: "Crypto",
    sort_by: "market_cap",
    sort_order: "desc",
  });

  const displayAssets = useMemo(() => {
    const assetsArray = (treemapData as any)?.data;
    if (!Array.isArray(assetsArray)) return [];
    
    return assetsArray.slice(0, 10).map((a: any) => ({
      ticker: a.ticker || a.asset_identifier,
      name: a.name,
      logo_url: a.logo_url,
      current_price: parseFloat(a.current_price) || 0,
      price_change_percentage_24h: parseFloat(a.price_change_percentage_24h) || 0
    }));
  }, [treemapData]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Zap className="text-blue-500 fill-blue-500" />
            전략 백테스트 센터
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium italic">원하는 자산을 선택하여 역사적 성과를 분석하고 최적의 전략을 구축하세요.</p>
        </div>
        
        <div className="hidden lg:flex gap-3">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                <BarChart3 size={20} />
            </div>
            <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Active Simulation</p>
                <p className="text-lg font-black text-gray-900 dark:text-white font-mono leading-none tracking-tighter">PREMIUM</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[40px] overflow-hidden shadow-sm border-b-4 border-b-blue-600/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Selection Asset</th>
                <th className="px-8 py-6">Current Market</th>
                <th className="px-8 py-6">Intelligence Status</th>
                <th className="px-8 py-6 text-right">Configure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {isLoading ? (
                <tr><td colSpan={4} className="py-24 text-center text-gray-400 font-black uppercase tracking-widest text-sm animate-pulse">Initializing Data Stream...</td></tr>
              ) : displayAssets.map((asset: AssetData) => (
                <BacktestRow 
                  key={asset.ticker} 
                  asset={asset}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-xl shadow-blue-600/20 flex flex-col justify-between group overflow-hidden relative min-h-[220px]">
              <History className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 group-hover:scale-110 transition-transform duration-700" />
              <div className="space-y-4 relative z-10">
                  <h2 className="text-2xl font-black leading-tight tracking-tight">Sell in May<br/>전략 지원</h2>
                  <p className="text-blue-100 text-sm font-medium">특정 월별 진입/청산 조건을 세밀하게 설정할 수 있습니다.</p>
              </div>
              <ArrowRight className="mt-4 text-white opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
          </div>

          <div className="bg-gray-900 rounded-[32px] p-8 text-white shadow-xl flex flex-col justify-between group overflow-hidden relative min-h-[220px]">
              <Clock className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 group-hover:scale-110 transition-transform duration-700" />
              <div className="space-y-4 relative z-10">
                  <h2 className="text-2xl font-black leading-tight tracking-tight">Intraday Timing<br/>정밀 분석</h2>
                  <p className="text-gray-400 text-sm font-medium">한국 시간(KST) 기준 특정 시간대 체결을 시뮬레이션 합니다.</p>
              </div>
              <ArrowRight className="mt-4 text-white opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[32px] p-8 flex flex-col justify-between group overflow-hidden relative min-h-[220px]">
              <Activity className="absolute -right-8 -bottom-8 w-40 h-40 opacity-5 group-hover:scale-110 transition-transform duration-700" />
              <div className="space-y-4 relative z-10">
                  <h2 className="text-2xl font-black leading-tight tracking-tight text-gray-900 dark:text-white">Macro Correlation<br/>연동 테스트</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">SPY, GOLD 등 자산 상관관계 기반 전략을 구축하세요.</p>
              </div>
              <ArrowRight className="mt-4 text-blue-600 opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
          </div>
      </div>
    </div>
  );
};

export default BacktestMainView;
