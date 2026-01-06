import React from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import Badge from '@/components/ui/badge/Badge'
import { ArrowUpIcon, DollarLineIcon, PieChartIcon, UserIcon } from '@/icons'

interface AssetHeaderProps {
    asset: any
    isConnected?: boolean
    locale: string
}

const AssetHeader: React.FC<AssetHeaderProps> = ({ asset, isConnected, locale }) => {
    const getStringValue = (value: any): string => {
        if (!value) return ''
        if (typeof value === 'string') return value
        if (typeof value === 'object') {
            if (value[locale]) return value[locale]
            if (value.en) return value.en
            if (value.ko) return value.ko
            const firstKey = Object.keys(value)[0]
            if (firstKey) return String(value[firstKey])
        }
        return String(value)
    }

    const assetName = getStringValue(asset.name)
    const assetTicker = getStringValue(asset.ticker)
    const assetTypeName = getStringValue(asset.type_name)
    const assetExchange = getStringValue(asset.exchange)
    const assetCurrency = getStringValue(asset.currency)
    const assetDescription = getStringValue(asset.description || asset.post_overview?.description)

    const websiteUrl = asset.website

    const renderTitle = () => (
        <div className="flex items-center gap-3">
            {asset.logo_image_url && (
                <img
                    src={asset.logo_image_url}
                    alt={`${assetName} Logo`}
                    className="w-8 h-8 object-contain rounded-full bg-white"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                    }}
                />
            )}
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{assetName}</span>
                    <span className="text-gray-500 text-sm">({assetTicker})</span>
                </div>
            </div>
        </div>
    )

    return (
        <ComponentCard
            title={
                websiteUrl ? (
                    <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:opacity-80 transition-opacity inline-flex items-center"
                    >
                        {renderTitle()}
                    </a>
                ) : (
                    renderTitle()
                )
            }
        >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                    <p className="text-gray-500 dark:text-gray-400">
                        {assetTypeName} • {assetExchange}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge color={asset.is_active ? "success" : "light"}>
                        {asset.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {assetCurrency && assetCurrency !== '-' && (
                        <Badge color="info">{assetCurrency}</Badge>
                    )}
                    {isConnected && (
                        <Badge color="success">
                            Live
                        </Badge>
                    )}
                </div>
            </div>

            {assetDescription && (
                <div
                    className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: assetDescription }}
                />
            )}
        </ComponentCard>
    )
}

export default AssetHeader
