"use client"

import React, { useEffect, useState, useRef } from 'react';
import { MonthlySeasonality, QuarterlySeasonality } from '@/api/quantSeasonality';

interface SeasonalityHeatmapChartProps {
  monthlyData: MonthlySeasonality;
  quarterlyData: QuarterlySeasonality;
  locale?: string;
}

const SeasonalityHeatmapChart: React.FC<SeasonalityHeatmapChartProps> = ({ 
  monthlyData, 
  quarterlyData, 
  locale = 'en' 
}) => {
  const [viewType, setViewType] = useState<'monthly' | 'quarterly'>('monthly');
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
        const HighchartsCore = HighchartsCoreModule.default || HighchartsCoreModule;

        const moduleImports = await Promise.all([
          import('highcharts/modules/heatmap'),
          import('highcharts/modules/exporting'),
          import('highcharts/modules/accessibility')
        ]);

        moduleImports.forEach((mod) => {
          const init = mod.default || mod;
          if (typeof init === 'function') (init as any)(HighchartsCore);
        });

        setHighchartsReact(() => HighchartsReactComponent);
        setHighcharts(HighchartsCore);
        setIsClient(true);
      } catch (err) {
        console.error('Failed to load Highcharts:', err);
      }
    };
    loadHighcharts();
  }, []);

  if (!isClient || !Highcharts || !HighchartsReact) {
    return <div className="h-[400px] bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />;
  }

  // Transform Data
  const years = Object.keys(monthlyData).sort();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  let chartOptions: any = {};

  if (viewType === 'monthly') {
    const heatmapData: any[] = [];
    years.forEach((year, yIdx) => {
      months.forEach((month, mIdx) => {
        const value = monthlyData[year]?.[month];
        if (value !== undefined) {
          heatmapData.push([mIdx, yIdx, parseFloat(value.toFixed(2))]);
        }
      });
    });

    chartOptions = {
      chart: { type: 'heatmap', marginTop: 40, marginBottom: 80, plotBorderWidth: 1, backgroundColor: 'transparent' },
      title: { text: '' },
      xAxis: { categories: months, title: null, opposite: true, labels: { style: { fontWeight: 'bold' } } },
      yAxis: { categories: years, title: null, reversed: true },
      colorAxis: {
        stops: [
          [0, '#f87171'], // Rose 400 (Bearish)
          [0.45, '#fee2e2'], // Rose 100
          [0.5, '#ffffff'], // White (Neutral)
          [0.55, '#d1fae5'], // Emerald 100
          [1, '#10b981']  // Emerald 500 (Bullish)
        ],
        min: -30,
        max: 30
      },
      legend: { align: 'right', layout: 'vertical', margin: 0, verticalAlign: 'top', y: 25, symbolHeight: 280 },
      tooltip: {
        formatter: function (this: any) {
          return `<b>${this.series.yAxis.categories[this.point.y]} ${this.series.xAxis.categories[this.point.x]}</b><br/>Return: <b>${this.point.value}%</b>`;
        }
      },
      series: [{
        name: 'Bitcoin Monthly Returns',
        borderWidth: 1,
        borderColor: '#f9fafb',
        data: heatmapData,
        dataLabels: {
          enabled: true,
          color: '#000000',
          style: { textOutline: 'none', fontWeight: 'bold', fontSize: '11px' },
          formatter: function (this: any) {
            return this.point.value !== undefined ? this.point.value + '%' : '';
          }
        }
      }]
    };
  } else {
    // Quarterly Column Chart
    chartOptions = {
        chart: { type: 'column', backgroundColor: 'transparent' },
        title: { text: '' },
        xAxis: { categories: quarters, labels: { style: { fontWeight: 'bold' } } },
        yAxis: { title: { text: 'Average Return (%)' }, labels: { format: '{value}%' } },
        plotOptions: {
            column: {
                borderRadius: 5,
                dataLabels: { enabled: true, format: '{point.y:.2f}%' },
                colorByPoint: true,
                colors: quarters.map(q => quarterlyData[q] >= 0 ? '#10b981' : '#f87171')
            }
        },
        series: [{
            name: 'Avg Quarterly Return',
            data: quarters.map(q => parseFloat(quarterlyData[q]?.toFixed(2) || '0'))
        }]
    };
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800 tracking-tight">
          {locale === 'ko' ? '비트코인 계절성 히트맵' : 'Bitcoin Seasonality Heatmap'}
        </h3>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
          <button 
            onClick={() => setViewType('monthly')}
            className={`px-3 py-1 text-[10px] font-black uppercase rounded ${viewType === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 font-bold'}`}
          >
            {locale === 'ko' ? '월간' : 'Monthly'}
          </button>
          <button 
            onClick={() => setViewType('quarterly')}
            className={`px-3 py-1 text-[10px] font-black uppercase rounded ${viewType === 'quarterly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 font-bold'}`}
          >
            {locale === 'ko' ? '분기' : 'Quarterly'}
          </button>
        </div>
      </div>

      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        ref={chartRef}
      />
    </div>
  );
};

export default SeasonalityHeatmapChart;
