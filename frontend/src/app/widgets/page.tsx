"use client";

import dynamic from 'next/dynamic';

// 클라이언트 사이드에서만 렌더링
const WidgetExamples = dynamic(() => import('../../components/widget/WidgetExamples'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function WidgetsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <WidgetExamples />
    </div>
  );
}













