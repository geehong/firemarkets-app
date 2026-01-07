import React from 'react';
import BlogManage from '@/components/admin/post/BlogManage';
import AdminPageTemplateView from '@/components/template/admin/AdminPageTemplateView';

interface PageProps {
    params: Promise<{
        locale: string;
    }>;
}

export default async function PageListPage({ params }: PageProps) {
    const { locale } = await params;

    return (
        <AdminPageTemplateView locale={locale} subtitle="Manage your static pages." hideHeader={true}>
            <div className="flex-1 overflow-auto">
                <BlogManage postType="page,assets" pageTitle="페이지 리스트" />
            </div>
        </AdminPageTemplateView>
    );
}
