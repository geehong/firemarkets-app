export interface TimeframeWinRate {
  win_rate: number;
  avg_up: number;
  avg_down: number;
  profit_factor: number;
}

export interface MonthlySeasonality {
  [year: string]: {
    [month: string]: number;
  };
}

export interface QuarterlySeasonality {
  [quarter: string]: number;
}

export interface RollingCorrelationPoint {
  date: string;
  r30: number;
  r90: number;
}

export interface IntradayEffect {
  by_hour: { hour: number; avg_return: number }[];
  by_weekday: { day: string; avg_return: number }[];
}

export interface QuantSeasonalityResponse {
  generated_at: string;
  timeframe_winrate: { [key: string]: TimeframeWinRate };
  monthly_seasonality: {
    all: MonthlySeasonality;
    hiking: MonthlySeasonality;
    cutting: MonthlySeasonality;
  };
  quarterly_seasonality: {
    all: QuarterlySeasonality;
    hiking: QuarterlySeasonality;
    cutting: QuarterlySeasonality;
  };
  rolling_correlation: {
    [ticker: string]: RollingCorrelationPoint[];
  };
  intraday_effect: IntradayEffect;
}

export const fetchQuantSeasonality = async (params: {
  rateRegime?: 'all' | 'hiking' | 'cutting';
  compare?: string;
}): Promise<QuantSeasonalityResponse> => {
  const query = new URLSearchParams(params as any).toString();
  const res = await fetch(`/api/v2/assets/quant-seasonality?${query}`);
  if (!res.ok) throw new Error('Failed to fetch quant seasonality');
  return res.json();
};
