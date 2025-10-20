import ComponentCard from '@/components/common/ComponentCard'

export default function Loading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* 페이지 헤더 스켈레톤 */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>

        {/* 필터 스켈레톤 */}
        <ComponentCard title="Loading Filters...">
          <div className="animate-pulse">
            <div className="flex gap-4 mb-4">
              <div className="h-10 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </ComponentCard>

        {/* 자산 목록 스켈레톤 */}
        <ComponentCard title="Loading Assets...">
          <div className="animate-pulse">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ComponentCard>

        {/* 페이지네이션 스켈레톤 */}
        <div className="animate-pulse">
          <div className="flex justify-center space-x-2">
            <div className="h-10 bg-gray-200 rounded w-10"></div>
            <div className="h-10 bg-gray-200 rounded w-10"></div>
            <div className="h-10 bg-gray-200 rounded w-10"></div>
            <div className="h-10 bg-gray-200 rounded w-10"></div>
          </div>
        </div>
      </div>
    </main>
  )
}
