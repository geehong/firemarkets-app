'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface OnChainGuideProps {
    locale: string
}

const OnChainGuide: React.FC<OnChainGuideProps> = ({ locale }) => {
    const [isOpen, setIsOpen] = useState(false)

    // Text content management
    const t = {
        title: locale === 'ko' ? '차트 읽는 법 및 주요 기능' : 'Visual Guide & Features',
        visualGuideTitle: locale === 'ko' ? '차트 읽는 법 (Visual Guide)' : '2. How to Read the Chart (Visual Guide)',
        visualGuideDesc: locale === 'ko'
            ? '이 차트는 그라데이션(Gradient) 효과를 사용하여 데이터의 강도를 시각화합니다. 색상이 붉거나 초록이 아니더라도, 명암(농도)의 차이로 시장 상태를 직관적으로 판단할 수 있습니다.'
            : 'This chart utilizes Gradient Intensity rather than fixed colors to visualize market conditions.',
        
        darkZoneTitle: locale === 'ko' ? '짙은 영역 (Darker/Upper Zone): 고평가 (Overvalued)' : 'Darker / Upper Zone: Overvalued (Market Top)',
        darkZonePos: locale === 'ko'
            ? '차트의 상단에 위치하며 색상이 가장 진하게 표현되는 구간입니다.'
            : 'Located at the top of the chart with the deepest/darkest color intensity.',
        darkZoneInterp: locale === 'ko'
            ? '해석: 시장 가치가 실현 가치보다 월등히 높아, "거품"이 끼어 있는 상태입니다. 역사적으로 이 구간의 꼭대기는 상승장의 최고점과 일치했습니다.'
            : 'Interpretation: Market Value is significantly higher than Realized Value. This indicates an unsustainable "bubble." Historically, spikes into this dark zone have pinpointed cycle peaks.',
        
        lightZoneTitle: locale === 'ko' ? '옅은 영역 (Lighter/Lower Zone): 저평가 (Undervalued)' : 'Lighter / Lower Zone: Undervalued (Market Bottom)',
        lightZonePos: locale === 'ko'
            ? '차트의 하단에 위치하며 색상이 가장 연하게 표현되는 구간입니다.'
            : 'Located at the bottom of the chart with the lightest/faintest color intensity.',
        lightZoneInterp: locale === 'ko'
            ? '해석: 시장 가치가 실현 가치보다 낮거나 비슷해진 상태입니다. 투자자들이 손해를 보고 있는 "항복(Capitulation)" 단계로, 역사적으로 최고의 매수 기회였습니다.'
            : 'Interpretation: Market Value has dropped near or below Realized Value. This indicates market capitulation where the asset is trading below its fair value, historically signaling a generational buying opportunity.',
        
        featuresTitle: locale === 'ko' ? '주요 기능 및 도구 (Features)' : '3. Advanced Features',
        colorModes: locale === 'ko'
            ? '컬러 모드 (Color Modes): Dark, Vivid, High, Simple 등 다양한 테마를 제공합니다. 모드에 따라 짙고 옅은 색상의 테마가 변경됩니다.'
            : 'Color Modes: Choose from Dark, Vivid, High, or Simple themes. The gradient tones will adapt to the selected mode.',
        chartTypes: locale === 'ko' ? '차트 타입:' : 'Chart Types:',
        chartTypeArea: locale === 'ko'
            ? 'Area: 그라데이션을 통해 과열의 강도를 면적으로 느끼기에 가장 적합합니다.'
            : 'Area: Best for visualizing the "volume" of market sentiment through gradients.',
        chartTypeLine: locale === 'ko'
            ? 'Line/Spline: 데이터의 정밀한 흐름을 선으로 확인합니다.'
            : 'Line/Spline: For tracking the precise trajectory of the score.',
        
        correlationTitle: locale === 'ko' ? '상관계수 (Correlation Score):' : 'Correlation Analytics:',
        correlationDesc1: locale === 'ko'
            ? '차트 하단의 슬라이더로 특정 기간을 선택(Zoom)해 보세요.'
            : 'Use the zoom slider or select a specific timeframe.',
        correlationDesc2: locale === 'ko'
            ? '해당 기간 동안 비트코인 가격과 지표가 얼마나 비슷하게 움직였는지 상관계수(Correlation)를 자동으로 계산해 줍니다. (1에 가까울수록 높은 신뢰도)'
            : 'The system automatically calculates the Correlation Score between Bitcoin Price and the metric for that period, helping you verify the indicator\'s accuracy.',
        
        toggleShow: locale === 'ko' ? '가이드 보기' : 'Show Guide',
        toggleHide: locale === 'ko' ? '가이드 접기' : 'Hide Guide',
    }

    return (
        <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors rounded-t-lg"
            >
                <span>{t.title}</span>
                <span className="flex items-center text-sm text-gray-500">
                    {isOpen ? t.toggleHide : t.toggleShow}
                    {isOpen ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </span>
            </button>
            
            {isOpen && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-6 text-sm md:text-base leading-relaxed text-gray-800 dark:text-gray-200">
                    {/* Visual Guide */}
                    <section>
                        <h3 className="font-bold text-lg mb-3 text-blue-600 dark:text-blue-400">{t.visualGuideTitle}</h3>
                        <p className="mb-4">{t.visualGuideDesc}</p>
                        
                        <div className="space-y-4 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                            <div>
                                <h4 className="font-bold mb-1">{t.darkZoneTitle}</h4>
                                <p className="mb-1 text-gray-600 dark:text-gray-400">{t.darkZonePos}</p>
                                <p className="text-gray-800 dark:text-gray-200 bg-red-50 dark:bg-red-900/20 p-2 rounded">{t.darkZoneInterp}</p>
                            </div>
                            <div>
                                <h4 className="font-bold mb-1">{t.lightZoneTitle}</h4>
                                <p className="mb-1 text-gray-600 dark:text-gray-400">{t.lightZonePos}</p>
                                <p className="text-gray-800 dark:text-gray-200 bg-green-50 dark:bg-green-900/20 p-2 rounded">{t.lightZoneInterp}</p>
                            </div>
                        </div>
                    </section>

                    {/* Features */}
                    <section>
                        <h3 className="font-bold text-lg mb-3 text-blue-600 dark:text-blue-400">{t.featuresTitle}</h3>
                        <ul className="list-disc list-inside space-y-3">
                            <li>{t.colorModes}</li>
                            <li>
                                <span className="font-semibold">{t.chartTypes}</span>
                                <ul className="list-circle list-inside pl-5 mt-1 space-y-1 text-gray-700 dark:text-gray-300">
                                    <li>{t.chartTypeArea}</li>
                                    <li>{t.chartTypeLine}</li>
                                </ul>
                            </li>
                            <li>
                                <span className="font-semibold">{t.correlationTitle}</span>
                                <p className="pl-5 mt-1 text-gray-700 dark:text-gray-300">
                                    {t.correlationDesc1}
                                    <br />
                                    {t.correlationDesc2}
                                </p>
                            </li>
                        </ul>
                    </section>
                </div>
            )}
        </div>
    )
}

export default OnChainGuide
