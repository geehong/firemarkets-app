'use client';
import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import BlogEdit from '@/components/admin/edit/BlogEdit';

export default function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id: idStr } = use(params);
    const id = parseInt(idStr);

    const handleSave = () => {
        router.push('/admin/page/list');
    };

    const handleCancel = () => {
        router.push('/admin/page/list');
    };

    return (
        <div className="w-full py-8">
            <BlogEdit postId={id} mode="edit" postType="page" onSave={handleSave} onCancel={handleCancel} />
        </div>
    );
}
