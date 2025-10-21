'use client'

import React from 'react'

interface SchedulerControlsProps {
  isRunning: boolean
  status: string
  schedulerStatus: any
  jobDetails: any[]
  period: string
  onPeriodChange: (period: string) => void
  onStart: () => void
  onStop: () => void
  onPause: () => void
  onTrigger: () => void
}

const SchedulerControls: React.FC<SchedulerControlsProps> = ({
  isRunning,
  status,
  schedulerStatus,
  jobDetails,
  period,
  onPeriodChange,
  onStart,
  onStop,
  onPause,
  onTrigger,
}) => {
  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Status</div>
          <div className="text-lg font-semibold text-gray-900">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isRunning 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {status}
            </span>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Job Count</div>
          <div className="text-lg font-semibold text-gray-900">
            {schedulerStatus?.job_count || 0}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Last Run</div>
          <div className="text-sm text-gray-900">
            {schedulerStatus?.last_run 
              ? new Date(schedulerStatus.last_run).toLocaleString('en-US') 
              : 'Never'
            }
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Next Run</div>
          <div className="text-sm text-gray-900">
            {schedulerStatus?.next_run 
              ? new Date(schedulerStatus.next_run).toLocaleString('en-US') 
              : 'Not scheduled'
            }
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Data Collection Period</h4>
        <div className="flex flex-wrap gap-2">
          {['hour', 'day', 'week', 'month'].map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Scheduler Controls</h4>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onStart}
            disabled={isRunning}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Start
          </button>
          
          <button
            onClick={onStop}
            disabled={!isRunning}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
            Stop
          </button>
          
          <button
            onClick={onPause}
            disabled={!isRunning}
            className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
            Pause
          </button>
          
          <button
            onClick={onTrigger}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Trigger Now
          </button>
        </div>
      </div>

      {/* Job Details */}
      {jobDetails && jobDetails.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Job Details</h4>
          <div className="space-y-2">
            {jobDetails.map((job, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">{job.name || `Job ${index + 1}`}</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  job.status === 'running' 
                    ? 'bg-green-100 text-green-800'
                    : job.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {job.status || 'unknown'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Status Information */}
      {schedulerStatus && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Scheduler ID:</span>
              <span className="ml-2 text-gray-600">{schedulerStatus.id || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Version:</span>
              <span className="ml-2 text-gray-600">{schedulerStatus.version || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Uptime:</span>
              <span className="ml-2 text-gray-600">{schedulerStatus.uptime || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Memory Usage:</span>
              <span className="ml-2 text-gray-600">{schedulerStatus.memory_usage || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SchedulerControls
