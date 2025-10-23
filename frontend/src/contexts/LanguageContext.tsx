'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface LanguageContextType {
  language: 'ko' | 'en'
  setLanguage: (lang: 'ko' | 'en') => void
  t: (key: string, fallback?: string) => string
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')
  const [translations, setTranslations] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)

  // 초기 로드 시 localStorage에서 언어 설정
  useEffect(() => {
    const storedLang = localStorage.getItem('language') as 'ko' | 'en'
    if (storedLang && (storedLang === 'ko' || storedLang === 'en')) {
      console.log('[LanguageContext] Loading stored language:', storedLang)
      setLanguage(storedLang)
    }
  }, [])

  // 언어 변경 시 메뉴 번역 로드
  useEffect(() => {
    localStorage.setItem('language', language)
    loadMenuTranslations(language)
  }, [language])

  const loadMenuTranslations = async (lang: string) => {
    setIsLoading(true)
    try {
      const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'
      const response = await fetch(`${BACKEND_BASE}/navigation/menu?lang=${lang}`)
      const menus = await response.json()
      
      // 메뉴 데이터를 번역 객체로 변환
      const menuTranslations: Record<string, string> = {}
      
      const processMenu = (menu: any) => {
        menuTranslations[`menu.${menu.id}`] = menu.name
        if (menu.children) {
          menu.children.forEach(processMenu)
        }
      }
      
      menus.forEach(processMenu)
      
      // 기본 UI 번역 추가
      const uiTranslations: Record<string, string> = {
        'assetOverview.title': lang === 'ko' ? '자산 개요' : 'Asset Overview',
        'assetOverview.price': lang === 'ko' ? '현재 가격' : 'Current Price',
        'assetOverview.company': lang === 'ko' ? '회사' : 'Company',
        'assetOverview.sector': lang === 'ko' ? '섹터' : 'Sector',
        'assetOverview.industry': lang === 'ko' ? '산업' : 'Industry',
        'assetOverview.country': lang === 'ko' ? '국가' : 'Country',
        'assetOverview.ceo': lang === 'ko' ? 'CEO' : 'CEO',
        'assetOverview.employees': lang === 'ko' ? '직원 수' : 'Employees',
        'assetOverview.ipoDate': lang === 'ko' ? '상장일' : 'IPO Date',
        'assetOverview.website': lang === 'ko' ? '웹사이트' : 'Website',
        'assetOverview.address': lang === 'ko' ? '주소' : 'Address',
        'assetOverview.phone': lang === 'ko' ? '전화번호' : 'Phone',
        'assetOverview.state': lang === 'ko' ? '주/도' : 'State',
        'assetOverview.zipCode': lang === 'ko' ? '우편번호' : 'ZIP Code',
        'assetOverview.active': lang === 'ko' ? '활성' : 'Active',
        'assetOverview.inactive': lang === 'ko' ? '비활성' : 'Inactive',
        'assetOverview.live': lang === 'ko' ? '실시간' : 'Live',
        'assetOverview.type': lang === 'ko' ? '타입' : 'Type',
        'assetOverview.english': lang === 'ko' ? '영어' : 'English',
        'assetOverview.korean': lang === 'ko' ? '한국어' : 'Korean',
        'assetOverview.slug': lang === 'ko' ? '슬러그' : 'Slug',
        'postOverview.content': lang === 'ko' ? '콘텐츠 미리보기' : 'Content Preview',
        'postOverview.description': lang === 'ko' ? '설명' : 'Description',
        'postOverview.excerpt': lang === 'ko' ? '요약' : 'Excerpt',
        'postOverview.seo': lang === 'ko' ? 'SEO 정보' : 'SEO Information',
        'postOverview.metaTitle': lang === 'ko' ? '메타 타이틀' : 'Meta Title',
        'postOverview.metaDescription': lang === 'ko' ? '메타 설명' : 'Meta Description',
        'postOverview.keywords': lang === 'ko' ? '키워드' : 'Keywords',
        'postOverview.canonicalUrl': lang === 'ko' ? '정규 URL' : 'Canonical URL',
        'postOverview.postInfo': lang === 'ko' ? '포스트 정보' : 'Post Information',
        'postOverview.timestamps': lang === 'ko' ? '타임스탬프' : 'Timestamps',
        'postOverview.created': lang === 'ko' ? '생성일' : 'Created',
        'postOverview.updated': lang === 'ko' ? '수정일' : 'Updated',
        'postOverview.published': lang === 'ko' ? '발행일' : 'Published',
        'postOverview.postDetails': lang === 'ko' ? '포스트 상세' : 'Post Details',
        'postOverview.id': lang === 'ko' ? 'ID' : 'ID',
        'postOverview.status': lang === 'ko' ? '상태' : 'Status',
        'postOverview.published': lang === 'ko' ? '발행됨' : 'Published',
        'postOverview.draft': lang === 'ko' ? '초안' : 'Draft',
        'postOverview.scheduled': lang === 'ko' ? '예약됨' : 'Scheduled',
        'postOverview.private': lang === 'ko' ? '비공개' : 'Private',
        'postOverview.showMore': lang === 'ko' ? '더보기' : 'Show More',
        'postOverview.showLess': lang === 'ko' ? '접기' : 'Show Less',
        'postOverview.characters': lang === 'ko' ? '문자' : 'characters',
        'postOverview.charactersTotal': lang === 'ko' ? '문자 총' : 'characters total',
        'postOverview.contentTruncated': lang === 'ko' ? '콘텐츠 잘림' : 'Content truncated',
        'postOverview.noContentAvailable': lang === 'ko' ? '콘텐츠 없음' : 'No Content Available',
        'postOverview.noContentMessage': lang === 'ko' ? '이 자산에 대한 포스트 콘텐츠가 없습니다.' : 'No post content available for this asset.',
        'postOverview.underConstruction': lang === 'ko' ? '현재 페이지는 공사 중입니다.' : 'This page is currently under construction.',
        'postOverview.underConstructionMessage': lang === 'ko' ? '이 자산에 대한 최신 정보를 제공하기 위해 열심히 작업하고 있습니다.' : 'We\'re working hard to bring you the latest information about this asset.',
        'postOverview.comingSoon': lang === 'ko' ? '곧 출시' : 'Coming Soon'
      }
      
      setTranslations({ ...menuTranslations, ...uiTranslations })
    } catch (error) {
      console.error('Failed to load translations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const t = (key: string, fallback?: string): string => {
    return translations[key] || fallback || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  )
}
