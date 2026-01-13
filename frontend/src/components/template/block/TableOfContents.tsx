'use client'

import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, List } from 'lucide-react'

interface TOCItem {
    id: string;
    text: string;
    level: number;
}

interface TableOfContentsProps {
    contentSelector: string; // CSS selector for the container holding the content
}

export default function TableOfContents({ contentSelector }: TableOfContentsProps) {
    const [headings, setHeadings] = useState<TOCItem[]>([])
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        const updateHeadings = () => {
            const container = document.querySelector(contentSelector)
            if (!container) return

            const headingElements = container.querySelectorAll('h2, h3')
            const items: TOCItem[] = Array.from(headingElements).map((el, index) => {
                // ID가 없거나 자동 생성된 ID면 텍스트 기반으로 새로 생성하여 강제 할당 (앵커 링크 동작 보장)
                if (!el.id || el.id.startsWith('heading-')) {
                    const textContent = el.textContent || ''
                    const slug = textContent
                        .toLowerCase()
                        .trim()
                        .replace(/[^\w\s가-힣-]/g, '')
                        .replace(/\s+/g, '-') || `h-${index}`
                    el.id = slug
                }

                return {
                    id: el.id,
                    text: el.textContent || '',
                    level: parseInt(el.tagName.replace('H', ''))
                }
            })
            setHeadings(items)
        }

        // 초기 실행
        updateHeadings()

        // 컨텐츠가 늦게 로드될 수 있으므로 Observer 설정
        const container = document.querySelector(contentSelector)
        if (container) {
            const observer = new MutationObserver(updateHeadings)
            observer.observe(container, { childList: true, subtree: true })
            return () => observer.disconnect()
        }
    }, [contentSelector])

    if (headings.length === 0) return null

    return (
        <div className="my-8 inline-block w-full max-w-[400px] bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden transition-all duration-300 shadow-sm">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <List className="w-5 h-5 text-orange-500" />
                    <span className="font-bold text-sm text-gray-900 dark:text-white">목차 (Contents)</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
            </button>

            <div
                className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] border-t border-gray-200 dark:border-gray-800 opacity-100' : 'max-h-0 opacity-0'
                    } overflow-hidden`}
            >
                <nav className="p-4 px-6">
                    <ul className="space-y-2">
                        {headings.map((heading) => (
                            <li
                                key={`${heading.id}-${heading.level}`}
                                style={{ paddingLeft: `${(heading.level - 2) * 1}rem` }}
                                className="group"
                            >
                                <a
                                    href={`#${heading.id}`}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        const target = document.getElementById(heading.id)
                                        if (target) {
                                            const headerOffset = 100 // 상단 네비바 여백
                                            const elementPosition = target.getBoundingClientRect().top
                                            const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                                            window.scrollTo({
                                                top: offsetPosition,
                                                behavior: 'smooth'
                                            })
                                            window.history.pushState(null, '', `#${heading.id}`)
                                        }
                                    }}
                                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors text-sm"
                                >
                                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700 group-hover:bg-orange-500 transition-colors flex-shrink-0" />
                                    <span className="truncate">{heading.text}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </div>
    )
}
