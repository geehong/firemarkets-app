'use client'

import React from 'react'

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
            <article
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
            />
        </>
    )
}

export default PostContent
