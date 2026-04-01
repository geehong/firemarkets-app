"use client"

import React, { useEffect, useState, useRef } from 'react';
import { IntradayEffect } from '@/api/quantSeasonality';

interface IntradayEffectBarChartProps {
  data: IntradayEffect;
  locale?: string;
}

const IntradayEffectBarChart: React.FC<IntradayEffectBarChartProps> = ({ data, locale = 'en' }) => {
  const [tab, setTab] = useState<'hour' | 'weekday'>('hour');
  const [isClient, setIsClient] = useState(false);
  const [HighchartsReact, setHighchartsReact] = useState<any>(null);
  const [Highcharts, setHighcharts] = useState<any>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const loadHighcharts = async () => {
      try {
        const [
          HighchartsReactComponentModule,
          HighchartsCoreModule
        ] = await Promise.all([
          import('highcharts-react-official'),
          import('highcharts')
        ]);

        const HighchartsReactComponent = HighchartsReactComponentModule.default || HighchartsReactComponentModule;
        const HC = HighchartsCoreModule.default || HighchartsCoreModule;

        if (!HC) {
          console.error('Highcharts load failed: invalid core', HC);
          return;
        }

        // Load modules individually
        const ExportingMod = (await import('highcharts/modules/exporting')).default;
        const AccessibilityMod = (await import('highcharts/modules/accessibility')).default;

        if (typeof ExportingMod === 'function') (ExportingMod as any)(HC);
        if (typeof AccessibilityMod === 'function') (AccessibilityMod as any)(HC);

        setHighchartsReact(() => HighchartsReactComponent);
        setHighcharts(HC);
        setIsClient(true);
      } catch (err) {
        console.error('Failed to load Highcharts in IntradayChart:', err);
      }
    };
    loadHighcharts();
  }, []);

  if (!isClient || !Highcharts || !HighchartsReact) {
    return <div className="h-[400px] bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />;
  }

  const isHour = tab === 'hour';
  const categories = isHour 
    ? data.by_hour.map(h => `${h.hour}h`) 
    : data.by_weekday.map(w => w.day);
    
  const seriesData = isHour 
    ? data.by_hour.map(h => ({ y: h.avg_return, color: h.avg_return >= 0 ? '#10b981' : '#f87171' }))
    : data.by_weekday.map(w => ({ y: w.avg_return, color: w.avg_return >= 0 ? '#10b981' : '#f87171' }));

  const chartOptions: any = {
    chart: { type: 'column', height: 350, backgroundColor: 'transparent' },
    title: { text: '' },
    xAxis: { categories: categories, labels: { style: { fontSize: '9px', fontWeight: 'bold' } } },
    yAxis: { title: { text: 'Avg Return (%)' }, labels: { format: '{value}%' } },
    tooltip: { format: '<b>{point.category}</b><br/>Avg Return: <b>{point.y:.4f}%</b>' },
    plotOptions: {
        column: {
            borderRadius: 3,
            borderWidth: 0,
            pointPadding: 0.1,
            groupPadding: 0.1
        }
    },
    series: [{
      name: locale === 'ko' ? '평균 수익률' : 'Avg Return',
      showInLegend: false,
      data: seriesData
    }]
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">
            {locale === 'ko' ? '장중 효과 리서치' : 'Intraday Effect Research'}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">
            {tab === 'hour' ? 'Hour of Day (UTC)' : 'Day of Week'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
          <button 
            onClick={() => setTab('hour')}
            className={`px-3 py-1 text-[10px] font-black uppercase rounded ${tab === 'hour' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 font-bold'}`}
          >
            {locale === 'ko' ? '시간별' : 'Hour'}
          </button>
          <button 
            onClick={() => setTab('weekday')}
            className={`px-3 py-1 text-[10px] font-black uppercase rounded ${tab === 'weekday' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 font-bold'}`}
          >
            {locale === 'ko' ? '요일별' : 'Day'}
          </button>
        </div>
      </div>

      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        ref={chartRef}
      />
      
      <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
              <span className="font-bold text-blue-500 mr-1 italic">TIP:</span>
              {tab === 'hour' 
                ? (locale === 'ko' ? '특정 시간대의 변동성과 평균 수익률 편향을 확인하여 매매 시간 전략을 최적화하세요.' : 'Check volatility and return bias at specific times to optimize your trading schedule.')
                : (locale === 'ko' ? '요일별 통계적 유의미함을 분석하여 주말 효과나 주간 트렌드를 파악할 수 있습니다.' : 'Analyze statistical significance by day of week to identify weekend effects or weekly trends.')}
          </p>
      </div>
    </div>
  );
};

export default IntradayEffectBarChart;
