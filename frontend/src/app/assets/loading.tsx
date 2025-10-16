import ComponentCard from '@/components/common/ComponentCard'

export default function Loading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* 헤더 스켈레톤 */}
        <ComponentCard title="Loading...">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </ComponentCard>

        {/* 차트 스켈레톤 */}
        <ComponentCard title="Loading Chart...">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </ComponentCard>
      </div>
    </main>
  )
}
