// mathUtils.ts

/**
 * Calculates Pearson Correlation Coefficient between two numeric arrays
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0; // Return 0 or throw an error based on your preference
  }

  const n = x.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Calculates the direction agreement rate (up/down matches) between two arrays
 */
export function calculateAgreementRate(base: number[], fractal: number[]): number {
  if (base.length !== fractal.length || base.length < 2) return 0;

  let matches = 0;
  const comparisons = base.length - 1;

  for (let i = 1; i < base.length; i++) {
    const baseDir = base[i] >= base[i - 1] ? 1 : -1;
    const fractalDir = fractal[i] >= fractal[i - 1] ? 1 : -1;
    if (baseDir === fractalDir) {
      matches++;
    }
  }

  return (matches / comparisons) * 100;
}

/**
 * Linearly interpolates a value inside an array
 * Used for dynamic time warping / rubber banding
 */
export function interpolateArray(arr: any[], newLength: number) {
  if (newLength === arr.length) return [...arr];
  if (newLength === 0) return [];
  if (arr.length === 1) return Array(newLength).fill(arr[0]);

  const result = [];
  const ratio = (arr.length - 1) / (newLength - 1);

  for (let i = 0; i < newLength; i++) {
    const floatIndex = i * ratio;
    const lowerIndex = Math.floor(floatIndex);
    const upperIndex = Math.ceil(floatIndex);
    const weight = floatIndex - lowerIndex;

    if (lowerIndex === upperIndex) {
      result.push(arr[lowerIndex]);
    } else {
      // Very basic linear interpolation for generic objects, assuming we interpolate numbers
      // For candlestick data, we would interpolate open, high, low, close
      const valLower = arr[lowerIndex];
      const valUpper = arr[upperIndex];
      
      if (typeof valLower === 'object') {
        const interpolatedObj: any = { ...valLower };
        for (const key of ['open', 'high', 'low', 'close']) {
           if (valLower[key] !== undefined && valUpper[key] !== undefined) {
               interpolatedObj[key] = valLower[key] * (1 - weight) + valUpper[key] * weight;
           }
        }
        result.push(interpolatedObj);
      } else {
        result.push(valLower * (1 - weight) + valUpper * weight);
      }
    }
  }
  return result;
}
