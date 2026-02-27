import uuid
from datetime import datetime

from pydantic import BaseModel


class BriefingRequest(BaseModel):
    portfolio_id: uuid.UUID


class HoldingAnalysis(BaseModel):
    symbol: str
    thesis: str | None
    analysis: str
    sentiment: str


class MacroIndicator(BaseModel):
    value: float | None = None
    previous_close: float | None = None
    change_pct: float | None = None
    error: str | None = None


class StockSnapshot(BaseModel):
    symbol: str = ""
    current_price: float | None = None
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None
    pe_ratio: float | None = None
    forward_pe: float | None = None
    market_cap: float | None = None
    perf_1m_pct: float | None = None
    perf_3m_pct: float | None = None
    volume_ratio_5d_20d: float | None = None
    error: str | None = None
    fetched_at: str | None = None


class NewsItem(BaseModel):
    title: str
    source: str = ""
    url: str = ""
    published_at: str = ""


class MarketSnapshot(BaseModel):
    stocks: dict[str, StockSnapshot] = {}
    macro: dict[str, MacroIndicator] = {}
    news: dict[str, list[NewsItem]] = {}
    fetched_at: str | None = None


class BriefingResponse(BaseModel):
    portfolio_id: uuid.UUID
    generated_at: datetime
    holdings_analyses: list[HoldingAnalysis]
    portfolio_summary: str
    risk_alerts: list[str]
    market_snapshot: MarketSnapshot | None = None
