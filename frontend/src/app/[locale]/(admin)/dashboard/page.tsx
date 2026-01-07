import type { Metadata } from "next";
import React from "react";
import DashBoardMainView from "@/components/dashboard/DashBoardMainView";

export const metadata: Metadata = {
  title: "FireMarkets Dashboard | Prism Hub & Personalized Feed",
  description: "Real-time market overview and personalized feed for the modern investor.",
};

export default function Dashboard() {
  return (
    <div className="w-full">
      <DashBoardMainView />
    </div>
  );
}
