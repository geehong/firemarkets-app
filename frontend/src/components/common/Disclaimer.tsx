'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';

interface DisclaimerProps {
  className?: string;
  type?: 'short' | 'full'; 
}

const Disclaimer: React.FC<DisclaimerProps> = ({ className = '', type = 'full' }) => {
  const locale = useLocale();
  const isKo = locale === 'ko';
  const [isOpen, setIsOpen] = useState(false);

  if (type === 'short') {
    return (
      <div className={`mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500 ${className}`}>
        <p>
          {isKo 
            ? '본 콘텐츠는 단순 정보 제공을 목적으로 하며, 투자 권유나 조언이 아닙니다. 모든 투자의 책임은 본인에게 있습니다.' 
            : 'This content is for informational purposes only and does not constitute investment advice. You are solely responsible for your investment decisions.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`mt-10 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden ${className}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
      >
        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2 group-hover:text-gray-700 dark:group-hover:text-gray-300">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {isKo ? '면책 조항 (Disclaimer)' : 'Disclaimer'}
        </h4>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div 
        className={`transition-all duration-300 ease-in-out px-5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed space-y-2 overflow-hidden ${isOpen ? 'max-h-96 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p>
          {isKo 
            ? 'FireMarkets에서 제공하는 모든 콘텐츠(뉴스, 분석, 데이터 등)는 투자 판단을 돕기 위한 참고 자료일 뿐이며, 특정 자산의 매수/매도를 권유하지 않습니다.' 
            : 'All content provided by FireMarkets (including news, analysis, and data) is for reference purposes only to assist in investment decisions and does not constitute a recommendation to buy or sell any specific asset.'}
        </p>
        <p>
          {isKo
            ? '금융 시장은 변동성이 크며, 과거의 데이터가 미래의 수익을 보장하지 않습니다. 실제 투자 결정 전 반드시 본인의 판단과 전문가의 조언을 참고하시기 바랍니다. FireMarkets는 투자 결과에 대해 법적 책임을 지지 않습니다.'
            : 'Financial markets are highly volatile, and past performance is not indicative of future results. Please rely on your own judgment and consult with professionals before making any investment decisions. FireMarkets assumes no legal liability for investment outcomes.'}
        </p>
      </div>
    </div>
  );
};

export default Disclaimer;
