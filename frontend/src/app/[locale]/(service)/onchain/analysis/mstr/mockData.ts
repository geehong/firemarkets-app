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
  let currentPrice = basePrice;
  const start = new Date(startDate);

  for (let i = 0; i < days; i++) {
    // Phase 1: Accumulation (Slow rise)
    // Phase 2: Parabolic advance
    // Phase 3: Sharp drop
    // Phase 4: Bear market consolidation
    
    let trend = 0;
    const progress = i / trendPhaseLength;
    
    if (progress < 0.3) {
      trend = 0.005; // Accumulation
    } else if (progress < 0.6) {
      trend = 0.03 * (progress * 2); // Parabolic
    } else if (progress < 0.7) {
      trend = -0.05; // Sharp drop
    } else {
      trend = -0.005; // Bear market bleeding
    }

    // Add noise
    const noise = (Math.random() - 0.5) * volatility;
    currentPrice = currentPrice * (1 + trend + noise);
    
    if (currentPrice < 1) currentPrice = 1; // Floor

    const open = currentPrice;
    const close = currentPrice * (1 + (Math.random() - 0.5) * volatility * 0.5);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.2);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.2);

    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    // Skip weekends to make it realistic for stock data
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
  800,
  8
);
