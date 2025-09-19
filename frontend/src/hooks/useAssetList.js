import { useQuery } from '@tanstack/react-query'

const buildQueryString = (params) => {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.append(k, v)
  })
  return usp.toString()
}

export const fetchAssetList = async ({ typeName, page, pageSize, hasOhlcvData }) => {
  const limit = pageSize
  const offset = (page - 1) * pageSize
  const qs = buildQueryString({ type_name: typeName, has_ohlcv_data: hasOhlcvData, limit, offset })
  const url = `/api/v1/assets-lists?${qs}`
  console.log('[useAssetList] Request:', { url, typeName, page, pageSize, hasOhlcvData })
  const res = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Failed to fetch assets-lists')
  }
  const json = await res.json()
  // normalize backend shape { data, total_count }
  if (json && json.data && typeof json.total_count === 'number') {
    console.log('[useAssetList] Response:', { total: json.total_count, sample: json.data?.slice?.(0, 3) })
    return { data: json.data, total: json.total_count }
  }
  // fallback for potential different format
  const data = json.data || json || []
  const total = json.total || json.total_count || 0
  console.log('[useAssetList] Response (fallback):', { total, sample: Array.isArray(data) ? data.slice(0,3) : data })
  return { data, total }
}

export const useAssetList = ({ typeName = null, page = 1, pageSize = 50, hasOhlcvData = true } = {}) => {
  const query = useQuery({
    queryKey: ['assets-lists', typeName, page, pageSize, hasOhlcvData],
    queryFn: () => fetchAssetList({ typeName, page, pageSize, hasOhlcvData }),
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  })

  return {
    data: query.data?.data || [],
    total: query.data?.total || 0,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export default useAssetList


