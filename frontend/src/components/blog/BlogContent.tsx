'use client'

import React from 'react'
import { useLocalizedContent } from '@/hooks/useLocalizedContent'

interface BlogContentProps {
  content?: string
  content_ko?: string
}

const BlogContent: React.FC<BlogContentProps> = ({ content, content_ko }) => {
  const displayContent = useLocalizedContent(content, content_ko)
  
  return (
    <article 
      className="prose dark:prose-invert max-w-none" 
      dangerouslySetInnerHTML={{ __html: displayContent }} 
    />
  )
}

export default BlogContent
