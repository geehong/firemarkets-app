import type { Metadata } from "next";
import React from "react";
import BacktestMainView from "@/components/backtest/BacktestMainView";

export const metadata: Metadata = {
  title: "Strategy Backtest | FireMarkets",
  description: "Backtest your trading strategies and analyze historical performance with professional-grade data.",
};

export default function BacktestPage() {
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-950 min-h-screen">
      <BacktestMainView />
    </div>
  );
}
