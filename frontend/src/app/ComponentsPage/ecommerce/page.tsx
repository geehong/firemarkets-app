'use client'

import { useState } from 'react'
import EcommerceMetrics from '@/components/ecommerce/EcommerceMetrics'
import MonthlySalesChart from '@/components/ecommerce/MonthlySalesChart'
import MonthlyTarget from '@/components/ecommerce/MonthlyTarget'
import RecentOrders from '@/components/ecommerce/RecentOrders'
import StatisticsChart from '@/components/ecommerce/StatisticsChart'
import DemographicCard from '@/components/ecommerce/DemographicCard'
import CountryMap from '@/components/ecommerce/CountryMap'

export default function EcommercePage() {
  const [activeComponent, setActiveComponent] = useState('metrics')

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          E-commerce
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          E-commerce components and analytics dashboards.
        </p>
      </div>

      {/* Component Selector */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveComponent('metrics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeComponent === 'metrics'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Metrics
          </button>
          <button
            onClick={() => setActiveComponent('sales')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeComponent === 'sales'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Sales Chart
          </button>
          <button
            onClick={() => setActiveComponent('target')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeComponent === 'target'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Monthly Target
          </button>
          <button
            onClick={() => setActiveComponent('orders')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeComponent === 'orders'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Recent Orders
          </button>
          <button
            onClick={() => setActiveComponent('statistics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeComponent === 'statistics'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveComponent('demographics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeComponent === 'demographics'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Demographics
          </button>
          <button
            onClick={() => setActiveComponent('map')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeComponent === 'map'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Country Map
          </button>
        </div>
      </div>

      {/* Component Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <div className="min-h-96">
          {activeComponent === 'metrics' && <EcommerceMetrics />}
          {activeComponent === 'sales' && <MonthlySalesChart />}
          {activeComponent === 'target' && <MonthlyTarget />}
          {activeComponent === 'orders' && <RecentOrders />}
          {activeComponent === 'statistics' && <StatisticsChart />}
          {activeComponent === 'demographics' && <DemographicCard />}
          {activeComponent === 'map' && <CountryMap />}
        </div>
      </div>

      {/* Component Examples Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">E-commerce Metrics</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Key performance indicators and business metrics.
          </p>
          <div className="h-48">
            <EcommerceMetrics />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Sales</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Sales performance chart for monthly analysis.
          </p>
          <div className="h-48">
            <MonthlySalesChart />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Latest customer orders and transactions.
          </p>
          <div className="h-48">
            <RecentOrders />
          </div>
        </div>
      </div>
    </main>
  )
}