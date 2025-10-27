'use client'

import React, { createContext, useContext, useMemo, useRef } from 'react'
import { useLanguage } from './LanguageContext'

interface AutoLocalizationContextType {
  localizeData: <T extends Record<string, any>>(data: T) => T
  localizeArray: <T extends Record<string, any>[]>(array: T) => T
}

const AutoLocalizationContext = createContext<AutoLocalizationContextType | null>(null)

export const AutoLocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage()
  
  // 언어 변경 로그를 한 번만 출력하도록 수정
  const prevLanguage = useRef<string>()
  if (prevLanguage.current !== language) {
    console.log('🔄 [AutoLocalization] Language changed to:', language)
    prevLanguage.current = language
  }

  const localizeData = useMemo(() => {
    return <T extends Record<string, any>>(data: T): T => {
      if (!data) return data

      console.log('🌐 [AutoLocalization] Processing data for language:', language, data)

      const localizedData = { ...data }

      // Handle content fields
      if (data.content !== undefined || data.content_ko !== undefined) {
        const originalContent = data.content
        const originalContentKo = data.content_ko
        localizedData.content = language === 'ko' 
          ? (data.content_ko || data.content || '')
          : (data.content || data.content_ko || '')
        
        console.log('📝 [AutoLocalization] Content localization:', {
          language,
          originalContent: originalContent?.substring(0, 50) + '...',
          originalContentKo: originalContentKo?.substring(0, 50) + '...',
          selectedContent: localizedData.content?.substring(0, 50) + '...'
        })
      }

      // Handle JSONB fields (title, description, excerpt, etc.)
      const jsonbFields = ['title', 'description', 'excerpt', 'meta_title', 'meta_description']
      
      jsonbFields.forEach(field => {
        if (data[field]) {
          // JSONB 객체인 경우
          if (typeof data[field] === 'object' && !Array.isArray(data[field])) {
            const fieldData = data[field] as { ko?: string; en?: string }
            const originalValue = fieldData
            localizedData[field] = language === 'ko' 
              ? (fieldData.ko || fieldData.en || '')
              : (fieldData.en || fieldData.ko || '')
            
            console.log(`🏷️ [AutoLocalization] ${field} localization (JSONB):`, {
              language,
              originalValue,
              selectedValue: localizedData[field]
            })
          }
          // 문자열인 경우도 처리 (이미 변환된 경우)
          else if (typeof data[field] === 'string') {
            console.log(`🏷️ [AutoLocalization] ${field} is already string:`, data[field])
            // 이미 문자열이면 그대로 사용
            localizedData[field] = data[field]
          }
        }
      })

      console.log('✅ [AutoLocalization] Final localized data:', {
        language,
        title: localizedData.title,
        content: localizedData.content?.substring(0, 50) + '...'
      })

      return localizedData
    }
  }, [language])

  const localizeArray = useMemo(() => {
    return <T extends Record<string, any>[]>(array: T): T => {
      if (!Array.isArray(array)) return array
      console.log('📋 [AutoLocalization] Processing array with', array.length, 'items for language:', language)
      const localizedArray = array.map(item => localizeData(item)) as T
      console.log('📋 [AutoLocalization] Array localization complete:', {
        language,
        originalCount: array.length,
        localizedCount: localizedArray.length,
        firstItem: localizedArray[0] ? {
          id: localizedArray[0].id,
          title: localizedArray[0].title,
          content: localizedArray[0].content?.substring(0, 30) + '...'
        } : null
      })
      return localizedArray
    }
  }, [localizeData, language])

  // 언어 변경 시 강제로 리렌더링을 트리거하기 위한 상태
  const [, forceUpdate] = React.useState({})
  
  React.useEffect(() => {
    console.log('🔄 [AutoLocalization] Language changed, forcing update')
    forceUpdate({})
  }, [language])

  const value = useMemo(() => ({
    localizeData,
    localizeArray
  }), [localizeData, localizeArray])

  return (
    <AutoLocalizationContext.Provider value={value}>
      {children}
    </AutoLocalizationContext.Provider>
  )
}

export const useAutoLocalization = () => {
  const context = useContext(AutoLocalizationContext)
  if (!context) {
    throw new Error('useAutoLocalization must be used within an AutoLocalizationProvider')
  }
  return context
}
