"use client"

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { RollingCorrelationPoint } from '@/api/quantSeasonality';
import { getHighcharts } from '@/lib/highcharts-init';

interface CrossAssetCorrelationChartProps {
  correlationData: { [ticker: string]: RollingCorrelationPoint[] };
  locale?: string;
}

const CrossAssetCorrelationChart: React.FC<CrossAssetCorrelationChartProps> = ({ 
  correlationData, 
  locale = 'en' 
}) => {
  const [windowSize, setWindowSize] = useState<'r30' | 'r90'>('r30');
  const [isClient, setIsClient] = useState(false);
  const [HighchartsReact, setHighchartsReact] = useState<any>(null);
  const [Highcharts, setHighcharts] = useState<any>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const loadSharedHighcharts = async () => {
      try {
        const { Highcharts: HC, HighchartsReact: HC_React } = await getHighcharts();
        
        setHighchartsReact(() => HC_React);
        setHighcharts(HC);
        setIsClient(true);
      } catch (err) {
        console.error('Failed to load Highcharts in CorrelationChart:', err);
      }
    };
    loadSharedHighcharts();
  }, []);

  const chartOptions = useMemo(() => {
    if (!Highcharts) return {};

    const tickers = Object.keys(correlationData);
    const series: any[] = [];
    
    const colors = {
      'SPY': '#3b82f6', // Blue
      'QQQ': '#ef4444', // Red
      'GLD': '#f59e0b'  // Amber/Gold
    };

    tickers.forEach(ticker => {
      const data = correlationData[ticker] || [];
      series.push({
        name: ticker,
        data: data.map(p => [new Date(p.date).getTime(), p[windowSize]]),
        color: (colors as any)[ticker] || Highcharts.getOptions().colors[series.length % 10],
        lineWidth: 2,
        marker: { enabled: false },
        tooltip: { valueDecimals: 3 }
      });
    });

    return {
      chart: { height: 500, backgroundColor: 'transparent' },
      title: { text: '' },
      xAxis: { type: 'datetime' },
      yAxis: {
        title: { text: 'Correlation Coefficient (r)' },
        min: -1,
        max: 1,
        plotLines: [{
          value: 0,
          color: '#e5e7eb',
          width: 1,
          dashStyle: 'dash'
        }, {
            value: 0.5,
            color: '#10b981',
            width: 0.5,
            dashStyle: 'dot',
            label: { text: 'High Coupling', align: 'right', style: { color: '#10b981', fontSize: '9px' } }
        }, {
            value: -0.5,
            color: '#f87171',
            width: 0.5,
            dashStyle: 'dot',
            label: { text: 'Decoupling', align: 'right', style: { color: '#f87171', fontSize: '9px' } }
        }]
      },
      tooltip: { shared: true, split: false },
      legend: { enabled: true, align: 'center', verticalAlign: 'bottom' },
      series: series,
      rangeSelector: {
        enabled: true,
        selected: 1,
        buttons: [
            { type: 'month', count: 1, text: '1m' },
            { type: 'month', count: 3, text: '3m' },
            { type: 'month', count: 6, text: '6m' },
            { type: 'year', count: 1, text: '1y' },
            { type: 'all', text: 'All' }
        ]
      },
      navigator: { enabled: true }
    };
  }, [correlationData, windowSize, Highcharts]);

  if (!isClient || !Highcharts || !HighchartsReact) {
    return <div className="h-[500px] bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />;
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">
            {locale === 'ko' ? '비트코인 vs 매크로 자산 상관관계' : 'Bitcoin vs Macro Asset Correlation'}
          </h3>
          <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">
            30D/90D Rolling Correlation
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
          <button 
            onClick={() => setWindowSize('r30')}
            className={`px-3 py-1 text-[10px] font-black uppercase rounded ${windowSize === 'r30' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 font-bold'}`}
          >
            30D Roll
          </button>
          <button 
            onClick={() => setWindowSize('r90')}
            className={`px-3 py-1 text-[10px] font-black uppercase rounded ${windowSize === 'r90' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 font-bold'}`}
          >
            90D Roll
          </button>
        </div>
      </div>

      <HighchartsReact
        highcharts={Highcharts}
        constructorType={'stockChart'}
        options={chartOptions}
        ref={chartRef}
      />
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <span className="text-[10px] uppercase font-bold text-blue-600 mb-1 block">SPY (S&P 500)</span>
              <p className="text-xs text-gray-600 leading-normal">
                  {locale === 'ko' ? '위험 자산 선호도와의 동조화 정도를 나타냅니다.' : 'Indicates the degree of coupling with risk appetite.'}
              </p>
          </div>
          <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100">
              <span className="text-[10px] uppercase font-bold text-rose-600 mb-1 block">QQQ (NASDAQ)</span>
              <p className="text-xs text-gray-600 leading-normal">
                  {locale === 'ko' ? '기술주 및 유동성 민감도와의 상관관계를 보여줍니다.' : 'Shows correlation with tech stocks and liquidity sensitivity.'}
              </p>
          </div>
          <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
              <span className="text-[10px] uppercase font-bold text-amber-600 mb-1 block">GLD (Gold)</span>
              <p className="text-xs text-gray-600 leading-normal">
                  {locale === 'ko' ? '디지털 골드로서의 가치 저장소 특성을 확인합니다.' : 'Identifies store-of-value characteristics as digital gold.'}
              </p>
          </div>
      </div>
    </div>
  );
};

export default CrossAssetCorrelationChart;
