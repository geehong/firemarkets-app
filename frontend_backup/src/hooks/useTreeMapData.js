import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'

const useTreeMapData = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('[TreeMap] fetching /world-assets/top-assets-by-category?limit=30')
      // 카테고리별 상위 자산 데이터 (채권 시장 데이터 포함)
      const response = await axios.get(
        '/api/v1/world-assets/top-assets-by-category?limit=30',
      )
      console.log('[TreeMap] status:', response.status)
      console.log('[TreeMap] keys:', Object.keys(response.data || {}))
      console.log('[TreeMap] success:', response.data?.success, 'total:', response.data?.total, 'limit:', response.data?.limit)
      console.log('[TreeMap] categories keys:', response.data?.categories ? Object.keys(response.data.categories).length : 'no categories')
      let combinedData = []

      // 응답 데이터 처리
      if (response.data && response.data.categories) {
        const categories = response.data.categories

        // categories는 객체이므로 Object.entries로 순회
        Object.entries(categories).forEach(([categoryName, categoryData]) => {
          if (Array.isArray(categoryData)) {
            categoryData.forEach((asset) => {
              // 채권 데이터 처리
              if (asset.is_bond) {
                combinedData.push({
                  ...asset,
                  category: categoryName, // Government Bonds, Corporate Bonds
                  country: asset.country || 'Global',
                  sector: categoryName,
                  daily_change_percent: asset.daily_change_percent || 0,
                  is_top_asset: false,
                  is_bond: true,
                  bond_type: categoryName,
                  quarter: asset.quarter,
                  data_source: asset.data_source,
                })
              } else {
                // 일반 자산 데이터 처리
                combinedData.push({
                  ...asset,
                  category: categoryName,
                  country: asset.country || 'Unknown',
                  sector: categoryName, // 카테고리를 섹터로 사용
                  daily_change_percent: asset.daily_change_percent || 0,
                  is_top_asset: true,
                  is_bond: false,
                  rank_in_category: asset.rank,
                })
              }
            })
          }
        })
      }

      console.log('[TreeMap] combined items:', combinedData.length)
      console.log('[TreeMap] sample data:', combinedData.slice(0, 3))
      setData(combinedData)
    } catch (err) {
      setError(err.message)
      console.error('[TreeMap] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = useCallback(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refreshData,
  }
}

// 성과 트리맵용 새로운 훅
const usePerformanceTreeMapData = (performancePeriod = '1d', limit = 100) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // console.log('=== FETCHING PERFORMANCE DATA ===')
      // console.log(
      //   'URL:',
      //   `/api/v1/world-assets/performance-treemap?performance_period=${performancePeriod}&limit=${limit}`,
      // )

      const response = await axios.get(
        `/api/v1/world-assets/performance-treemap?performance_period=${performancePeriod}&limit=${limit}`,
      )

      // console.log('=== API RESPONSE ===')
      // console.log('Response status:', response.status)
      // console.log('Response data keys:', Object.keys(response.data))
      // console.log('Response success:', response.data?.success)
      // console.log('Response data length:', response.data?.data?.length)

      const payload = response.data
      const performanceData = payload && Array.isArray(payload.data) ? payload.data : null
      if (performanceData) {

        // console.log('=== RAW PERFORMANCE DATA ===')
        // console.log('Performance data length:', performanceData.length)
        // console.log('First 3 items:', performanceData.slice(0, 3))

        // PerformanceTreeMap 컴포넌트가 기대하는 형식으로 변환
        const formattedData = performanceData.map((asset) => ({
          ...asset,
          // PerformanceTreeMap이 기대하는 필드명으로 매핑
          type_name: asset.category,
          market_cap: asset.market_cap_usd,
          performance: asset.performance,
          current_price: asset.current_price,
          volume: asset.volume_24h,
          change_percent_24h: asset.change_percent_24h,
        }))

        // console.log('=== FORMATTED PERFORMANCE DATA ===')
        // console.log('Formatted data length:', formattedData.length)
        // console.log('First 3 formatted items:', formattedData.slice(0, 3))

        // 성과 값 범위 확인
        const performances = formattedData
          .map((d) => d.performance)
          .filter((p) => p !== null && p !== undefined)
        // if (performances.length > 0) {
        //   console.log('Performance range:', {
        //     min: Math.min(...performances),
        //     max: Math.max(...performances),
        //     avg: performances.reduce((a, b) => a + b, 0) / performances.length,
        //   })
        // }

        // 필드 매핑 확인
        // console.log('Field mapping check (first item):', {
        //   original: performanceData[0],
        //   formatted: formattedData[0],
        //   hasTypeName: !!formattedData[0]?.type_name,
        //   hasMarketCap: !!formattedData[0]?.market_cap,
        //   hasPerformance: !!formattedData[0]?.performance,
        // })

        // console.log('=== SETTING DATA ===')
        // console.log('Setting data with length:', formattedData.length)
        setData(formattedData)
      } else {
        // console.log('=== NO DATA CONDITION ===')
        // console.log('Response data:', payload)
        // console.log('Success check:', response.data?.success)
        // console.log('Data check:', response.data?.data)
        setData([])
      }
    } catch (err) {
      // console.log('=== ERROR ===')
      // console.error('Error fetching performance treemap data:', err)
      setError(err.message)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [performancePeriod, limit])

  const refreshData = useCallback(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refreshData,
  }
}

// 성과 기반 TreeMap용 훅 (api/v1/assets/market-caps 사용, 본드 제외)
const usePerformanceTreeMapDataFromTreeMap = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('[PerformanceTreeMap] fetching /api/v1/assets/market-caps')
      // /assets/market-caps/today API 사용 (오늘 날짜의 모든 자산 로드, asset_id null 포함)
      const response = await axios.get(
        '/api/v1/assets/market-caps/today?has_asset_id=false&limit=1000'
      )
      
      console.log('[PerformanceTreeMap] status:', response.status)
      console.log('[PerformanceTreeMap] data length:', response.data?.data?.length)
      
      if (response.data && response.data.data) {
        const marketCapData = response.data.data
        
        // 본드 데이터 제외하고 성과 데이터 매핑
        const performanceData = marketCapData
          .filter(asset => !asset.is_bond && !asset.bond_type) // 본드 데이터 제외
          .map(asset => ({
            ...asset,
            // 성과 데이터 매핑
            performance: asset.daily_change_percent || 0,
            // PerformanceTreeMap이 기대하는 필드명으로 매핑
            type_name: asset.type_name || asset.category,
            market_cap: asset.market_cap,
            market_cap_usd: asset.market_cap, // 호환성을 위해 추가
            current_price: asset.current_price || asset.price,
            price_usd: asset.current_price || asset.price, // 호환성을 위해 추가
            volume: asset.volume || 0,
            change_percent_24h: asset.daily_change_percent || 0,
            daily_change_percent: asset.daily_change_percent || 0,
            category: asset.type_name || asset.category,
            country: asset.country || 'Unknown',
            ticker: asset.ticker,
            name: asset.name,
            rank: asset.rank,
          }))
        
        console.log('[PerformanceTreeMap] processed data length:', performanceData.length)
        console.log('[PerformanceTreeMap] sample data:', performanceData.slice(0, 3))
        setData(performanceData)
      } else {
        setData([])
      }
    } catch (err) {
      setError(err.message)
      console.error('[PerformanceTreeMap] fetch error:', err)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = useCallback(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  return {
    data,
    loading,
    error,
    refreshData,
  }
}

export { useTreeMapData, usePerformanceTreeMapData, usePerformanceTreeMapDataFromTreeMap }
