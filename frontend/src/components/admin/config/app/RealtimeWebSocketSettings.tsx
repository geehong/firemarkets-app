'use client'

import React from 'react'
import GenericConfigEditor from '@/components/admin/common/GenericConfigEditor'

const RealtimeWebSocketSettings: React.FC = () => {
  return (
    <div className="space-y-8">
      <section>
        <GenericConfigEditor
          configKey="realtime_settings"
          title="Realtime Data Processing"
          description="Configure batch sizes, processing intervals, and stream parameters."
        />
      </section>
      <section>
        <GenericConfigEditor
          configKey="websocket_config"
          title="WebSocket Configuration"
          description="Enable/disable consumers and manage API keys."
        />
      </section>
    </div>
  )
}

export default RealtimeWebSocketSettings
