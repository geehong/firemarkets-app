import ComponentCard from '@/components/common/ComponentCard'

export default function Loading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* 헤더 스켈레톤 */}
        <ComponentCard title="Loading...">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </ComponentCard>

        {/* 차트 스켈레톤 */}
        <ComponentCard title="Loading Chart...">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </ComponentCard>

        {/* 정보 카드 스켈레톤 */}
        <ComponentCard title="Loading Information...">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </ComponentCard>
      </div>
    </main>
  )
}
