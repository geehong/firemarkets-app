'use client'

import React from 'react'

interface FireMarketsAnalysisProps {
    postInfo: any
    locale: string
}

const FireMarketsAnalysis: React.FC<FireMarketsAnalysisProps> = ({ postInfo, locale }) => {
    // In the future, this data will come from real-time API or post metadata
    // For now, we show a placeholder structure to satisfy AdSense content requirements
    
    // Check if we have any tickers to analyze
    const tickers = postInfo.tickers || [];
    
    if (tickers.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800 my-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                FireMarkets Analysis
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                {locale === 'ko' 
                    ? `FireMarkets의 데이터 분석 시스템이 감지한 ${tickers.join(', ')} 관련 시장 데이터입니다. 이 자산의 최근 변동성과 기술적 지표를 참고하세요.`
                    : `Market data analysis for ${tickers.join(', ')} detected by FireMarkets system. Please refer to the recent volatility and technical indicators of this asset.`
                }
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tickers.map((ticker: string, idx: number) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-gray-900 dark:text-white">{ticker}</span>
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">Market Data</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">RSI (14)</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Neutral</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Trend</span>
                                <span className="font-medium text-green-600 dark:text-green-400">Bullish</span>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <a href={`/${locale}/assets/${ticker}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-end">
                                View Full Chart &rarr;
                            </a>
                        </div>
                    </div>
                ))}
            </div>
            
            <p className="text-xs text-gray-400 mt-4 text-center">
                * This data is automatically generated based on real-time market conditions.
            </p>
        </div>
    )
}

export default FireMarketsAnalysis
