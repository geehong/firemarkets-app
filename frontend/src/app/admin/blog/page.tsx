"use client";

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import BlogManage from '@/components/blog/admin/BlogManage';

const AdminBlogPage: React.FC = () => {
  return (
    <ProtectedRoute requiredRole="admin">
      <BlogManage />
    </ProtectedRoute>
  );
};

export default AdminBlogPage;
