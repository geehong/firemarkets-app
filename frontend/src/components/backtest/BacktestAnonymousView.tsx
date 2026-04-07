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
  Shield,
  Lock,
  ChevronRight
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

      <td className="px-6 py-8 hidden md:table-cell">
          <div className="flex items-center">
              <div className="bg-gray-50 dark:bg-gray-800/80 px-5 py-3 rounded-2xl flex items-center gap-4 border border-gray-100 dark:border-gray-700 shadow-inner">
                  <div className="flex -space-x-2">
                     <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[8px] font-black text-blue-600 border border-white dark:border-gray-800">1H</div>
                     <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[8px] font-black text-gray-400 border border-white dark:border-gray-800">4H</div>
                  </div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">DEMO DATA READY</span>
              </div>
          </div>
      </td>

      <td className="px-6 py-8 text-right">
           <Link 
              href={`/backtest/${asset.ticker.toLowerCase()}`}
              className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black py-4 px-8 rounded-2xl shadow-xl transition-all text-sm tracking-tight"
           >
              TRY DEMO
              <ArrowRight size={16} />
           </Link>
      </td>
    </tr>
  );
};

const BacktestAnonymousView: React.FC = () => {
  const { data: treemapData, isLoading } = useTreemapLive({
    type_name: "Crypto",
    sort_by: "market_cap",
    sort_order: "desc",
  });

  const displayAssets = useMemo(() => {
    const assetsArray = (treemapData as any)?.data;
    if (!Array.isArray(assetsArray)) return [];
    
    // Limit to 2 assets for anonymous users
    return assetsArray.slice(0, 2).map((a: any) => ({
      ticker: a.ticker || a.asset_identifier,
      name: a.name,
      logo_url: a.logo_url,
      current_price: parseFloat(a.current_price) || 0,
      price_change_percentage_24h: parseFloat(a.price_change_percentage_24h) || 0
    }));
  }, [treemapData]);

  return (
    <div className="space-y-12 max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[48px] bg-blue-600 p-8 md:p-16 text-white shadow-2xl shadow-blue-500/20">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-400 rounded-full opacity-10 blur-3xl" />
        
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
            <Zap size={16} className="text-yellow-300 fill-yellow-300" />
            <span className="text-xs font-black uppercase tracking-widest">Strategy Backtest Demo</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tight">
            과거 데이터로<br/>
            수익률을 검증하세요.
          </h1>
          
          <p className="text-lg text-blue-100 font-medium max-w-lg leading-relaxed">
            복잡한 코딩 없이 클릭 몇 번으로 나만의 트레이딩 전략을 테스트해보세요.<br/>
            정교한 시뮬레이션 엔진이 당신의 전략을 역사적 데이터에 비추어 분석해드립니다.
          </p>
          
          <div className="flex flex-wrap gap-4 pt-4">
            <Link 
              href="/login" 
              className="bg-white text-blue-600 font-black px-8 py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              무료로 시작하기
              <ChevronRight size={20} />
            </Link>
            <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 font-black px-8 py-4 rounded-2xl hover:bg-white/20 transition-all">
              기능 둘러보기
            </button>
          </div>
        </div>

        {/* Feature Preview Badges */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {[
            { icon: <Clock size={18}/>, text: "High Fidelity Data" },
            { icon: <Activity size={18}/>, text: "Advanced Indicators" },
            { icon: <History size={18}/>, text: "Performance Analytics" },
            { icon: <Shield size={18}/>, text: "Strategy Security" }
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <div className="text-blue-200">{f.icon}</div>
              <span className="text-xs font-bold">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Demo List Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              무료 체험 가능 자산
              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-md font-bold">LIMITED DEMO</span>
            </h2>
            <Link href="/login" className="text-blue-600 text-sm font-bold hover:underline">150+ 전체 자산 확인하기</Link>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[40px] overflow-hidden shadow-sm border-b-4 border-b-blue-600/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">
                  <th className="px-8 py-6">Asset</th>
                  <th className="px-8 py-6">Price</th>
                  <th className="px-8 py-6 hidden md:table-cell tracking-wider">Status</th>
                  <th className="px-8 py-6 text-right">Try</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {isLoading ? (
                  <tr><td colSpan={4} className="py-24 text-center text-gray-400 font-black uppercase tracking-widest text-sm animate-pulse">Stream Initializing...</td></tr>
                ) : (
                  <>
                    {displayAssets.map((asset: AssetData) => (
                      <BacktestRow key={asset.ticker} asset={asset} />
                    ))}
                    <tr className="bg-gray-50/30 dark:bg-gray-800/20">
                      <td colSpan={4} className="px-8 py-10">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                              <Lock size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white uppercase tracking-tighter">150개 이상의 추가 자산 잠금됨</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-black tracking-widest mt-0.5">Premium Login Required</p>
                            </div>
                          </div>
                          <Link 
                            href="/login" 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-[20px] shadow-lg shadow-blue-500/20 transition-all text-xs tracking-tighter"
                          >
                            모든 기능 잠금 해제하기
                          </Link>
                        </div>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Premium Teaser Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 flex flex-col justify-between group overflow-hidden relative min-h-[200px] shadow-sm">
              <History className="absolute -right-8 -bottom-8 w-40 h-40 opacity-5 group-hover:scale-110 transition-transform duration-700" />
              <div className="space-y-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 mb-2">
                    <History size={20} />
                  </div>
                  <h2 className="text-xl font-black leading-tight tracking-tight text-gray-900 dark:text-white uppercase">Strategy Persistence</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">로그인 후 나만의 전략을 저장하고 언제든 다시 불러올 수 있습니다.</p>
              </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 flex flex-col justify-between group overflow-hidden relative min-h-[200px] shadow-sm">
              <BarChart3 className="absolute -right-8 -bottom-8 w-40 h-40 opacity-5 group-hover:scale-110 transition-transform duration-700" />
              <div className="space-y-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-500 mb-2">
                    <BarChart3 size={20} />
                  </div>
                  <h2 className="text-xl font-black leading-tight tracking-tight text-gray-900 dark:text-white uppercase">Precision 1m Data</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">베이직 유저는 1시간 데이터를, 프리미엄 유저는 1분 단위 초정밀 시뮬레이션을 즐길 수 있습니다.</p>
              </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 flex flex-col justify-between group overflow-hidden relative min-h-[200px] shadow-sm md:col-span-2 lg:col-span-1">
              <ArrowRight className="absolute -right-8 -bottom-8 w-40 h-40 opacity-5 group-hover:scale-110 transition-transform duration-700" />
              <div className="space-y-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 mb-2">
                    <Zap size={20} />
                  </div>
                  <h2 className="text-xl font-black leading-tight tracking-tight text-gray-900 dark:text-white uppercase">Ready to go?</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">지금 로그인하고 전문적인 퀀트 투자 여정을 시작하세요.</p>
                  <Link href="/login" className="flex items-center gap-2 text-blue-600 font-black text-sm mt-2">
                    로그인 페이지로 이동
                    <ArrowRight size={16} />
                  </Link>
              </div>
          </div>
      </div>
    </div>
  );
};

export default BacktestAnonymousView;
