"use client"

import { useEffect } from 'react'

/**
 * 메타 태그를 동적으로 설정하는 커스텀 훅
 * @param {Object} metaTags - 설정할 메타 태그들
 * @param {string} metaTags.title - 페이지 제목
 * @param {string} metaTags.description - 페이지 설명
 * @param {string} metaTags.keywords - 키워드
 * @param {string} metaTags.ogTitle - Open Graph 제목
 * @param {string} metaTags.ogDescription - Open Graph 설명
 * @param {string} metaTags.ogImage - Open Graph 이미지
 */
const useMetaTags = (metaTags = {}) => {
  useEffect(() => {
    const updateMetaTag = (name, content, property = false) => {
      if (!content) return
      
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`
      let meta = document.querySelector(selector)
      
      if (!meta) {
        meta = document.createElement('meta')
        if (property) {
          meta.setAttribute('property', name)
        } else {
          meta.setAttribute('name', name)
        }
        document.head.appendChild(meta)
      }
      
      meta.setAttribute('content', content)
    }

    // 기본 메타 태그들
    if (metaTags.title) {
      document.title = metaTags.title
    }
    
    if (metaTags.description) {
      updateMetaTag('description', metaTags.description)
    }
    
    if (metaTags.keywords) {
      updateMetaTag('keywords', metaTags.keywords)
    }

    // Open Graph 태그들
    if (metaTags.ogTitle) {
      updateMetaTag('og:title', metaTags.ogTitle, true)
    }
    
    if (metaTags.ogDescription) {
      updateMetaTag('og:description', metaTags.ogDescription, true)
    }
    
    if (metaTags.ogImage) {
      updateMetaTag('og:image', metaTags.ogImage, true)
    }

    // Twitter Card 태그들
    if (metaTags.ogTitle) {
      updateMetaTag('twitter:title', metaTags.ogTitle)
    }
    
    if (metaTags.ogDescription) {
      updateMetaTag('twitter:description', metaTags.ogDescription)
    }
    
    if (metaTags.ogImage) {
      updateMetaTag('twitter:image', metaTags.ogImage)
    }

  }, [metaTags])
}

export default useMetaTags
