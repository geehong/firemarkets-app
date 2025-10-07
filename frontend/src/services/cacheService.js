/**
 * 프론트엔드 캐싱 서비스
 * 브라우저 localStorage와 메모리 캐시를 활용한 클라이언트 사이드 캐싱
 */

class CacheService {
  constructor() {
    this.memoryCache = new Map()
    this.storagePrefix = 'firemarkets-cache-'
  }

  /**
   * 캐시 키 생성
   */
  generateKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')
    return `${endpoint}${paramString ? '?' + paramString : ''}`
  }

  /**
   * 메모리 캐시에서 데이터 조회
   */
  getFromMemory(key) {
    const cached = this.memoryCache.get(key)
    if (cached && Date.now() < cached.expiry) {
      return cached.data
    }
    // 만료된 캐시 삭제
    if (cached) {
      this.memoryCache.delete(key)
    }
    return null
  }

  /**
   * localStorage에서 데이터 조회
   */
  getFromStorage(key) {
    try {
      const cached = localStorage.getItem(this.storagePrefix + key)
      if (cached) {
        const { data, expiry } = JSON.parse(cached)
        if (Date.now() < expiry) {
          return data
        }
        // 만료된 캐시 삭제
        localStorage.removeItem(this.storagePrefix + key)
      }
    } catch (error) {
      console.warn('Cache storage error:', error)
    }
    return null
  }

  /**
   * 메모리 캐시에 데이터 저장
   */
  setInMemory(key, data, ttl = 60000) { // 기본 1분
    this.memoryCache.set(key, {
      data,
      expiry: Date.now() + ttl
    })
  }

  /**
   * localStorage에 데이터 저장
   */
  setInStorage(key, data, ttl = 300000) { // 기본 5분
    try {
      const cacheData = {
        data,
        expiry: Date.now() + ttl
      }
      localStorage.setItem(this.storagePrefix + key, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Cache storage error:', error)
    }
  }

  /**
   * 캐시에서 데이터 조회 (메모리 → localStorage 순서)
   */
  get(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params)
    
    // 1. 메모리 캐시 확인
    const memoryData = this.getFromMemory(key)
    if (memoryData) {
      return memoryData
    }
    
    // 2. localStorage 확인
    const storageData = this.getFromStorage(key)
    if (storageData) {
      // 메모리 캐시에도 저장
      this.setInMemory(key, storageData, 60000)
      return storageData
    }
    
    return null
  }

  /**
   * 캐시에 데이터 저장
   */
  set(endpoint, params = {}, data, options = {}) {
    const key = this.generateKey(endpoint, params)
    const { memoryTtl = 60000, storageTtl = 300000 } = options
    
    // 메모리와 localStorage 모두에 저장
    this.setInMemory(key, data, memoryTtl)
    this.setInStorage(key, data, storageTtl)
  }

  /**
   * 캐시 삭제
   */
  delete(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params)
    
    // 메모리 캐시 삭제
    this.memoryCache.delete(key)
    
    // localStorage 캐시 삭제
    try {
      localStorage.removeItem(this.storagePrefix + key)
    } catch (error) {
      console.warn('Cache deletion error:', error)
    }
  }

  /**
   * 패턴으로 캐시 삭제
   */
  deletePattern(pattern) {
    // 메모리 캐시에서 패턴 매칭
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key)
      }
    }
    
    // localStorage에서 패턴 매칭
    try {
      const keys = Object.keys(localStorage)
      for (const key of keys) {
        if (key.startsWith(this.storagePrefix) && key.includes(pattern)) {
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.warn('Cache pattern deletion error:', error)
    }
  }

  /**
   * 모든 캐시 삭제
   */
  clear() {
    // 메모리 캐시 삭제
    this.memoryCache.clear()
    
    // localStorage 캐시 삭제
    try {
      const keys = Object.keys(localStorage)
      for (const key of keys) {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.warn('Cache clear error:', error)
    }
  }

  /**
   * 캐시 통계
   */
  getStats() {
    const memorySize = this.memoryCache.size
    let storageSize = 0
    
    try {
      const keys = Object.keys(localStorage)
      storageSize = keys.filter(key => key.startsWith(this.storagePrefix)).length
    } catch (error) {
      console.warn('Cache stats error:', error)
    }
    
    return {
      memorySize,
      storageSize,
      totalSize: memorySize + storageSize
    }
  }
}

// 싱글톤 인스턴스
const cacheService = new CacheService()

export default cacheService
