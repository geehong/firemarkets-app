
import React from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import MarketDataSection from './MarketDataSection'
import { formatDate, getStringValue } from '@/utils/formatters'

interface BasicAssetInfoCardProps {
    asset: any
    commonData?: any
}

const BasicAssetInfoCard: React.FC<BasicAssetInfoCardProps> = ({ asset, commonData }) => {
    return (
        <ComponentCard title="Asset Information">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Basic Information</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Asset ID:</span>
                            <span className="font-medium">{asset?.asset_id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Type:</span>
                            <span className="font-medium">{getStringValue(asset?.type_name)}</span>
                        </div>
                        {asset?.exchange && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Exchange:</span>
                                <span className="font-medium">{getStringValue(asset.exchange)}</span>
                            </div>
                        )}
                        {asset?.currency && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Currency:</span>
                                <span className="font-medium">{getStringValue(asset.currency)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Timestamps</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Created:</span>
                            <span className="font-medium">{formatDate(asset?.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Updated:</span>
                            <span className="font-medium">{formatDate(asset?.updated_at)}</span>
                        </div>
                    </div>
                </div>

                <MarketDataSection asset={asset} commonData={commonData} />
            </div>
        </ComponentCard>
    )
}

export default BasicAssetInfoCard
