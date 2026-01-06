import React from 'react';
import BlogManage from '@/components/admin/post/BlogManage';

export default function PostListPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <BlogManage postType="post,news,raw_news,ai_draft_news,all" pageTitle="포스트 리스트" />
        </div>
    );
}
