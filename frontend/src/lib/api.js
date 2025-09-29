import axios from 'axios'

const baseURL = import.meta?.env?.VITE_API_BASE || 'https://backend.firemarkets.net/api/v1'

export const api = axios.create({
  baseURL,
})

export const paramsSerializer = (params) => {
  const usp = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    usp.append(k, typeof v === 'string' ? v : String(v))
  })
  return usp.toString()
}
