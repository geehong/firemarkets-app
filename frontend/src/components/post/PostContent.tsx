'use client'

import React from 'react'

interface PostContentProps {
    content: string
}

const PostContent: React.FC<PostContentProps> = ({ content }) => {
    return (
        <article
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
        />
    )
}

export default PostContent
