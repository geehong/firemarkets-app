import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Explore Tags | FireMarkets',
    description: 'Browse all topics and tags on FireMarkets.',
}

export default async function TagIndexPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    let tags: any[] = [];
    
    try {
        const tagData: any = await apiClient.getBlogTags();
        if (tagData && Array.isArray(tagData)) {
            // Sort by usage count descending
            tags = tagData.sort((a: any, b: any) => (b.usage_count || 0) - (a.usage_count || 0));
        }
    } catch (e) {
        console.error('Failed to fetch tags for index page', e);
    }

    return (
        <div className="w-full py-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Explore Topics
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Discover articles and news by topic.
                </p>
            </header>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 p-6">
                {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                        {tags.map((tag) => (
                            <Link 
                                key={tag.id || tag.slug} 
                                href={`/tag/${tag.slug}`}
                                className="group inline-flex items-center justify-between gap-2 px-4 py-2 bg-gray-50 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400 transition-colors duration-200"
                            >
                                <span>#{tag.name}</span>
                                {tag.usage_count > 0 && (
                                    <span className="bg-gray-200 dark:bg-gray-600 group-hover:bg-blue-100 dark:group-hover:bg-gray-500 text-gray-500 group-hover:text-blue-600 dark:text-gray-300 dark:group-hover:text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">
                                        {tag.usage_count}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        No tags found.
                    </div>
                )}
            </div>
        </div>
    )
}
