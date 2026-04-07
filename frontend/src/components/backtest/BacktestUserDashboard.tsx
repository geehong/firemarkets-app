"use client";

import React, { useMemo } from "react";
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
  Activity,
  Plus,
  LayoutDashboard,
  Search
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

const BacktestRow = ({ asset }: { asset: AssetData }) => {
  const { latestPrice } = useRealtimePrices(asset.ticker);
  const currentPrice = latestPrice?.price || asset.current_price;
  const change24h = latestPrice?.changePercent || asset.price_change_percentage_24h;

  return (
    <tr className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all border-none">
      <td className="px-6 py-8">
        <Link href={`/backtest/${asset.ticker.toLowerCase()}`} className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-105 transition-transform">
            {asset.logo_url ? (
              <Image src={asset.logo_url} alt={asset.ticker} width={48} height={48} className="object-cover" />
            ) : (
              <span className="font-bold text-sm">{asset.ticker.substring(0, 3)}</span>
            )}
          </div>
          <div>
            <div className="font-black text-gray-900 dark:text-white text-lg group-hover:text-blue-500 transition-colors uppercase tracking-tight">{asset.ticker}USDT</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{asset.name}</div>
          </div>
        </Link>
      </td>
      
      <td className="px-6 py-8">
        <div className="font-mono font-black text-gray-900 dark:text-white text-lg tracking-tighter">
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`text-xs flex items-center gap-1 font-black ${change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change24h).toFixed(2)}%
        </div>
      </td>

      <td className="px-6 py-8 hidden md:table-cell">
          <div className="flex items-center">
              <div className="bg-gray-50 dark:bg-gray-800/80 px-5 py-3 rounded-2xl flex items-center gap-4 border border-gray-100 dark:border-gray-700 shadow-inner group-hover:border-blue-500/30 transition-all">
                  <div className="flex -space-x-2">
                     <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[8px] font-black text-blue-600 border border-white dark:border-gray-800">1H</div>
                     <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[8px] font-black text-gray-400 border border-white dark:border-gray-800">4H</div>
                     <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-[8px] font-black text-green-600 border border-white dark:border-gray-800">1M</div>
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

const BacktestUserDashboard: React.FC = () => {
  const { data: treemapData, isLoading } = useTreemapLive({
    type_name: "Crypto",
    sort_by: "market_cap",
    sort_order: "desc",
  });

  const displayAssets = useMemo(() => {
    const assetsArray = (treemapData as any)?.data;
    if (!Array.isArray(assetsArray)) return [];
    
    // User sees up to 20 assets for now
    return assetsArray.slice(0, 20).map((a: any) => ({
      ticker: a.ticker || a.asset_identifier,
      name: a.name,
      logo_url: a.logo_url,
      current_price: parseFloat(a.current_price) || 0,
      price_change_percentage_24h: parseFloat(a.price_change_percentage_24h) || 0
    }));
  }, [treemapData]);

  return (
    <div className="p-4 lg:p-6 space-y-8 max-w-7xl mx-auto animate-in slide-in-from-bottom duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard size={16} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Strategy Workspace</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Zap className="text-blue-500 fill-blue-500" />
            전략 백테스트 센터
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">실시간 프리미엄 데이터를 활용하여 전략의 성공 가능성을 검토하세요.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                <BarChart3 size={20} />
            </div>
            <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Active Account</p>
                <p className="text-lg font-black text-gray-900 dark:text-white font-mono leading-none tracking-tighter">PREMIUM</p>
            </div>
          </div>
          <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-5 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "My Strategies", value: "3", icon: <History size={20}/>, color: "text-blue-500" },
          { label: "Recent Performance", value: "+12.4%", icon: <TrendingUp size={20}/>, color: "text-green-500" },
          { label: "Active Simulations", value: "1", icon: <Activity size={20}/>, color: "text-orange-500" },
          { label: "API Calls", value: "1.2k/5k", icon: <Zap size={20}/>, color: "text-yellow-500" }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-800 ${stat.color}`}>{stat.icon}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[40px] overflow-hidden shadow-sm border-b-4 border-b-blue-600/10">
        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search assets (BTC, ETH, etc...)" 
              className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-xs font-black bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">MARKET CAP</button>
            <button className="px-4 py-2 text-xs font-black text-gray-400 hover:text-blue-500 transition-colors">NAME</button>
            <button className="px-4 py-2 text-xs font-black text-gray-400 hover:text-blue-500 transition-colors">PRICE</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Selection Asset</th>
                <th className="px-8 py-6">Current Market</th>
                <th className="px-8 py-6 hidden md:table-cell tracking-wider">Status</th>
                <th className="px-8 py-6 text-right">Configure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {isLoading ? (
                <tr><td colSpan={4} className="py-24 text-center text-gray-400 font-black uppercase tracking-widest text-sm animate-pulse">Synchronizing Data Modules...</td></tr>
              ) : displayAssets.map((asset: AssetData) => (
                <BacktestRow key={asset.ticker} asset={asset} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BacktestUserDashboard;
