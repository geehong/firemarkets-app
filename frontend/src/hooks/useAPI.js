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