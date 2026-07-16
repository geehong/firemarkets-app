export type CandlestickData = {
  time: string; // 'YYYY-MM-DD'
  open: number;
  high: number;
  low: number;
  close: number;
};

// Helper function to generate synthetic bubble data
function generateSyntheticData(
  startDate: string,
  days: number,
  basePrice: number,
  volatility: number,
  trendPhaseLength: number,
  peakMultiplier: number
): CandlestickData[] {
  const data: CandlestickData[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < days; i++) {
    const progress = i / trendPhaseLength;
    
    // Deterministic curve for a bubble cycle
    let curve = 0;
    if (progress < 0.4) {
      curve = Math.pow(progress / 0.4, 2); // slow start
    } else if (progress < 0.6) {
      curve = 1 + 5 * Math.pow((progress - 0.4) / 0.2, 3); // parabolic
    } else if (progress < 0.7) {
      curve = 6 - 5 * ((progress - 0.6) / 0.1); // crash
    } else {
      curve = 1 + 0.5 * Math.sin(progress * 10); // bear market chop
    }

    // Deterministic pseudo-random noise based on index (offset by peakMultiplier)
    const noise = (Math.sin(i * 13.7 + peakMultiplier) + Math.cos(i * 29.3 + peakMultiplier)) * volatility * 0.5;
    
    let currentPrice = basePrice * (1 + curve + noise);
    if (currentPrice < 1) currentPrice = 1;

    const open = currentPrice;
    const close = currentPrice * (1 + (Math.sin(i * 3.14) * volatility * 0.2));
    const high = Math.max(open, close) * (1 + Math.abs(Math.cos(i * 7.1)) * volatility * 0.1);
    const low = Math.min(open, close) * (1 - Math.abs(Math.sin(i * 5.3)) * volatility * 0.1);

    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
    }

    data.push({
      time: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });
  }
  return data;
}

// Generate past cycle data (Fractal) starting from 2020
export const fractalMockData: CandlestickData[] = generateSyntheticData(
  '2023-01-01',
  1000,
  150,
  0.08,
  800,
  10
);

// Generate current cycle data starting from 2023, tracking similarly to fractal
export const currentMockData: CandlestickData[] = generateSyntheticData(
  '2023-01-01',
  500, // Shorter duration to simulate being "in the middle" of the cycle
  200,
  0.07,
  700, // Slightly different cycle length so they don't perfectly overlap!
  8
);
