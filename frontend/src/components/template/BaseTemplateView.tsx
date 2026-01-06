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
    header: {
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
}

const BaseTemplateView: React.FC<BaseTemplateViewProps> = ({
    seo,
    header,
    tabs,
    locale
}) => {
    // Default to first tab
    const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id || '')

    return (
        <div className="space-y-6">
            {/* 1. Semantic Header Section */}
            <header className="space-y-4">
                {/* Breadcrumbs (Optional) */}
                {header.breadcrumbs && (
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

                <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
                    <div className="flex flex-col gap-6">
                        {/* Cover Image */}
                        {header.coverImage && (
                            <div className="w-full h-48 md:h-64 lg:h-80 overflow-hidden rounded-lg relative">
                                <img
                                    src={header.coverImage}
                                    alt={seo.title} // SEO: Use title as alt text
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Meta Row: Category | Status | Date */}
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                {header.category && (
                                    <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
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
                            <div className="flex justify-between items-start gap-4">
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                                    {header.title}
                                </h1>
                                {header.actions && (
                                    <div className="flex-shrink-0">
                                        {header.actions}
                                    </div>
                                )}
                            </div>

                            {/* Author Row */}
                            {header.author && (
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        By <span className="font-medium text-gray-900 dark:text-white">{header.author.name}</span>
                                    </span>
                                </div>
                            )}

                            {/* Lead Description (Optional SEO content visible on page) */}
                            {seo.description && (
                                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mt-2">
                                    {seo.description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </header>

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
    )
}

export default BaseTemplateView
