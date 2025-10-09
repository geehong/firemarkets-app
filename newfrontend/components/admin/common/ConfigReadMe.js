import React from 'react'

const ConfigReadMe = () => {
  return (
    <div className="text-muted">
      <h6 className="mb-2">Configuration Overview</h6>
      <ul className="mb-3">
        <li>Scheduler controls manage background data collection jobs.</li>
        <li>Realtime/WebSocket settings control live data pipelines.</li>
        <li>Logs provide visibility into system events and job outcomes.</li>
      </ul>
      <div className="small">
        If you need to adjust defaults, update environment variables and backend scheduler settings, then restart services.
      </div>
    </div>
  )
}

export default ConfigReadMe


