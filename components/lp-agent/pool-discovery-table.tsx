"use client";

import { useState } from "react";
import { LpPoolData, DexType } from "@/lib/lp-agent-engine";
import { formatCurrencyCompact } from "@/lib/format-utils";
import {
  Search,
  Sliders,
  Filter,
  Calculator,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Layers,
  Sparkles,
  Info,
  RefreshCw,
  Radio,
  Zap,
} from "lucide-react";

interface PoolDiscoveryTableProps {
  pools: LpPoolData[];
  onDeploy: (pool: LpPoolData) => void;
  onOpenCalculator: (pool: LpPoolData) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: number | null;
}

export function PoolDiscoveryTable({
  pools,
  onDeploy,
  onOpenCalculator,
  isLoading,
  onRefresh,
  lastUpdated,
}: PoolDiscoveryTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDex, setSelectedDex] = useState<string>("ALL");
  const [onlyToken2022, setOnlyToken2022] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"APR" | "TVL" | "VOLUME">("APR");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Lọc danh sách pools
  const filtered = pools.filter((pool) => {
    if (selectedDex !== "ALL" && pool.dex !== selectedDex) return false;
    if (onlyToken2022 && !pool.isToken2022) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        pool.tokenA.symbol.toLowerCase().includes(q) ||
        pool.tokenB.symbol.toLowerCase().includes(q) ||
        pool.poolAddress.toLowerCase().includes(q) ||
        pool.tokenA.mint.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sắp xếp
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "APR") return b.feeApr24h - a.feeApr24h;
    if (sortBy === "TVL") return b.tvlUsd - a.tvlUsd;
    if (sortBy === "VOLUME") return b.volume24hUsd - a.volume24hUsd;
    return 0;
  });

  // Phân trang: 10 pool / trang
  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1;
  const paginatedPools = sorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDexChange = (dex: string) => {
    setSelectedDex(dex);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by token, mint, or pool address..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Quick Sort & Token-2022 Toggle */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 cursor-pointer hover:border-zinc-700">
              <input
                type="checkbox"
                checked={onlyToken2022}
                onChange={(e) => {
                  setOnlyToken2022(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded bg-zinc-900 border-zinc-700 text-purple-500"
              />
              <span>Token-2022 Tax Only</span>
            </label>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="APR">Sort: Highest Fee APR</option>
              <option value="TVL">Sort: Highest TVL</option>
              <option value="VOLUME">Sort: Highest 24h Volume</option>
            </select>
          </div>
        </div>

        {/* DEX Selector Pills & Live Sync Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: "ALL", label: "All DEXes" },
              { id: "METEORA_DLMM", label: "Meteora DLMM" },
              { id: "FLUXBEAM", label: "FluxBeam (Token-2022)" },
              { id: "RAYDIUM_CLMM", label: "Raydium CLMM" },
              { id: "ORCA_WHIRLPOOL", label: "Orca Whirlpool" },
            ].map((tab) => {
              const isSelected = selectedDex === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleDexChange(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
                      : "bg-zinc-950/80 text-zinc-400 hover:text-white border border-zinc-800/80"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 justify-end shrink-0">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                title={lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : "Refresh real-time pool metrics"}
              >
                <RefreshCw className={`size-3 text-purple-400 ${isLoading ? "animate-spin" : ""}`} />
                <span>{isLoading ? "Syncing..." : "Sync Live"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pools Table */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs border-collapse">
            <thead className="text-[11px] uppercase text-zinc-400 bg-zinc-950/90 border-b border-zinc-800">
              <tr>
                <th className="py-3.5 pl-5 pr-3 font-semibold text-zinc-400 w-[30%] min-w-[260px]">Pair & DEX</th>
                <th className="py-3.5 px-4 font-semibold text-zinc-400 text-right w-[14%] min-w-[120px] whitespace-nowrap">TVL</th>
                <th className="py-3.5 px-4 font-semibold text-zinc-400 text-right w-[14%] min-w-[125px] whitespace-nowrap">24h Volume</th>
                <th className="py-3.5 px-4 font-semibold text-zinc-400 text-right w-[14%] min-w-[125px] whitespace-nowrap">24h Fee APR</th>
                <th className="py-3.5 px-4 font-semibold text-zinc-400 text-center w-[13%] min-w-[115px] whitespace-nowrap">IL Risk</th>
                <th className="py-3.5 pl-3 pr-6 font-semibold text-zinc-400 text-right w-[15%] min-w-[170px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {paginatedPools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-sans">
                    No liquidity pools found matching the active filters.
                  </td>
                </tr>
              ) : (
                paginatedPools.map((pool) => {
                  const isMeteora = pool.dex === "METEORA_DLMM";
                  const isFlux = pool.dex === "FLUXBEAM";
                  const isRaydium = pool.dex === "RAYDIUM_CLMM";
                  const isOrca = pool.dex === "ORCA_WHIRLPOOL";

                  return (
                    <tr
                      key={pool.id}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      {/* Cặp Token & DEX */}
                      <td className="py-4 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white shadow-inner shrink-0">
                            {pool.tokenA.symbol[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-sans font-bold text-white text-sm">
                              <span className="truncate">
                                {pool.tokenA.symbol} / {pool.tokenB.symbol}
                              </span>
                              {pool.isToken2022 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-bold shrink-0">
                                  Token-2022 ({pool.transferFeePct}% Tax)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-sans flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span
                                className={`font-semibold ${
                                  isMeteora
                                    ? "text-purple-300"
                                    : isFlux
                                    ? "text-amber-300"
                                    : isRaydium
                                    ? "text-blue-300"
                                    : "text-teal-300"
                                }`}
                              >
                                {isMeteora
                                  ? "Meteora DLMM"
                                  : isFlux
                                  ? "FluxBeam"
                                  : isRaydium
                                  ? "Raydium CLMM"
                                  : "Orca Whirlpool"}
                              </span>
                              <span>•</span>
                              <span>Fee: {pool.feeTierPct}%</span>
                              <span>•</span>
                              <span className="text-zinc-500 font-mono text-[10px]">
                                ${pool.currentPrice}
                              </span>
                              <span>•</span>
                              <a
                                href={
                                  pool.dex === "METEORA_DLMM"
                                    ? `https://app.meteora.ag/dlmm/${pool.poolAddress}`
                                    : `https://solscan.io/account/${pool.poolAddress}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500 hover:text-purple-300 transition-colors font-mono"
                                title="Verify on-chain pool address"
                              >
                                <span>{pool.poolAddress.slice(0, 4)}...{pool.poolAddress.slice(-4)}</span>
                                <ExternalLink className="size-2.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* TVL */}
                      <td className="py-4 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className="text-white font-medium text-xs tracking-tight hover:text-purple-300 transition-colors cursor-default"
                          title={`TVL: $${pool.tvlUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        >
                          {formatCurrencyCompact(pool.tvlUsd)}
                        </span>
                      </td>

                      {/* Volume */}
                      <td className="py-4 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className="text-zinc-300 font-medium text-xs tracking-tight hover:text-white transition-colors cursor-default"
                          title={`24h Volume: $${pool.volume24hUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        >
                          {formatCurrencyCompact(pool.volume24hUsd)}
                        </span>
                      </td>

                      {/* Fee APR */}
                      <td className="py-4 px-4 font-mono font-bold text-emerald-400 text-sm text-right tabular-nums whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <TrendingUp className="size-3.5 text-emerald-500 shrink-0" />
                          <span>+{pool.feeApr24h.toFixed(1)}%</span>
                        </div>
                      </td>

                      {/* Rủi ro IL */}
                      <td className="py-4 px-4 font-sans text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center min-w-[98px] text-[10px] px-2.5 py-1 rounded-full font-bold border tracking-wide uppercase shadow-sm ${
                            pool.ilRiskScore === "LOW"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : pool.ilRiskScore === "MEDIUM"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {pool.ilRiskScore === "LOW"
                            ? "Low (Stable)"
                            : pool.ilRiskScore === "MEDIUM"
                            ? "Medium"
                            : "High (Meme)"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => onOpenCalculator(pool)}
                            className="p-2 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/70 hover:border-zinc-600 text-zinc-300 hover:text-purple-300 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                            title="Simulate IL & Net Yield (Calculator)"
                          >
                            <Calculator className="size-3.5" />
                          </button>
                          <button
                            onClick={() => onDeploy(pool)}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 hover:from-purple-400 hover:to-emerald-300 text-white font-extrabold text-xs shadow-md shadow-purple-500/20 hover:shadow-purple-500/30 transition-all cursor-pointer font-sans whitespace-nowrap flex items-center gap-1.5 hover:scale-[1.02] active:scale-95"
                          >
                            <Zap className="size-3 text-amber-300 shrink-0" />
                            <span>Deploy Agent</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/80 border-t border-zinc-800 text-xs">
            <span className="text-zinc-500 font-sans">
              Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, sorted.length)} of{" "}
              <strong className="text-white font-mono">{sorted.length}</strong> pools
            </span>

            <div className="flex items-center gap-1 font-mono">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNumber = idx + 1;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`size-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === pageNumber
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
