
import { apiClient } from '@/lib/api'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

interface PageProps {
    params: Promise<{
        slug: string
        locale: string
    }>
}

// 메타데이터 생성 (SEO)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    try {
        const resolvedParams = await params;
        const post = await apiClient.getPost(resolvedParams.slug)

        if (!post || post.post_type !== 'page') {
            return {
                title: 'Page Not Found',
            }
        }

        // 다국어 제목/설명 처리
        const locale = resolvedParams.locale || 'ko'
        let title = typeof post.title === 'string' ? post.title : (post.title?.[locale] || post.title?.ko || post.title?.en || 'Untitled')
        let description = typeof post.description === 'string' ? post.description : (post.description?.[locale] || post.description?.ko || post.description?.en || '')

        return {
            title: title,
            description: description,
        }
    } catch (error) {
        return {
            title: 'Error',
        }
    }
}

export default async function DynamicPage({ params }: PageProps) {
    const resolvedParams = await params;
    let post;

    try {
        post = await apiClient.getPost(resolvedParams.slug)
    } catch (error) {
        console.error(`Failed to fetch page: ${resolvedParams.slug}`, error)
        notFound()
    }

    if (!post || post.post_type !== 'page') {
        notFound()
    }

    // 다국어 콘텐츠 처리
    const locale = resolvedParams.locale === 'en' ? 'en' : 'ko'
    // DB 스키마에 따라 content_ko, content 등으로 나뉠 수 있음
    // Post 모델을 보면 content(영문), content_ko(한글) 컬럼이 있음
    // 그러나 API 응답은 다를 수 있으므로 확인 필요.
    // 여기서는 content_ko가 존재하면 우선 사용.

    let content = post.content
    if (locale === 'ko' && post.content_ko) {
        content = post.content_ko
    }

    // 제목/설명 다국어 처리
    const title = typeof post.title === 'string' ? post.title : (post.title?.[locale] || post.title?.en || '')

    return (
        <article className="w-full px-4 py-12 max-w-4xl">
            <header className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                    {title}
                </h1>
                {post.updated_at && (
                    <time className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(post.updated_at).toLocaleDateString()}
                    </time>
                )}
            </header>

            {/* 
        주의: content가 HTML이 아닌 소스 코드라면 그대로 출력됨.
        HTML이라면 dangerouslySetInnerHTML 사용.
        여기서는 소스 코드일 가능성이 높으므로 pre 태그로 감싸서 예외적으로 보여줌.
        일반적인 CMS 페이지라면 HTML 렌더링이 맞음.
      */}
            <div className="prose dark:prose-invert max-w-none">
                {/* 
            만약 content가 HTML 태그를 포함하고 있다면:
            <div dangerouslySetInnerHTML={{ __html: content }} /> 
            
            사용자가 "소스 코드"를 넣었으므로, 이를 보여주기 위해 pre로 렌더링 시도.
            하지만 일반적인 페이지라면 HTML이어야 함. 
            일단 간단한 휴리스틱으로 태그가 포함되어 있으면 HTML로, 아니면 텍스트로?
            안전을 위해 줄바꿈 처리만 하여 텍스트로 렌더링.
          */}
                <div className="whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
                    {content}
                </div>
            </div>
        </article>
    )
}
