"""
Competitor mapping for news aggregation.

Maps a stock ticker to its top 3-5 direct competitors.
Edit this file to customize the mappings for your portfolio.
"""

COMPETITOR_MAP: dict[str, list[str]] = {
    # Mega-cap tech
    "AAPL": ["MSFT", "GOOG", "SAMSUNG", "META"],
    "MSFT": ["AAPL", "GOOG", "AMZN", "CRM"],
    "GOOG": ["MSFT", "META", "AAPL", "AMZN"],
    "GOOGL": ["MSFT", "META", "AAPL", "AMZN"],
    "AMZN": ["MSFT", "GOOG", "WMT", "SHOP"],
    "META": ["GOOG", "SNAP", "PINS", "TIKTOK"],
    "NVDA": ["AMD", "INTC", "AVGO", "QCOM"],
    "TSLA": ["RIVN", "GM", "F", "BYD", "LCID"],
    # Semiconductors
    "AMD": ["NVDA", "INTC", "QCOM", "AVGO"],
    "INTC": ["AMD", "NVDA", "TSM", "QCOM"],
    "AVGO": ["QCOM", "TXN", "NVDA", "MRVL"],
    "TSM": ["INTC", "SAMSUNG", "GFS", "UMC"],
    # Financials
    "JPM": ["BAC", "GS", "MS", "C"],
    "GS": ["MS", "JPM", "BAC", "UBS"],
    "V": ["MA", "PYPL", "SQ", "ADYEN"],
    "MA": ["V", "PYPL", "SQ", "ADYEN"],
    # Healthcare
    "UNH": ["CVS", "CI", "HUM", "ELV"],
    "JNJ": ["PFE", "MRK", "ABT", "LLY"],
    "LLY": ["NVO", "MRK", "PFE", "ABBV"],
    # Energy
    "XOM": ["CVX", "COP", "BP", "SHEL"],
    "CVX": ["XOM", "COP", "BP", "TTE"],
    # Consumer
    "WMT": ["COST", "TGT", "AMZN", "KR"],
    "COST": ["WMT", "TGT", "BJ", "KR"],
    "DIS": ["NFLX", "CMCSA", "WBD", "PARA"],
    "NFLX": ["DIS", "WBD", "PARA", "CMCSA"],
}


def get_competitors(symbol: str) -> list[str]:
    """Return competitor list for a symbol, or empty list if unknown."""
    return COMPETITOR_MAP.get(symbol.upper(), [])
