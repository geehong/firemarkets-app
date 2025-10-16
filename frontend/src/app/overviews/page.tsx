import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Overviews | FireMarkets',
  description: 'Overview components and dashboard widgets.',
}

export default function OverviewsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Overviews
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Overview components and dashboard widgets for data visualization.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Dashboard Widgets</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Overview widgets for dashboard displays.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Summary Cards</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Summary cards showing key metrics and statistics.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Status Indicators</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Status indicators and progress displays.
          </p>
        </div>
      </div>
    </main>
  )
}
