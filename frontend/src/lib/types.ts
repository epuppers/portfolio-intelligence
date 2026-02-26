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
