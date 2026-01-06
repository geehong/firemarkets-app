'use client';
import React from 'react';
import { useAuth } from '@/hooks/auth/useAuthNew';

export default function CategoryManagePage() {
    const { isAdmin, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!isAdmin) return <div className="p-6 text-red-600">Access Denied</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Category Management</h1>
            <div className="bg-white rounded-lg shadow p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
                <p className="text-gray-600">Category management features are currently under development.</p>
            </div>
        </div>
    );
}
