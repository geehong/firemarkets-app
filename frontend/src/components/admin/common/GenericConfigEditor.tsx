'use client'

import React, { useState, useEffect } from 'react'
import { useGroupedConfigs, GroupedConfigItem } from '@/hooks/admin/useGroupedConfigs'

interface GenericConfigEditorProps {
    configKey: string
    title?: string
    description?: string
}

const GenericConfigEditor: React.FC<GenericConfigEditorProps> = ({ configKey, title, description }) => {
    const { data, loading, error, updateConfig, refetch } = useGroupedConfigs()
    const [localConfig, setLocalConfig] = useState<Record<string, GroupedConfigItem> | null>(null)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (data && data.length > 0) {
            const config = data.find(c => c.config_key === configKey)
            if (config) {
                setLocalConfig(config.config_value)
            }
        }
    }, [data, configKey])

    const handleInputChange = (key: string, value: any, type: string) => {
        if (!localConfig) return

        let parsedValue = value
        if (type === 'int') parsedValue = parseInt(value, 10)
        if (type === 'float') parsedValue = parseFloat(value)
        if (type === 'boolean') parsedValue = value === true // checkboxes

        setLocalConfig(prev => {
            if (!prev) return null
            return {
                ...prev,
                [key]: {
                    ...prev[key],
                    value: parsedValue
                }
            }
        })
    }

    const handleSave = async () => {
        if (!localConfig) return
        setSaving(true)
        setMessage(null)
        try {
            const success = await updateConfig(configKey, localConfig)
            if (success) {
                setMessage({ type: 'success', text: 'Settings saved successfully' })
                await refetch()
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings' })
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' })
        } finally {
            setSaving(false)
        }
    }

    const handleReset = () => {
        // Revert to original data from hook
        const config = data.find(c => c.config_key === configKey)
        if (config) {
            setLocalConfig(config.config_value)
            setMessage({ type: 'success', text: 'Reset to last saved values' })
        }
    }

    if (loading && !localConfig) return <div className="p-4 text-center">Loading configuration...</div>
    if (error) return <div className="p-4 text-red-600">Error loading configuration: {error.message}</div>
    if (!localConfig && !loading) return <div className="p-4 text-gray-500">Configuration key '{configKey}' not found.</div>

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                {(title || description) && (
                    <div className="mb-6">
                        {title && <h4 className="text-lg font-medium text-gray-900">{title}</h4>}
                        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
                    </div>
                )}

                {message && (
                    <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                    {localConfig && Object.entries(localConfig).map(([key, item]) => (
                        <div key={key} className={item.type === 'boolean' ? 'flex items-center' : ''}>
                            {item.type === 'boolean' ? (
                                <>
                                    <input
                                        type="checkbox"
                                        id={`${configKey}-${key}`}
                                        checked={item.value === true}
                                        onChange={(e) => handleInputChange(key, e.target.checked, 'boolean')}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor={`${configKey}-${key}`} className="ml-2 block text-sm text-gray-900">
                                        {item.description || key}
                                        {/* <span className="text-xs text-gray-400 block">{key}</span> */}
                                    </label>
                                </>
                            ) : (
                                <>
                                    <label htmlFor={`${configKey}-${key}`} className="block text-sm font-medium text-gray-700 mb-1">
                                        {item.description || key} <span className="text-xs text-gray-400 font-normal">({key})</span>
                                    </label>
                                    {item.type === 'json' || item.type === 'text' ? (
                                        <textarea
                                            id={`${configKey}-${key}`}
                                            value={typeof item.value === 'string' ? item.value : JSON.stringify(item.value, null, 2)}
                                            onChange={(e) => {
                                                if (item.type === 'json') {
                                                    try {
                                                        const jsonVal = JSON.parse(e.target.value)
                                                        handleInputChange(key, jsonVal, 'json')
                                                    } catch (err) {
                                                        // Allow editing invalid JSON as string temporarily? 
                                                        // For now, complicated. Let's just assume valid JSON or keep as string until valid.
                                                        // Actually, parsing on every keystroke is bad.
                                                        // Let's store raw string in local state if generic editor supports it?
                                                        // But `localConfig` expects `GroupedConfigItem` where `value` is `any`.
                                                        // Better to just treat JSON as readonly or use a better editor.
                                                        // For simplicity, I'll just use a text area that updates the value on BLUR or have a separate internal state for the text.
                                                        // To keep it simple, I won't implement complex JSON editing here. 
                                                        // Just simple readonly display or string input.
                                                        console.warn("Direct JSON editing not fully implemented in generic editor")
                                                    }
                                                } else {
                                                    handleInputChange(key, e.target.value, 'text')
                                                }
                                            }}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                                            rows={10}
                                            disabled={item.type === 'json'} // Disable JSON editing, enable Text editing
                                        />
                                    ) : (
                                        <input
                                            type={item.type === 'int' || item.type === 'float' ? 'number' : 'text'}
                                            step={item.type === 'float' ? 'any' : 1}
                                            id={`${configKey}-${key}`}
                                            value={item.value}
                                            onChange={(e) => handleInputChange(key, e.target.value, item.type)}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex space-x-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    )
}

export default GenericConfigEditor
