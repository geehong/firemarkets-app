import React from 'react'
import Alert from '@/components/ui/alert/Alert'
import { TimeIcon } from '@/icons'

interface AdminDataInspectorProps {
    data: any
    isLoading: boolean
    error: Error | null | undefined
    title?: string
    locale?: string
}

const AdminDataInspector: React.FC<AdminDataInspectorProps> = ({
    data,
    isLoading,
    error,
    title = 'Raw Data',
    locale = 'en'
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2">
                    <TimeIcon className="h-4 w-4 animate-spin" />
                    <span>Loading details...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <Alert
                variant="error"
                title="Error"
                message={error.message || "Failed to load details."}
            />
        )
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-500 dark:text-gray-400">No detailed information available.</p>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-fadeIn">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                {title}
            </h3>
            <div className="relative">
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-gray-800 dark:text-gray-200 font-mono">
                    {JSON.stringify(data, null, 2)}
                </pre>
                <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 text-xs font-semibold text-purple-600 bg-purple-100 rounded-full dark:bg-purple-900 dark:text-purple-300">
                        Admin Only
                    </span>
                </div>
            </div>
        </div>
    )
}

export default AdminDataInspector
