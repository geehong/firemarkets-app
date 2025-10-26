"use client";

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="admin-layout">
          <div className="bg-red-600 text-white p-2 text-center text-sm">
            🔒 관리자 전용 페이지 - 접근 권한이 필요합니다
          </div>
          <main className="admin-content p-6">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminLayout;
