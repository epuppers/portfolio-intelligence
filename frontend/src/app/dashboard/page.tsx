"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Portfolio, Holding, HoldingCreatePayload, BriefingResponse } from "@/lib/types";

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [thesis, setThesis] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  const refreshPortfolio = useCallback(async () => {
    try {
      const portfolios = await apiFetch<Portfolio[]>("/api/portfolios/");
      if (portfolios.length > 0) {
        setPortfolio(portfolios[0]);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPortfolio();
  }, [refreshPortfolio]);

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolio) return;

    setSubmitting(true);
    try {
      const payload: HoldingCreatePayload = {
        symbol: symbol.toUpperCase().trim(),
        quantity: parseFloat(quantity),
        avg_cost: parseFloat(avgCost),
        thesis: thesis.trim() || null,
      };

      await apiFetch<Holding>(`/api/portfolios/${portfolio.id}/holdings`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSymbol("");
      setQuantity("");
      setAvgCost("");
      setThesis("");
      await refreshPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holding");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (holdingId: string) => {
    if (!portfolio) return;

    try {
      await apiFetch(`/api/portfolios/${portfolio.id}/holdings/${holdingId}`, {
        method: "DELETE",
      });
      await refreshPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete holding");
    }
  };

  const handleGenerateBriefing = async () => {
    if (!portfolio || portfolio.holdings.length === 0) return;

    setBriefingLoading(true);
    setBriefingError(null);
    setBriefing(null);

    try {
      const result = await apiFetch<BriefingResponse>(
        "/api/intelligence/briefing",
        {
          method: "POST",
          body: JSON.stringify({ portfolio_id: portfolio.id }),
        }
      );
      setBriefing(result);
    } catch (err) {
      setBriefingError(
        err instanceof Error ? err.message : "Failed to generate briefing"
      );
    } finally {
      setBriefingLoading(false);
    }
  };

  const sentimentColor = (s: string): string => {
    switch (s) {
      case "bullish":
      case "high-conviction-long":
        return "text-terminal-green";
      case "bearish":
      case "high-conviction-short":
        return "text-red-400";
      default:
        return "text-terminal-amber";
    }
  };

  const sentimentLabel = (s: string): string => {
    switch (s) {
      case "high-conviction-long":
        return "HIGH CONVICTION LONG";
      case "high-conviction-short":
        return "HIGH CONVICTION SHORT";
      default:
        return s.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen scanlines crt-vignette">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-8 border-b border-terminal-border pb-4">
          <h1 className="text-2xl font-bold text-terminal-green text-glow tracking-wider uppercase">
            Portfolio Intelligence Terminal
          </h1>
          <p className="text-terminal-green-dim text-sm mt-1">
            <span className="text-terminal-amber">&gt;</span> Holdings
            Management System v0.1.0
          </p>
        </header>

        {/* Error display */}
        {error && (
          <div className="mb-6 border border-red-500/50 bg-red-500/10 text-red-400 px-4 py-2 text-sm">
            <span className="text-red-500 font-bold">ERR:</span> {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 underline hover:text-red-300"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Add Holding Form */}
        <section className="mb-8 border border-terminal-border bg-terminal-bg-light p-6">
          <h2 className="text-sm font-bold text-terminal-amber uppercase tracking-widest mb-4">
            <span className="text-terminal-green">&gt;</span> Add Position
          </h2>
          <form onSubmit={handleAddHolding} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-terminal-green-dim uppercase tracking-wider mb-1">
                  Ticker
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="AAPL"
                  required
                  maxLength={20}
                  className="w-full bg-terminal-bg border border-terminal-border text-terminal-green
                    px-3 py-2 text-sm placeholder:text-terminal-green-dark
                    focus:outline-none focus:border-terminal-green focus:text-glow-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-terminal-green-dim uppercase tracking-wider mb-1">
                  Shares
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="100"
                  required
                  step="any"
                  min="0"
                  className="w-full bg-terminal-bg border border-terminal-border text-terminal-green
                    px-3 py-2 text-sm placeholder:text-terminal-green-dark
                    focus:outline-none focus:border-terminal-green"
                />
              </div>
              <div>
                <label className="block text-xs text-terminal-green-dim uppercase tracking-wider mb-1">
                  Avg Cost ($)
                </label>
                <input
                  type="number"
                  value={avgCost}
                  onChange={(e) => setAvgCost(e.target.value)}
                  placeholder="150.00"
                  required
                  step="any"
                  min="0"
                  className="w-full bg-terminal-bg border border-terminal-border text-terminal-green
                    px-3 py-2 text-sm placeholder:text-terminal-green-dark
                    focus:outline-none focus:border-terminal-green"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-terminal-green-dim uppercase tracking-wider mb-1">
                Investment Thesis
              </label>
              <textarea
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder="Why are you making this investment?"
                rows={2}
                maxLength={1000}
                className="w-full bg-terminal-bg border border-terminal-border text-terminal-green
                  px-3 py-2 text-sm placeholder:text-terminal-green-dark
                  focus:outline-none focus:border-terminal-green resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-terminal-green-dark border border-terminal-green text-terminal-green
                px-6 py-2 text-sm uppercase tracking-widest font-bold
                hover:bg-terminal-green hover:text-terminal-bg
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150"
            >
              {submitting ? "Processing..." : "Execute"}
            </button>
          </form>
        </section>

        {/* Holdings Table */}
        <section className="border border-terminal-border bg-terminal-bg-light">
          <div className="px-6 py-3 border-b border-terminal-border">
            <h2 className="text-sm font-bold text-terminal-amber uppercase tracking-widest">
              <span className="text-terminal-green">&gt;</span> Current Holdings
              {portfolio && (
                <span className="text-terminal-green-dim ml-4 font-normal normal-case">
                  [{portfolio.holdings.length} positions]
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-terminal-green-dim">
              <span className="animate-cursor-blink">_</span> Loading...
            </div>
          ) : !portfolio || portfolio.holdings.length === 0 ? (
            <div className="px-6 py-12 text-center text-terminal-green-dim">
              No positions found. Add your first position above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-terminal-border text-terminal-amber text-xs uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Symbol</th>
                    <th className="text-right px-6 py-3">Shares</th>
                    <th className="text-right px-6 py-3">Avg Cost</th>
                    <th className="text-left px-6 py-3">Thesis</th>
                    <th className="text-left px-6 py-3">Updated</th>
                    <th className="text-right px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.holdings.map((holding) => (
                    <tr
                      key={holding.id}
                      className="border-b border-terminal-border/50 hover:bg-terminal-green-dark/20"
                    >
                      <td className="px-6 py-3 font-bold text-terminal-green text-glow-sm">
                        {holding.symbol}
                      </td>
                      <td className="px-6 py-3 text-right text-terminal-green">
                        {holding.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-terminal-green">
                        $
                        {holding.avg_cost.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-3 text-terminal-green-dim max-w-xs truncate">
                        {holding.thesis || "---"}
                      </td>
                      <td className="px-6 py-3 text-terminal-green-dim">
                        {new Date(holding.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleDelete(holding.id)}
                          className="text-red-500 hover:text-red-400 text-xs uppercase tracking-wider
                            border border-red-500/30 px-3 py-1
                            hover:border-red-400 hover:bg-red-500/10
                            transition-colors duration-150"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Intelligence Briefing Section */}
        {portfolio && portfolio.holdings.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleGenerateBriefing}
                disabled={briefingLoading}
                className="bg-terminal-green-dark border border-terminal-amber text-terminal-amber
                  px-6 py-2 text-sm uppercase tracking-widest font-bold
                  hover:bg-terminal-amber hover:text-terminal-bg
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-150"
              >
                {briefingLoading ? "Analyzing..." : "Generate Briefing"}
              </button>
              {briefingLoading && (
                <span className="text-terminal-green-dim text-sm animate-pulse">
                  <span className="text-terminal-amber">&gt;</span> Claude is
                  analyzing your portfolio...
                </span>
              )}
            </div>

            {briefingError && (
              <div className="mb-6 border border-red-500/50 bg-red-500/10 text-red-400 px-4 py-2 text-sm">
                <span className="text-red-500 font-bold">INTEL ERR:</span>{" "}
                {briefingError}
              </div>
            )}

            {briefing && (
              <div className="space-y-6">
                {/* Data Freshness */}
                {briefing.market_snapshot?.fetched_at && (
                  <div className="text-xs text-terminal-green-dim border border-terminal-border bg-terminal-bg-light px-4 py-2 flex justify-between">
                    <span>
                      <span className="text-terminal-amber">MARKET DATA:</span>{" "}
                      {new Date(briefing.market_snapshot.fetched_at).toLocaleString()}
                    </span>
                    <span>
                      <span className="text-terminal-amber">BRIEFING:</span>{" "}
                      {new Date(briefing.generated_at).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Macro Indicators */}
                {briefing.market_snapshot?.macro &&
                  Object.keys(briefing.market_snapshot.macro).length > 0 && (
                    <div className="border border-terminal-border bg-terminal-bg-light px-6 py-4">
                      <h3 className="text-xs font-bold text-terminal-amber uppercase tracking-widest mb-3">
                        <span className="text-terminal-green">&gt;</span> Macro
                        Environment
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Object.entries(briefing.market_snapshot.macro).map(
                          ([key, indicator]) => {
                            const labels: Record<string, string> = {
                              VIX: "VIX",
                              US_10Y_YIELD: "10Y Yield",
                              DXY: "DXY",
                              CRUDE_OIL: "Crude Oil",
                            };
                            const val = indicator.value;
                            const prev = indicator.previous_close;
                            const change =
                              val && prev && prev > 0
                                ? ((val - prev) / prev) * 100
                                : null;
                            const changeColor =
                              change === null
                                ? "text-terminal-green-dim"
                                : change >= 0
                                  ? "text-terminal-green"
                                  : "text-red-400";

                            return (
                              <div key={key} className="text-center">
                                <div className="text-xs text-terminal-amber uppercase tracking-wider">
                                  {labels[key] || key}
                                </div>
                                <div className="text-lg text-terminal-green font-bold">
                                  {val != null ? val.toFixed(2) : "N/A"}
                                </div>
                                {change !== null && (
                                  <div className={`text-xs ${changeColor}`}>
                                    {change >= 0 ? "+" : ""}
                                    {change.toFixed(2)}%
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                {/* Risk Alerts */}
                {briefing.risk_alerts.length > 0 && (
                  <div className="border border-terminal-amber/50 bg-terminal-amber/5 px-6 py-4">
                    <h3 className="text-xs font-bold text-terminal-amber uppercase tracking-widest mb-3">
                      <span className="text-red-400">!</span> Risk Alerts
                    </h3>
                    <ul className="space-y-1">
                      {briefing.risk_alerts.map((alert, i) => (
                        <li key={i} className="text-sm text-terminal-amber-dim">
                          <span className="text-red-400 mr-2">&gt;</span>
                          {alert}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Per-Holding Analyses */}
                <div className="border border-terminal-border bg-terminal-bg-light">
                  <div className="px-6 py-3 border-b border-terminal-border">
                    <h3 className="text-sm font-bold text-terminal-amber uppercase tracking-widest">
                      <span className="text-terminal-green">&gt;</span> Position
                      Analysis
                    </h3>
                  </div>
                  <div className="divide-y divide-terminal-border/50">
                    {briefing.holdings_analyses.map((ha) => (
                      <div key={ha.symbol} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-terminal-green text-glow-sm text-lg">
                            {ha.symbol}
                          </span>
                          <span
                            className={`text-xs font-bold uppercase tracking-widest border px-3 py-1 ${sentimentColor(ha.sentiment)} border-current`}
                          >
                            {sentimentLabel(ha.sentiment)}
                          </span>
                        </div>
                        {/* Per-holding market data */}
                        {briefing.market_snapshot?.stocks?.[ha.symbol] &&
                          (() => {
                            const stock =
                              briefing.market_snapshot!.stocks[ha.symbol];
                            const holding = portfolio?.holdings.find(
                              (h) => h.symbol === ha.symbol
                            );
                            const price = stock.current_price;
                            const cost = holding?.avg_cost;
                            const pl =
                              price && cost
                                ? ((price - cost) / cost) * 100
                                : null;
                            const plColor =
                              pl === null
                                ? "text-terminal-green-dim"
                                : pl >= 0
                                  ? "text-terminal-green"
                                  : "text-red-400";

                            return (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs border border-terminal-border/30 bg-terminal-bg px-3 py-2 mb-2">
                                <div>
                                  <span className="text-terminal-amber">
                                    PRICE:
                                  </span>{" "}
                                  <span className="text-terminal-green">
                                    {price != null
                                      ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                      : "N/A"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-terminal-amber">
                                    P/L:
                                  </span>{" "}
                                  <span className={plColor}>
                                    {pl !== null
                                      ? `${pl >= 0 ? "+" : ""}${pl.toFixed(1)}%`
                                      : "N/A"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-terminal-amber">
                                    P/E:
                                  </span>{" "}
                                  <span className="text-terminal-green-dim">
                                    {stock.pe_ratio != null
                                      ? stock.pe_ratio.toFixed(1)
                                      : "N/A"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-terminal-amber">
                                    52W:
                                  </span>{" "}
                                  <span className="text-terminal-green-dim">
                                    {stock.fifty_two_week_low != null &&
                                    stock.fifty_two_week_high != null
                                      ? `$${stock.fifty_two_week_low.toFixed(0)}-$${stock.fifty_two_week_high.toFixed(0)}`
                                      : "N/A"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-terminal-amber">
                                    1M/3M:
                                  </span>{" "}
                                  <span className="text-terminal-green-dim">
                                    {stock.perf_1m_pct != null
                                      ? `${stock.perf_1m_pct > 0 ? "+" : ""}${stock.perf_1m_pct}%`
                                      : "?"}{" "}
                                    /{" "}
                                    {stock.perf_3m_pct != null
                                      ? `${stock.perf_3m_pct > 0 ? "+" : ""}${stock.perf_3m_pct}%`
                                      : "?"}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        {ha.thesis && (
                          <p className="text-xs text-terminal-green-dim mb-2 italic">
                            Your thesis: &quot;{ha.thesis}&quot;
                          </p>
                        )}
                        <div className="text-sm text-terminal-green-dim leading-relaxed whitespace-pre-line">
                          {ha.analysis}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Portfolio Summary */}
                <div className="border border-terminal-border bg-terminal-bg-light">
                  <div className="px-6 py-3 border-b border-terminal-border">
                    <h3 className="text-sm font-bold text-terminal-amber uppercase tracking-widest">
                      <span className="text-terminal-green">&gt;</span> Portfolio
                      Macro View
                    </h3>
                  </div>
                  <div className="px-6 py-4 text-sm text-terminal-green-dim leading-relaxed whitespace-pre-line">
                    {briefing.portfolio_summary}
                  </div>
                </div>

                {!briefing.market_snapshot?.fetched_at && (
                  <p className="text-xs text-terminal-green-dim text-right">
                    <span className="text-terminal-amber">GENERATED:</span>{" "}
                    {new Date(briefing.generated_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Footer status bar */}
        <footer className="mt-8 text-xs text-terminal-green-dim border-t border-terminal-border pt-4 flex justify-between">
          <span>
            <span className="text-terminal-amber">SYS:</span> Portfolio
            Intelligence Terminal
          </span>
          <span>
            <span className="text-terminal-amber">STATUS:</span>{" "}
            <span className="text-terminal-green">ONLINE</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
