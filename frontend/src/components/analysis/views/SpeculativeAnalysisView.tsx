
"use client";

import React, { useState } from "react";
import FearAndGreedGauge from "@/components/analysis/speculative/FearAndGreedGauge";
import SentimentAnalyzer from "@/components/analysis/speculative/SentimentAnalyzer";
import SentimentTrendTable from "@/components/analysis/speculative/SentimentTrendTable";

export default function SpeculativeAnalysisView() {
  const [activeTab, setActiveTab] = useState<'market' | 'lab'>('market');

  const description = (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-100 dark:border-yellow-800 mb-6">
      <h2 className="text-lg font-bold text-yellow-800 dark:text-yellow-300 mb-2">투기적/감성 분석 가이드 (Speculative Guide)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-md font-semibold text-yellow-700 dark:text-yellow-400 mb-2">🤖 AI 뉴스 감성 분석</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>최신 뉴스 기사나 소셜 미디어 텍스트를 입력창에 붙여넣으세요.</li>
            <li><strong>Positive (긍정):</strong> 가격 상승 압력으로 해석할 수 있습니다.</li>
            <li><strong>Negative (부정):</strong> 악재로 인한 하락 위험을 경고합니다.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-md font-semibold text-yellow-700 dark:text-yellow-400 mb-2">😨 공포 & 탐욕 지수 (F&G)</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li><strong>극단적 공포 (0~25):</strong> 과매도 상태. <span className="text-green-600 font-bold">저점 매수 기회</span>일 수 있습니다.</li>
            <li><strong>극단적 탐욕 (75~100):</strong> 과매수 상태. <span className="text-red-600 font-bold">조정(하락) 가능성</span>을 주의하세요.</li>
            <li>데이터 소스: Alternative.me (Crypto)</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {description}
      
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
              onClick={() => setActiveTab('market')}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 
                  ${activeTab === 'market' 
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
          >
              시장 심리 (Market Sentiment)
          </button>
          <button
              onClick={() => setActiveTab('lab')}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 
                  ${activeTab === 'lab' 
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
          >
              AI 분석 실험실 (AI Lab)
          </button>
      </div>

      {activeTab === 'market' && (
          <div className="space-y-8">
              {/* 1. Fear & Greed Index */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FearAndGreedGauge />
                  {/* Empty Right Column or maybe summary? For now Dashboard below covers it */}
              </div>

              {/* 2. Global Sentiment Trend */}
              <SentimentTrendTable />
          </div>
      )}

      {activeTab === 'lab' && (
          <div className="max-w-4xl mx-auto">
              {/* 3. User Sentiment Gauge & Input */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <SentimentAnalyzer />
              </div>
          </div>
      )}
    </div>
  );
}
