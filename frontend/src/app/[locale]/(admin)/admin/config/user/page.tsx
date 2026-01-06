'use client';
import React from 'react';
import { useAuth } from '@/hooks/auth/useAuthNew';

export default function UserConfigPage() {
    const { isAdmin, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!isAdmin) return <div className="p-6 text-red-600">Access Denied</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">User Management</h1>

            <div className="bg-white rounded-lg shadow p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
                <p className="text-gray-600 mb-8">
                    User management features are currently under development.
                </p>

                <div className="max-w-4xl mx-auto border rounded-lg overflow-hidden text-left">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Example Preview</h3>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">admin</td>
                                <td className="px-6 py-4 whitespace-nowrap">admin@example.com</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Admin</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
