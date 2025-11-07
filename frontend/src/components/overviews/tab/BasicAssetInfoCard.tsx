import React from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import MarketDataSection from '@/components/overviews/tab/MarketDataSection'
import { formatDate, getStringValue } from '@/components/overviews/utils/formatters'

interface BasicAssetInfoCardProps {
  asset: any
  commonData?: any
}

const BasicAssetInfoCard: React.FC<BasicAssetInfoCardProps> = ({ asset, commonData }) => {
  return (
    <ComponentCard title="Asset Information">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <h4 className="font-medium mb-2">Basic Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Asset ID:</span>
              <span>{asset?.asset_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span>{getStringValue(asset?.type_name)}</span>
            </div>
            {asset?.exchange && (
              <div className="flex justify-between">
                <span className="text-gray-500">Exchange:</span>
                <span>{getStringValue(asset.exchange)}</span>
              </div>
            )}
            {asset?.currency && (
              <div className="flex justify-between">
                <span className="text-gray-500">Currency:</span>
                <span>{getStringValue(asset.currency)}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Timestamps</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Created:</span>
              <span>{formatDate(asset?.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Updated:</span>
              <span>{formatDate(asset?.updated_at)}</span>
            </div>
          </div>
        </div>

        <MarketDataSection asset={asset} commonData={commonData} />
      </div>
    </ComponentCard>
  )
}

export default BasicAssetInfoCard

