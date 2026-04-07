"use client";

import React from "react";
import { useAuth } from "@/hooks/auth/useAuthNew";
import BacktestAnonymousView from "./BacktestAnonymousView";
import BacktestUserDashboard from "./BacktestUserDashboard";

const BacktestMainView: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700">
      {isAuthenticated ? (
        <BacktestUserDashboard />
      ) : (
        <BacktestAnonymousView />
      )}
    </div>
  );
};

export default BacktestMainView;
