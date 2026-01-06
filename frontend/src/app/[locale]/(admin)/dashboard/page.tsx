import type { Metadata } from "next";
import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PersonalizedFeedDashboard } from "@/components/dashboard/PersonalizedFeedDashboard";
import { PrismHubDashboard } from "@/components/dashboard/PrismHubDashboard";
import DashboardTabs from "@/components/dashboard/DashboardTabs";

export const metadata: Metadata = {
  title:
    "FireMarkets Dashboard | Personalized Feed",
  description: "Real-time market feed personalized for you.",
};

export default function Dashboard() {
  return (
    <div>
      <DashboardTabs />
    </div>
  );
}
