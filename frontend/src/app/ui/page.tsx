import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'UI Components | FireMarkets',
  description: 'UI components and interface elements.',
}

export default function UIPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          UI Components
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          UI components and interface elements for building user interfaces.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Buttons</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Button components with various styles and states.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Modals</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Modal dialogs and popup components.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Navigation</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Navigation components and menu systems.
          </p>
        </div>
      </div>
    </main>
  )
}
