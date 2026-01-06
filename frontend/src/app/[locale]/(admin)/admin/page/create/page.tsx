'use client';
import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BlogEdit from '@/components/admin/edit/BlogEdit';

function CreatePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const postType = (searchParams.get('post_type') || 'page') as any;

    const handleSave = () => {
        router.push('/admin/page/list');
    };

    const handleCancel = () => {
        router.push('/admin/page/list');
    };

    return (
        <BlogEdit mode="create" postType={postType} onSave={handleSave} onCancel={handleCancel} />
    );
}

export default function CreatePagePage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <Suspense fallback={<div>Loading...</div>}>
                <CreatePageContent />
            </Suspense>
        </div>
    );
}
