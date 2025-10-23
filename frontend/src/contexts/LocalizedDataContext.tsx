'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { useLanguage } from './LanguageContext'

interface LocalizedDataContextType {
  getLocalizedContent: (content?: string, content_ko?: string) => string
  getLocalizedText: (field: string | { ko?: string; en?: string } | undefined, fallback?: string) => string
  getLocalizedBlogFields: (
    title?: string | { ko?: string; en?: string },
    description?: string | { ko?: string; en?: string },
    excerpt?: string | { ko?: string; en?: string }
  ) => {
    title: string
    description: string
    excerpt: string
  }
}

const LocalizedDataContext = createContext<LocalizedDataContextType | null>(null)

export const LocalizedDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage()

  const getLocalizedContent = useMemo(() => {
    return (content?: string, content_ko?: string): string => {
      return language === 'ko' 
        ? (content_ko || content || '')
        : (content || content_ko || '')
    }
  }, [language])

  const getLocalizedText = useMemo(() => {
    return (field: string | { ko?: string; en?: string } | undefined, fallback: string = ''): string => {
      if (typeof field === 'string') {
        return field
      }
      if (typeof field === 'object' && field !== null) {
        return language === 'ko' 
          ? (field.ko || field.en || fallback)
          : (field.en || field.ko || fallback)
      }
      return fallback
    }
  }, [language])

  const getLocalizedBlogFields = useMemo(() => {
    return (
      title?: string | { ko?: string; en?: string },
      description?: string | { ko?: string; en?: string },
      excerpt?: string | { ko?: string; en?: string }
    ) => {
      return {
        title: getLocalizedText(title, 'Untitled'),
        description: getLocalizedText(description, ''),
        excerpt: getLocalizedText(excerpt, '')
      }
    }
  }, [getLocalizedText])

  const value = useMemo(() => ({
    getLocalizedContent,
    getLocalizedText,
    getLocalizedBlogFields
  }), [getLocalizedContent, getLocalizedText, getLocalizedBlogFields])

  return (
    <LocalizedDataContext.Provider value={value}>
      {children}
    </LocalizedDataContext.Provider>
  )
}

export const useLocalizedData = () => {
  const context = useContext(LocalizedDataContext)
  if (!context) {
    throw new Error('useLocalizedData must be used within a LocalizedDataProvider')
  }
  return context
}
