import React from "react";
import AssetsList from '@/components/lists/AssetsList'

interface AssetsPageProps {
  searchParams: { type_name?: string }
}

export default function AssetsPage({ searchParams }: AssetsPageProps) {
  return (
    <main className="container mx-auto px-4 py-8">
      <AssetsList />
    </main>
  )
}
