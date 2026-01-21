import React from 'react';
import BlogManage from '@/components/admin/post/BlogManage';
import AdminPostTemplateView from '@/components/template/admin/AdminPostTemplateView';

interface PageProps {
    params: Promise<{
        locale: string;
    }>;
}

export default async function PostListPage({ params }: PageProps) {
    const { locale } = await params;

    return (
        <AdminPostTemplateView locale={locale} subtitle="View and manage all your blog posts and news articles." hideHeader={true}>
            <div className="flex-1 overflow-auto">
                <BlogManage postType="all,post,news,raw_news,ai_draft_news,brief_news" pageTitle="포스트 리스트" />
            </div>
        </AdminPostTemplateView>
    );
}
