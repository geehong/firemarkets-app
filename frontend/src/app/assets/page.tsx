import React from "react";
import AssetsList from '@/components/lists/AssetsList'
import AssetsDashboardContent from '@/components/dashboard/AssetsDashboardContent'

interface AssetsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  // searchParams를 unwrap
  const params = await searchParams
  
  // type_name 파라미터가 있으면 AssetsList 표시 (Stocks, Commodities, All Assets 등 모든 경우)
  const typeName = params?.type_name ? String(params.type_name) : undefined
  const hasAllAssetsFlag = typeof params?.["All Assets"] !== 'undefined'
  const hasTypeName = !!typeName || hasAllAssetsFlag

  if (hasTypeName) {
    return (
      <main className="container mx-auto px-4 py-8">
        <AssetsList />
      </main>
    )
  }

  // type_name 파라미터가 없으면 대시보드 표시
  return (
    <main className="container mx-auto px-4 py-8">
      <AssetsDashboardContent />
    </main>
  )
}
