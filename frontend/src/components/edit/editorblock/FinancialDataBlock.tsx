'use client'

import React, { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, BarChart3, PieChart } from 'lucide-react'

interface FinancialData {
  financial_id: number
  asset_id: number
  snapshot_date: string
  currency: string | null
  market_cap: number | null
  ebitda: number | null
  shares_outstanding: number | null
  pe_ratio: number | null
  peg_ratio: number | null
  beta: number | null
  eps: number | null
  dividend_yield: number | null
  dividend_per_share: number | null
  profit_margin_ttm: number | null
  return_on_equity_ttm: number | null
  revenue_ttm: number | null
  price_to_book_ratio: number | null
  week_52_high: number | null
  week_52_low: number | null
  day_50_moving_avg: number | null
  day_200_moving_avg: number | null
  updated_at: string
  // 추가 필드들
  book_value: number | null
  revenue_per_share_ttm: number | null
  operating_margin_ttm: number | null
  return_on_assets_ttm: number | null
  gross_profit_ttm: number | null
  quarterly_earnings_growth_yoy: number | null
  quarterly_revenue_growth_yoy: number | null
  analyst_target_price: number | null
  trailing_pe: number | null
  forward_pe: number | null
  price_to_sales_ratio_ttm: number | null
  ev_to_revenue: number | null
  ev_to_ebitda: number | null
}

interface FinancialDataBlockProps {
  ticker?: string
  assetId?: number | null
  financialData?: FinancialData | null
  onSaveFinancial?: (data: Partial<FinancialData>) => Promise<void>
}

export default function FinancialDataBlock({ ticker, assetId, financialData, onSaveFinancial }: FinancialDataBlockProps) {
  const [financials, setFinancials] = useState<FinancialData | null>(financialData || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<FinancialData>>({})

  useEffect(() => {
    if (ticker || assetId) {
      fetchFinancialData()
    }
  }, [ticker, assetId])

  useEffect(() => {
    if (financials) {
      setEditData(financials)
    }
  }, [financials])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 올바른 API 엔드포인트 사용
      const response = await fetch(`https://backend.firemarkets.net/api/v1/assets/stock-financials/asset/${ticker || assetId}?limit=10`)
      if (!response.ok) {
        throw new Error('재무 데이터를 가져올 수 없습니다.')
      }
      
      const data = await response.json()
      console.log('📊 FinancialDataBlock - API Response:', data)
      
      // API 응답 구조에 맞춰 데이터 처리
      if (data.data && data.data.length > 0) {
        setFinancials(data.data[0]) // 가장 최근 데이터 사용
      } else {
        setFinancials(null)
      }
    } catch (err) {
      console.error('❌ FinancialDataBlock - API Error:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FinancialData, value: string | number) => {
    setEditData(prev => ({
      ...prev,
      [field]: value === '' || value === 0 ? null : value
    }))
  }

  const handleSave = async () => {
    if (onSaveFinancial) {
      try {
        await onSaveFinancial(editData)
        setFinancials(prev => prev ? { ...prev, ...editData } : null)
        setEditing(false)
      } catch (err) {
        console.error('Failed to save financial data:', err)
      }
    }
  }

  const handleCancel = () => {
    setEditData(financials || {})
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 text-sm">재무 데이터 로딩 중...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchFinancialData}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (!financials) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-center">
          <div className="text-gray-400 mb-2">📊</div>
          <p className="text-gray-500 text-sm">재무 데이터가 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <BarChart3 className="w-4 h-4 mr-2" />
          재무 데이터
        </h3>
        <div className="flex space-x-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              >
                저장
              </button>
              <button
                onClick={handleCancel}
                className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
              >
                취소
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              편집
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 시가총액 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <DollarSign className="w-4 h-4 mr-2 text-green-600" />
            <span className="text-sm font-medium text-gray-700">시가총액</span>
          </div>
          {editing ? (
            <input
              type="number"
              value={editData.market_cap || ''}
              onChange={(e) => handleInputChange('market_cap', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              ${financials.market_cap ? (financials.market_cap / 1e9).toFixed(2) + 'B' : 'N/A'}
            </span>
          )}
        </div>

        {/* P/E 비율 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">P/E 비율</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.pe_ratio || ''}
              onChange={(e) => handleInputChange('pe_ratio', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.pe_ratio ? financials.pe_ratio.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* EPS */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <PieChart className="w-4 h-4 mr-2 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">EPS</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.eps || ''}
              onChange={(e) => handleInputChange('eps', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.eps ? financials.eps.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* 발행주식수 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">발행주식수</span>
          </div>
          {editing ? (
            <input
              type="number"
              value={editData.shares_outstanding || ''}
              onChange={(e) => handleInputChange('shares_outstanding', parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.shares_outstanding ? (financials.shares_outstanding / 1e6).toFixed(1) + 'M' : 'N/A'}
            </span>
          )}
        </div>

        {/* 52주 최고 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">52주 최고</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.week_52_high || ''}
              onChange={(e) => handleInputChange('week_52_high', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              ${financials.week_52_high ? financials.week_52_high.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* 52주 최저 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">52주 최저</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.week_52_low || ''}
              onChange={(e) => handleInputChange('week_52_low', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              ${financials.week_52_low ? financials.week_52_low.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* 배당금 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">배당금</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.dividend_per_share || ''}
              onChange={(e) => handleInputChange('dividend_per_share', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              ${financials.dividend_per_share ? financials.dividend_per_share.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* 베타 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">베타</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.beta || ''}
              onChange={(e) => handleInputChange('beta', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.beta ? financials.beta.toFixed(3) : 'N/A'}
            </span>
          )}
        </div>

        {/* 50일 이동평균 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">50일 이동평균</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.day_50_moving_avg || ''}
              onChange={(e) => handleInputChange('day_50_moving_avg', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              ${financials.day_50_moving_avg ? financials.day_50_moving_avg.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* 200일 이동평균 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">200일 이동평균</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.day_200_moving_avg || ''}
              onChange={(e) => handleInputChange('day_200_moving_avg', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              ${financials.day_200_moving_avg ? financials.day_200_moving_avg.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* 추가 필드들 (모든 필드 표시) */}
        {/* 장부가치 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">장부가치</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.book_value || ''}
              onChange={(e) => handleInputChange('book_value', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              ${financials.book_value ? financials.book_value.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* 주당 매출 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">주당 매출</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.revenue_per_share_ttm || ''}
              onChange={(e) => handleInputChange('revenue_per_share_ttm', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              ${financials.revenue_per_share_ttm ? financials.revenue_per_share_ttm.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* 영업 마진 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">영업 마진</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.operating_margin_ttm || ''}
              onChange={(e) => handleInputChange('operating_margin_ttm', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.operating_margin_ttm ? (financials.operating_margin_ttm * 100).toFixed(2) + '%' : 'N/A'}
            </span>
          )}
        </div>

        {/* 자산 수익률 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">자산 수익률</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.return_on_assets_ttm || ''}
              onChange={(e) => handleInputChange('return_on_assets_ttm', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.return_on_assets_ttm ? (financials.return_on_assets_ttm * 100).toFixed(2) + '%' : 'N/A'}
            </span>
          )}
        </div>

        {/* 총 이익 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">총 이익</span>
          </div>
          {editing ? (
            <input
              type="number"
              value={editData.gross_profit_ttm || ''}
              onChange={(e) => handleInputChange('gross_profit_ttm', parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.gross_profit_ttm ? (financials.gross_profit_ttm / 1e9).toFixed(2) + 'B' : 'N/A'}
            </span>
          )}
        </div>

        {/* 분기 수익 성장률 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">분기 수익 성장률</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.quarterly_earnings_growth_yoy || ''}
              onChange={(e) => handleInputChange('quarterly_earnings_growth_yoy', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.quarterly_earnings_growth_yoy ? (financials.quarterly_earnings_growth_yoy * 100).toFixed(2) + '%' : 'N/A'}
            </span>
          )}
        </div>

        {/* 분기 매출 성장률 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">분기 매출 성장률</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.quarterly_revenue_growth_yoy || ''}
              onChange={(e) => handleInputChange('quarterly_revenue_growth_yoy', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.quarterly_revenue_growth_yoy ? (financials.quarterly_revenue_growth_yoy * 100).toFixed(2) + '%' : 'N/A'}
            </span>
          )}
        </div>

        {/* 애널리스트 목표가 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">애널리스트 목표가</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.analyst_target_price || ''}
              onChange={(e) => handleInputChange('analyst_target_price', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              ${financials.analyst_target_price ? financials.analyst_target_price.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* Trailing P/E */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Trailing P/E</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.trailing_pe || ''}
              onChange={(e) => handleInputChange('trailing_pe', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.trailing_pe ? financials.trailing_pe.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* Forward P/E */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Forward P/E</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.forward_pe || ''}
              onChange={(e) => handleInputChange('forward_pe', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.forward_pe ? financials.forward_pe.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* 주가매출비율 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">주가매출비율</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.price_to_sales_ratio_ttm || ''}
              onChange={(e) => handleInputChange('price_to_sales_ratio_ttm', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.price_to_sales_ratio_ttm ? financials.price_to_sales_ratio_ttm.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* 기업가치매출비율 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">기업가치매출비율</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.ev_to_revenue || ''}
              onChange={(e) => handleInputChange('ev_to_revenue', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.ev_to_revenue ? financials.ev_to_revenue.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>

        {/* 기업가치EBITDA비율 */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-700">기업가치EBITDA비율</span>
          </div>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={editData.ev_to_ebitda || ''}
              onChange={(e) => handleInputChange('ev_to_ebitda', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-900">
              {financials.ev_to_ebitda ? financials.ev_to_ebitda.toFixed(2) : 'N/A'}
            </span>
          )}
        </div>
      </div>

      {!editing && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={fetchFinancialData}
            className="w-full px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
          >
            새로고침
          </button>
        </div>
      )}
    </div>
  )
}
