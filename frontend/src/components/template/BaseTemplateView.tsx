'use client'

import React, { useState } from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import Badge from '@/components/ui/badge/Badge'
import Link from 'next/link'

export interface BaseTemplateViewProps {
    /**
     * SEO and Metadata configuration
     * Note: Actual <meta> tags for title/description should be handled in page.tsx generateMetadata.
     * This prop is for semantic details within the view (e.g. H1).
     */
    seo: {
        title: string; // Used for H1
        description?: string; // Optional: displayed as lead text
        keywords?: string[];
    };
    /**
     * Header configuration
     */
    header?: {
        title: React.ReactNode | string; // Can be complex node or string
        category?: {
            name: string;
            url?: string;
        }; // Optional category badge/link
        status?: {
            label: string;
            color?: 'success' | 'warning' | 'error' | 'info' | 'primary';
        };
        publishedAt?: string;
        updatedAt?: string;
        author?: {
            name: string;
            avatar?: string;
        };
        breadcrumbs?: {
            label: string;
            href: string;
        }[];
        coverImage?: string;
        actions?: React.ReactNode; // Extra buttons (e.g. Edit)
        headerClassName?: string; // Optional class for the header container
    };
    /**
     * Tabbed content configuration
     */
    tabs: {
        id: string;
        label: string;
        content: React.ReactNode;
    }[];
    /**
     * Current locale
     */
    locale: string;
    /**
     * Optional sidebar content
     */
    sidebar?: React.ReactNode;
}

const BaseTemplateView: React.FC<BaseTemplateViewProps> = ({
    seo,
    header,
    tabs,
    locale,
    sidebar
}) => {
    // Default to first tab
    const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id || '')



    return (
        <div className="space-y-6">
            <div className={`w-full ${sidebar ? 'lg:flex lg:gap-8' : ''}`}>
                <div className={`min-w-0 ${sidebar ? 'flex-1 space-y-6' : 'space-y-6'}`}>
                    {/* 1. Semantic Header Section */}
                    {header && (
                        <header className="space-y-4">
                            {/* Breadcrumbs (Optional) */}
                            {header.breadcrumbs && header.breadcrumbs.length > 0 && (
                                <nav className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                    <ol className="list-none p-0 inline-flex">
                                        {header.breadcrumbs.map((crumb, index) => (
                                            <li key={index} className="flex items-center">
                                                {index > 0 && <span className="mx-2">/</span>}
                                                <Link href={crumb.href} className="hover:text-blue-600">
                                                    {crumb.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ol>
                                </nav>
                            )}

                            <div className={`overflow-hidden rounded-3xl border ${header.headerClassName ? 'border-transparent' : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]'} ${header.headerClassName || 'p-6'}`}>
                                <div className={`flex flex-col gap-6 ${header.headerClassName ? 'p-6 md:p-8' : ''}`}>
                                    {/* Cover Image - prevent displaying icons as cover images */}
                                    {header.coverImage && !header.coverImage.includes('/icons/') && (
                                        <div className="w-full aspect-[16/10] overflow-hidden rounded-lg relative">
                                            <img
                                                src={header.coverImage}
                                                alt={seo.title} // SEO: Use title as alt text
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-4 relative z-10">
                                        {/* Meta Row: Category | Status | Date */}
                                        <div className={`flex flex-wrap items-center gap-3 text-sm ${header.headerClassName ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {header.category && (
                                                <span className={`font-semibold px-2 py-1 rounded ${header.headerClassName ? 'text-blue-400 bg-white/10' : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'}`}>
                                                    {header.category.name}
                                                </span>
                                            )}

                                            {header.publishedAt && (
                                                <>
                                                    <span>•</span>
                                                    <time dateTime={header.publishedAt}>
                                                        {new Date(header.publishedAt).toLocaleDateString(locale, {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </time>
                                                </>
                                            )}

                                            {header.status && (
                                                <>
                                                    <span>•</span>
                                                    <Badge color={header.status.color || 'info'}>
                                                        {header.status.label}
                                                    </Badge>
                                                </>
                                            )}
                                        </div>

                                        {/* H1 Title */}
                                        <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                                            <h1 className={`w-full flex-1 text-2xl md:text-3xl font-black leading-tight ${header.headerClassName ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                {header.title}
                                            </h1>
                                            {header.actions && (
                                                <div className="w-full md:w-auto flex-shrink-0">
                                                    {header.actions}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </header>
                    )}

                    {/* 2. Tab Navigation */}
                    {tabs.length > 0 && (
                        <div>
                            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`
                                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                                                ${activeTab === tab.id
                                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                                            `}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* 3. Tab Content */}
                            <main className="animate-fadeIn min-h-[400px]">
                                {tabs.map(tab => (
                                    <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
                                        {tab.content}
                                    </div>
                                ))}
                            </main>
                        </div>
                    )}
                </div>

                {/* Sidebar Column */}
                {sidebar && (
                    <div className="hidden lg:block w-[300px] min-w-[300px]">
                        <div className="sticky top-24">
                            {sidebar}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default BaseTemplateView
