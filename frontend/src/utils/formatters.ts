
export const getStringValue = (value: any, lang: 'ko' | 'en' = 'ko'): string => {
    if (!value) return '-'
    if (typeof value === 'string') return value
    if (typeof value === 'object') {
        if (value[lang]) return String(value[lang])
        if (value.ko) return String(value.ko)
        if (value.en) return String(value.en)
        const firstKey = Object.keys(value)[0]
        if (firstKey) return String(value[firstKey])
    }
    return String(value)
}

export const formatDate = (dateInput: any) => {
    if (!dateInput) return '-'
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return '-'
    return date.toISOString().split('T')[0]
}

export const formatIPODate = (dateInput: any) => {
    if (!dateInput) return '-'
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return '-'
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export const formatTime = (timestamp: any) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return '-'
    return date.toISOString().split('T')[1].split('.')[0]
}

export const toNumber = (value: any): number | null => {
    if (value === null || value === undefined) return null
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

export const formatNumberWithLocale = (value: any, options?: Intl.NumberFormatOptions) => {
    const num = toNumber(value)
    if (num === null) return '-'
    return num.toLocaleString('en-US', options)
}


export const formatPercent = (value: any, fractionDigits = 2) => {
    const num = toNumber(value)
    if (num === null) return '-'
    return `${num.toFixed(fractionDigits)}%`
}

export const formatLargeNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    if (Math.abs(num) >= 1e12) {
        return `${(num / 1e12).toFixed(2)}T`;
    }
    if (Math.abs(num) >= 1e9) {
        return `${(num / 1e9).toFixed(2)}B`;
    }
    if (Math.abs(num) >= 1e6) {
        return `${(num / 1e6).toFixed(2)}M`;
    }
    if (Math.abs(num) >= 1e3) {
        return `${(num / 1e3).toFixed(2)}K`;
    }
    
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};
