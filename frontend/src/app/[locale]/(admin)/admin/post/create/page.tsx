'use client';
import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BlogEdit from '@/components/admin/edit/BlogEdit';

function CreatePostContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const postType = (searchParams.get('post_type') || 'post') as any;

    const slug = searchParams.get('slug');
    const title = searchParams.get('title');

    const initialData = {
        slug: slug || '',
        title: title ? { ko: title, en: title } : { ko: '', en: '' }
    };

    const handleSave = () => {
        router.push('/admin/post/list');
    };

    const handleCancel = () => {
        router.push('/admin/post/list');
    };

    return (
        <BlogEdit 
            mode="create" 
            postType={postType} 
            onSave={handleSave} 
            onCancel={handleCancel}
            initialData={initialData}
        />
    );
}

export default function CreatePostPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <Suspense fallback={<div>Loading...</div>}>
                <CreatePostContent />
            </Suspense>
        </div>
    );
}
