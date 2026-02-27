"""
Market data service — fetches real-time financial data, macro indicators, and news.

Providers:
  - yfinance: stock quotes, fundamentals, price history, macro indices
  - NewsAPI.org: recent headlines for holdings and competitors

All yfinance calls run via asyncio.to_thread() since yfinance is synchronous.
NewsAPI calls use httpx.AsyncClient for native async.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
import yfinance as yf

from app.core.config import settings
from app.services.competitors import get_competitors

logger = logging.getLogger(__name__)


# ── Stock data (yfinance, sync → threaded) ────────────────────────────


def _fetch_stock_data_sync(symbol: str) -> dict[str, Any]:
    ticker = yf.Ticker(symbol)
    info = ticker.info

    # 1-month and 3-month price performance
    perf_1m = None
    perf_3m = None
    try:
        hist_3m = ticker.history(period="3mo")
        if len(hist_3m) >= 2:
            price_now = hist_3m["Close"].iloc[-1]
            price_3m_ago = hist_3m["Close"].iloc[0]
            perf_3m = ((price_now - price_3m_ago) / price_3m_ago) * 100

            one_month_idx = max(0, len(hist_3m) - 21)
            price_1m_ago = hist_3m["Close"].iloc[one_month_idx]
            perf_1m = ((price_now - price_1m_ago) / price_1m_ago) * 100
    except Exception:
        pass

    # Volume trend: average last 5 days vs last 20 days
    volume_ratio = None
    try:
        hist_vol = ticker.history(period="1mo")
        if len(hist_vol) >= 20:
            vol_5d = hist_vol["Volume"].iloc[-5:].mean()
            vol_20d = hist_vol["Volume"].iloc[-20:].mean()
            if vol_20d > 0:
                volume_ratio = vol_5d / vol_20d
    except Exception:
        pass

    return {
        "symbol": symbol,
        "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
        "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
        "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
        "pe_ratio": info.get("trailingPE"),
        "forward_pe": info.get("forwardPE"),
        "market_cap": info.get("marketCap"),
        "perf_1m_pct": round(perf_1m, 2) if perf_1m is not None else None,
        "perf_3m_pct": round(perf_3m, 2) if perf_3m is not None else None,
        "volume_ratio_5d_20d": round(volume_ratio, 2) if volume_ratio is not None else None,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


async def fetch_stock_data(symbol: str) -> dict[str, Any]:
    try:
        return await asyncio.to_thread(_fetch_stock_data_sync, symbol)
    except Exception as e:
        logger.warning("Failed to fetch stock data for %s: %s", symbol, e)
        return {
            "symbol": symbol,
            "error": str(e),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }


# ── Macro indicators (yfinance, sync → threaded) ──────────────────────

MACRO_SYMBOLS = {
    "VIX": "^VIX",
    "US_10Y_YIELD": "^TNX",
    "DXY": "DX-Y.NYB",
    "CRUDE_OIL": "CL=F",
}


def _fetch_macro_sync() -> dict[str, Any]:
    result = {}
    for label, yf_symbol in MACRO_SYMBOLS.items():
        try:
            ticker = yf.Ticker(yf_symbol)
            info = ticker.info
            result[label] = {
                "value": info.get("regularMarketPrice"),
                "previous_close": info.get("regularMarketPreviousClose"),
                "change_pct": info.get("regularMarketChangePercent"),
            }
        except Exception as e:
            logger.warning("Failed to fetch macro %s (%s): %s", label, yf_symbol, e)
            result[label] = {"value": None, "error": str(e)}
    return result


async def fetch_macro_indicators() -> dict[str, Any]:
    try:
        data = await asyncio.to_thread(_fetch_macro_sync)
        data["fetched_at"] = datetime.now(timezone.utc).isoformat()
        return data
    except Exception as e:
        logger.warning("Failed to fetch macro indicators: %s", e)
        return {"error": str(e), "fetched_at": datetime.now(timezone.utc).isoformat()}


# ── News (NewsAPI, async via httpx) ───────────────────────────────────

NEWSAPI_BASE = "https://newsapi.org/v2/everything"


async def fetch_news(symbol: str, max_articles: int = 7) -> list[dict[str, str]]:
    if not settings.newsapi_key:
        return []

    competitors = get_competitors(symbol)
    query_terms = [symbol] + competitors[:5]
    query = " OR ".join(query_terms)

    params = {
        "q": query,
        "sortBy": "publishedAt",
        "pageSize": max_articles,
        "language": "en",
        "apiKey": settings.newsapi_key,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(NEWSAPI_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()

        return [
            {
                "title": a.get("title", ""),
                "source": a.get("source", {}).get("name", ""),
                "url": a.get("url", ""),
                "published_at": a.get("publishedAt", ""),
            }
            for a in data.get("articles", [])
            if a.get("title")
        ]
    except Exception as e:
        logger.warning("Failed to fetch news for %s: %s", symbol, e)
        return []


# ── Aggregator ────────────────────────────────────────────────────────


async def fetch_all_market_data(symbols: list[str]) -> dict[str, Any]:
    fetched_at = datetime.now(timezone.utc).isoformat()

    stock_tasks = [fetch_stock_data(s) for s in symbols]
    news_tasks = [fetch_news(s) for s in symbols]
    macro_task = fetch_macro_indicators()

    all_results = await asyncio.gather(
        *stock_tasks,
        *news_tasks,
        macro_task,
        return_exceptions=True,
    )

    n = len(symbols)
    stock_results = all_results[:n]
    news_results = all_results[n : 2 * n]
    macro_result = all_results[2 * n]

    stocks = {}
    for i, sym in enumerate(symbols):
        r = stock_results[i]
        stocks[sym] = r if isinstance(r, dict) else {"symbol": sym, "error": str(r)}

    news = {}
    for i, sym in enumerate(symbols):
        r = news_results[i]
        news[sym] = r if isinstance(r, list) else []

    macro = macro_result if isinstance(macro_result, dict) else {"error": str(macro_result)}

    return {
        "stocks": stocks,
        "macro": macro,
        "news": news,
        "fetched_at": fetched_at,
    }
