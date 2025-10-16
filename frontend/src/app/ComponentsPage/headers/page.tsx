import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Headers | FireMarkets',
  description: 'Header components and navigation elements.',
}

export default function HeadersPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Headers
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Header components and navigation elements for page layouts.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Page Headers</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Page header components with titles and actions.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Navigation Bars</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Navigation bar components with menu items.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Breadcrumbs</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Breadcrumb navigation components.
          </p>
        </div>
      </div>
    </main>
  )
}
