'use client'

import React, { useState, useEffect } from 'react'

interface SchedulerControlsProps {
  isRunning: boolean
  status: string
  schedulerStatus: any
  jobDetails?: any[]
  period: string
  onPeriodChange: (period: string) => void
  onStart: () => void
  onStop: () => void
  onPause: () => void
  onTrigger: () => void
}

interface ContainerStatus {
  id: string
  name: string
  status: string
  state: string
  image: string
  created: string
  ports: any
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
  // Docker Container State
  const [containers, setContainers] = useState<ContainerStatus[]>([])
  const [loadingContainers, setLoadingContainers] = useState(false)
  const [containerError, setContainerError] = useState<string | null>(null)
  
  // Logs State
  const [logContainerId, setLogContainerId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string>('')
  const [loadingLogs, setLoadingLogs] = useState(false)

  const fetchContainers = async () => {
    try {
      const res = await fetch('/api/v1/docker/containers');
      if (!res.ok) throw new Error('Failed to fetch containers');
      const data = await res.json();
      setContainers(data);
      setContainerError(null);
    } catch (err: any) {
      console.error(err);
      setContainerError(err.message);
    }
  }

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 10000); // 10초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const handleContainerAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    try {
      const res = await fetch(`/api/v1/docker/containers/${id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Failed to ${action} container`);
      
      // Refresh list immediately
      fetchContainers();
      alert(`Container ${action}ed successfully`);
    } catch (err: any) {
      alert(err.message);
    }
  }

  const handleViewLogs = async (id: string) => {
    setLogContainerId(id);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/v1/docker/containers/${id}/logs?tail=200`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs);
    } catch (err: any) {
      setLogs(`Error fetching logs: ${err.message}`);
    } finally {
      setLoadingLogs(false);
    }
  }

  const closeLogs = () => {
    setLogContainerId(null);
    setLogs('');
  }

  // Helper to find scheduler container
  const schedulerContainer = containers.find(c => c.name.includes('scheduler'));
  const isContainerRunning = schedulerContainer?.state === 'running';

  // Override props with container state if available
  const displayStatus = schedulerContainer ? (isContainerRunning ? 'Running' : 'Stopped') : status;
  const displayIsRunning = schedulerContainer ? isContainerRunning : isRunning;

  const handleStartScheduler = async () => {
    if (schedulerContainer) {
      await handleContainerAction(schedulerContainer.id, 'start');
    } else {
      onStart(); // Fallback to prop
    }
  };

  const handleStopScheduler = async () => {
    if (schedulerContainer) {
      await handleContainerAction(schedulerContainer.id, 'stop');
    } else {
      onStop(); // Fallback to prop
    }
  };

  const handleTriggerScheduler = async () => {
    try {
        const res = await fetch('/api/v1/scheduler/collect-all-now', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to trigger collection');
        alert('Collection triggered successfully');
    } catch (err: any) {
        alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Existing Scheduler Controls */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Internal Scheduler</h3>
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">Status</div>
            <div className="text-lg font-semibold text-gray-900">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${displayIsRunning
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
                }`}>
                {displayStatus}
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
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${period === p
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
              onClick={handleStartScheduler}
              disabled={displayIsRunning}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start
            </button>

            <button
              onClick={handleStopScheduler}
              disabled={!displayIsRunning}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
              Stop
            </button>

            <button
              onClick={onPause}
              disabled={!displayIsRunning}
              className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause
            </button>

            <button
              onClick={handleTriggerScheduler}
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
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${job.status === 'running'
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
      </div>
      
      <hr className="border-gray-200" />

      {/* Docker Container Management */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium leading-6 text-gray-900">System Containers</h3>
            <button 
                onClick={() => fetchContainers()}
                className="text-sm text-blue-600 hover:text-blue-800"
            >
                Refresh
            </button>
        </div>
        
        {containerError && (
            <div className="bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-700">{containerError}</p>
            </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {containers.map((container) => (
                    <tr key={container.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {container.name.replace(/^\//, '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {container.image}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        container.state === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {container.state}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {container.state !== 'running' ? (
                            <button
                                onClick={() => handleContainerAction(container.id, 'start')}
                                className="text-green-600 hover:text-green-900"
                            >
                                Start
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleContainerAction(container.id, 'stop')}
                                    className="text-red-600 hover:text-red-900"
                                >
                                    Stop
                                </button>
                                <button
                                    onClick={() => handleContainerAction(container.id, 'restart')}
                                    className="text-orange-600 hover:text-orange-900"
                                >
                                    Restart
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => handleViewLogs(container.id)}
                            className="text-blue-600 hover:text-blue-900 ml-2"
                        >
                            Logs
                        </button>
                    </td>
                    </tr>
                ))}
                {containers.length === 0 && !containerError && (
                    <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            No containers found or loading...
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
      </div>

      {/* Logs Modal */}
      {logContainerId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative p-5 border w-3/4 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Container Logs</h3>
                    <button onClick={closeLogs} className="text-gray-500 hover:text-gray-700">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="bg-gray-900 text-white p-4 rounded-md h-96 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                    {loadingLogs ? 'Loading logs...' : logs || 'No logs available.'}
                </div>
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={closeLogs}
                        className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}

export default SchedulerControls
