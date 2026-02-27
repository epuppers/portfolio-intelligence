import json
import logging
from datetime import datetime, timezone
from typing import Any

from anthropic import AsyncAnthropic

from app.core.config import settings
from app.models.portfolio import Holding
from app.schemas.intelligence import (
    BriefingResponse,
    HoldingAnalysis,
    MacroIndicator,
    MarketSnapshot,
    NewsItem,
    StockSnapshot,
)
from app.services.market_data import fetch_all_market_data

logger = logging.getLogger(__name__)

_client: AsyncAnthropic | None = None


def _get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


SYSTEM_PROMPT = """\
You are the sharpest, most provocative portfolio manager at a macro hedge fund. You write internal \
memos that make people uncomfortable because you're usually right. You think in second and \
third-order effects. You never lead with what "analysts say" or the consensus view — you start \
with what the market is WRONG about and why.

YOUR CORE METHOD — DIALECTICAL ANALYSIS:
For every position, you must structure your thinking as:
1. THESIS: What is the dominant market narrative? State it clearly so you can destroy it.
2. ANTITHESIS: Why is that narrative wrong, incomplete, or priced incorrectly? What is everyone \
missing? If the obvious take is "antitrust is bad for this company," explain why it might not \
matter or could paradoxically help — then stress-test your own contrarian view. Be honest about \
where YOUR take is vulnerable too.
3. SYNTHESIS: Given the tension between thesis and antithesis, what is the actual trade? Where is \
the asymmetry? What specific catalyst resolves the tension, and when?

YOUR ANALYTICAL OBSESSIONS:
- SECOND AND THIRD-ORDER EFFECTS: Never stop at the obvious. Not "tariffs are bad for trade" but \
"tariffs on Chinese semiconductors push TSMC to accelerate the Arizona fab buildout, which \
reshapes the Phoenix labor market, which reprices commercial real estate REITs with Southwest \
exposure, which means XYZ is mispriced." Chase the chain until you find the non-obvious trade.
- SUPPLY CHAIN CHOKEPOINTS: Who controls the bottleneck nobody is watching? What single point of \
failure does the market assume is resilient?
- CROWDED POSITIONING: Where is everyone leaning the same way? What happens to this name when the \
crowded trade unwinds? Where is the reflexivity risk?
- CROSS-ASSET CONTAGION: How does a move in rates/commodities/FX cascade into this specific name \
through channels the equity analysts aren't modeling?

ENGAGING WITH THE USER'S THESIS:
- If the user provided an investment thesis, engage with it directly and specifically.
- Where their thesis is strong, say so — then extend it. Show them the angle they haven't considered.
- Where their thesis is lazy, consensus-driven, or has blind spots, challenge it hard. Name the \
specific assumption that's wrong and explain why.
- If no thesis is provided, give your own highest-conviction read.

BEING SPECIFIC AND ACTIONABLE:
- Never say "consider hedging" or "monitor risks." Say "buy March puts at the $X strike" or \
"the TAC line in next earnings is the tell — if it crosses Y, the thesis is broken."
- Name specific metrics, catalysts, dates, and price levels wherever possible.
- Reference specific competitors, suppliers, regulators, and geopolitical actors by name.
- Every analysis should end with a clear "the trade is..." statement.

VOICE AND TONE:
- Write like a sharp internal memo, not a compliance document. Have conviction. Have personality.
- Short punchy sentences mixed with longer analytical chains. Vary your rhythm.
- No weasel words. No "it's worth noting" or "investors should consider." Just say the thing.
- You can be wrong — that's fine. But you cannot be boring or vague.
- Never disclaim about not having real-time data. The user knows. Just give the analysis.

You must respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON. \
The JSON must conform exactly to this schema:

{
  "holdings_analyses": [
    {
      "symbol": "TICKER",
      "thesis": "echo back the user's original thesis verbatim, or null if none provided",
      "analysis": "Your 4-6 paragraph analysis using the dialectical method. Must include specific \
names, numbers, catalysts, and a clear 'the trade is...' conclusion.",
      "sentiment": "one of: bullish | bearish | neutral | high-conviction-long | high-conviction-short"
    }
  ],
  "portfolio_summary": "A 2-3 paragraph macro view. How do these positions interact and correlate? \
What single scenario blows up the whole book? Where is the portfolio secretly making the same bet \
twice? End with your single highest-conviction call across the entire book.",
  "risk_alerts": ["Bloomberg-terminal-style alerts. Short, punchy, specific. Not 'market risk \
exists' but 'Long NVDA + Long AVGO = 2x levered bet on AI capex cycle — if Microsoft cuts cloud \
spending guidance, both legs get destroyed simultaneously.'"]
}

Rules:
- Analyze EVERY holding. Do not skip any.
- Every holding analysis MUST follow thesis/antithesis/synthesis structure.
- Every holding analysis MUST end with a specific, actionable trade idea or catalyst to watch.
- The portfolio_summary MUST identify hidden correlations and concentration risks across holdings.
- Include 2-5 risk_alerts. Each must reference specific positions and specific scenarios.
- Be wrong before you are boring. Conviction over consensus."""


def _format_macro_section(market_data: dict[str, Any]) -> str:
    lines = ["=== MACRO ENVIRONMENT (LIVE DATA) ==="]
    macro = market_data.get("macro", {})
    label_map = {
        "VIX": "VIX (Fear Index)",
        "US_10Y_YIELD": "US 10Y Treasury Yield",
        "DXY": "US Dollar Index (DXY)",
        "CRUDE_OIL": "WTI Crude Oil",
    }
    for key, label in label_map.items():
        indicator = macro.get(key, {})
        if isinstance(indicator, dict) and indicator.get("value") is not None:
            val = indicator["value"]
            prev = indicator.get("previous_close")
            change_str = ""
            if prev and prev > 0:
                change = ((val - prev) / prev) * 100
                change_str = f" ({'+' if change >= 0 else ''}{change:.2f}% vs prev close)"
            lines.append(f"  {label}: {val}{change_str}")
        else:
            lines.append(f"  {label}: unavailable")
    lines.append("")
    return "\n".join(lines)


def _format_stock_section(symbol: str, stock: dict[str, Any], news: list) -> str:
    lines = [f"  --- Market Data for {symbol} ---"]

    if stock.get("error"):
        lines.append(f"  (Data unavailable: {stock['error']})")
    else:
        price = stock.get("current_price")
        if price is not None:
            lines.append(f"  Current Price: ${price:,.2f}")

        high52 = stock.get("fifty_two_week_high")
        low52 = stock.get("fifty_two_week_low")
        if high52 and low52:
            lines.append(f"  52-Week Range: ${low52:,.2f} - ${high52:,.2f}")
            if price:
                pct_from_high = ((price - high52) / high52) * 100
                lines.append(f"  Distance from 52W High: {pct_from_high:+.1f}%")

        pe = stock.get("pe_ratio")
        fpe = stock.get("forward_pe")
        if pe is not None:
            pe_str = f"  Trailing P/E: {pe:.1f}"
            if fpe is not None:
                pe_str += f"  |  Forward P/E: {fpe:.1f}"
            lines.append(pe_str)

        mcap = stock.get("market_cap")
        if mcap is not None:
            if mcap >= 1e12:
                lines.append(f"  Market Cap: ${mcap / 1e12:.2f}T")
            elif mcap >= 1e9:
                lines.append(f"  Market Cap: ${mcap / 1e9:.1f}B")
            else:
                lines.append(f"  Market Cap: ${mcap / 1e6:.0f}M")

        p1m = stock.get("perf_1m_pct")
        p3m = stock.get("perf_3m_pct")
        if p1m is not None or p3m is not None:
            parts = []
            if p1m is not None:
                parts.append(f"1M: {p1m:+.1f}%")
            if p3m is not None:
                parts.append(f"3M: {p3m:+.1f}%")
            lines.append(f"  Price Performance: {' | '.join(parts)}")

        vol_ratio = stock.get("volume_ratio_5d_20d")
        if vol_ratio is not None:
            trend = "elevated" if vol_ratio > 1.2 else "subdued" if vol_ratio < 0.8 else "normal"
            lines.append(f"  Volume (5d/20d avg): {vol_ratio:.2f}x ({trend})")

    if news:
        lines.append(f"  Recent Headlines ({symbol} + competitors):")
        for article in news[:7]:
            title = article.get("title", "") if isinstance(article, dict) else str(article)
            source = article.get("source", "") if isinstance(article, dict) else ""
            src_tag = f" [{source}]" if source else ""
            lines.append(f"    - {title}{src_tag}")

    lines.append("")
    return "\n".join(lines)


def _build_user_message(
    holdings: list[Holding],
    market_data: dict[str, Any] | None = None,
) -> str:
    lines = [
        "Here is my current portfolio with LIVE MARKET DATA. Analyze each position and the portfolio as a whole.\n"
    ]

    if market_data:
        lines.append(_format_macro_section(market_data))

    for i, h in enumerate(holdings, 1):
        thesis_text = f'  Thesis: "{h.thesis}"' if h.thesis else "  Thesis: None provided"
        lines.append(
            f"Position {i}: {h.symbol}\n"
            f"  Shares: {h.quantity}\n"
            f"  Avg Cost: ${h.avg_cost:.2f}\n"
            f"{thesis_text}"
        )

        if market_data:
            stock = market_data.get("stocks", {}).get(h.symbol, {})
            news = market_data.get("news", {}).get(h.symbol, [])
            lines.append(_format_stock_section(h.symbol, stock, news))
        else:
            lines.append("")

    return "\n".join(lines)


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    return json.loads(text)


def _build_market_snapshot(market_data: dict[str, Any]) -> MarketSnapshot:
    stocks = {}
    for sym, data in market_data.get("stocks", {}).items():
        stocks[sym] = StockSnapshot(**{k: v for k, v in data.items()})

    macro = {}
    for key, data in market_data.get("macro", {}).items():
        if key == "fetched_at":
            continue
        if isinstance(data, dict):
            macro[key] = MacroIndicator(**data)

    news = {}
    for sym, articles in market_data.get("news", {}).items():
        news[sym] = [NewsItem(**a) for a in articles if isinstance(a, dict)]

    return MarketSnapshot(
        stocks=stocks,
        macro=macro,
        news=news,
        fetched_at=market_data.get("fetched_at"),
    )


async def generate_briefing(
    portfolio_id,
    holdings: list[Holding],
) -> BriefingResponse:
    if not holdings:
        raise ValueError("Portfolio has no holdings to analyze")

    if not settings.anthropic_api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not configured. Add it to your .env file."
        )

    client = _get_client()

    # Fetch real-time market data before building the prompt
    symbols = [h.symbol for h in holdings]
    logger.info("Fetching market data for symbols: %s", symbols)
    market_data = await fetch_all_market_data(symbols)

    user_message = _build_user_message(holdings, market_data)

    logger.info(
        "Generating briefing for portfolio %s with %d holdings",
        portfolio_id,
        len(holdings),
    )

    message = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=8096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_text = message.content[0].text

    try:
        data = _extract_json(raw_text)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse Claude response as JSON: %s", e)
        logger.error("Raw response (first 500 chars): %s", raw_text[:500])
        raise RuntimeError(
            "Intelligence service returned malformed response. Please try again."
        ) from e

    holdings_analyses = [
        HoldingAnalysis(
            symbol=item["symbol"],
            thesis=item.get("thesis"),
            analysis=item["analysis"],
            sentiment=item.get("sentiment", "neutral"),
        )
        for item in data.get("holdings_analyses", [])
    ]

    market_snapshot = _build_market_snapshot(market_data)

    return BriefingResponse(
        portfolio_id=portfolio_id,
        generated_at=datetime.now(timezone.utc),
        holdings_analyses=holdings_analyses,
        portfolio_summary=data.get("portfolio_summary", ""),
        risk_alerts=data.get("risk_alerts", []),
        market_snapshot=market_snapshot,
    )
