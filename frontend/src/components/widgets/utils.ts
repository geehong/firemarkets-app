export const formatCurrency = (value: number | null | undefined, type: string = 'crypto') => {
    if (value === undefined || value === null) return '---';
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: type === 'crypto' && value < 1 ? 6 : 2
    });
};

export const formatChange = (value: number | null | undefined) => {
    if (value === undefined || value === null) return '0.00%';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};
