import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Debug | FireMarkets',
  description: 'Debug components and development tools.',
}

export default function DebugPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Debug
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Debug components and development tools for troubleshooting.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Console Logs</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Console logging components for debugging.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Error Tracking</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Error tracking and reporting components.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Performance</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Performance monitoring and debugging tools.
          </p>
        </div>
      </div>
    </main>
  )
}
