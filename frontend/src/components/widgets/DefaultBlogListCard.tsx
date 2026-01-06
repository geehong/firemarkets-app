'use client'

import React from 'react'
import Link from 'next/link'
import { getFallbackImage } from '@/utils/fallbackImage'

interface DefaultBlogListCardProps {
    id: number
    title: string
    summary: string
    author: string
    date: string
    image?: string
    category: string
    href: string
}

/**
 * Original Blog List Card design preserved as a widget.
 * Features a traditional list-style layout with metadata below the title.
 */
export const DefaultBlogListCard: React.FC<DefaultBlogListCardProps> = ({
    id,
    title,
    summary,
    author,
    date,
    image,
    category,
    href
}) => {
    const hasImage = image && image.trim() !== '';
    // Construct a compatible object for getFallbackImage
    const imageUrl = hasImage ? image!.trim() : getFallbackImage({
        id,
        title,
        category: { name: category }
    });

    return (
        <article id={`post-${id}`} className="blog-entry flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-gray-700 h-full">
            <div className="blog-entry-inner flex flex-col h-full">
                {/* Thumbnail */}
                <div className="thumbnail relative aspect-[16/10] overflow-hidden group">
                    <Link href={href} className="thumbnail-link block w-full h-full">
                        <img
                            src={imageUrl!}
                            alt={title}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                        />
                        <span className="overlay absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    </Link>
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg dark:text-white text-slate-900">
                            {category}
                        </span>
                    </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                    <header className="blog-entry-header mb-4">
                        <h2 className="blog-entry-title text-xl font-bold leading-tight mb-2">
                            <Link href={href} className="text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {title}
                            </Link>
                        </h2>
                    </header>

                    <ul className="meta text-xs text-slate-500 dark:text-gray-400 flex flex-wrap gap-4 mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <li className="meta-author flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{author}</span>
                        </li>
                        <li className="meta-date flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{date}</span>
                        </li>
                    </ul>

                    {summary && (
                        <div className="blog-entry-summary mb-6 text-slate-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-3">
                            <p>{summary}</p>
                        </div>
                    )}

                    <div className="blog-entry-readmore mt-auto">
                        <Link href={href} className="inline-flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group">
                            Continue Reading
                            <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </article>
    )
}
