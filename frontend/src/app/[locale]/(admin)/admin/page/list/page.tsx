import React from 'react';
import BlogManage from '@/components/admin/post/BlogManage';

export default function PageListPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <BlogManage postType="assets,page,onchain" pageTitle="페이지 리스트" />
        </div>
    );
}
