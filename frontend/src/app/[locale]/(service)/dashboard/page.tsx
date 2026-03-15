import type { Metadata } from "next";
import React from "react";
import DashBoardMainView from "@/components/dashboard/DashBoardMainView";

export const metadata: Metadata = {
  title: "FireMarkets Dashboard | Live Market & Prism Hub",
  description: "Real-time live market sessions, prism hub overview and personalized feed.",
};

export default function Dashboard() {
  return (
    <div className="w-full">
      <DashBoardMainView />
    </div>
  );
}
