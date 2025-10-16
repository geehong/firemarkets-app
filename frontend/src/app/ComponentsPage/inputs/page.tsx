import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inputs | FireMarkets',
  description: 'Input components and form controls.',
}

export default function InputsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Inputs
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Input components and form controls for data entry.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Text Inputs</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Text input fields with various styles and validations.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Number Inputs</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Number input fields with step controls.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Date Inputs</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Date and time picker components.
          </p>
        </div>
      </div>
    </main>
  )
}
