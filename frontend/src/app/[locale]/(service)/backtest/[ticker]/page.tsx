import type { Metadata } from "next";
import React from "react";
import BacktestSetupView from "@/components/backtest/BacktestSetupView";

export const metadata: Metadata = {
  title: "Backtest Strategy Setup | FireMarkets",
  description: "Configure and run professional-grade trading backtests for your favorite assets.",
};

export default async function BacktestDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const resolvedParams = await params;
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-950 min-h-screen">
      <BacktestSetupView ticker={resolvedParams.ticker.toUpperCase()} />
    </div>
  );
}
