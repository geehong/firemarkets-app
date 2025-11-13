/**
 * 프론트엔드에서 제외할 자산 목록
 * ticker 또는 asset_id로 제외 가능
 */
export const EXCLUDED_ASSETS = {
  // Ticker로 제외
  tickers: [
    '2222.SR', // Saudi Aramco - 데이터 수집 불가
    'USDC',
    'USDT',
    'PLAT',
    'PALLAD',
    // 추가 제외할 ticker를 여기에 추가
  ] as string[],
  
  // Asset ID로 제외
  assetIds: [
    // 12, // 2222.SR의 asset_id (필요시 사용)
    // 추가 제외할 asset_id를 여기에 추가
  ] as number[],
} as const

/**
 * 자산이 제외 목록에 있는지 확인
 */
export function isAssetExcluded(asset: { ticker?: string; asset_id?: number }): boolean {
  if (asset.ticker && EXCLUDED_ASSETS.tickers.includes(asset.ticker)) {
    return true
  }
  if (asset.asset_id && EXCLUDED_ASSETS.assetIds.includes(asset.asset_id)) {
    return true
  }
  return false
}

/**
 * 자산 배열에서 제외 목록에 있는 항목 필터링
 */
export function filterExcludedAssets<T extends { ticker?: string; asset_id?: number }>(
  assets: T[]
): T[] {
  return assets.filter(asset => !isAssetExcluded(asset))
}

