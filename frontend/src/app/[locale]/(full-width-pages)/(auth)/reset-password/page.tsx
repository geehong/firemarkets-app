"use client";
import React from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "@/icons";

export default function ResetPassword() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <Link
            href="/signin"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-6"
        >
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Back to Sign In
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Reset Password</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This feature is currently disabled or under maintenance. Please contact the administrator if you need assistance.
        </p>

        <div className="text-sm text-center">
            <Link href="/" className="text-blue-600 hover:text-blue-500">
                Go to Home
            </Link>
        </div>
      </div>
    </div>
  );
}
