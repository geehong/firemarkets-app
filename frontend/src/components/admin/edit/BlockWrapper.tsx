'use client'

import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Plus, Minus } from 'lucide-react'

interface BlockWrapperProps {
    title: React.ReactNode
    children: React.ReactNode
    onMoveUp?: () => void
    onMoveDown?: () => void
    isFirst?: boolean
    isLast?: boolean
    defaultCollapsed?: boolean
}

export default function BlockWrapper({
    title,
    children,
    onMoveUp,
    onMoveDown,
    isFirst = false,
    isLast = false,
    defaultCollapsed = false
}: BlockWrapperProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4 transition-all duration-200">
            {/* Header Bar */}
            <div className="border-b px-4 py-3 bg-gray-50 flex justify-between items-center select-none">
                <div className="font-semibold text-gray-900 flex-1 flex items-center gap-2">
                    {title}
                </div>

                <div className="flex items-center gap-1 ml-2">
                    {/* Move Up */}
                    {onMoveUp && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                            disabled={isFirst}
                            className={`p-1 rounded hover:bg-gray-200 focus:outline-none transition-colors ${isFirst ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600'
                                }`}
                            title="Move Up"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    )}

                    {/* Move Down */}
                    {onMoveDown && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                            disabled={isLast}
                            className={`p-1 rounded hover:bg-gray-200 focus:outline-none transition-colors ${isLast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600'
                                }`}
                            title="Move Down"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    )}

                    <div className="w-px h-4 bg-gray-300 mx-1"></div>

                    {/* Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 rounded text-gray-500 hover:bg-gray-200 hover:text-blue-600 focus:outline-none transition-colors"
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        {isCollapsed ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Content */}
            {!isCollapsed && (
                <div>
                    {children}
                </div>
            )}
        </div>
    )
}
