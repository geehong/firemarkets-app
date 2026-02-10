'use client'

import React from 'react'
import TableOfContents from '../template/block/TableOfContents'
import { parseShortcodes } from '@/utils/shortcodeParser'
import ShortcodeRenderer from './ShortcodeRenderer'

interface PostContentProps {
    content: string
}

const PostContent: React.FC<PostContentProps> = ({ content }) => {
    return (
        <>
            <style jsx global>{`
                .prose strong, .prose em, .prose b, .prose i {
                    color: inherit !important;
                }
            `}</style>
            <div className="flex flex-col">
                <TableOfContents contentSelector="#post-article-content" />
                <article
                    id="post-article-content"
                    className="prose dark:prose-invert max-w-none"
                >
                    {parseShortcodes(content).map((part, index) => {
                        if (part.type === 'shortcode' && part.shortcode) {
                            return <ShortcodeRenderer key={index} shortcode={part.shortcode} />
                        }
                        return (
                            <div
                                key={index}
                                dangerouslySetInnerHTML={{ __html: part.content || '' }}
                                className="html-part"
                                suppressHydrationWarning
                            />
                        )
                    })}
                </article>
            </div>
        </>
    )
}

export default PostContent
