import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lists | FireMarkets',
  description: 'List components and data display.',
}

export default function ListsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Lists
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          List components for displaying data in various formats.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Simple Lists</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Basic list components with simple styling.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Card Lists</h3>
          <p className="text-gray-600 dark:text-gray-400">
            List items displayed as cards with rich content.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Grid Lists</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Grid-based list layouts for organized display.
          </p>
        </div>
      </div>
    </main>
  )
}
