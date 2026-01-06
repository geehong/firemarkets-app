import React from 'react';
import BlogManage from '@/components/admin/post/BlogManage';

export default function PostListPage() {
    return (
        <div className="flex-1 overflow-auto">
            <BlogManage postType="post,news,raw_news,ai_draft_news,brief_news,all" pageTitle="포스트 리스트" />
        </div>
    );
}
