'use client'

import React, { useState } from 'react'
import { useGroupedConfigs, GroupedConfig, GroupedConfigItem } from '@/hooks/admin/useGroupedConfigs'

const ConfigValueEditor = ({ item, onChange }: { item: GroupedConfigItem, onChange: (val: any) => void }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        let val: any = e.target.value;
        if (item.type === 'int') val = parseInt(val);
        if (item.type === 'float') val = parseFloat(val);
        if (item.type === 'boolean') val = val === 'true';
        onChange(val);
    };

    if (item.type === 'boolean') {
        return (
            <select
                value={String(item.value)}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
                <option value="true">True</option>
                <option value="false">False</option>
            </select>
        );
    }

    if (item.type === 'json') {
        return (
            <textarea
                value={typeof item.value === 'string' ? item.value : JSON.stringify(item.value, null, 2)}
                onChange={(e) => {
                    try {
                        onChange(JSON.parse(e.target.value));
                    } catch (err) {
                        // Simply allow typing, validation happens on submit or we can add local state
                        // For now, simple raw edit
                        // Note: A real JSON editor would be better here
                    }
                }}
                rows={5}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono text-xs"
            />
        )
    }

    return (
        <input
            type={item.type === 'int' || item.type === 'float' ? 'number' : 'text'}
            value={item.value}
            onChange={handleChange}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
    );
};

export default function AdvancedConfigList() {
    const { data: configs, loading, error, updateConfig } = useGroupedConfigs();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<Record<string, GroupedConfigItem> | null>(null);

    if (loading) return <div className="p-4 text-center text-gray-500">Loading configurations...</div>;
    if (error) return <div className="p-4 text-center text-red-500">Error loading configurations: {error.message}</div>;

    const startEdit = (config: GroupedConfig) => {
        setEditingId(config.config_id);
        // Deep copy to avoid mutating state directly
        setEditValues(JSON.parse(JSON.stringify(config.config_value)));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValues(null);
    };

    const saveEdit = async (configKey: string) => {
        if (editValues) {
            const success = await updateConfig(configKey, editValues);
            if (success) {
                setEditingId(null);
                setEditValues(null);
            } else {
                alert('Failed to save configuration');
            }
        }
    };

    const handleValueChange = (key: string, newValue: any) => {
        if (editValues) {
            setEditValues({
                ...editValues,
                [key]: {
                    ...editValues[key],
                    value: newValue
                }
            });
        }
    };

    return (
        <div className="space-y-8">
            {configs.map(config => (
                <div key={config.config_id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">{config.config_key}</h3>
                            {config.description && <p className="text-sm text-gray-500">{config.description}</p>}
                        </div>
                        <div>
                            {editingId === config.config_id ? (
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => saveEdit(config.config_key)}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => startEdit(config)}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Edit
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            {(editingId === config.config_id && editValues ? Object.entries(editValues) : Object.entries(config.config_value)).map(([key, item]) => (
                                <div key={key} className="sm:col-span-3 lg:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 truncate" title={key}>
                                        {key}
                                    </label>
                                    <div className="mt-1">
                                        {editingId === config.config_id ? (
                                            <ConfigValueEditor item={item} onChange={(val) => handleValueChange(key, val)} />
                                        ) : (
                                            <div className="text-sm text-gray-900 break-words bg-gray-50 p-2 rounded border border-gray-100">
                                                {item.type === 'boolean' ? (item.value ? 'True' : 'False') :
                                                    item.type === 'json' ? <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(item.value, null, 2)}</pre> :
                                                        item.is_sensitive ? '********' : String(item.value)}
                                            </div>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p className="mt-1 text-xs text-gray-500 truncate">{item.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
