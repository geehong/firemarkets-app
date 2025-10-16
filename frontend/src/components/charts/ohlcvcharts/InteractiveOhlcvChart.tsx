"use client";

import React, { useEffect, useRef, useState } from 'react';
import TradingViewDemo from './TradingViewDemo';

// TradingView widget types
declare global {
  interface Window {
    TradingView: {
      widget: (config: TradingViewWidgetConfig) => any;
    };
    Datafeeds: {
      UDFCompatibleDatafeed: new (url: string) => any;
    };
  }
}

interface TradingViewWidgetConfig {
  container: string;
  locale: string;
  library_path: string;
  datafeed: any;
  symbol: string;
  interval: string;
  fullscreen: boolean;
  debug: boolean;
  autosize?: boolean;
  theme?: string;
  toolbar_bg?: string;
  studies_overrides?: any;
  overrides?: any;
}

interface InteractiveOhlcvChartProps {
  symbol?: string;
  interval?: string;
  theme?: 'light' | 'dark';
  height?: number;
  width?: number;
  datafeedUrl?: string;
  onSymbolChange?: (symbol: string) => void;
  onIntervalChange?: (interval: string) => void;
}

const InteractiveOhlcvChart: React.FC<InteractiveOhlcvChartProps> = ({
  symbol = 'AAPL',
  interval = '1D',
  theme = 'light',
  height = 600,
  width = '100%',
  datafeedUrl = 'https://demo-feed-data.tradingview.com',
  onSymbolChange,
  onIntervalChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTradingViewScripts = async () => {
      try {
        // Check if scripts are already loaded
        if (window.TradingView && window.Datafeeds) {
          initializeChart();
          return;
        }

        // Check if we're in development mode and show demo
        if (process.env.NODE_ENV === 'development') {
          setIsLoading(false);
          setError('demo'); // Special flag for demo mode
          return;
        }

        // Load TradingView charting library
        const chartingLibraryScript = document.createElement('script');
        chartingLibraryScript.src = '/charting_library/charting_library.standalone.js';
        chartingLibraryScript.async = true;
        
        chartingLibraryScript.onload = () => {
          // Load datafeed script
          const datafeedScript = document.createElement('script');
          datafeedScript.src = '/datafeeds/udf/dist/bundle.js';
          datafeedScript.async = true;
          
          datafeedScript.onload = () => {
            initializeChart();
          };
          
          datafeedScript.onerror = () => {
            setError('Failed to load TradingView datafeed library');
            setIsLoading(false);
          };
          
          document.head.appendChild(datafeedScript);
        };
        
        chartingLibraryScript.onerror = () => {
          setError('Failed to load TradingView charting library. Please ensure the library files are properly installed.');
          setIsLoading(false);
        };
        
        document.head.appendChild(chartingLibraryScript);
      } catch (err) {
        setError('Failed to initialize TradingView chart');
        setIsLoading(false);
      }
    };

    const initializeChart = () => {
      if (!containerRef.current || !window.TradingView || !window.Datafeeds) {
        return;
      }

      try {
        // Clean up existing widget
        if (widgetRef.current) {
          widgetRef.current.remove();
          widgetRef.current = null;
        }

        // Create new widget
        const widget = new (window.TradingView as any).widget({
          container: containerRef.current.id || 'chartContainer',
          locale: 'en',
          library_path: '/charting_library/',
          datafeed: new (window.Datafeeds as any).UDFCompatibleDatafeed(datafeedUrl),
          symbol: symbol,
          interval: interval,
          fullscreen: false,
          autosize: true,
          debug: false,
          theme: theme,
          toolbar_bg: theme === 'dark' ? '#1e1e1e' : '#ffffff',
          overrides: {
            'paneProperties.background': theme === 'dark' ? '#1e1e1e' : '#ffffff',
            'paneProperties.vertGridProperties.color': theme === 'dark' ? '#2a2a2a' : '#e1e1e1',
            'paneProperties.horzGridProperties.color': theme === 'dark' ? '#2a2a2a' : '#e1e1e1',
            'symbolWatermarkProperties.transparency': 90,
            'scalesProperties.textColor': theme === 'dark' ? '#d1d4dc' : '#131722',
          },
          studies_overrides: {
            'volume.volume.color.0': '#00bcd4',
            'volume.volume.color.1': '#ff6b6b',
            'volume.volume.transparency': 70,
          },
        });

        widgetRef.current = widget;

        // Set up event listeners
        widget.onChartReady(() => {
          setIsLoading(false);
          setError(null);
          
          // Listen for symbol changes
          widget.subscribe('onSymbolChanged', (symbolInfo: any) => {
            if (onSymbolChange) {
              onSymbolChange(symbolInfo.name);
            }
          });

          // Listen for interval changes
          widget.subscribe('onIntervalChanged', (interval: string) => {
            if (onIntervalChange) {
              onIntervalChange(interval);
            }
          });
        });

      } catch (err) {
        setError('Failed to create TradingView widget');
        setIsLoading(false);
      }
    };

    loadTradingViewScripts();

    // Cleanup function
    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (err) {
          console.warn('Error removing TradingView widget:', err);
        }
        widgetRef.current = null;
      }
    };
  }, [symbol, interval, theme, datafeedUrl, onSymbolChange, onIntervalChange]);

  // Update widget when props change
  useEffect(() => {
    if (widgetRef.current && !isLoading) {
      try {
        widgetRef.current.setSymbol(symbol, interval);
      } catch (err) {
        console.warn('Error updating TradingView widget:', err);
      }
    }
  }, [symbol, interval, isLoading]);

  if (error === 'demo') {
    return (
      <TradingViewDemo 
        symbol={symbol}
        interval={interval}
        theme={theme}
        height={600}
        width={typeof width === 'number' ? width : undefined}
      />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center max-w-2xl p-6">
          <div className="text-red-500 text-lg font-semibold mb-4">TradingView Chart Setup Required</div>
          <div className="text-gray-600 mb-4">{error}</div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-semibold text-blue-800 mb-2">Setup Instructions:</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Download TradingView Advanced Charts library from their repository</li>
              <li>Extract the ZIP file and copy the <code className="bg-blue-100 px-1 rounded">charting_library</code> folder to <code className="bg-blue-100 px-1 rounded">/frontend/public/</code></li>
              <li>Copy the <code className="bg-blue-100 px-1 rounded">datafeeds</code> folder to <code className="bg-blue-100 px-1 rounded">/frontend/public/</code></li>
              <li>Ensure the following files exist:
                <ul className="ml-4 mt-1 space-y-1 list-disc">
                  <li><code className="bg-blue-100 px-1 rounded">/public/charting_library/charting_library.standalone.js</code></li>
                  <li><code className="bg-blue-100 px-1 rounded">/public/datafeeds/udf/dist/bundle.js</code></li>
                </ul>
              </li>
            </ol>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-semibold text-yellow-800 mb-2">Demo Mode:</h3>
            <p className="text-sm text-yellow-700">
              This is a demo placeholder. The actual TradingView chart will appear once the library files are properly installed.
            </p>
          </div>
          
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-gray-600">Loading TradingView Chart...</div>
          </div>
        </div>
      )}
      <div 
        ref={containerRef} 
        style={{ 
          height: typeof height === 'number' ? `${height}px` : height,
          width: typeof width === 'number' ? `${width}px` : width,
        }}
        className="rounded-lg overflow-hidden border border-gray-200"
      />
    </div>
  );
};

export default InteractiveOhlcvChart;
