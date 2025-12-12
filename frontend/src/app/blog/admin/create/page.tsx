"use client";

import React from 'react';
import BlogEdit from '@/components/edit/BlogEdit';

export default function CreateBlogPost() {
  return (
    <div>
      <BlogEdit mode="create" />
    </div>
  )
}