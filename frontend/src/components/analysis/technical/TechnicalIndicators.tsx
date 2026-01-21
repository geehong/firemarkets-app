
"use client";

import React, { useMemo } from "react";
import { RSI, MACD } from "technicalindicators";

interface TechnicalIndicatorsProps {
  ohlcvData: any;
  isLoading: boolean;
}

export default function TechnicalIndicators({ ohlcvData, isLoading }: TechnicalIndicatorsProps) {
  
  const indicators = useMemo(() => {
    if (!ohlcvData || !(ohlcvData as any).data || (ohlcvData as any).data.length < 50) return null;

    // Extract closes
    const sortedData = [...(ohlcvData as any).data].sort((a: any, b: any) => 
        new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime()
    );
    const closes = sortedData.map((d: any) => parseFloat(d.close_price));

    // Calculate RSI
    const rsiInput = {
        values: closes,
        period: 14
    };
    const rsiResult = RSI.calculate(rsiInput);
    const currentRSI = rsiResult[rsiResult.length - 1];

    // Calculate MACD
    const macdInput = {
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    };
    const macdResult = MACD.calculate(macdInput);
    const currentMACD = macdResult[macdResult.length - 1];

    return {
        rsi: currentRSI,
        macd: currentMACD,
        price: closes[closes.length - 1]
    };

  }, [ohlcvData]);

  const getSignal = (rsi: number) => {
      if (rsi > 70) return { text: "OVERBOUGHT (Sell)", color: "text-red-500" };
      if (rsi < 30) return { text: "OVERSOLD (Buy)", color: "text-green-500" };
      return { text: "NEUTRAL", color: "text-gray-500" };
  };

  return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* RSI Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
           <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">RSI (14)</h4>
           {isLoading ? (
               <div className="animate-pulse h-8 bg-gray-200 rounded w-1/2"></div>
           ) : (
               <>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {indicators?.rsi?.toFixed(2) || '-'}
                </div>
                {indicators?.rsi && (
                    <div className={`text-sm font-bold mt-1 ${getSignal(indicators.rsi).color}`}>
                        {getSignal(indicators.rsi).text}
                    </div>
                )}
               </>
           )}
        </div>

        {/* MACD Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
           <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">MACD</h4>
           {isLoading ? (
               <div className="animate-pulse h-8 bg-gray-200 rounded w-1/2"></div>
           ) : (
               <>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {indicators?.macd?.histogram?.toFixed(4) || '-'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                    Signal: {indicators?.macd?.signal?.toFixed(2)} | MACD: {indicators?.macd?.MACD?.toFixed(2)}
                </div>
               </>
           )}
        </div>

        {/* Price Summary */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
             <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Bitcoin Price</h4>
             <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                 ${indicators?.price?.toLocaleString() || '-'}
             </div>
        </div>
      </div>
  );
}
