import React from 'react';
import { TimeframeWinRate } from '@/api/quantSeasonality';

interface TimeframeWinRateMatrixProps {
  data: { [key: string]: TimeframeWinRate };
  locale?: string;
}

const TimeframeWinRateMatrix: React.FC<TimeframeWinRateMatrixProps> = ({ data, locale = 'en' }) => {
  const timeframeOrder = ['1h', '4h', '12h', '1d', '1w', '1m'];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
        <div className="flex-1">
          <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 tracking-tight">
            {locale === 'ko' ? '타임프레임별 승률 매트릭스' : 'Win Rate Matrix by Timeframe'}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest">
            {locale === 'ko' ? '다양한 보유 기간에 따른 비트코인 수익 확률 통계' : 'Statistical profit probability for various Bitcoin holding periods.'}
          </p>
        </div>

      <div className="grid grid-cols-2 gap-4">
        {timeframeOrder.map((tf) => {
          const stats = data[tf];
          if (!stats) return null;

          const winRatePct = stats.win_rate * 100;
          const isPositive = winRatePct >= 50;

          return (
            <div 
              key={tf} 
              className="relative p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all group overflow-hidden"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-black text-gray-400 group-hover:text-blue-500 transition-colors uppercase">
                  {tf}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  stats.profit_factor >= 1.5 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  PF {stats.profit_factor.toFixed(2)}
                </span>
              </div>

              <div className="flex items-end justify-between gap-1 mb-1.5">
                <div className="text-2xl font-black text-gray-900 leading-none">
                  {winRatePct.toFixed(1)}<span className="text-sm ml-0.5">%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'} transition-all duration-1000`} 
                  style={{ width: `${winRatePct}%` }}
                />
              </div>

              {/* Sub Stats */}
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                <div className="flex items-center text-emerald-600">
                  <span className="mr-1">▲</span>
                  <span>{stats.avg_up.toFixed(2)}%</span>
                </div>
                <div className="flex items-center text-rose-500">
                  <span className="mr-1">▼</span>
                  <span>{stats.avg_down.toFixed(2)}%</span>
                </div>
              </div>
              
              {/* Background Decoration */}
              <div className="absolute -bottom-4 -right-2 text-6xl font-black text-black/[0.02] select-none group-hover:text-blue-500/[0.03] transition-colors">
                {tf}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeframeWinRateMatrix;
