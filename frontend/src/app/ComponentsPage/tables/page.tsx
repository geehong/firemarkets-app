'use client'

import { useState } from 'react'
import TableBase from '@/components/tables/TableBase'
import BasicTableOne from '@/components/tables/BasicTableOne'
import AssetsListTable from '@/components/tables/AssetsListTable'
import HistoryTable from '@/components/tables/HistoryTable'
import SimpleHistoryTable from '@/components/tables/SimpleHistoryTable'
import AgGridBaseTable from '@/components/tables/AgGridBaseTable'
import AgGridHistoryTable from '@/components/tables/AgGridHistoryTable'
import RealtimePriceTable from '@/components/tables/RealtimePriceTable'

export default function TablesPage() {
  const [activeTable, setActiveTable] = useState('basic')

  return (

    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Tables
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive table components and data grids for structured data display.
        </p>
      </div>

      {/* Table Type Selector */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTable('basic')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTable === 'basic'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            Basic Table
          </button>
          <button
            onClick={() => setActiveTable('assets')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTable === 'assets'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            Assets Table
          </button>
          <button
            onClick={() => setActiveTable('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTable === 'history'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            History Table
          </button>
          <button
            onClick={() => setActiveTable('aggrid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTable === 'aggrid'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            AgGrid Table
          </button>
          <button
            onClick={() => setActiveTable('realtime')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTable === 'realtime'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            Realtime Price Table
          </button>
        </div>
      </div>

      {/* Table Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <div>
          {activeTable === 'basic' && <BasicTableOne />}
          {activeTable === 'assets' && <AssetsListTable />}
          {activeTable === 'history' && <HistoryTable />}
          {activeTable === 'aggrid' && <AgGridBaseTable />}
          {activeTable === 'realtime' && <RealtimePriceTable />}
        </div>
      </div>

      {/* Table Examples Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Basic Table</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Simple table with basic styling and data display.
          </p>
          <div className="h-64 overflow-auto">
            <BasicTableOne />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Assets List Table</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Table for displaying asset information with filtering.
          </p>
          <div className="h-64 overflow-auto">
            <AssetsListTable />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">History Table</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Table for displaying historical data with pagination.
          </p>
          <div className="h-64 overflow-auto">
            <HistoryTable />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">AgGrid Table</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Advanced table with AgGrid features and sorting.
          </p>
          <div className="h-64 overflow-auto">
            <AgGridBaseTable />
          </div>
        </div>
      </div>
    </main>

  )
}
