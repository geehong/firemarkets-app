import React from "react";

export default function Loading() {
    return (
        <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
        </div>
    );
}
