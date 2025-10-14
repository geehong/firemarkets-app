"use client"

import React from 'react'
import AssetsListTable from '@/components/tables/AssetsListTable'

export default function AssetsListPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Assets List</h1>
        <p className="text-gray-600">/assets/treemap/live 데이터를 기반으로 한 자산 리스트</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <AssetsListTable />
      </div>
    </div>
  )
}


