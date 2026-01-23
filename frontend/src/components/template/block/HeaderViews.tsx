import React from 'react'
import { Activity, Zap, TrendingUp, TrendingDown } from 'lucide-react'

interface AssetHeaderDetailProps {
    asset: any
    techData: any
    latestPrice: any
    displayPrice: number | undefined | null
    displayChange: number | undefined | null
    analysis: any
    fngData: any
    isCrypto: boolean
    locale: string
    assetName: string
    formattedTitle: string
    typeName: string
    identifier: string
    finalCoverImage?: string
    formatCurrency: (val: any) => string
}

export const AssetHeaderDetail: React.FC<AssetHeaderDetailProps> = ({
    asset,
    techData,
    latestPrice,
    displayPrice,
    displayChange,
    analysis,
    fngData,
    isCrypto,
    locale,
    assetName,
    formattedTitle,
    typeName,
    identifier,
    finalCoverImage,
    formatCurrency
}) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Activity className="w-24 h-24" />
            </div>
            
            <div className="flex items-center gap-4">

                {(() => {
                    const customIcons: Record<string, string> = {
                        'GC': '/images/icons/commodities/GOLD.svg',
                        'GC=F': '/images/icons/commodities/GOLD.svg',
                        'GOLD': '/images/icons/commodities/GOLD.svg',
                        'XAU': '/images/icons/commodities/GOLD.svg',
                        'SI': '/images/icons/commodities/SILVER.svg',
                        'SI=F': '/images/icons/commodities/SILVER.svg',
                        'SILVER': '/images/icons/commodities/SILVER.svg',
                        'XAG': '/images/icons/commodities/SILVER.svg',
                        'GCUSD': '/images/icons/commodities/GOLD.svg',
                        'SIUSD': '/images/icons/commodities/SILVER.svg',
                    }
                    const logoUrl = customIcons[identifier] || customIcons[identifier.toUpperCase()] || asset.logo_url
                    
                    if (!logoUrl && finalCoverImage) return null // Don't show empty placeholder if no logo

                    return (!finalCoverImage && logoUrl && (
                        <div className="p-1 bg-white rounded-xl shadow-lg shrink-0">
                            <img src={logoUrl} alt={assetName} className="w-10 h-10 md:w-12 md:h-12 object-contain" />
                        </div>
                    ))
                })()}
                <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-3 h-3 text-blue-400 fill-blue-400/20" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Intelligent Outlook</span>
                    </div>
                    <span className="text-2xl md:text-3xl font-black truncate">{formattedTitle}</span>
                    
                    {/* Price Display in Title Area */}
                    <div className="flex items-baseline gap-3 mt-3">
                        <span className="text-3xl md:text-4xl font-black text-white drop-shadow-md">
                            {formatCurrency(displayPrice)}
                        </span>
                        {(displayChange !== undefined && displayChange !== null) && (
                            <span className={`flex items-center text-base md:text-lg font-bold px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md ${displayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {displayChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />} 
                                {Math.abs(displayChange).toFixed(2)}%
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        {analysis && (
                            <>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${analysis.trend === 'bull' ? 'bg-green-500/20 text-green-400 border-green-500/30' : (analysis.trend === 'bear' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30')}`}>
                                    {analysis.trend === 'bull' ? (locale === 'ko' ? '상승' : 'Bullish') : (analysis.trend === 'bear' ? (locale === 'ko' ? '하락' : 'Bearish') : (locale === 'ko' ? '중립' : 'Neutral'))}
                                </span>
                                {analysis.signals.map((s: string, idx: number) => (
                                    <span key={idx} className="bg-white/5 border border-white/10 px-2.5 py-0.5 rounded text-[10px] font-medium text-white/70 whitespace-nowrap">{s}</span>
                                ))}
                            </>
                        )}
                        {isCrypto && fngData && (
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20">
                                <span className="text-[9px] font-bold text-white/50 uppercase tracking-tighter">Mood</span>
                                <span className={`text-[11px] font-black ${parseInt(fngData.value) > 60 ? 'text-green-400' : (parseInt(fngData.value) < 40 ? 'text-red-400' : 'text-amber-400')}`}>
                                    {fngData.value}
                                </span>
                                <span className="text-[10px] text-white/70 opacity-80 whitespace-nowrap">{fngData.value_classification}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export const AssetHeaderIndicators: React.FC<{
    items: { label: string, val: string, diff?: string | null }[]
}> = ({ items }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full max-w-[500px]">
            {items.map((item, i) => (
                <div key={i} className="flex flex-col bg-white/5 p-2 rounded-lg border border-white/10 backdrop-blur-sm">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter mb-0.5">{item.label}</span>
                    <span className="text-xs font-bold text-white leading-none whitespace-nowrap">{item.val}</span>
                    {item.diff && (
                        <span className={`text-[10px] font-medium mt-0.5 ${Number(item.diff) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {Number(item.diff) > 0 ? '+' : ''}{item.diff}%
                        </span>
                    )}
                </div>
            ))}
        </div>
    )
}
