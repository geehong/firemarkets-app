"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";

interface BlogItem {
  id: number;
  title: string;
  slug: string;
}

export default function SidebarWidget() {
  const [latest, setLatest] = useState<BlogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await apiClient.getBlogs({ page: 1, page_size: 5, status: "published" });
        if (!mounted) return;
        setLatest((data?.blogs || []).map((b: any) => ({ id: b.id, title: b.title, slug: b.slug })));
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load");
      }
    };
    load();
    return () => { mounted = false };
  }, []);
  return (
    <div
      className={`
        mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]`}
    >
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
        About FireMarkets
      </h3>
      <p className="mb-3 text-gray-600 text-theme-sm dark:text-gray-300">
        An investment analytics platform offering real-time asset data and on-chain insights.
      </p>
      <p className="mb-4 text-gray-500 text-theme-sm dark:text-gray-400">
        Read market analysis and guides on our blog, and explore deep metrics on asset pages.
      </p>
      <a
        href="/blog"
        className="flex items-center justify-center p-3 font-medium text-white rounded-lg bg-brand-500 text-theme-sm hover:bg-brand-600"
      >
        Go to Blog
      </a>

      {/* Latest posts */}
      <div className="mt-4 text-left">
        <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Latest Posts</h4>
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : (
          <ul className="space-y-1">
            {latest.map((post) => (
              <li key={post.id} className="text-sm">
                <Link href={`/blog/${post.slug}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 line-clamp-1">
                  {post.title}
                </Link>
              </li>
            ))}
            {latest.length === 0 && (
              <li className="text-xs text-gray-500 dark:text-gray-400">No posts yet.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
