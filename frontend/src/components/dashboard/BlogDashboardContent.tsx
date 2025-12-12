"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import Link from "next/link";
import { useAuth } from '@/hooks/useAuthNew';
import BlogManage from '../blog/admin/BlogManage';

interface BlogPostCardProps {
  title: string;
  excerpt: string;
  author: string;
  createdAt: string;
  category?: string;
  tags?: string[];
  slug: string;
}

const BlogPostCard: React.FC<BlogPostCardProps> = ({
  title,
  excerpt,
  author,
  createdAt,
  category,
  tags,
  slug,
}: BlogPostCardProps) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // 안전하게 문자열로 변환
  const safeCategory = category && typeof category === 'string' ? category : '';
  const safeTags = tags && Array.isArray(tags) ? tags.filter((tag: any) => typeof tag === 'string') : [];

  return (
    <Link
      href={`/blog/${slug}`}
      className="block bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-[1.02]"
    >
      <div className="flex items-start justify-between mb-3">
        {safeCategory && (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {safeCategory}
          </span>
        )}
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(createdAt)}
        </span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
        {excerpt}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            작성자: {author}
          </span>
        </div>
        {safeTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {safeTags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export default function BlogDashboardContent() {
  const { isAuthenticated } = useAuth();
  // 최근 블로그 포스트 조회
  const { data: recentPosts, isLoading: recentLoading, isError: recentError } = useQuery({
    queryKey: ['blog-posts', 'recent'],
    queryFn: () => apiClient.getPosts({ page: 1, page_size: 6, status: 'published' }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // 인기 블로그 포스트 조회 (최신 포스트와 동일 데이터 사용)
  // Note: 별도의 인기 정렬 API가 없어서 최신 포스트와 동일한 데이터를 사용합니다

  // 카테고리 조회
  const { data: categories } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => apiClient.getBlogCategories(),
    staleTime: 30 * 60 * 1000,
    retry: 0,
  });

  // 태그 조회
  const { data: tags } = useQuery({
    queryKey: ['blog-tags'],
    queryFn: () => apiClient.getBlogTags(),
    staleTime: 30 * 60 * 1000,
    retry: 0,
  });

  // 정규화 헬퍼
  const normalizeArrayData = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.posts && Array.isArray(data.posts)) return data.posts;
    return [];
  };

  // 객체를 문자열로 변환하는 헬퍼 (다국어 지원)
  const normalizeString = (value: any, lang: string = 'ko'): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      if (value[lang]) return String(value[lang]);
      if (value.ko) return String(value.ko);
      if (value.en) return String(value.en);
      // 객체의 첫 번째 값 사용
      const keys = Object.keys(value);
      if (keys.length > 0) return String(value[keys[0]]);
    }
    return String(value);
  };

  // 배열을 문자열 배열로 변환하는 헬퍼
  const normalizeStringArray = (value: any, lang: string = 'ko'): string[] => {
    if (!value) return [];
    if (!Array.isArray(value)) return [];
    return value.map(item => normalizeString(item, lang));
  };

  const normalizedRecent = normalizeArrayData(recentPosts);

  return (
    <>
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          블로그 대시보드
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          최신 시장 인사이트와 분석을 확인하세요
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            전체 포스트
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {normalizedRecent.length > 0 ? (recentPosts?.total || normalizedRecent.length) : '0'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            카테고리
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {categories?.categories?.length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            태그
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {tags?.tags?.length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            이번 주 작성
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {normalizedRecent.filter((post: any) => {
              const postDate = new Date(post.created_at || post.createdAt);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return postDate >= weekAgo;
            }).length}
          </div>
        </div>
      </div>

      {isAuthenticated && (
        <div className="mb-8 border-b pb-8 dark:border-gray-700">
          <BlogManage />
        </div>
      )}

      {/* 최근 포스트 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            최근 포스트
          </h2>
          <Link
            href="/blog"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
          >
            전체 보기 →
          </Link>
        </div>

        {recentLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : recentError ? (
          <div className="text-center py-12">
            <div className="text-red-500 dark:text-red-400 mb-2">⚠️ 블로그 데이터를 불러오는 데 실패했습니다.</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">잠시 후 다시 시도해주세요.</p>
          </div>
        ) : normalizedRecent.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-gray-500 dark:text-gray-400">아직 작성된 포스트가 없습니다.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">새로운 포스트가 곧 게시될 예정입니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {normalizedRecent.map((post: any) => {
              const normalizedCategory = normalizeString(post.category);
              const normalizedTags = normalizeStringArray(post.tags);
              return (
                <BlogPostCard
                  key={post.id || post.slug}
                  title={normalizeString(post.title) || '제목 없음'}
                  excerpt={normalizeString(post.excerpt) || (typeof post.content === 'string' ? post.content.substring(0, 150) : '') || '내용 없음'}
                  author={normalizeString(post.author) || '익명'}
                  createdAt={post.created_at || post.createdAt || new Date().toISOString()}
                  category={normalizedCategory || undefined}
                  tags={normalizedTags.length > 0 ? normalizedTags : undefined}
                  slug={post.slug || post.id?.toString() || 'unknown'}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 카테고리별 포스트 */}
      {categories?.categories && categories.categories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            카테고리별 포스트
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.categories.map((category: any) => {
              const categoryStr = normalizeString(category);
              return (
                <Link
                  key={categoryStr}
                  href={`/blog?category=${encodeURIComponent(categoryStr)}`}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:scale-105 text-center"
                >
                  <div className="text-3xl mb-2">📝</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {categoryStr}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )
      }

      {/* 인기 태그 */}
      {
        tags?.tags && tags.tags.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 shadow-lg text-white">
            <h2 className="text-2xl font-bold mb-4">인기 태그</h2>
            <div className="flex flex-wrap gap-3">
              {tags.tags.slice(0, 20).map((tag: any) => {
                const tagStr = normalizeString(tag);
                return (
                  <Link
                    key={tagStr}
                    href={`/blog?tag=${encodeURIComponent(tagStr)}`}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 transition-all hover:scale-105"
                  >
                    #{tagStr}
                  </Link>
                );
              })}
            </div>
          </div>
        )
      }
    </>
  );
}

