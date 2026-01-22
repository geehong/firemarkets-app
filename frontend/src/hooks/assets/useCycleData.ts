import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'

export interface CycleConfig {
  era: number
  startDate: string
  endDate: string
  name: string
}

export interface CycleData {
  era: number
  name: string
  data: Array<{
    timestamp_utc: string
    close_price: number
    date: string
    change_percent?: number
  }>
  minPrice: number
  maxPrice: number
  minDate: string
  maxDate: string
}

// 비트코인 사이클 정의
export const BITCOIN_CYCLES: CycleConfig[] = [
  {
    era: 1,
    startDate: '2011-11-28',
    endDate: '2013-11-25',
    name: 'Era 1'
  },
  {
    era: 2,
    startDate: '2015-01-14',
    endDate: '2017-12-17',
    name: 'Era 2'
  },
  {
    era: 3,
    startDate: '2018-12-15',
    endDate: '2021-11-10',
    name: 'Era 3'
  },
  {
    era: 4,
    startDate: '2022-11-21',
    endDate: new Date().toISOString().split('T')[0], // 현재 날짜
    name: 'Era 4'
  }
]

// 단일 사이클 데이터 가져오기
export const useCycleData = (cycle: CycleConfig, enabled: boolean = true) => {
  const [data, setData] = useState<CycleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (!enabled) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.v2GetOhlcv('BTC', {
          data_interval: '1d',
          start_date: cycle.startDate,
          end_date: cycle.endDate,
          limit: 10000
        })

        if (result && result.data && Array.isArray(result.data)) {
          // 데이터 정렬 (날짜순)
          const sortedData = result.data.sort((a: any, b: any) => {
            const dateA = new Date(a.date || a.timestamp_utc).getTime()
            const dateB = new Date(b.date || b.timestamp_utc).getTime()
            return dateA - dateB
          })

          // 최저점과 최고점 찾기
          let minPrice = Infinity
          let maxPrice = -Infinity
          let minDate = ''
          let maxDate = ''

          sortedData.forEach((point: any) => {
            // API 응답은 value 필드를 사용 (close_price, price도 지원)
            const price = parseFloat(point.value || point.close_price || point.price || 0)
            if (price > 0 && isFinite(price)) {
              if (price < minPrice) {
                minPrice = price
                minDate = point.date || point.timestamp_utc
              }
              if (price > maxPrice) {
                maxPrice = price
                maxDate = point.date || point.timestamp_utc
              }
            }
          })

          setData({
            era: cycle.era,
            name: cycle.name,
            data: sortedData,
            minPrice: minPrice === Infinity ? 0 : minPrice,
            maxPrice: maxPrice === -Infinity ? 0 : maxPrice,
            minDate,
            maxDate
          })
        } else {
          setError(new Error('Invalid data format'))
        }
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [cycle.startDate, cycle.endDate, cycle.era, enabled])

  return { data, loading, error }
}

// 여러 사이클 데이터를 동시에 가져오는 훅
export const useMultipleCycleData = (cycles: CycleConfig[], enabled: boolean = true) => {
  const [allData, setAllData] = useState<CycleData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (!enabled || cycles.length === 0) return

    const fetchAllData = async () => {
      setLoading(true)
      setError(null)
      try {
        const promises = cycles.map(cycle => 
          apiClient.v2GetOhlcv('BTC', {
            data_interval: '1d',
            start_date: cycle.startDate,
            end_date: cycle.endDate,
            limit: 10000
          }).then(result => {
            if (result && result.data && Array.isArray(result.data)) {
              // 데이터 정렬 (날짜순)
              const sortedData = result.data.sort((a: any, b: any) => {
                const dateA = new Date(a.date || a.timestamp_utc).getTime()
                const dateB = new Date(b.date || b.timestamp_utc).getTime()
                return dateA - dateB
              })

              // 최저점과 최고점 찾기
              let minPrice = Infinity
              let maxPrice = -Infinity
              let minDate = ''
              let maxDate = ''

              sortedData.forEach((point: any) => {
                // API 응답은 value 필드를 사용 (close_price, price도 지원)
                const price = parseFloat(point.value || point.close_price || point.price || 0)
                if (price > 0 && isFinite(price)) {
                  if (price < minPrice) {
                    minPrice = price
                    minDate = point.date || point.timestamp_utc
                  }
                  if (price > maxPrice) {
                    maxPrice = price
                    maxDate = point.date || point.timestamp_utc
                  }
                }
              })

              return {
                era: cycle.era,
                name: cycle.name,
                data: sortedData,
                minPrice: minPrice === Infinity ? 0 : minPrice,
                maxPrice: maxPrice === -Infinity ? 0 : maxPrice,
                minDate,
                maxDate
              } as CycleData
            }
            return null
          }).catch(err => {
            console.error(`Error fetching cycle ${cycle.era}:`, err)
            return null
          })
        )

        const results = await Promise.all(promises)
        const validResults = results.filter((r): r is CycleData => r !== null)
        setAllData(validResults)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [cycles, enabled])

  return { data: allData, loading, error }
}

