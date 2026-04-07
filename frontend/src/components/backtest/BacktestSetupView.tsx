"use client";

import React, { useState, useMemo, useEffect } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { format } from "date-fns";
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
  RefreshCw,
  LineChart,
  BarChart,
  DollarSign
} from "lucide-react";
import { useRealtimePrices } from "@/hooks/data/useSocket";
import { useTranslations } from "next-intl";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { useAuth } from "@/hooks/auth/useAuthNew";


interface BacktestSetupViewProps {
  ticker: string;
}

// 고성능 백테스트 차트 (Highcharts 활용)
const BacktestResultChart = ({ 
  ticker, 
  data, 
  stats 
}: { 
  ticker: string, 
  data: { strategy: any[], benchmark: any[] },
  stats: any
}) => {
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
         formatter: function() { return '$' + (this.value as number).toLocaleString(); }
      }
    },
    tooltip: {
      shared: true,
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      borderColor: '#3b82f6',
      style: { color: '#fff', fontSize: '11px' },
      borderWidth: 1,
      borderRadius: 12,
      useHTML: true,
      formatter: function() {
        const points = (this as any).points || [];
        const x = (this as any).x;
        const initialCapital = stats.initial_capital || 1000;
        
        let s = `<div style="padding: 4px">
                  <div style="font-size: 10px; color: #9ca3af; font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid rgba(156, 163, 175, 0.2); padding-bottom: 4px">
                    ${Highcharts.dateFormat('%Y년 %m월 %d일 (%A)', x)}
                  </div>`;
        
        points.forEach((point: any) => {
          const val = point.y;
          const roi = ((val - initialCapital) / initialCapital * 100).toFixed(2);
          const color = point.color;
          const name = point.series.name;
          
          s += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 4px">
                  <div style="display: flex; align-items: center; gap: 4px">
                    <span style="color:${color}">●</span> 
                    <span style="font-weight: 500">${name}:</span>
                  </div>
                  <div style="text-align: right">
                    <span style="font-weight: 800; color: ${color}">$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span style="font-size: 9px; font-weight: 900; color: ${val >= initialCapital ? '#10b981' : '#f43f5e'}; margin-left: 4px">
                      (${val >= initialCapital ? '+' : ''}${roi}%)
                    </span>
                  </div>
                </div>`;
        });
        
        s += '</div>';
        return s;
      }
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
        name: `📈 전략 수익 (Strategy Simulation)`,
        color: '#2563eb',
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(37, 99, 235, 0.2)'],
            [1, 'rgba(37, 99, 235, 0)']
          ]
        },
        data: data.strategy
      },
      {
        type: 'line',
        name: `⚖️ 지수 성과 (Hold Baseline)`,
        color: '#94a3b8',
        dashStyle: 'Dash',
        data: data.benchmark
      }
    ],
    credits: { enabled: false }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 space-y-6 shadow-sm overflow-hidden relative group">
        <div className="flex items-center justify-between mb-2">
            <div>
               <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Performance Curve</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Starting with ${stats.initial_capital.toLocaleString()} Initial Capital</p>
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
                <p className="text-xl font-black text-gray-900 dark:text-white">${stats.final_value.toLocaleString()}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ROI (Total)</p>
                <p className={`text-xl font-black ${stats.total_roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stats.total_roi >= 0 ? '+' : ''}{stats.total_roi}%
                </p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">MDD (Max)</p>
                <p className="text-xl font-black text-red-500">{stats.max_drawdown}%</p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Win Rate</p>
                <p className="text-xl font-black text-blue-600">{stats.win_rate}%</p>
             </div>
        </div>
    </div>
  );
};

const ConditionSettingBox = ({ 
  title, 
  icon, 
  color, 
  rules,
  onChange 
}: { 
  title: string; 
  icon: React.ReactNode; 
  color: string;
  rules: any;
  onChange: (newRules: any) => void;
}) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Any", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const toggleMonth = (m: string) => {
    const newMonths = rules.months.includes(m)
      ? rules.months.filter((item: string) => item !== m)
      : [...rules.months, m];
    onChange({ ...rules, months: newMonths });
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 space-y-6 shadow-sm hover:shadow-lg transition-all border-t-4" style={{ borderTopColor: color === 'green' ? '#10b981' : '#f43f5e' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${color === 'green' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'} dark:bg-opacity-10`}>
            {icon}
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</h3>
        </div>
      </div>

      <div className="space-y-6">
          {/* Seasonality */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-2"><Calendar size={12} /> Seasonal Window (Active Months)</span>
                <span className="text-blue-500 text-[9px]">{rules.months.length} Months Selected</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                    { label: 'ALL', m: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
                    { label: 'CLEAR', m: [] },
                    { label: 'H1', m: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
                    { label: 'H2', m: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
                    { label: 'Q1', m: ["Jan", "Feb", "Mar"] },
                    { label: 'Q2', m: ["Apr", "May", "Jun"] },
                    { label: 'Q3', m: ["Jul", "Aug", "Sep"] },
                    { label: 'Q4', m: ["Oct", "Nov", "Dec"] },
                    { label: 'Season (Nov-Apr)', m: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"] },
                ].map((preset) => (
                    <button
                        key={preset.label}
                        onClick={() => onChange({ ...rules, months: preset.m })}
                        className="px-2.5 py-1 text-[8px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all uppercase"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-6 gap-1">
              {months.map(m => (
                <button 
                  key={m} 
                  onClick={() => toggleMonth(m)}
                  className={`py-2 text-[9px] font-bold rounded-lg border transition-all ${
                    rules.months.includes(m) 
                    ? (color === 'green' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-rose-500 text-white border-rose-600')
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700 hover:border-blue-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Time & Day */}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Execution Day</p>
                <select 
                  value={rules.day}
                  onChange={(e) => onChange({ ...rules, day: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-xs font-bold outline-none"
                >
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Execution Time (Hour)</p>
                <div className="flex bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden items-center">
                  <input 
                    type="number" 
                    min="0" max="23"
                    value={rules.hour}
                    onChange={(e) => onChange({ ...rules, hour: parseInt(e.target.value) })}
                    className="w-full bg-transparent p-3 text-xs font-bold outline-none" 
                  />
                  <select 
                    value={rules.timezone}
                    onChange={(e) => onChange({ ...rules, timezone: e.target.value })}
                    className="bg-gray-100 dark:bg-gray-700 px-2 text-[9px] font-black h-full outline-none"
                  >
                    <option value="KST">KST</option>
                    <option value="UTC">UTC</option>
                    <option value="EST">EST</option>
                  </select>
                </div>
             </div>
          </div>

          {/* Indicators */}
          <div className="space-y-3 pt-2 border-t border-gray-50 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={12} /> Tech Indicators
              </label>
              <input 
                type="checkbox" 
                checked={rules.rsi.enabled}
                onChange={(e) => onChange({ ...rules, rsi: { ...rules.rsi, enabled: e.target.checked } })}
                className="w-3 h-3 rounded"
              />
            </div>
            
            {rules.rsi.enabled && (
              <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-1 duration-200 mb-4">
                <div className="flex bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden items-center">
                  <span className="px-3 text-[9px] font-black text-gray-400">RSI</span>
                  <select 
                    value={rules.rsi.operator}
                    onChange={(e) => onChange({ ...rules, rsi: { ...rules.rsi, operator: e.target.value } })}
                    className="bg-transparent text-[10px] font-bold outline-none"
                  >
                    <option value="<">Below</option>
                    <option value=">">Above</option>
                  </select>
                  <input 
                    type="number" 
                    value={rules.rsi.value}
                    onChange={(e) => onChange({ ...rules, rsi: { ...rules.rsi, value: parseInt(e.target.value) } })}
                    className="w-12 bg-transparent p-3 text-xs font-bold outline-none text-right" 
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={12} /> Moving Average Cross
              </label>
            </div>
            <select 
                value={rules.ma.value}
                onChange={(e) => onChange({ ...rules, ma: { ...rules.ma, value: e.target.value, enabled: e.target.value !== 'none' } })}
                className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-xs font-bold outline-none"
            >
                <option value="none">No MA Cross</option>
                <option value="ma5-20">MA 5/20 Cross</option>
                <option value="ma20-60">MA 20/60 Cross</option>
                <option value="ma50-200">Golden Cross</option>
            </select>
          </div>

          {/* Macro */}
          <div className="space-y-3 pt-2 border-t border-gray-50 dark:border-gray-800">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Globe size={12} /> Macro Sensitivity
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-bold text-gray-400 uppercase">
                  <span>Interest Rate Threshold</span>
                  <span>{rules.macro.interest}%</span>
                </div>
                <input 
                  type="range" min="0" max="10" step="0.1"
                  value={rules.macro.interest}
                  onChange={(e) => onChange({ ...rules, macro: { ...rules.macro, interest: parseFloat(e.target.value) } })}
                  className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-bold text-gray-400 uppercase">
                  <span>SPY Correlation</span>
                  <span>{rules.macro.correlation}</span>
                </div>
                <input 
                  type="range" min="-1" max="1" step="0.1"
                  value={rules.macro.correlation}
                  onChange={(e) => onChange({ ...rules, macro: { ...rules.macro, correlation: parseFloat(e.target.value) } })}
                  className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                />
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

const BacktestSetupView: React.FC<BacktestSetupViewProps> = ({ ticker }) => {
  const { isAuthenticated, user } = useAuth();
  const { latestPrice } = useRealtimePrices(ticker);
  const [isRunning, setIsRunning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [entryType, setEntryType] = useState<'lump' | 'dca'>('lump');

  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialCapital, setInitialCapital] = useState('1,000');
  const [leverage, setLeverage] = useState(1);
  const [backtestData, setBacktestData] = useState<any>(null);

  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [weekOfMonth, setWeekOfMonth] = useState<string>('2nd');
  const [dayOfWeek, setDayOfWeek] = useState<string>('Wed');
  const [dcaAmount, setDcaAmount] = useState<string>('500');

  const [entryRules, setEntryRules] = useState({
    months: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
    day: "Mon",
    hour: 4,
    timezone: "KST",
    rsi: { enabled: true, value: 40, operator: "<" },
    ma: { enabled: true, value: "ma20-60", type: "cross" },
    macro: { interest: 0.5, correlation: 0.3 }
  });

  const [exitRules, setExitRules] = useState({
    months: ["May", "Jun", "Jul", "Aug", "Sep"],
    day: "Any",
    hour: 17,
    timezone: "KST",
    rsi: { enabled: true, value: 75, operator: ">" },
    ma: { enabled: false, value: "none", type: "none" },
    macro: { interest: 0, correlation: 0 }
  });

  const [activeTab, setActiveTab] = useState<'simulation' | 'guide'>('simulation');
  const [positionMode, setPositionMode] = useState<'long' | 'short'>('long');

  const [optResults, setOptResults] = useState<any>(null);

  const monthOverlap = useMemo(() => {
    return entryRules.months.filter(m => exitRules.months.includes(m));
  }, [entryRules.months, exitRules.months]);

  useEffect(() => {
     const fetchOptResults = async () => {
        try {
           const res = await fetch('/api/v2/backtest/optimization/results');
           const data = await res.json();
           if (data && data.best_results) {
              setOptResults(data.best_results);
           }
        } catch (e) { console.error('Failed to fetch opt results', e); }
     };
     fetchOptResults();
  }, []);

  const applyAIStrategy = (period: string) => {
     if (!optResults || !optResults[period]) return;
     
     const { params, roi } = optResults[period];
     
     // Special case for seasonal strategy
     if (period === 'Sell in May') {
        setEntryRules(prev => ({
           ...prev,
           months: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
           day: "Any",
           hour: 0,
           rsi: { ...prev.rsi, enabled: false }
        }));
        setExitRules(prev => ({
           ...prev,
           months: ["May"],
           rsi: { ...prev.rsi, enabled: false }
        }));
        alert(`Seasonal 'Sell in May' strategy applied successfully! (Last ROI: ${roi}%)`);
        return;
     }

     const [hour, day, rsi] = params;
     
     setEntryRules(prev => ({
        ...prev,
        hour: hour === null ? 0 : hour,
        day: day === 'Any' ? 'Any' : day,
        rsi: { ...prev.rsi, enabled: true, value: rsi, operator: "<" }
     }));
     
     // Reset exit rules to defaults if we are trying to find entry optimal
     setExitRules(prev => ({
        ...prev,
        rsi: { ...prev.rsi, enabled: true, value: 70, operator: ">" }
     }));

     alert(`AI Optimized Strategy (${period}, ROI: ${roi}%) applied successfully!`);
  };

  const selectedDateRange = useMemo(() => ({
    from: startDate ? new Date(startDate + 'T00:00:00') : undefined,
    to: endDate ? new Date(endDate + 'T00:00:00') : undefined
  }), [startDate, endDate]);

  const handleRun = async () => {
    setIsRunning(true);
    setShowResult(false);
    
    try {
      const capital = parseFloat(initialCapital.replace(/,/g, ''));
      const payload = {
        ticker,
        start_date: startDate,
        end_date: endDate,
        initial_capital: capital,
        leverage,
        side: positionMode,
        entry_type: entryType,
        dca_amount: entryType === 'dca' ? parseFloat(dcaAmount.replace(/,/g, '')) : null,
        frequency: entryType === 'dca' ? frequency : null,
        week_of_month: entryType === 'dca' && frequency === 'monthly' ? weekOfMonth : null,
        day_of_week: entryType === 'dca' && (frequency === 'weekly' || frequency === 'monthly') ? dayOfWeek : null,
        entry_rules: entryRules,
        exit_rules: exitRules
      };

      const response = await fetch(`/api/v2/backtest/${ticker}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.status === 405 || response.status === 404) {
        const getUrl = `/api/v2/backtest/${ticker}?start_date=${startDate}&end_date=${endDate}&initial_capital=${capital}&leverage=${leverage}`;
        const getResponse = await fetch(getUrl);
        const data = await getResponse.json();
        setBacktestData(data);
      } else {
        const data = await response.json();
        setBacktestData(data);
      }
      
      setShowResult(true);
    } catch (error) {
      console.error('Backtest error:', error);
      alert('백테스트 중 오류가 발생했습니다. 전략 설정을 확인해주세요.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-12 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/backtest" className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors font-bold group">
               <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
               Back to Selection
            </Link>
          </div>

          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm self-start md:self-auto">
             <button 
                onClick={() => setActiveTab('simulation')}
                className={`px-8 py-2.5 text-[11px] font-black rounded-xl transition-all uppercase tracking-widest flex items-center gap-2 ${activeTab === 'simulation' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-gray-400 hover:text-blue-500'}`}
             >
                <Zap size={14} /> 전략 시뮬레이션
             </button>
             <button 
                onClick={() => setActiveTab('guide')}
                className={`px-8 py-2.5 text-[11px] font-black rounded-xl transition-all uppercase tracking-widest flex items-center gap-2 ${activeTab === 'guide' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-gray-400 hover:text-blue-500'}`}
             >
                <History size={14} /> 백테스트 가이드 (설명서)
             </button>
          </div>

          <div className="hidden lg:flex items-center gap-4 bg-white dark:bg-gray-800 px-6 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
             <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">{isAuthenticated ? 'User Account' : 'Guest Account'}</span>
             <span className="w-px h-3 bg-gray-200 dark:bg-gray-800" />
             <span className="flex items-center gap-1.5 text-xs font-black text-blue-500 leading-none uppercase">
                {isAuthenticated ? (user?.role || 'PREMIUM') : 'DEMO MODE'}
             </span>
          </div>
      </div>

      {!isAuthenticated && (
        <div className="bg-brand-500 rounded-[32px] p-6 text-white shadow-xl shadow-brand-500/20 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="font-black text-lg leading-tight uppercase italic tracking-tighter">계정 보호 및 전략 저장 <span className="text-blue-200">FireMarkets Auth</span></p>
              <p className="text-sm opacity-80 font-medium tracking-tight mt-1">지금 로그인하시면 현재의 정밀한 전략 설정을 저장하고 나중에 다시 불러올 수 있습니다.</p>
            </div>
          </div>
          <Link 
            href="/login" 
            className="whitespace-nowrap bg-white text-brand-600 font-black px-8 py-3 rounded-2xl hover:scale-105 active:scale-95 transition-all text-xs uppercase"
          >
            로그인 및 전체 기능 잠금해제
          </Link>
        </div>
      )}

      {activeTab === 'guide' ? (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-12 max-w-4xl">
            <div className="space-y-4">
                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight uppercase italic">Quantum Backtest Guide <span className="text-blue-500 not-italic">Manual</span></h2>
                <p className="text-gray-500 font-medium text-lg leading-relaxed">FireMarkets의 정밀 시뮬레이션 엔진을 활용하여 최적의 매매 타이밍을 찾는 방법을 알아봅니다.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center"><Calendar size={24}/></div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Seasonality (계절성 전략)</h3>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">비트코인은 특정 월에 강세를 보이는 경향이 있습니다. 가령 'Sell in May' 전략은 10월에 사서 차년도 4월에 매도하는 방식으로, 과거 10년간 매우 높은 하락 방어력을 보여주었습니다. 매월 단위로 진입 기간을 조절해 보세요.</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center"><DollarSign size={24}/></div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">DCA & Time (적립 및 타이밍)</h3>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">단순히 한 번에 사는 것이 아니라, 매주 월요일 새벽 KST 4시와 같이 변동성이 큰 특정 시간을 공략하여 분할 매수(DCA)를 시뮬레이션할 수 있습니다. 1h(시간별) 데이터 기반으로 오차 없는 백테스트가 진행됩니다.</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center"><Activity size={24}/></div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">RSI Indicators (RSI 지표)</h3>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">Entry 규칙에 RSI를 추가하면 설정한 달, 설정한 시간일지라도 RSI 지표가 과매도(예: 40 미만) 구간인 경우에만 정교하게 매수합니다. 이는 하락장에서의 무분별한 매수를 막는 강력한 필터가 됩니다.</p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center"><Scale size={24}/></div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Leverage Risk (레버리지)</h3>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">최대 100배까지 레버리지를 설정할 수 있습니다. 하지만 높은 레버리지는 청산 리스크를 동반하므로, MDD(최대 낙폭) 수치를 반드시 확인하여 포트폴리오의 생존 가능성을 체크하십시오.</p>
                </div>
            </div>

            <div className="bg-blue-600 p-10 rounded-[40px] text-white flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 space-y-4 text-center md:text-left">
                    <h3 className="text-3xl font-black uppercase italic tracking-tight">Ready to Run?</h3>
                    <p className="text-blue-100 font-medium">준비가 되었다면 '전략 시뮬레이션' 탭으로 돌아가 나만의 세린메이 또는 RSI 돌파 전략을 설계해 보십시오.</p>
                    <button 
                        onClick={() => setActiveTab('simulation')}
                        className="bg-white text-blue-600 font-black px-8 py-3 rounded-2xl hover:scale-105 active:scale-95 transition-all text-xs uppercase"
                    >
                        시뮬레이션으로 돌아가기
                    </button>
                </div>
                <div className="w-full md:w-64 h-48 bg-blue-500/30 rounded-3xl border border-blue-400/50 flex items-center justify-center backdrop-blur-xl">
                   <Play size={64} fill="white" className="opacity-50" />
                </div>
            </div>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-10">
          <div className="flex-1 space-y-10">
            <div className="space-y-4">
                <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-4 uppercase italic">
                   {ticker}USDT <span className="text-2xl text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-4 py-1 rounded-2xl not-italic">Backtest Pro</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-2xl text-lg leading-relaxed">
                    시작일과 구매 패턴을 결합하여 역사적 성과를 정밀하게 분석합니다. <br/>적립식(DCA) 투자의 복합 시나리오를 자유롭게 설계하세요.
                </p>
            </div>


            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[40px] p-10 space-y-8 shadow-sm">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                         1
                     </div>
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Simulation Period & Side</h2>
                  </div>

                  <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl flex items-center shadow-inner border border-gray-200 dark:border-gray-700">
                     <button 
                        onClick={() => setPositionMode('long')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${positionMode === 'long' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md' : 'text-gray-400'}`}
                     >
                        <TrendingUp size={14} /> Long
                     </button>
                     <button 
                        onClick={() => setPositionMode('short')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${positionMode === 'short' ? 'bg-white dark:bg-gray-700 text-rose-500 shadow-md' : 'text-gray-400'}`}
                     >
                        <TrendingDown size={14} /> Short
                     </button>
                  </div>
               </div>
               
               <div className="flex flex-col gap-6">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Simulation Period (Start - End)</label>
                     <DateRangePicker 
                        className="w-full"
                        value={selectedDateRange}
                        onChange={(range) => {
                           if (range?.from) {
                              setStartDate(format(range.from, 'yyyy-MM-dd'));
                           }
                           if (range?.to) {
                              setEndDate(format(range.to, 'yyyy-MM-dd'));
                           }
                         }}
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                         {[
                            { label: '1M', days: 30 },
                            { label: '3M', days: 90 },
                            { label: '6M', days: 180 },
                            { label: '1Y', days: 365 },
                            { label: '2Y', days: 730 },
                            { label: '3Y', days: 1095 },
                            { label: '5Y', days: 1825 },
                            { label: '10Y', days: 3650 },
                            { label: 'ALL', days: null }
                         ].map((p) => (
                            <button
                               key={p.label}
                               onClick={() => {
                                  const end = new Date();
                                  setEndDate(format(end, 'yyyy-MM-dd'));
                                  if (p.days === null) {
                                     setStartDate('2015-01-01');
                                  } else {
                                     const start = new Date();
                                     start.setDate(end.getDate() - p.days);
                                     setStartDate(format(start, 'yyyy-MM-dd'));
                                  }
                               }}
                               className="px-2 py-1 text-[9px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-blue-500 hover:text-white rounded-md transition-colors uppercase tracking-tighter"
                            >
                               {p.label}
                            </button>
                         ))}
                      </div>
                   </div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2 px-1">
                     Selected Range: <span className="text-blue-500">{startDate}</span> to <span className="text-blue-500">{endDate}</span>
                  </p>
               </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[40px] p-10 space-y-10 shadow-sm border-t-8 border-t-blue-600">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black">
                        3
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Execution Strategy</h2>
                  </div>
                  
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-700">
                      <button 
                        onClick={() => setEntryType('lump')}
                        className={`px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${entryType === 'lump' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md border border-gray-100 dark:border-gray-600' : 'text-gray-400'}`}
                      >
                          거치식 (Lump-sum)
                      </button>
                      <button 
                        onClick={() => setEntryType('dca')}
                        className={`px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${entryType === 'dca' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md border border-gray-100 dark:border-gray-600' : 'text-gray-400'}`}
                      >
                          적립식 (Recurring DCA)
                      </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">원금 및 투자 규모 (Initial Investment)</label>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex items-center gap-2 group focus-within:border-blue-500 transition-all">
                           <input 
                              type="text" 
                              value={initialCapital} 
                              onChange={(e) => setInitialCapital(e.target.value)}
                              className="bg-transparent w-full font-black text-3xl text-gray-900 dark:text-white outline-none" 
                           />
                           <span className="font-bold text-gray-400 text-xl">USDT</span>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">운용 레버리지 (Simulation Leverage)</label>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex items-center gap-6">
                           <input 
                              type="range" 
                              min="1" 
                              max="100" 
                              value={leverage} 
                              onChange={(e) => setLeverage(parseInt(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                           />
                           <span className="font-black text-2xl text-blue-600 w-12 text-right">{leverage}x</span>
                        </div>
                     </div>
                  </div>

                  {entryType === 'dca' && (
                    <div className="space-y-8 p-8 bg-emerald-50/30 dark:bg-emerald-900/5 rounded-[32px] border border-emerald-100/50 dark:border-emerald-800 animate-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-3">
                              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">정기 추가 매수액 ($)</label>
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-2 group focus-within:border-emerald-500 transition-all">
                                 <input 
                                    type="text" 
                                    value={dcaAmount} 
                                    onChange={(e) => setDcaAmount(e.target.value)} 
                                    className="bg-transparent w-full font-black text-xl text-emerald-600 outline-none" 
                                 />
                              </div>
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">매수 반복 주기</label>
                              <select 
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value as any)}
                                className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 font-black text-xs text-emerald-600 outline-none"
                              >
                                  <option value="daily">매일 (Daily)</option>
                                  <option value="weekly">매주 (Weekly)</option>
                                  <option value="monthly">매월 (Monthly)</option>
                              </select>
                           </div>
                        </div>

                        {frequency === 'weekly' && (
                          <div className="space-y-3 animate-in slide-in-from-top-2">
                             <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">매수 요일 선택</label>
                             <div className="flex gap-2 flex-wrap">
                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                                   <button key={day} className={`flex-1 py-2 text-[10px] font-black rounded-xl border transition-all ${dayOfWeek === day ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700'}`} onClick={() => setDayOfWeek(day)}>
                                      {day}
                                   </button>
                                ))}
                             </div>
                          </div>
                        )}

                        {frequency === 'monthly' && (
                          <div className="space-y-4 animate-in slide-in-from-top-2">
                             <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">월간 매수 시점 설정</label>
                             <div className="flex gap-4">
                                <select 
                                  value={weekOfMonth}
                                  onChange={(e) => setWeekOfMonth(e.target.value)}
                                  className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 font-black text-xs text-emerald-600 outline-none"
                                >
                                    <option value="1st">첫째 주 (1st Week)</option>
                                    <option value="2nd">둘째 주 (2nd Week)</option>
                                    <option value="3rd">셋째 주 (3rd Week)</option>
                                    <option value="4th">넷째 주 (4th Week)</option>
                                    <option value="last">마지막 주 (Last Week)</option>
                                </select>
                                <select 
                                  value={dayOfWeek}
                                  onChange={(e) => setDayOfWeek(e.target.value)}
                                  className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 font-black text-xs text-emerald-600 outline-none"
                                >
                                    <option value="Mon">월요일 (Mon)</option>
                                    <option value="Tue">화요일 (Tue)</option>
                                    <option value="Wed">수요일 (Wed)</option>
                                    <option value="Thu">목요일 (Thu)</option>
                                    <option value="Fri">금요일 (Fri)</option>
                                </select>
                             </div>
                             <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest text-center mt-2">
                                요약: 매월 {weekOfMonth === 'last' ? '마지막' : weekOfMonth.replace('st','').replace('nd','').replace('rd','').replace('th','') + '번째'} 주 {dayOfWeek === 'Mon' ? '월요일' : dayOfWeek === 'Tue' ? '화요일' : dayOfWeek === 'Wed' ? '수요일' : dayOfWeek === 'Thu' ? '목요일' : '금요일'}에 매수
                             </p>
                          </div>
                        )}
                    </div>
                  )}
               </div>
            </div>

             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">4</div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Strategy Entry & Exit Rules</h2>
             </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <ConditionSettingBox 
                  title={positionMode === 'long' ? "전략 매수 조건 (BUY / LONG ENTRY)" : "전략 매도 조건 (SELL / SHORT ENTRY)"} 
                  icon={positionMode === 'long' ? <TrendingUp size={24} /> : <TrendingDown size={24} />} 
                  color={positionMode === 'long' ? "green" : "red"} 
                  rules={entryRules}
                  onChange={setEntryRules}
               />
               <ConditionSettingBox 
                  title={positionMode === 'long' ? "전략 매도 조건 (SELL / LONG EXIT)" : "전략 매수 조건 (BUY / SHORT COVER)"} 
                  icon={positionMode === 'long' ? <TrendingDown size={24} /> : <TrendingUp size={24} />} 
                  color={positionMode === 'long' ? "red" : "green"} 
                  rules={exitRules}
                  onChange={setExitRules}
               />
            </div>

            {monthOverlap.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <ShieldCheck className="text-amber-500" size={20} />
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  주의: 진입 월과 청산 월이 겹치는 달({monthOverlap.join(', ')})이 있습니다. 이 경우 매매 로직이 복잡해질 수 있습니다.
                </p>
              </div>
            )}

            {/* Dynamic Strategy Summary */}
            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-[32px] p-8 space-y-4">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest">
                    <Zap size={16} /> Strategy Logic Summary
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-bold text-lg leading-relaxed">
                   매년 <span className="text-blue-600 dark:text-blue-400 font-black">{entryRules.months.join(', ')}</span> 기간 중,{" "}
                   <span className="text-gray-900 dark:text-white font-black">{entryRules.day === 'Any' ? '모든 날' : entryRules.day + '요일'} {entryRules.hour}:00 ({entryRules.timezone})</span> 시점에{" "}
                   {entryRules.rsi.enabled && <><span className="text-emerald-500 font-black">RSI가 {entryRules.rsi.value} {entryRules.rsi.operator === '<' ? '미만' : '초과'}</span> 이고 </>}
                   {entryRules.ma.enabled && <><span className="text-emerald-500 font-black">{entryRules.ma.value}</span> 조건이 충족될 때 </>}
                   <span className={`${positionMode === 'long' ? 'text-blue-600' : 'text-rose-500'} dark:text-blue-400 font-black underline decoration-2 underline-offset-4`}>
                     {positionMode === 'long' ? '롱 포지션에 진입(매수)' : '숏 포지션에 진입(공매도)'}
                   </span>합니다. 
                   이후 <span className="text-red-500 font-black">{exitRules.months.join(', ')}</span> 기간이 되거나{" "}
                   {exitRules.rsi.enabled && <><span className="text-rose-500 font-black">RSI가 {exitRules.rsi.value} {exitRules.rsi.operator === '>' ? '초과' : '미만'}</span> 시점에 </>}
                   <span className="text-gray-900 dark:text-white font-black">전량 {positionMode === 'long' ? '매도(청산)' : '환수(커버/청산)'}</span>하여 수익을 확정합니다.
                </p>
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

            {showResult && backtestData && (
              <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-6">
                {backtestData.liquidated && (
                  <div className="bg-rose-500/10 border-2 border-rose-500 rounded-[32px] p-8 flex items-center justify-between gap-6 animate-pulse">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/40">
                           <TrendingDown size={32} />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 uppercase tracking-tighter">LIQUIDATION DETECTED</h3>
                           <p className="text-sm font-bold text-rose-500/80">레버리지 사용 중 원금이 전액 소실되었습니다. 전략을 수정해 보세요.</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Event Occurred At</p>
                        <p className="text-xl font-black text-rose-600 dark:text-rose-500">
                           {format(new Date(backtestData.liquidation_time), 'yyyy-MM-dd HH:mm')}
                        </p>
                     </div>
                  </div>
                )}
                
                <BacktestResultChart 
                  ticker={ticker} 
                  data={backtestData.graph} 
                  stats={backtestData.stats} 
                />
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
                       {(latestPrice?.changePercent ?? 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
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

                  {optResults && (
                    <div className="pt-4 border-t border-gray-50 dark:border-gray-800 space-y-4">
                       <h4 className="flex items-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">
                          <Zap size={14} /> AI Optimization Presets
                       </h4>
                       <div className="grid grid-cols-1 gap-2">
                          {Object.keys(optResults).map((period) => (
                             <button
                                key={period}
                                onClick={() => applyAIStrategy(period)}
                                className="group flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all text-left"
                             >
                                <div className="space-y-1">
                                   <div className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{period} Optimal</div>
                                   <div className="text-[9px] font-bold text-gray-400">ROI {optResults[period].roi}% Expected</div>
                                </div>
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                   <Plus size={12} />
                                </div>
                             </button>
                          ))}
                       </div>
                       <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest pt-2">
                          Click to apply AI suggested parameters
                       </p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BacktestSetupView;
