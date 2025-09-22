import { useState, useEffect } from 'react'

const useAssetTypes = () => {
  const [assetTypes, setAssetTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAssetTypes = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/v1/asset-types?has_data=false&include_description=false')
        if (!response.ok) {
          throw new Error('Failed to fetch asset types')
        }
        const data = await response.json()
        console.log('Asset types API response:', data)
        
        // API 응답이 객체인 경우 data 필드를 확인
        const assetTypesData = data.data || data
        setAssetTypes(Array.isArray(assetTypesData) ? assetTypesData : [])
      } catch (err) {
        setError(err.message)
        console.error('Asset types fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAssetTypes()
  }, [])

  return { assetTypes, loading, error }
}

export default useAssetTypes 