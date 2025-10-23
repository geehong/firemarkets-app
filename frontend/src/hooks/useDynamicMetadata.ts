'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface MetadataUpdate {
  title?: string
  description?: string
  keywords?: string
  ogTitle?: string
  ogDescription?: string
  twitterTitle?: string
  twitterDescription?: string
}

export const useDynamicMetadata = (metadata: MetadataUpdate) => {
  const { language } = useLanguage()

  useEffect(() => {
    // 언어가 변경될 때마다 메타 태그 업데이트
    if (metadata.title) {
      document.title = metadata.title
    }

    // Description 메타 태그 업데이트
    if (metadata.description) {
      const descriptionMeta = document.querySelector('meta[name="description"]')
      if (descriptionMeta) {
        descriptionMeta.setAttribute('content', metadata.description)
      }
    }

    // Keywords 메타 태그 업데이트
    if (metadata.keywords) {
      const keywordsMeta = document.querySelector('meta[name="keywords"]')
      if (keywordsMeta) {
        keywordsMeta.setAttribute('content', metadata.keywords)
      }
    }

    // Open Graph 메타 태그 업데이트
    if (metadata.ogTitle) {
      const ogTitleMeta = document.querySelector('meta[property="og:title"]')
      if (ogTitleMeta) {
        ogTitleMeta.setAttribute('content', metadata.ogTitle)
      }
    }

    if (metadata.ogDescription) {
      const ogDescriptionMeta = document.querySelector('meta[property="og:description"]')
      if (ogDescriptionMeta) {
        ogDescriptionMeta.setAttribute('content', metadata.ogDescription)
      }
    }

    // Twitter 메타 태그 업데이트
    if (metadata.twitterTitle) {
      const twitterTitleMeta = document.querySelector('meta[name="twitter:title"]')
      if (twitterTitleMeta) {
        twitterTitleMeta.setAttribute('content', metadata.twitterTitle)
      }
    }

    if (metadata.twitterDescription) {
      const twitterDescriptionMeta = document.querySelector('meta[name="twitter:description"]')
      if (twitterDescriptionMeta) {
        twitterDescriptionMeta.setAttribute('content', metadata.twitterDescription)
      }
    }

    console.log('🔄 [useDynamicMetadata] Updated metadata for language:', language, metadata)

  }, [language, metadata])
}
