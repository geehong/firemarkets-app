import type { Metadata } from "next";
import React from "react";
import VirtualTradingDetailView from "@/components/virtual-trading/VirtualTradingDetailView";

export async function generateMetadata({ params }: { params: { symbol: string } }): Promise<Metadata> {
  const { symbol } = await params;
  return {
    title: `${symbol} Virtual Trading | FireMarkets`,
    description: `Detailed virtual futures trading view for ${symbol} with real-time charts and settings.`,
  };
}

export default function VirtualTradingDetailPage() {
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-950 min-h-screen">
      <VirtualTradingDetailView />
    </div>
  );
}
