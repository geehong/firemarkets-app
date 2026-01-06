'use client'

import React, { useState, useEffect } from 'react'
import { Smile, Frown, Meh, ExternalLink, Plus, X } from 'lucide-react'

// Define interfaces for AI analysis data
interface AnalysisData {
    sentiment?: 'positive' | 'negative' | 'neutral' | string
    summary_en?: string[]
    summary_ko?: string[]
    analysis_en?: string
    analysis_ko?: string
    tickers?: string[] // e.g. ["BTC", "ETH"]
    source_articles?: string[] // IDs or titles
}

interface PostInfo {
    source?: string
    author?: string
    url?: string
    image_url?: string // Source image URL
    analysis?: AnalysisData
    tickers?: string[] // Tickers might be at root of post_info or inside analysis? JSON shows tickers at root level in provided example.
}

interface AiAnalysisBlockProps {
    postInfo: any
    onPostInfoChange: (newInfo: any) => void
    activeLanguage: 'ko' | 'en'
    onAiRewrite?: () => void
    isRewriting?: boolean
}

export default function AiAnalysisBlock({
    postInfo,
    onPostInfoChange,
    activeLanguage,
    onAiRewrite,
    isRewriting = false
}: AiAnalysisBlockProps) {
    // Local state for tickers manipulation before saving
    const [localTickers, setLocalTickers] = useState<string[]>([])
    const [tickerInput, setTickerInput] = useState('')

    useEffect(() => {
        // Initialize tickers from postInfo
        // Check both root level tickers and analysis.tickers just in case
        const initialTickers = postInfo?.tickers || postInfo?.analysis?.tickers || []
        setLocalTickers(initialTickers)
    }, [postInfo])

    const handleAddTicker = () => {
        if (tickerInput.trim() && !localTickers.includes(tickerInput.trim())) {
            const newTickers = [...localTickers, tickerInput.trim()]
            setLocalTickers(newTickers)
            updatePostInfo('tickers', newTickers)
            setTickerInput('')
        }
    }

    const handleRemoveTicker = (tickerToRemove: string) => {
        const newTickers = localTickers.filter(t => t !== tickerToRemove)
        setLocalTickers(newTickers)
        updatePostInfo('tickers', newTickers)
    }

    const updatePostInfo = (key: string, value: any) => {
        onPostInfoChange({
            ...postInfo,
            [key]: value
        })
    }

    const sentiment = postInfo?.analysis?.sentiment?.toLowerCase()

    const getSentimentIcon = () => {
        switch (sentiment) {
            case 'positive': return <Smile className="w-5 h-5 text-green-500" />
            case 'negative': return <Frown className="w-5 h-5 text-red-500" />
            case 'neutral': return <Meh className="w-5 h-5 text-gray-500" />
            default: return <Meh className="w-5 h-5 text-gray-400" />
        }
    }

    const getSentimentColor = () => {
        switch (sentiment) {
            case 'positive': return 'bg-green-100 text-green-800 border-green-200'
            case 'negative': return 'bg-red-100 text-red-800 border-red-200'
            case 'neutral': return 'bg-gray-100 text-gray-800 border-gray-200'
            default: return 'bg-gray-50 text-gray-600 border-gray-200'
        }
    }

    // Determine which summary to show based on active language
    const summaries = activeLanguage === 'ko'
        ? postInfo?.analysis?.summary_ko
        : postInfo?.analysis?.summary_en

    const analysisText = activeLanguage === 'ko'
        ? postInfo?.analysis?.analysis_ko
        : postInfo?.analysis?.analysis_en

    return (
        <div className="p-4 space-y-4">
            {/* AI Action Button */}
            {onAiRewrite && (
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={onAiRewrite}
                        disabled={isRewriting}
                        className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isRewriting ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors`}
                    >
                        {isRewriting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                AI 글다듬기 및 분석 중...
                            </>
                        ) : (
                            <>
                                <span className="mr-2">✨</span>
                                AI 글다듬기 및 분석 (Regenerate)
                            </>
                        )}
                    </button>
                    <p className="mt-1 text-xs text-gray-500 text-center">
                        현재 내용을 바탕으로 AI가 요약, 분석, 스타일을 개선합니다.
                    </p>
                </div>
            )}

            {/* 1. Tickers */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    관련 티커 (Tickers)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {localTickers.map(ticker => (
                        <span key={ticker} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {ticker}
                            <button
                                type="button"
                                onClick={() => handleRemoveTicker(ticker)}
                                className="ml-1.5 text-blue-600 hover:text-blue-800 focus:outline-none"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={tickerInput}
                        onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTicker())}
                        placeholder="Add ticker (e.g. BTC)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        type="button"
                        onClick={handleAddTicker}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 2. Summary */}
            {(summaries && summaries.length > 0) && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI 요약 (Summary - {activeLanguage.toUpperCase()})
                    </label>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        {summaries.map((line: string, idx: number) => (
                            <li key={idx}>{line}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 3. Analysis Text */}
            {analysisText && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI 분석 코멘트 (Analysis - {activeLanguage.toUpperCase()})
                    </label>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                        {analysisText}
                    </p>
                </div>
            )}

            {/* 4. Source Articles */}
            {postInfo?.source_articles && postInfo.source_articles.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        참조 기사 (Source Articles)
                    </label>
                    <div className="space-y-1">
                        {postInfo.source_articles.map((article: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                <ExternalLink className="w-3 h-3" />
                                <span className="truncate">{article}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
