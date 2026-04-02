"use client";

import React, { useState, useMemo, useEffect } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { 
  Zap, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Play, 
  History, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  Scale, 
  Activity, 
  Globe, 
  ShieldCheck,
  Plus,
  ArrowRight,
  TrendingUp as TrendingUpIcon,
  RefreshCw,
  LineChart,
  BarChart,
  DollarSign
} from "lucide-react";
import { useRealtimePrices } from "@/hooks/data/useSocket";
import { useTranslations } from "next-intl";

interface BacktestSetupViewProps {
  ticker: string;
}

// 고성능 백테스트 차트 (Highcharts 활용)
const BacktestResultChart = ({ ticker }: { ticker: string }) => {
  const chartOptions: Highcharts.Options = {
    chart: {
      backgroundColor: 'transparent',
      height: 320,
      zooming: {
        type: 'x'
      },
      style: {
        fontFamily: 'Inter, sans-serif'
      }
    },
    title: { text: undefined },
    xAxis: {
      type: 'datetime',
      gridLineWidth: 0.5,
      gridLineDashStyle: 'Dash',
      gridLineColor: 'rgba(156, 163, 175, 0.1)',
      lineColor: 'rgba(156, 163, 175, 0.1)',
      labels: { style: { color: '#9ca3af', fontSize: '10px' } }
    },
    yAxis: {
      title: { text: undefined },
      gridLineDashStyle: 'Dash',
      gridLineColor: 'rgba(156, 163, 175, 0.1)',
      labels: { 
         style: { color: '#9ca3af', fontSize: '10px' },
         formatter: function() { return '$' + this.value; }
      }
    },
    tooltip: {
      shared: true,
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      borderColor: '#3b82f6',
      style: { color: '#fff' },
      borderWidth: 1,
      borderRadius: 12
    },
    legend: { 
        enabled: true, 
        itemStyle: { color: '#9ca3af', fontSize: '11px', fontWeight: 'bold' },
        align: 'right',
        verticalAlign: 'top'
    },
    series: [
      {
        type: 'area',
        name: 'Portfolio Equity (STRATEGY)',
        color: '#2563eb',
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(37, 99, 235, 0.2)'],
            [1, 'rgba(37, 99, 235, 0)']
          ]
        },
        data: Array.from({ length: 120 }, (_, i) => [
          Date.now() - (120 - i) * 24 * 3600 * 1000,
          1000 + (Math.sin(i / 10) * 200) + (i * 15) + (Math.random() * 50)
        ])
      },
      {
        type: 'line',
        name: 'Buy & Hold (BTC)',
        color: '#94a3b8',
        dashStyle: 'Dash',
        data: Array.from({ length: 120 }, (_, i) => [
          Date.now() - (120 - i) * 24 * 3600 * 1000,
          1000 + (i * 8) + (Math.random() * 100)
        ])
      }
    ],
    credits: { enabled: false }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 space-y-6 shadow-sm overflow-hidden relative group">
        <div className="flex items-center justify-between mb-2">
            <div>
               <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Performance Curve</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Starting with $1,000 Initial Capital</p>
            </div>
            <div className="flex gap-2">
                <button className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"><RefreshCw size={14} /></button>
                <button className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"><Settings size={14} /></button>
            </div>
        </div>
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-50 dark:border-gray-800 mt-4">
             <div className="space-y-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Final Value</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">$2,482.12</p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ROI (Total)</p>
                <p className="text-xl font-black text-emerald-500">+148.21%</p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">MDD (Max)</p>
                <p className="text-xl font-black text-red-500">-12.4%</p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Win Rate</p>
                <p className="text-xl font-black text-blue-600">62.8%</p>
             </div>
        </div>
    </div>
  );
};

const ConditionSettingBox = ({ 
  title, 
  icon, 
  color, 
  defaults 
}: { 
  title: string; 
  icon: React.ReactNode; 
  color: string;
  defaults: any;
}) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 space-y-6 shadow-sm hover:shadow-lg transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${color === 'green' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'} dark:bg-opacity-10`}>
            {icon}
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</h3>
        </div>
      </div>

      <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={12} />
                Technical Indicators (RSI / MA)
            </label>
            <div className="flex gap-4">
               <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 focus-within:border-blue-500/50 transition-all">
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">RSI Limit</p>
                  <input type="text" defaultValue={defaults.rsi} className="bg-transparent w-full font-black text-gray-900 dark:text-white outline-none" />
               </div>
               <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 focus-within:border-blue-500/50 transition-all">
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">MA Crossover</p>
                  <select defaultValue={defaults.ma} className="bg-transparent w-full font-black text-gray-900 dark:text-white outline-none">
                      <option value="none">None</option>
                      <option value="ma5-20">MA 5/20 Cross</option>
                      <option value="ma20-60">MA 20/60 Cross</option>
                  </select>
               </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} />
                Execution Months (Seasonal Cycle)
            </label>
            <div className="grid grid-cols-6 gap-2">
              {months.map(m => (
                <button 
                  key={m} 
                  className={`py-2 text-[10px] font-black rounded-xl border transition-all ${
                    defaults.months?.includes(m) 
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md transform scale-105' 
                    : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700 hover:border-blue-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={12} />
                    Intraday Hour (0-23)
                </label>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center gap-2 focus-within:border-blue-500/50 transition-all">
                   <input type="number" defaultValue={defaults.hour} className="bg-transparent w-full font-black text-gray-900 dark:text-white outline-none" />
                   <span className="font-bold text-blue-500 text-xs">KST</span>
                </div>
             </div>
             <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe size={12} />
                    Macro Correlation (SPY)
                </label>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 focus-within:border-blue-500/50 transition-all">
                   <input type="text" defaultValue={defaults.macro1} className="bg-transparent w-full font-black text-gray-900 dark:text-white outline-none" />
                </div>
             </div>
          </div>
      </div>
    </div>
  );
};

const BacktestSetupView: React.FC<BacktestSetupViewProps> = ({ ticker }) => {
  const { latestPrice } = useRealtimePrices(ticker);
  const [isRunning, setIsRunning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [entryType, setEntryType] = useState<'lump' | 'dca'>('lump');

  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [weekOfMonth, setWeekOfMonth] = useState<string>('2nd');
  const [dayOfWeek, setDayOfWeek] = useState<string>('Wed');

  const handleRun = () => {
    setIsRunning(true);
    setShowResult(false);
    setTimeout(() => {
      setIsRunning(false);
      setShowResult(true);
    }, 2000);
  };

  return (
    <div className="p-4 lg:p-8 space-y-12 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
          <Link href="/backtest" className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors font-bold group">
             <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
             Back to Selection
          </Link>
          <div className="flex items-center gap-4 bg-white dark:bg-gray-800 px-6 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
             <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Precision Simulation</span>
             <span className="w-px h-3 bg-gray-200 dark:bg-gray-800" />
             <span className="flex items-center gap-1.5 text-xs font-black text-blue-500 leading-none">
                AI OPTIMIZER ON
             </span>
          </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-10">
          {/* Configuration (Left Column) */}
          <div className="flex-1 space-y-10">
            <div className="space-y-4">
                <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-4 uppercase italic">
                   {ticker}USDT <span className="text-2xl text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-4 py-1 rounded-2xl not-italic">Backtest Pro</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-2xl text-lg leading-relaxed">
                    시작일과 구매 패턴을 결합하여 역사적 성과를 정밀하게 분석합니다. <br/>적립식(DCA) 투자의 복합 시나리오를 자유롭게 설계하세요.
                </p>
            </div>

            {/* Step 1: Period Selection (Improved Date Picker) */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[40px] p-10 space-y-8 shadow-sm">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                      <Calendar size={20} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Period Selection</h2>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Backtest Start Date</label>
                     <div 
                        className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:border-blue-500 focus-within:border-blue-500 transition-all cursor-pointer"
                        //@ts-ignore
                        onClick={(e) => e.currentTarget.querySelector('input')?.showPicker?.()}
                     >
                        <input 
                          type="date" 
                          defaultValue="2023-01-01" 
                          className="bg-transparent font-black text-xl text-gray-900 dark:text-white outline-none w-full cursor-pointer [color-scheme:light] dark:[color-scheme:dark]" 
                        />
                     </div>
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Backtest End Date</label>
                     <div 
                        className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:border-blue-500 focus-within:border-blue-500 transition-all cursor-pointer"
                        //@ts-ignore
                        onClick={(e) => e.currentTarget.querySelector('input')?.showPicker?.()}
                     >
                        <input 
                          type="date" 
                          defaultValue="2025-04-01" 
                          className="bg-transparent font-black text-xl text-gray-900 dark:text-white outline-none w-full cursor-pointer [color-scheme:light] dark:[color-scheme:dark]" 
                        />
                     </div>
                  </div>
               </div>
            </div>

            {/* Step 2: Dynamic Execution Builder */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[40px] p-10 space-y-10 shadow-sm border-t-8 border-t-blue-600">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
                        <DollarSign size={20} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Execution Strategy</h2>
                  </div>
                  
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-700">
                      <button 
                        onClick={() => setEntryType('lump')}
                        className={`px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${entryType === 'lump' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md border border-gray-100 dark:border-gray-600' : 'text-gray-400'}`}
                      >
                          Lump-sum
                      </button>
                      <button 
                        onClick={() => setEntryType('dca')}
                        className={`px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${entryType === 'dca' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md border border-gray-100 dark:border-gray-600' : 'text-gray-400'}`}
                      >
                          Recurring DCA
                      </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Initial Investment Basis</label>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex items-center gap-2 group focus-within:border-blue-500 transition-all">
                           <input type="text" defaultValue="1,000" className="bg-transparent w-full font-black text-3xl text-gray-900 dark:text-white outline-none" />
                           <span className="font-bold text-gray-400 text-xl">USDT</span>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Simulation Leverage</label>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex items-center gap-6">
                           <input type="range" min="1" max="100" defaultValue="1" className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                           <span className="font-black text-2xl text-blue-600 w-12 text-right">1x</span>
                        </div>
                     </div>
                  </div>

                  {entryType === 'dca' && (
                    <div className="space-y-8 p-8 bg-emerald-50/30 dark:bg-emerald-900/5 rounded-[32px] border border-emerald-100/50 dark:border-emerald-800 animate-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-3">
                              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Recurring Pop-up ($)</label>
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-2 group focus-within:border-emerald-500 transition-all">
                                 <input type="text" defaultValue="500" className="bg-transparent w-full font-black text-xl text-emerald-600 outline-none" />
                              </div>
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Frequency Type</label>
                              <select 
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value as any)}
                                className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 font-black text-xs text-emerald-600 outline-none"
                              >
                                  <option value="daily">Daily</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="monthly">Monthly</option>
                              </select>
                           </div>
                        </div>

                        {frequency === 'weekly' && (
                          <div className="space-y-3 animate-in slide-in-from-top-2">
                             <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Select Purchase Day</label>
                             <div className="flex gap-2 flex-wrap">
                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                                   <button key={day} className={`flex-1 py-2 text-[10px] font-black rounded-xl border transition-all ${day === 'Mon' ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700'}`}>
                                      {day}
                                   </button>
                                ))}
                             </div>
                          </div>
                        )}

                        {frequency === 'monthly' && (
                          <div className="space-y-4 animate-in slide-in-from-top-2">
                             <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Monthly Purchase Logic</label>
                             <div className="flex gap-4">
                                <select 
                                  value={weekOfMonth}
                                  onChange={(e) => setWeekOfMonth(e.target.value)}
                                  className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 font-black text-xs text-emerald-600 outline-none"
                                >
                                    <option value="1st">1st Week</option>
                                    <option value="2nd">2nd Week</option>
                                    <option value="3rd">3rd Week</option>
                                    <option value="4th">4th Week</option>
                                    <option value="last">Last Week</option>
                                </select>
                                <select 
                                  value={dayOfWeek}
                                  onChange={(e) => setDayOfWeek(e.target.value)}
                                  className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 font-black text-xs text-emerald-600 outline-none"
                                >
                                    <option value="Mon">Monday</option>
                                    <option value="Tue">Tuesday</option>
                                    <option value="Wed">Wednesday</option>
                                    <option value="Thu">Thursday</option>
                                    <option value="Fri">Friday</option>
                                </select>
                             </div>
                             <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest text-center mt-2">
                                Result: Every {weekOfMonth} {dayOfWeek} of the month
                             </p>
                          </div>
                        )}
                    </div>
                  )}
               </div>
            </div>

            {/* Step 3 & 4: Logic Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <ConditionSettingBox 
                  title="Buy Signals (Long Entry)" 
                  icon={<TrendingUp size={24} />} 
                  color="green" 
                  defaults={{
                    rsi: "RSI < 40",
                    ma: "ma20-60",
                    months: ["Jan", "Apr", "Oct", "Nov", "Dec"],
                    hour: 8,
                    macro1: "SPY > 0.3%"
                  }}
               />
               <ConditionSettingBox 
                  title="Sell Signals (Long Exit)" 
                  icon={<TrendingDown size={24} />} 
                  color="red" 
                  defaults={{
                    rsi: "RSI > 75",
                    ma: "none",
                    months: ["May", "Jun", "Jul"],
                    hour: 17,
                    macro1: "None"
                  }}
               />
            </div>

            <div className="flex gap-6">
                <button 
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex-[2] bg-blue-600 text-white font-black py-8 rounded-[36px] text-2xl shadow-2xl shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50 relative overflow-hidden"
                >
                   {isRunning ? (
                      <RefreshCw size={28} className="animate-spin" />
                   ) : (
                      <>
                        <Play fill="white" size={32} />
                        START PRECISION SIMULATION
                      </>
                   )}
                   <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </button>
            </div>

            {/* Simulation Chart View (Shown after Run) */}
            {showResult && (
              <div className="animate-in slide-in-from-bottom-8 duration-700">
                <BacktestResultChart ticker={ticker} />
              </div>
            )}
          </div>

          {/* Market Insight (Right Column) */}
          <div className="w-full xl:w-[420px] space-y-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-10 space-y-8 shadow-sm relative overflow-hidden sticky top-8">
               <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-6">
                  <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                     <Activity size={14} className="text-blue-500" />
                     Market Insight
                  </h3>
               </div>
               
               <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-400">Current Market Price</span>
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded uppercase">Realtime</span>
                    </div>
                    <p className="text-5xl font-black text-gray-900 dark:text-white font-mono tracking-tighter leading-none">
                       ${latestPrice?.price?.toLocaleString() || '62,482'}
                    </p>
                    <div className={`text-sm font-black flex items-center gap-1.5 ${(latestPrice?.changePercent ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                       {(latestPrice?.changePercent ?? 0) >= 0 ? <TrendingUpIcon size={16} /> : <TrendingDown size={16} />}
                       {(latestPrice?.changePercent ?? 1.76).toFixed(2)}% 
                       <span className="text-gray-400 text-xs font-medium ml-2">Progress 24H</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                           <span>Volatility</span>
                           <span className="text-gray-900 dark:text-white">64.2%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                           <div className="w-2/3 h-full bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.4)]" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                           <span>Market Depth</span>
                           <span className="text-gray-900 dark:text-white">Professional</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                           <div className="w-1/2 h-full bg-emerald-500 rounded-full" />
                        </div>
                      </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4">
                      <h4 className="flex items-center gap-2 text-xs font-black text-gray-900 dark:text-white uppercase leading-none">
                         <ShieldCheck className="text-blue-500" size={16} />
                         Simulation Security
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                         모든 백테스트는 FireMarkets의 독자적인 AI 엔진을 통해 연산되며, 결과는 과거 데이터를 기반으로 한 참고용 수치입니다.
                      </p>
                  </div>
               </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default BacktestSetupView;
