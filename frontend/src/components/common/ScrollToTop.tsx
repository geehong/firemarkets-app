'use client'

import React, { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const toggleVisibility = () => {
            // 1. 전체 페이지 높이가 브라우저 본인 높이보다 클 때만 (스크롤이 필요할 때)
            // 2. 현재 스크롤 위치가 300px 이상일 때 표시
            const isPageScrollable = document.documentElement.scrollHeight > window.innerHeight

            if (isPageScrollable && window.pageYOffset > 300) {
                setIsVisible(true)
            } else {
                setIsVisible(false)
            }
        }

        window.addEventListener('scroll', toggleVisibility)
        // 화면 크기가 변할 때도 체크
        window.addEventListener('resize', toggleVisibility)

        // 초기 로드 시에도 체크
        toggleVisibility()

        return () => {
            window.removeEventListener('scroll', toggleVisibility)
            window.removeEventListener('resize', toggleVisibility)
        }
    }, [])

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        })
    }

    return (
        <button
            onClick={scrollToTop}
            className={`
                fixed bottom-8 right-8 z-50 p-3 rounded-full shadow-lg
                bg-white dark:bg-gray-800 text-gray-800 dark:text-white
                border border-gray-200 dark:border-gray-700
                hover:bg-orange-500 hover:text-white dark:hover:bg-orange-600
                transition-all duration-300 transform
                ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-75 pointer-events-none'}
            `}
            aria-label="Scroll to top"
        >
            <ChevronUp className="w-6 h-6" />
        </button>
    )
}
