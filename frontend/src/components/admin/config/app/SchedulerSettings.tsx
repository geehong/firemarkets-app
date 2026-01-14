'use client'

import React from 'react'
import GenericConfigEditor from '@/components/admin/common/GenericConfigEditor'

const SchedulerSettings: React.FC = () => {
  return (
    <GenericConfigEditor
      configKey="scheduler_settings"
      title="Scheduler Configurations"
      description="Configure data collection intervals, backfill usage, and timeouts."
    />
  )
}

export default SchedulerSettings
