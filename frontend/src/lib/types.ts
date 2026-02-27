export interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  avg_cost: number;
  thesis: string | null;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  name: string;
  created_at: string;
  holdings: Holding[];
}

export interface HoldingCreatePayload {
  symbol: string;
  quantity: number;
  avg_cost: number;
  thesis?: string | null;
}

export interface HoldingAnalysis {
  symbol: string;
  thesis: string | null;
  analysis: string;
  sentiment: string;
}

export interface MacroIndicator {
  value: number | null;
  previous_close: number | null;
  change_pct: number | null;
  error?: string;
}

export interface StockSnapshot {
  symbol: string;
  current_price: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  pe_ratio: number | null;
  forward_pe: number | null;
  market_cap: number | null;
  perf_1m_pct: number | null;
  perf_3m_pct: number | null;
  volume_ratio_5d_20d: number | null;
  error?: string;
  fetched_at: string | null;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  published_at: string;
}

export interface MarketSnapshot {
  stocks: Record<string, StockSnapshot>;
  macro: Record<string, MacroIndicator>;
  news: Record<string, NewsItem[]>;
  fetched_at: string | null;
}

export interface BriefingResponse {
  portfolio_id: string;
  generated_at: string;
  holdings_analyses: HoldingAnalysis[];
  portfolio_summary: string;
  risk_alerts: string[];
  market_snapshot: MarketSnapshot | null;
}
