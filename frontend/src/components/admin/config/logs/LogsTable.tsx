'use client'

import React, { useState } from 'react'
import { useSystemLogs, SystemLog } from '@/hooks/admin/useSystemLogs'
import { useSchedulerLogs } from '@/hooks/admin/useSchedulerLogs'
import { useApiLogs, ApiLog } from '@/hooks/admin/useApiLogs'

type LogType = 'system' | 'scheduler' | 'api'

const LogsTable: React.FC = () => {
  const [logType, setLogType] = useState<LogType>('system')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterModule, setFilterModule] = useState<string>('')

  // Hooks for each log type
  const systemLogs = useSystemLogs({
    enabled: logType === 'system',
    limit: 100,
    level: filterLevel !== 'all' ? filterLevel : undefined,
    module: filterModule || undefined
  })

  const schedulerLogs = useSchedulerLogs({
    enabled: logType === 'scheduler',
    // limit: 100 // Scheduler hook doesn't support limit param in current version, need update if needed
  })

  const apiLogs = useApiLogs({
    enabled: logType === 'api',
    limit: 100,
    // endpoint: filterModule || undefined // Reusing filterModule for endpoint filter
  })

  const currentLogs = () => {
    switch (logType) {
      case 'system': return systemLogs
      case 'scheduler': return schedulerLogs
      case 'api': return apiLogs
    }
  }

  const { data: logs, isLoading: loading, error, refetch } = currentLogs() as {
    data: any[]
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
  }

  // Helper functions
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'bg-blue-100 text-blue-800'
      case 'WARNING': return 'bg-yellow-100 text-yellow-800'
      case 'ERROR':
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'DEBUG': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string | number) => {
    if (typeof status === 'number') {
      if (status >= 200 && status < 300) return 'bg-green-100 text-green-800'
      if (status >= 400) return 'bg-red-100 text-red-800'
      return 'bg-gray-100 text-gray-800'
    }
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    } catch (e) {
      return dateString
    }
  }

  // Render functions for different log types
  const renderSystemLogs = () => (
    <>
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {(logs as SystemLog[]).map((log) => (
          <tr key={log.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.id}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(log.timestamp)}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                {log.level}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.module || '-'}</td>
            <td className="px-6 py-4 text-sm text-gray-500 break-all">{log.message}</td>
          </tr>
        ))}
      </tbody>
    </>
  )

  const renderSchedulerLogs = () => (
    <>
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {(logs as any[]).map((log) => (
          <tr key={log.log_id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.log_id}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.job_name}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                {log.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(log.start_time)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.duration_seconds ? `${log.duration_seconds}s` : '-'}</td>
            <td className="px-6 py-4 text-sm text-gray-500 break-all">{log.error_message || '-'}</td>
          </tr>
        ))}
      </tbody>
    </>
  )

  const renderApiLogs = () => (
    <>
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time (ms)</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {(logs as ApiLog[]).map((log) => (
          <tr key={log.log_id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.log_id}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(log.created_at)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{log.api_name || 'API'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.endpoint}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status_code)}`}>
                {log.status_code}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.response_time_ms}ms</td>
          </tr>
        ))}
      </tbody>
    </>
  )

  if (loading && (!logs || logs.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="mt-3 text-sm text-gray-600">Loading logs...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">Error: {error.message}</div>
        <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <label className="text-sm font-medium text-gray-700 mr-2">Log Source:</label>
          <select
            value={logType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLogType(e.target.value as LogType)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="system">System Logs</option>
            <option value="scheduler">Scheduler Logs</option>
            <option value="api">API Logs</option>
          </select>

          {logType === 'system' && (
            <select
              value={filterLevel}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="DEBUG">DEBUG</option>
            </select>
          )}

          {(logType === 'system' || logType === 'api') && (
            <input
              type="text"
              value={filterModule}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterModule(e.target.value)}
              placeholder={logType === 'system' ? "Filter by module..." : "Filter by endpoint..."}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>

        <button
          onClick={() => refetch()}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {logType === 'system' && renderSystemLogs()}
            {logType === 'scheduler' && renderSchedulerLogs()}
            {logType === 'api' && renderApiLogs()}

            {(!logs || logs.length === 0) && (
              <tbody>
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No logs found
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <div>
          Showing {logs?.length || 0} logs
        </div>
      </div>
    </div>
  )
}

export default LogsTable
