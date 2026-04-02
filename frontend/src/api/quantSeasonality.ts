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
  rsi_backtest: {
    [timeframe: string]: {
      win_rate: number;
      avg_win: number;
      avg_loss: number;
      total_trades: number;
    }
  };
}

export const fetchQuantSeasonality = async (params: {
  rateRegime?: 'all' | 'hiking' | 'cutting';
  compare?: string;
  days?: number;
  tz_offset?: number;
  rsi_buy?: number;
  rsi_sell?: number;
}): Promise<QuantSeasonalityResponse> => {
  // Only include defined parameters
  const cleanParams: any = {};
  Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
          cleanParams[key] = val;
      }
  });

  const query = new URLSearchParams(cleanParams).toString();
  const res = await fetch(`/api/v2/assets/quant-seasonality?${query}`);
  if (!res.ok) throw new Error('Failed to fetch quant seasonality');
  return res.json();
};
