'use client'

import React from 'react'
import TableOfContents from '../template/block/TableOfContents'

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
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </div>
        </>
    )
}

export default PostContent
