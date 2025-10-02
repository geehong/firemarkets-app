/**
 * useAPI.js
 * 
 * 필요성:
 * - 프로젝트 전체에서 사용되는 다양한 API 훅들을 체계적으로 관리
 * - 각 컴포넌트에서 개별적으로 API 훅을 import하는 번거로움 해결
 * - API 훅들의 일관된 네이밍과 구조 제공
 * - 새로운 API 훅 추가시 중앙 집중식 관리
 * 
 * 목적:
 * - 모든 API 훅을 카테고리별로 그룹화하여 통합 관리
 * - 확장 가능한 구조로 필요할 때마다 새로운 카테고리 추가
 * - 기존 코드 호환성 유지하면서 새로운 구조 제공
 * - API 훅들의 재사용성과 유지보수성 향상
 * 
 * 구조:
 * - assets: 자산 관련 훅들 (crypto, etf, ohlcv 등)
 * - realtime: 실시간 데이터 훅들 (prices, sparkline, treeMap 등)
 * - dashboard: 대시보드 관련 훅들
 * - admin: 관리자 관련 훅들
 * - 기타: navigation, onchain, scheduler 등
 * 
 * 사용법:
 * - useAPI.assets.crypto() - 암호화폐 데이터
 * - useAPI.realtime.prices() - 실시간 가격 데이터
 * - useAPI.dashboard.summary() - 대시보드 요약 데이터
 * 
 * 장점:
 * - 중앙 집중식 API 훅 관리
 * - 카테고리별 명확한 분류
 * - 기존 코드 호환성 유지
 * - 새로운 API 훅 추가 용이
 */

/**
 * 통합 API 훅 - 모든 API 훅을 카테고리별로 그룹화
 * 확장 가능한 구조로 필요할 때마다 새로운 카테고리 추가 가능
 */

// Assets 관련 훅들
import { useAssets, useAssetsOHLCV } from './useAssets'
import { useWorldAssets } from './useWorldAssets'
import { useCrypto } from './useCrypto'
import { useETF } from './useETF'

// Realtime 관련 훅들
import { useRealtime, useRealtimePricesPg, useDelaySparklinePg } from './useRealtime'
import { useWebSocket, useRealtimePricesWebSocket, useDelaySparklineWebSocket } from './useWebSocket'
import { useTreeMapData, usePerformanceTreeMapData, usePerformanceTreeMapDataFromTreeMap } from './useTreeMapData'

// Dashboard 관련 훅들
import { useDashboard } from './useDashboard'
import { useTickers } from './useTickers'

// Navigation 관련 훅들
import { useNavigation } from './useNavigation'

// Onchain 관련 훅들
import { useOnchain } from './useOnchain'

// Scheduler 관련 훅들
import { useScheduler } from './useScheduler'

// Collectors 관련 훅들
import { useCollectors } from './useCollectors'

// Admin 관련 훅들
import { useAdmin } from './useAdmin'
import { useLogs } from './useLogs'
import { useMetrics } from './useMetrics'

// Open Interest 관련 훅들
import { useOpenInterest } from './useOpenInterest'

// Configurations 관련 훅들
import { useConfigurations } from './useConfigurations'
import { paramSpecs } from './paramSpecs'

/**
 * 통합 API 훅 객체
 * 카테고리별로 그룹화된 모든 훅들을 제공
 */
export const useAPI = {
  // 자산 관련 훅들
  assets: {
    list: useAssets,
    world: useWorldAssets,
    crypto: useCrypto,
    etf: useETF,
    ohlcv: useAssetsOHLCV,  // OHLCV 데이터 훅 (useAssets.js에서)
    ohlcvRecent: useAssetsOHLCV  // 최근 OHLCV 데이터도 같은 훅 사용
  },
  specs: paramSpecs,

  // 실시간 데이터 관련 훅들
  realtime: {
    prices: useRealtime,
    pricesPg: useRealtimePricesPg,
    sparkline: useDelaySparklinePg,
    webSocket: useWebSocket,
    webSocketPrices: useRealtimePricesWebSocket,
    webSocketSparkline: useDelaySparklineWebSocket,
    treeMap: useTreeMapData,
    performanceTreeMap: usePerformanceTreeMapData,
    performanceTreeMapFromTreeMap: usePerformanceTreeMapDataFromTreeMap
  },

  // 대시보드 관련 훅들
  dashboard: {
    summary: useDashboard,
    tickers: useTickers
  },

  // 네비게이션 관련 훅들
  navigation: {
    menu: useNavigation
  },

  // 온체인 데이터 관련 훅들
  onchain: {
    metrics: useOnchain
  },

  // 스케줄러 관련 훅들
  scheduler: {
    tasks: useScheduler
  },

  // 컬렉터 관련 훅들
  collectors: {
    data: useCollectors
  },

  // 관리자 관련 훅들
  admin: {
    panel: useAdmin,
    logs: useLogs,
    metrics: useMetrics
  },

  // 오픈 인터레스트 관련 훅들
  openInterest: {
    data: useOpenInterest
  },

  // 설정 관련 훅들
  configurations: {
    settings: useConfigurations
  },

  // 자산 개요 관련 훅들
  assetsoverviews: {
    // 개별 훅들 (기존 것들 재사용)
    assets: useAssets,
    crypto: useCrypto,
    realtime: useRealtime,
    webSocket: useWebSocket,
    treeMap: useTreeMapData,
    ohlcv: useAssetsOHLCV,
    ohlcvRecent: useAssetsOHLCV
  }
}

// 기본 export로 useAPI 제공
export default useAPI

// 개별 훅들도 export (기존 코드 호환성 유지)
export {
  useAssets,
  useAssetsOHLCV,
  useWorldAssets,
  useCrypto,
  useETF,
  useRealtime,
  useRealtimePricesPg,
  useDelaySparklinePg,
  useWebSocket,
  useRealtimePricesWebSocket,
  useDelaySparklineWebSocket,
  useTreeMapData,
  usePerformanceTreeMapData,
  usePerformanceTreeMapDataFromTreeMap,
  useDashboard,
  useTickers,
  useNavigation,
  useOnchain,
  useScheduler,
  useCollectors,
  useAdmin,
  useLogs,
  useMetrics,
  useOpenInterest,
  useConfigurations
}