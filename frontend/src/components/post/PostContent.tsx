'use client'

import React from 'react'
import TableOfContents from '../template/block/TableOfContents'
import { parseShortcodes } from '@/utils/shortcodeParser'
import ShortcodeRenderer from './ShortcodeRenderer'

import AdUnit from '@/components/ads/AdUnit'

interface PostContentProps {
    content: string
}

const PostContent: React.FC<PostContentProps> = ({ content }) => {
    // Helper to inject ad into HTML content
    const renderHtmlWithAds = (htmlContent: string, partIndex: number) => {
        // Only try to inject ad in the first HTML part, or if it's long enough
        // Simple logic: split by </p> to count paragraphs
        const paragraphs = htmlContent.split('</p>');
        
        // If we have enough paragraphs (e.g. at least 4), inject ad after the 2nd one
        if (paragraphs.length >= 4 && partIndex === 0) {
            const firstBlock = paragraphs.slice(0, 2).join('</p>') + '</p>';
            const secondBlock = paragraphs.slice(2).join('</p>');

            return (
                <div key={`html-${partIndex}`} className="html-part-wrapper">
                    <div
                        dangerouslySetInnerHTML={{ __html: firstBlock }}
                        className="html-part"
                        suppressHydrationWarning
                    />
                    
                    {/* In-article Ad Unit */}
                    <div className="my-8 flex justify-center no-prose">
                        <AdUnit 
                            slot="8825574595" 
                            format="fluid" 
                            layout="in-article"
                            style={{ display: 'block', textAlign: 'center', width: '100%' }}
                            label="Advertisement"
                        />
                    </div>

                    <div
                        dangerouslySetInnerHTML={{ __html: secondBlock }}
                        className="html-part"
                        suppressHydrationWarning
                    />
                </div>
            );
        }

        return (
            <div
                key={`html-${partIndex}`}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                className="html-part"
                suppressHydrationWarning
            />
        );
    };

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
                        
                        // Handle HTML parts with potential ad injection
                        return renderHtmlWithAds(part.content || '', index);
                    })}
                </article>
            </div>
        </>
    )
}

export default PostContent
