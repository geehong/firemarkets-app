import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Examples | FireMarkets',
  description: 'Example components and code samples.',
}

export default function ExamplesPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Examples
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Example components and code samples for reference.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Component Examples</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Example implementations of various components.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Code Samples</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Code samples and implementation examples.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Best Practices</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Best practices and usage guidelines.
          </p>
        </div>
      </div>
    </main>
  )
}
