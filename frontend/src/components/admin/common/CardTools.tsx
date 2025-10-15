'use client'

import React, { useState, useRef } from 'react'

interface CardToolsProps {
  onCollapse?: (collapsed: boolean) => void
  onRemove?: () => void
  onAction?: (action: string) => void
  showCollapse?: boolean
  showRemove?: boolean
  showDropdown?: boolean
  dropdownItems?: Array<{
    label: string
    action: string
    icon?: React.ReactNode
    disabled?: boolean
  }>
  className?: string
  showRefresh?: boolean
  showExport?: boolean
}

const CardTools: React.FC<CardToolsProps> = ({
  onCollapse,
  onRemove,
  onAction,
  showCollapse = true,
  showRemove = true,
  showDropdown = true,
  dropdownItems = [],
  className = '',
  showRefresh = true,
  showExport = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const cardToolsRef = useRef<HTMLDivElement>(null)

  const handleCollapse = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)

    // 현재 CardTools 컴포넌트의 가장 가까운 부모 카드 요소를 찾아서 collapsed 클래스 추가/제거
    const cardElement = cardToolsRef.current?.closest('.bg-white')
    if (cardElement) {
      if (newCollapsedState) {
        cardElement.classList.add('opacity-50')
      } else {
        cardElement.classList.remove('opacity-50')
      }
    }

    if (onCollapse) {
      onCollapse(newCollapsedState)
    }
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove()
    }
  }

  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action)
    }
    setIsDropdownOpen(false)
  }

  const defaultDropdownItems = [
    ...dropdownItems,
    { label: 'Refresh', action: 'refresh', icon: '🔄' },
    { label: 'Settings', action: 'settings', icon: '⚙️' },
  ]

  if (showExport) {
    defaultDropdownItems.push({ label: 'Export', action: 'export', icon: '📥' })
  }

  return (
    <div ref={cardToolsRef} className={`flex items-center space-x-1 ${className}`}>
      {showCollapse && (
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          onClick={handleCollapse}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '▲' : '▼'}
        </button>
      )}

      {showRefresh && (
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => handleAction('refresh')}
          title="Refresh"
        >
          🔄
        </button>
      )}

      {showDropdown && (
        <div className="relative">
          <button
            type="button"
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title="More options"
          >
            ⚙️
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <div className="py-1">
                {defaultDropdownItems.map((item, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleAction(item.action)}
                    disabled={item.disabled}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showRemove && (
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          onClick={handleRemove}
          title="Remove"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export default CardTools
