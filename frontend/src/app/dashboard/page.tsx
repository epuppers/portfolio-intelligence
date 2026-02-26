"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Portfolio, Holding, HoldingCreatePayload } from "@/lib/types";

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [thesis, setThesis] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
