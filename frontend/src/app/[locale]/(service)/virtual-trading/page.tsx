import type { Metadata } from "next";
import React from "react";
import VirtualTradingDemo from "@/components/virtual-trading/VirtualTradingDemo";

export const metadata: Metadata = {
  title: "Virtual Futures Trading Demo | FireMarkets",
  description: "Experience virtual futures trading with real-time market data across multiple assets.",
};

export default function VirtualTradingPage() {
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-950 min-h-screen">
      <VirtualTradingDemo />
    </div>
  );
}
