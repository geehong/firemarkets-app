import { useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 다국어 컨텐츠를 현재 언어에 따라 선택하는 커스텀 훅
 * @param content - 영어 컨텐츠
 * @param content_ko - 한국어 컨텐츠
 * @returns 현재 언어에 맞는 컨텐츠
 */
export const useLocalizedContent = (content?: string, content_ko?: string) => {
  const { language } = useLanguage()
  
  return useMemo(() => {
    return language === 'ko' 
      ? (content_ko || content || '')
      : (content || content_ko || '')
  }, [language, content, content_ko])
}

/**
 * JSONB 형태의 다국어 필드를 현재 언어에 따라 선택하는 커스텀 훅
 * @param field - JSONB 형태의 다국어 필드 (예: {ko: "한국어", en: "English"})
 * @param fallback - 기본값
 * @returns 현재 언어에 맞는 텍스트
 */
export const useLocalizedText = (
  field: string | { ko?: string; en?: string } | undefined, 
  fallback: string = ''
) => {
  const { language } = useLanguage()
  
  return useMemo(() => {
    if (typeof field === 'string') {
      return field
    }
    if (typeof field === 'object' && field !== null) {
      return language === 'ko' 
        ? (field.ko || field.en || fallback)
        : (field.en || field.ko || fallback)
    }
    return fallback
  }, [language, field, fallback])
}

/**
 * 블로그 포스트의 제목, 설명, 요약을 현재 언어에 따라 선택하는 커스텀 훅
 * @param title - 제목 (JSONB 또는 문자열)
 * @param description - 설명 (JSONB 또는 문자열)
 * @param excerpt - 요약 (JSONB 또는 문자열)
 * @returns 현재 언어에 맞는 제목, 설명, 요약
 */
export const useLocalizedBlogFields = (
  title?: string | { ko?: string; en?: string },
  description?: string | { ko?: string; en?: string },
  excerpt?: string | { ko?: string; en?: string }
) => {
  const localizedTitle = useLocalizedText(title, 'Untitled')
  const localizedDescription = useLocalizedText(description, '')
  const localizedExcerpt = useLocalizedText(excerpt, '')
  
  return {
    title: localizedTitle,
    description: localizedDescription,
    excerpt: localizedExcerpt
  }
}
