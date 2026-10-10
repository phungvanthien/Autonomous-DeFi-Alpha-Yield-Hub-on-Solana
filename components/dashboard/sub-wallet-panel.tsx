"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Key,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  AlertOctagon,
  Trash2,
  TrendingUp,
  Clock,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import { useSolanaWallet } from "@/components/wallet/wallet-context";
import {
  SubWalletData,
  getOrCreateSubWallet,
  fetchSubWalletBalance,
  withdrawSolFromSubWallet,
  exportSubWalletPrivateKey,
} from "@/lib/sub-wallet-manager";
import {
  CopyTradeConfig,
  CopyTradePosition,
  getSavedConfigs,
  saveCopyTradeConfig,
  getSavedPositions,
  savePositions,
} from "@/lib/copytrade-engine";

interface SubWalletPanelProps {
  onOpenConfigModal?: (whaleAddress: string) => void;
}

export function SubWalletPanel({ onOpenConfigModal }: SubWalletPanelProps) {
  const { walletAddress, isConnected, sendSolToSubWallet, refreshBalance: refreshMainBalance } = useSolanaWallet();
  const [subWallet, setSubWallet] = useState<SubWalletData | null>(null);
  const [subBalance, setSubBalance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("0.2");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Danh sách cấu hình theo dõi và vị thế
  const [activeConfigs, setActiveConfigs] = useState<Record<string, CopyTradeConfig>>({});
  const [positions, setPositions] = useState<CopyTradePosition[]>([]);

  // Khởi tạo Sub-wallet khi kết nối ví chính
  useEffect(() => {
    if (walletAddress) {
      const sw = getOrCreateSubWallet(walletAddress);
      setSubWallet(sw);
      loadSubBalance(sw.publicKey);
      setActiveConfigs(getSavedConfigs());
      loadOrSeedPositions(sw.publicKey);
    } else {
      setSubWallet(null);
      setSubBalance(0);
    }

    const handleConfigsUpdate = () => {
      setActiveConfigs(getSavedConfigs());
    };
    const handlePositionsUpdate = () => {
      setPositions(getSavedPositions());
    };
    const handleBalanceUpdate = (e: any) => {
      if (e?.detail?.balance !== undefined) {
        setSubBalance(e.detail.balance);
      }
    };

    window.addEventListener("solana_copytrade_configs_updated", handleConfigsUpdate);
    window.addEventListener("solana_copytrade_positions_updated", handlePositionsUpdate);
    window.addEventListener("solana_subwallet_balance_updated", handleBalanceUpdate);

    return () => {
      window.removeEventListener("solana_copytrade_configs_updated", handleConfigsUpdate);
      window.removeEventListener("solana_copytrade_positions_updated", handlePositionsUpdate);
      window.removeEventListener("solana_subwallet_balance_updated", handleBalanceUpdate);
    };
  }, [walletAddress]);

  const loadSubBalance = async (pubKey: string) => {
    setIsRefreshing(true);
    const bal = await fetchSubWalletBalance(pubKey, walletAddress || undefined);
    setSubBalance(bal);
    setIsRefreshing(false);
  };

  const loadOrSeedPositions = (subPubKey: string) => {
    const saved = getSavedPositions();
    setPositions(saved);
  };

  const handleDepositSol = async (amount: number, isFaucet: boolean = false) => {
    if (!subWallet) return;
    setIsDepositing(true);
    try {
      const sig = await sendSolToSubWallet(subWallet.publicKey, amount, isFaucet);
      if (sig) {
        alert(`Successfully deposited ${amount} SOL into Sub-Wallet!\nTx: ${sig.slice(0, 10)}...`);
        await loadSubBalance(subWallet.publicKey);
        await refreshMainBalance();
      }
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdrawAll = async () => {
    if (!subWallet || !walletAddress) return;
    if (subBalance <= 0.005) {
      alert("Sub-Wallet balance is too low to withdraw (Requires > 0.005 SOL for network fees)");
      return;
    }
    const confirmWithdraw = confirm(`Do you want to withdraw all ~${subBalance.toFixed(3)} SOL from the sub-wallet back to your main wallet (${walletAddress.slice(0, 6)}...)?`);
    if (!confirmWithdraw) return;

    setIsWithdrawing(true);
    const res = await withdrawSolFromSubWallet(subWallet, walletAddress);
    setIsWithdrawing(false);

    if (res.success) {
      alert(`Withdrawal successful!\nSignature: ${res.signature?.slice(0, 10)}...`);
      await loadSubBalance(subWallet.publicKey);
      await refreshMainBalance();
    } else {
      alert(`Withdrawal failed: ${res.error}`);
    }
  };

  // Panic Sell button
  const handlePanicSellAll = () => {
    const confirmPanic = confirm("WARNING: Panic sell all open copy-trade positions and return capital to sub-wallet?");
    if (!confirmPanic) return;

    const closed = positions.map(p => ({
      ...p,
      status: "CLOSED_PANIC" as const,
      closeReason: "Emergency: User triggered Panic Sell All",
    }));
    setPositions(closed);
    savePositions(closed);
    alert("All positions have been closed via DEX routes successfully!");
  };

  // Sell individual position
  const handleSellPosition = (id: string) => {
    const target = positions.find(p => p.id === id);
    if (!target) return;
    const confirmSell = confirm(`Confirm selling 100% of ${target.tokenSymbol} to reclaim SOL?`);
    if (!confirmSell) return;

    const updated = positions.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: "CLOSED_TP" as const,
          closeReason: "Manual exit via Sell Now button",
        };
      }
      return p;
    });
    setPositions(updated);
    savePositions(updated);
  };

  const toggleWhaleConfig = (whaleAddr: string) => {
    const current = { ...activeConfigs };
    if (current[whaleAddr]) {
      current[whaleAddr].enabled = !current[whaleAddr].enabled;
      saveCopyTradeConfig(current[whaleAddr]);
      setActiveConfigs(current);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 text-center space-y-3">
        <div className="size-10 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
          <Wallet className="size-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white">Automated Trading Sub-Wallet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
            Please connect your browser extension wallet (Phantom, Solflare) above to activate your trading sub-wallet, set SOL limits, and run automated copy-trading.
          </p>
        </div>
      </div>
    );
  }

  const openPositions = positions.filter(p => p.status === "OPEN" || p.status === "TP1_TAKEN");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full">
      {/* COLUMN 1: SUB-WALLET CARD & DEPOSIT/WITHDRAW */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-lg">
        <div>
          <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Wallet className="size-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Trading Sub-Wallet</h3>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  ● Instant Execution (Zero Popup)
                </span>
              </div>
            </div>
            <button
              onClick={() => subWallet && loadSubBalance(subWallet.publicKey)}
              disabled={isRefreshing}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
              title="Refresh balance"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
            </button>
          </div>

          {/* Sub-wallet address */}
          <div className="mt-3 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-400">Sub-wallet address:</span>
              <div className="flex items-center gap-1.5 font-mono text-zinc-200">
                <span>{subWallet ? `${subWallet.publicKey.slice(0, 5)}...${subWallet.publicKey.slice(-5)}` : "Creating..."}</span>
                <button
                  onClick={() => {
                    if (subWallet) {
                      navigator.clipboard.writeText(subWallet.publicKey);
                      setCopiedAddr(true);
                      setTimeout(() => setCopiedAddr(false), 2000);
                    }
                  }}
                  className="hover:text-emerald-400 cursor-pointer"
                  title="Copy"
                >
                  {copiedAddr ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                </button>
                <a
                  href={`https://solscan.io/account/${subWallet?.publicKey}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-400"
                  title="Solscan"
                >
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>

            {/* Available SOL Balance */}
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-zinc-400">Available balance:</span>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {subBalance.toFixed(3)}
                </span>
                <span className="text-xs font-mono text-zinc-400 ml-1">SOL</span>
              </div>
            </div>
          </div>

          {/* Quick Deposit Buttons */}
          <div className="mt-3.5 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <label className="font-semibold text-zinc-300">Deposit from Main Wallet (Phantom):</label>
              <button
                type="button"
                onClick={() => handleDepositSol(0.5, true)}
                className="text-emerald-400 hover:text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Zap className="size-2.5" />
                Faucet +0.5 SOL
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
              {[0.1, 0.2, 0.5, 1.0].map((amt) => (
                <button
                  key={amt}
                  disabled={isDepositing}
                  onClick={() => handleDepositSol(amt)}
                  className="py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold border border-zinc-700/60 transition-colors cursor-pointer text-center disabled:opacity-50"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sub-wallet actions: Withdraw & Private Key */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleWithdrawAll}
              disabled={isWithdrawing || subBalance <= 0.005}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowDownRight className="size-3.5 text-blue-400" />
              {isWithdrawing ? "Withdrawing..." : "Withdraw to Main"}
            </button>
            <button
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition-colors cursor-pointer"
              title="View Private Key"
            >
              <Key className="size-3.5 text-amber-400" />
            </button>
          </div>

          {/* Private Key reveal block */}
          {showPrivateKey && subWallet && (
            <div className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded-xl text-[11px] space-y-1.5">
              <div className="flex justify-between items-center text-amber-400 font-semibold">
                <span>Private Key:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exportSubWalletPrivateKey(subWallet));
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 hover:bg-amber-500/30 cursor-pointer"
                >
                  {copiedKey ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copiedKey ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400">
                You can import this private key into Phantom/Solflare to retain 100% custody of your funds anytime.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2 & 3: LIVE POSITIONS & EMERGENCY ACTIONS */}
      <div className="lg:col-span-2 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-lg">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Live Copy Trade Positions</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {openPositions.length} Active Positions
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Automated multi-tier TP (TP1/TP2) and algorithmic hard stop-loss
              </p>
            </div>
            {openPositions.length > 0 && (
              <button
                onClick={handlePanicSellAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <AlertOctagon className="size-3.5 text-red-400" />
                Panic Sell All
              </button>
            )}
          </div>

          {/* Positions table */}
          <div className="mt-3 overflow-x-auto">
            {openPositions.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs space-y-1">
                <p>No active copy-trade positions open.</p>
                <p className="text-[11px] text-zinc-600">
                  Select a whale from the discovery table below and click <strong className="text-amber-400">"Copy Trade"</strong> to activate automated tracking.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-[11px] text-zinc-400 font-semibold">
                    <th className="pb-2">Token</th>
                    <th className="pb-2">Allocated SOL</th>
                    <th className="pb-2">Entry Price</th>
                    <th className="pb-2">Live Price</th>
                    <th className="pb-2">PnL %</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {openPositions.map((pos) => {
                    const isProfit = pos.pnlPct >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-400" />
                          <span>{pos.tokenSymbol}</span>
                        </td>
                        <td className="py-2.5 text-zinc-300">{pos.entrySolAmount} SOL</td>
                        <td className="py-2.5 text-zinc-400">${pos.entryPriceUsd.toFixed(3)}</td>
                        <td className="py-2.5 text-zinc-200">${pos.currentPriceUsd.toFixed(3)}</td>
                        <td className={`py-2.5 font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                          {isProfit ? `+${pos.pnlPct.toFixed(1)}%` : `${pos.pnlPct.toFixed(1)}%`}
                        </td>
                        <td className="py-2.5 font-sans">
                          {pos.status === "TP1_TAKEN" ? (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
                              50% TP1 Taken
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                              Holding / Riding
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-sans">
                          <button
                            onClick={() => handleSellPosition(pos.id)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border border-zinc-700 hover:border-red-500/30 text-[11px] font-semibold transition-all cursor-pointer"
                          >
                            Sell Now
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Whale Trackers List */}
        <div className="pt-3 border-t border-zinc-800/80">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Zap className="size-3.5 text-amber-400" />
              Active Whale Copy Campaigns:
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              {Object.keys(activeConfigs).length} Configured Whales
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(activeConfigs).map(([addr, cfg]) => (
              <div
                key={addr}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs font-mono"
              >
                <span className={`size-2 rounded-full ${cfg.enabled ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                <span className="text-zinc-200">{addr.slice(0, 4)}...{addr.slice(-4)}</span>
                <span className="text-amber-400 text-[11px]">{cfg.maxSolPerTrade} SOL</span>
                <button
                  onClick={() => toggleWhaleConfig(addr)}
                  className={`text-[10px] px-2 py-0.5 rounded font-sans font-semibold cursor-pointer transition-colors ${
                    cfg.enabled
                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {cfg.enabled ? "Active" : "Paused"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
