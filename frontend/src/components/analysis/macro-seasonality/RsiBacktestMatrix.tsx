'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';

interface RsiBacktestProps {
  data: {
    [timeframe: string]: {
      win_rate: number;
      avg_win: number;
      avg_loss: number;
      total_trades: number;
    }
  };
  rsiBuy: number;
  rsiSell: number;
}

const RsiBacktestMatrix = ({ data, rsiBuy, rsiSell }: RsiBacktestProps) => {
  const searchParams = useSearchParams();
  const locale = searchParams.get('locale') || 'ko';

  const timeframeOrder = ['1h', '1d', '1w', '1m'];
  const labels: { [key: string]: string } = {
    '1h': locale === 'ko' ? '1시간 봉' : '1H Chart',
    '1d': locale === 'ko' ? '일봉' : 'Daily Chart',
    '1w': locale === 'ko' ? '주봉' : 'Weekly Chart',
    '1m': locale === 'ko' ? '월봉' : 'Monthly Chart',
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 tracking-tight">
            {locale === 'ko' ? 'RSI 전략 백테스트' : 'RSI Strategy Backtest'}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest">
            {locale === 'ko' 
              ? `매수: RSI < ${rsiBuy} | 매도: RSI > ${rsiSell}` 
              : `Buy: RSI < ${rsiBuy} | Sell: RSI > ${rsiSell}`}
          </p>
        </div>
        <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-black uppercase">
          STOCHASTIC RSI (14)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {timeframeOrder.map((tf) => {
          const stats = data[tf];
          if (!stats) return null;

          return (
            <div key={tf} className="p-4 rounded-xl border border-gray-50 bg-gray-50/30 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-gray-700 uppercase tracking-tighter">{labels[tf]}</span>
                <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                  {stats.total_trades} {locale === 'ko' ? '회 매매' : 'Trades'}
                </span>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{locale === 'ko' ? '승률' : 'Win Rate'}</p>
                  <p className={`text-2xl font-black ${stats.win_rate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {stats.win_rate.toFixed(1)}%
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
                        <TrendingUp className="w-3 h-3" />
                        <span>+{stats.avg_win.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400">
                        <TrendingDown className="w-3 h-3" />
                        <span>{stats.avg_loss.toFixed(2)}%</span>
                    </div>
                </div>
              </div>

              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full transition-all duration-1000 ${stats.win_rate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${stats.win_rate}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <Activity className="w-4 h-4 text-amber-500" />
          <p className="text-[10px] text-amber-700 leading-tight font-medium">
              {locale === 'ko' 
                ? '과매수/과매도 구간을 활용한 단순 역추세 전략입니다. 시장가로 즉시 체결됨을 가정하며 수수료는 포함되지 않았습니다.'
                : 'Simple mean-reversion strategy using overbought/oversold levels. Assumes market orders without slippage or fees.'}
          </p>
      </div>
    </div>
  );
};

export default RsiBacktestMatrix;
