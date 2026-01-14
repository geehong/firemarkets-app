'use client'

import React from 'react'
import GenericConfigEditor from '@/components/admin/common/GenericConfigEditor'

const OnChainSettings: React.FC = () => {
  return (
    <div className="space-y-8">
      <section>
        <GenericConfigEditor
          configKey="onchain_api_settings"
          title="API Settings"
          description="Configure On-Chain API base URL, delays, and limits."
        />
      </section>
      <section>
        <GenericConfigEditor
          configKey="onchain_metrics_toggles"
          title="On-chain Metrics Collection"
          description="Toggle collection of specific on-chain metrics."
        />
      </section>
    </div>
  )
}

export default OnChainSettings
