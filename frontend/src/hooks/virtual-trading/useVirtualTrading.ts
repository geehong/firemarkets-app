'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resolveApiBaseUrl } from '@/lib/api'
import { tokenService } from '@/services/tokenService'

// API 기본 URL
const getApiBase = (): string => {
  return resolveApiBaseUrl();
}

// 인증 헤더를 가져오는 헬퍼 함수
const getAuthHeaders = (): Record<string, string> => {
  const token = tokenService.getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

// 타입 정의
export interface VirtualWallet {
  id: number
  user_id: number
  balance: number
  created_at: string
  updated_at: string
}

export interface VirtualPosition {
  id: number
  user_id: number
  symbol: string
  side: 'BUY' | 'SELL'
  entry_price: number
  quantity: number
  leverage: number
  margin_mode: string
  is_active: boolean
  pnl: number
  liquidation_price: number | null
  created_at: string
  updated_at: string
  closed_at: string | null
}

export interface VirtualOrder {
  id: number
  user_id: number
  symbol: string
  side: 'BUY' | 'SELL'
  order_type: 'MARKET' | 'LIMIT'
  price: number | null
  quantity: number
  leverage: number
  status: 'PENDING' | 'FILLED' | 'CANCELLED'
  created_at: string
}

export interface VirtualTrade {
    id: number
    user_id: number
    symbol: string
    side: 'BUY' | 'SELL'
    price: number
    quantity: number
    leverage: number
    pnl: number | null
    trade_type: 'ENTRY' | 'EXIT' | 'LIQUIDATION'
    timestamp: string
}

// 1. 가상 지갑 정보 조회 훅
export const useVirtualWallet = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['virtual', 'wallet'],
    queryFn: async (): Promise<VirtualWallet> => {
      const url = `${getApiBase()}/virtual-trading/wallet`
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch virtual wallet: ${response.status}`)
      }
      return response.json()
    },
    staleTime: 30000, // 30초
    ...options
  })
}

// 2. 활성 포지션 목록 조회 훅
export const useVirtualPositions = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['virtual', 'positions'],
    queryFn: async (): Promise<VirtualPosition[]> => {
      const url = `${getApiBase()}/virtual-trading/positions`
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch virtual positions: ${response.status}`)
      }
      return response.json()
    },
    staleTime: 10000, // 10초
    ...options
  })
}

// 3. 주문 생성 훅
export const useCreateVirtualOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderData: {
      symbol: string
      side: 'BUY' | 'SELL'
      order_type: 'MARKET' | 'LIMIT'
      price?: number
      quantity: number
      leverage: number
    }): Promise<VirtualOrder> => {
      const url = `${getApiBase()}/virtual-trading/orders`
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to create virtual order: ${response.status}`)
      }

      return response.json()
    },
    onSuccess: () => {
      // 관련 데이터 무효화
      queryClient.invalidateQueries({ queryKey: ['virtual', 'wallet'] })
      queryClient.invalidateQueries({ queryKey: ['virtual', 'positions'] })
      queryClient.invalidateQueries({ queryKey: ['virtual', 'history'] })
    },
  })
}

// 4. 거래 내역 조회 훅
export const useVirtualTradeHistory = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['virtual', 'history'],
    queryFn: async (): Promise<VirtualTrade[]> => {
      const url = `${getApiBase()}/virtual-trading/history`
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch virtual trade history: ${response.status}`)
      }
      return response.json()
    },
    staleTime: 60000, // 1분
    ...options
  })
}
