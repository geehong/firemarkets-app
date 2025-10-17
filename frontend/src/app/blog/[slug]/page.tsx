import Link from 'next/link'
import { headers } from 'next/headers'

export const revalidate = 60
export const dynamic = 'force-dynamic'

export default async function BlogDetailPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  // Fetch directly from backend on server (no CORS in server-side)
  const BACKEND = (process.env.BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1').replace(/\/$/, '')
  const url = `${BACKEND}/blogs/slug/${encodeURIComponent(slug)}`
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Not Found</h1>
        <p className="mt-2 text-gray-600">The blog post could not be loaded.</p>
        <div className="mt-4">
          <Link href="/blog" className="text-blue-600 hover:text-blue-800">Back to Blog</Link>
        </div>
      </div>
    )
  }

  const data = await res.json()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/blog" className="text-sm text-gray-600 hover:text-gray-900">← Back to Blog</Link>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{data.title}</h1>
      <div className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        {data.updated_at ? new Date(data.updated_at).toLocaleString() : ''}
      </div>
      <article className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: data.content }} />
    </div>
  )
}
