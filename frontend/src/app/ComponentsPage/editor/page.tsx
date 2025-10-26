"use client";

import React, { useState } from "react";
import ComponentCard from '@/components/common/ComponentCard'
import Button from '@/components/ui/button/Button'
import { 
  ArrowRightIcon,
  PlusIcon,
  PencilIcon,
  FileIcon,
  SaveIcon,
  DownloadIcon
} from '@/icons'

// 에디터 기능들
const editorFeatures = [
  {
    id: 'rich-text',
    name: 'Rich Text Editor',
    description: 'WYSIWYG 리치 텍스트 에디터',
    icon: '📝',
    path: '/ComponentsPage/editor/rich-text'
  },
  {
    id: 'markdown',
    name: 'Markdown Editor',
    description: '마크다운 문법 지원 에디터',
    icon: '📄',
    path: '/ComponentsPage/editor/markdown'
  },
  {
    id: 'code',
    name: 'Code Editor',
    description: '코드 하이라이팅 지원 에디터',
    icon: '💻',
    path: '/ComponentsPage/editor/code'
  },
  {
    id: 'collaborative',
    name: 'Collaborative Editor',
    description: '실시간 협업 에디터',
    icon: '👥',
    path: '/ComponentsPage/editor/collaborative'
  }
]

// 최근 문서들
const recentDocuments = [
  {
    id: 1,
    title: '프로젝트 기획서',
    type: 'Rich Text',
    lastModified: '2024-01-15',
    size: '2.3 MB',
    status: 'draft'
  },
  {
    id: 2,
    title: 'API 문서',
    type: 'Markdown',
    lastModified: '2024-01-14',
    size: '1.1 MB',
    status: 'published'
  },
  {
    id: 3,
    title: 'React 컴포넌트 가이드',
    type: 'Code',
    lastModified: '2024-01-13',
    size: '856 KB',
    status: 'draft'
  }
]

export default function EditorPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')

  return (
    <div className="p-4 mx-auto max-w-7xl md:p-6">
      {/* 헤더 섹션 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Editor Components
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              다양한 에디터 컴포넌트와 텍스트 편집 도구들
            </p>
          </div>
          <Button className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            새 문서 작성
          </Button>
        </div>

        {/* 검색 및 필터 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="문서 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="all">전체 타입</option>
              <option value="rich-text">Rich Text</option>
              <option value="markdown">Markdown</option>
              <option value="code">Code</option>
              <option value="collaborative">Collaborative</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 에디터 기능들 */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            에디터 타입
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editorFeatures.map((feature) => (
              <ComponentCard key={feature.id} title={feature.name}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{feature.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {feature.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  에디터 열기
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </ComponentCard>
            ))}
          </div>
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 최근 문서 */}
          <ComponentCard title="최근 문서">
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileIcon className="h-4 w-4 text-gray-500" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {doc.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {doc.type} • {doc.lastModified}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      doc.status === 'published' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {doc.status === 'published' ? '발행됨' : '초안'}
                    </span>
                    <Button size="sm" variant="outline">
                      열기
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ComponentCard>

          {/* 빠른 작업 */}
          <ComponentCard title="빠른 작업">
            <div className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <PencilIcon className="mr-2 h-4 w-4" />
                새 문서 작성
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileIcon className="mr-2 h-4 w-4" />
                파일 가져오기
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <DownloadIcon className="mr-2 h-4 w-4" />
                템플릿 다운로드
              </Button>
            </div>
          </ComponentCard>

          {/* 통계 */}
          <ComponentCard title="문서 통계">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">24</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">총 문서</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">18</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">발행됨</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">6</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">초안</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">1.2MB</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">총 크기</div>
              </div>
            </div>
          </ComponentCard>
        </div>
      </div>
    </div>
  )
}
