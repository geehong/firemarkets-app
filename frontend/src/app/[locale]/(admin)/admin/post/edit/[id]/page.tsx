'use client';
import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import BlogEdit from '@/components/admin/edit/BlogEdit';

import toast from 'react-hot-toast';

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    // params is a Promise in Next.js 15+ for Client Components
    const { id: idStr } = use(params);
    const id = parseInt(idStr);

    const handleSave = () => {
        toast.success('Post saved successfully');
    };

    const handleCancel = () => {
        router.push('/admin/post/list');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <BlogEdit postId={id} mode="edit" postType="post" onSave={handleSave} onCancel={handleCancel} />
        </div>
    );
}
