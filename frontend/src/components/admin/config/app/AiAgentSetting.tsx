'use client'

import React from 'react'
import GenericConfigEditor from '@/components/admin/common/GenericConfigEditor'

const AiAgentSetting: React.FC = () => {
    return (
        <div>
            {/* AI Provider Settings */}
            <div className="mb-8">
                <GenericConfigEditor
                    configKey="ai_provider_config"
                    title="Provider Configuration"
                    description="Configure API keys and models for AI providers."
                />
            </div>

            {/* AI Prompts Configuration */}
            <div>
                <GenericConfigEditor
                    configKey="ai_agent_prompts"
                    title="AI Agent Prompts"
                    description="Customize the prompts used by the AI Agent for various tasks."
                />
            </div>
        </div>
    )
}

export default AiAgentSetting
