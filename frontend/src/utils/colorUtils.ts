
/**
 * Interpolates a color based on a percentage value.
 * Range: -50% to 50%
 * Stops: -50% (Red #f73539), 0% (Grey #414555), 50% (Green #2ecc59)
 */
export const interpolateColor = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return 'transparent';

    const minVal = -50;
    const maxVal = 50;
    const midVal = 0;

    const minColor = [247, 53, 57];   // #f73539
    const midColor = [65, 69, 85];    // #414555
    const maxColor = [46, 204, 89];   // #2ecc59

    let r, g, b;

    if (value <= minVal) return `rgb(${minColor.join(',')})`;
    if (value >= maxVal) return `rgb(${maxColor.join(',')})`;

    if (value < midVal) {
        // Interpolate between min and mid
        const ratio = (value - minVal) / (midVal - minVal);
        r = Math.round(minColor[0] + (midColor[0] - minColor[0]) * ratio);
        g = Math.round(minColor[1] + (midColor[1] - minColor[1]) * ratio);
        b = Math.round(minColor[2] + (midColor[2] - minColor[2]) * ratio);
    } else {
        // Interpolate between mid and max
        const ratio = (value - midVal) / (maxVal - midVal);
        r = Math.round(midColor[0] + (maxColor[0] - midColor[0]) * ratio);
        g = Math.round(midColor[1] + (maxColor[1] - midColor[1]) * ratio);
        b = Math.round(midColor[2] + (maxColor[2] - midColor[2]) * ratio);
    }

    return `rgb(${r}, ${g}, ${b})`;
};
