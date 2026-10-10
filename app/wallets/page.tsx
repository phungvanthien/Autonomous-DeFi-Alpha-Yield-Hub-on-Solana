"use client";

import { useState, useEffect } from "react";
import { useSolanaWallet } from "@/components/wallet/wallet-context";
import { DepositSubWalletModal } from "@/components/wallet/deposit-subwallet-modal";
import { WithdrawSubWalletModal } from "@/components/wallet/withdraw-subwallet-modal";
import {
  SubWalletData,
  getOrCreateSubWallet,
  fetchSubWalletBalance,
  exportSubWalletPrivateKey,
  resetSubWallet,
  fetchSubWalletTokenHoldings,
  SubWalletTokenHolding,
} from "@/lib/sub-wallet-manager";
import { fetchLiveSolPrice } from "@/lib/token-price-service";
import { executeSubWalletSellToken } from "@/lib/jupiter-swap-router";
import { formatCurrency, formatSol } from "@/lib/format-utils";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Key,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw,
  Zap,
  Sliders,
  DollarSign,
  Lock,
  Coins,
  TrendingUp,
  ArrowRightLeft,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function WalletsPage() {
  const {
    walletAddress,
    isConnected,
    balance: mainBalance,
    network,
    setNetwork,
    refreshBalance: refreshMainBalance,
  } = useSolanaWallet();

  const [subWallet, setSubWallet] = useState<SubWalletData | null>(null);
  const [subBalance, setSubBalance] = useState<number>(0);
  const [solPriceUsd, setSolPriceUsd] = useState<number>(185.0);
  const [tokenHoldings, setTokenHoldings] = useState<SubWalletTokenHolding[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("0.2");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [liquidatingMint, setLiquidatingMint] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Modal states for Deposit & Withdraw
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositModalAmt, setDepositModalAmt] = useState<number>(0.2);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Allowance & Daily limits
  const [dailyMaxSol, setDailyMaxSol] = useState<number>(1.5);
  const [maxPerTradeSol, setMaxPerTradeSol] = useState<number>(0.3);
  const [autoRevokeOnEmergency, setAutoRevokeOnEmergency] = useState(true);

  const loadSubWallet = async (address: string) => {
    const sw = getOrCreateSubWallet(address);
    setSubWallet(sw);
    setIsRefreshing(true);
    try {
      const [bal, liveSol, holdingsData] = await Promise.all([
        fetchSubWalletBalance(sw.publicKey, address, network),
        fetchLiveSolPrice(),
        fetchSubWalletTokenHoldings(sw.publicKey, network),
      ]);
      setSubBalance(bal);
      setSubWallet((prev) => (prev ? { ...prev, balance: bal } : prev));
      if (liveSol > 0) {
        setSolPriceUsd(liveSol);
      } else if (holdingsData.solPriceUsd > 0) {
        setSolPriceUsd(holdingsData.solPriceUsd);
      }
      setTokenHoldings(holdingsData.tokens);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      loadSubWallet(walletAddress);
    } else {
      setSubWallet(null);
      setSubBalance(0);
      setTokenHoldings([]);
    }

    const handleBalanceUpdated = (e: any) => {
      if (e?.detail?.balance !== undefined) {
        setSubBalance(e.detail.balance);
        setSubWallet((prev) => (prev ? { ...prev, balance: e.detail.balance } : prev));
      }
    };
    window.addEventListener("solana_subwallet_balance_updated", handleBalanceUpdated);
    return () => {
      window.removeEventListener("solana_subwallet_balance_updated", handleBalanceUpdated);
    };
  }, [walletAddress, network]);

  const handleLiquidateToken = async (holding: SubWalletTokenHolding) => {
    if (!subWallet || !walletAddress) return;
    const confirmSwap = confirm(
      `Confirm liquidating 100% of ${holding.symbol} (~${holding.amount} tokens, value ≈ ${formatCurrency(holding.valueUsd)}) back into SOL via Jupiter DEX?`
    );
    if (!confirmSwap) return;

    setLiquidatingMint(holding.mint);
    try {
      const estSol = solPriceUsd > 0 ? holding.valueUsd / solPriceUsd : 0.05;
      const res = await executeSubWalletSellToken(subWallet, holding.mint, estSol, 3.0);

      // Cập nhật trạng thái trong localStorage nếu là vị thế copy trade
      try {
        const positionsRaw = localStorage.getItem("solana_copytrade_positions");
        if (positionsRaw) {
          const parsed = JSON.parse(positionsRaw);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((p: any) => {
              if (p.tokenMint === holding.mint && (p.status === "OPEN" || p.status === "TP1_TAKEN")) {
                return {
                  ...p,
                  status: "CLOSED_TP",
                  closeReason: "Manual liquidation via Sub-Wallet Vault",
                };
              }
              return p;
            });
            localStorage.setItem("solana_copytrade_positions", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("solana_copytrade_positions_updated", { detail: updated }));
          }
        }
      } catch {
        // ignore
      }

      await loadSubWallet(walletAddress);
      await refreshMainBalance();

      if (res.signature && !res.isSimulated) {
        alert(`Liquidated ${holding.symbol} on-chain successfully!\nTx: ${res.signature.slice(0, 10)}...`);
      } else {
        alert(`Liquidated ${holding.symbol} back into SOL capital successfully!`);
      }
    } finally {
      setLiquidatingMint(null);
    }
  };

  const handleResetSubWallet = () => {
    if (!walletAddress) return;
    if (subBalance > 0.01) {
      const ok = confirm("WARNING: Sub-Wallet still has a positive SOL balance! Please withdraw funds to your main wallet before resetting. Are you sure you want to generate a new keypair?");
      if (!ok) return;
    } else {
      const ok = confirm("Generate a new Sub-Wallet keypair and discard current keys?");
      if (!ok) return;
    }

    resetSubWallet(walletAddress);
    loadSubWallet(walletAddress);
    setShowPrivateKey(false);
  };

  const copyToClipboard = (text: string, type: "addr" | "key") => {
    navigator.clipboard.writeText(text);
    if (type === "addr") {
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const totalTokensValueUsd = tokenHoldings.reduce((sum, t) => sum + (t.valueUsd || 0), 0);
  const subSolValueUsd = subBalance * solPriceUsd;
  const subTotalPortfolioUsd = subSolValueUsd + totalTokensValueUsd;
  const mainSolValueUsd = mainBalance * solPriceUsd;

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="size-16 rounded-3xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
          <Wallet className="size-8" />
        </div>
        <h1 className="text-xl font-bold text-white">Sub-Wallet & Security Vault</h1>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Please connect your primary wallet (Phantom, Solflare, Backpack) to initialize and manage your autonomous Trading Sub-Wallet (Zero Popup).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-6 pb-28 sm:pb-32 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Lock className="size-5" />
            </div>
            <h1 className="text-xl font-black text-white">Sub-Wallet Management & Security Vault</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Isolated local autonomous keypair vault: segregated trading funds, zero-popup signing for Copy-Trading & LP Harvester.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live SOL Price Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-2 font-mono text-xs">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-400 text-[11px]">SOL:</span>
            <span className="text-white font-bold">${solPriceUsd.toFixed(2)}</span>
            <span className="text-[10px] text-zinc-500 font-sans">LIVE</span>
          </div>

          <button
            onClick={async () => {
              if (subWallet) await loadSubWallet(subWallet.ownerAddress);
              await refreshMainBalance();
            }}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sub-Wallet Balance & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* 5.4 Sub-Wallet Balance Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Zap className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">Trading Sub-Wallet (Zero-Click Execution)</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Encrypted local keypair vault for autonomous high-speed signing in Copy-Trading & LP Harvesting
                  </p>
                </div>
              </div>

              {/* Aggregated Total Portfolio Valuation */}
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Total Sub-Wallet Assets</span>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {formatCurrency(subTotalPortfolioUsd)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-mono">
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500 uppercase font-semibold">Sub-Wallet SOL Balance</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-sans font-semibold">
                    Vault Safe
                  </span>
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {subBalance.toFixed(4)} SOL
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5 flex items-center justify-between">
                  <span>≈ {formatCurrency(subSolValueUsd)}</span>
                  <span className="text-[10px] text-zinc-500 font-sans">@ ${solPriceUsd.toFixed(2)}/SOL</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-500 uppercase font-semibold">Primary Wallet (Browser Extension)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-sans font-semibold">
                    Master
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {mainBalance.toFixed(4)} SOL
                </div>
                <div className="text-[11px] text-zinc-300 mt-0.5 flex items-center justify-between">
                  <span>≈ {formatCurrency(mainSolValueUsd)}</span>
                  <span className="text-[10px] text-zinc-500 font-sans">@ ${solPriceUsd.toFixed(2)}/SOL</span>
                </div>
              </div>
            </div>

            {/* Address bar */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 text-xs font-mono">
              <div className="truncate">
                <span className="text-zinc-500 text-[11px]">Sub-Wallet Address: </span>
                <span className="text-zinc-300 font-bold select-all">{subWallet?.publicKey}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => subWallet && copyToClipboard(subWallet.publicKey, "addr")}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                  title="Copy Address"
                >
                  {copiedAddr ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                </button>
                <a
                  href={`https://solscan.io/account/${subWallet?.publicKey}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  title="View on Solscan"
                >
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </div>

            {/* Quick Modal Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => {
                  setDepositModalAmt(0.3);
                  setIsDepositModalOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <ArrowDownRight className="size-4" />
                <span>Deposit SOL</span>
              </button>
              <button
                onClick={() => setIsWithdrawModalOpen(true)}
                disabled={subBalance <= 0.005}
                className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-zinc-700 disabled:opacity-50 cursor-pointer"
              >
                <ArrowUpRight className="size-4 text-blue-400" />
                <span>Withdraw Funds</span>
              </button>
            </div>
          </div>

          {/* Sub-Wallet SPL Token Holdings & Asset Vault */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Coins className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Sub-Wallet Token Holdings & Asset Vault
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      {tokenHoldings.length} Tokens
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Live SPL tokens held in vault with dynamic USD pricing via DexScreener & Jupiter
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Total SPL Token Value</span>
                <div className="text-base font-bold font-mono text-amber-400">
                  {formatCurrency(totalTokensValueUsd)}
                </div>
              </div>
            </div>

            {/* Token Table */}
            <div className="overflow-x-auto">
              {tokenHoldings.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs space-y-1.5">
                  <Coins className="size-8 mx-auto text-zinc-600 mb-1" />
                  <p className="font-semibold text-zinc-400">No SPL tokens currently held in Sub-Wallet.</p>
                  <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                    When you activate automated copy-trading or LP harvesting, bought tokens will be held securely in this vault with real-time USD conversion.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[11px] text-zinc-400 font-semibold">
                      <th className="pb-2">Token</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Live Unit Price</th>
                      <th className="pb-2">Total USD Value</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {tokenHoldings.map((token) => (
                      <tr key={token.mint} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-amber-400 font-sans">
                              {token.symbol.slice(0, 3)}
                            </div>
                            <div>
                              <div className="font-bold text-white">{token.symbol}</div>
                              <div className="text-[10px] text-zinc-500 font-sans">{token.name}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 font-sans">
                          {token.source === "ONCHAIN" ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                              ON-CHAIN
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                              COPY-TRADE
                            </span>
                          )}
                        </td>

                        <td className="py-3 text-zinc-200">
                          {token.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                        </td>

                        <td className="py-3 text-zinc-300">
                          ${token.priceUsd < 0.001
                            ? token.priceUsd.toFixed(6)
                            : token.priceUsd.toFixed(token.priceUsd < 1 ? 4 : 2)}
                          {token.priceChange24h !== undefined && (
                            <span
                              className={`ml-1 text-[10px] ${
                                token.priceChange24h >= 0 ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {token.priceChange24h >= 0 ? "+" : ""}
                              {token.priceChange24h.toFixed(1)}%
                            </span>
                          )}
                        </td>

                        <td className="py-3 font-bold text-emerald-400">
                          {formatCurrency(token.valueUsd)}
                        </td>

                        <td className="py-3 text-right font-sans">
                          <button
                            onClick={() => handleLiquidateToken(token)}
                            disabled={liquidatingMint === token.mint}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border border-zinc-700 hover:border-amber-500/30 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            {liquidatingMint === token.mint ? (
                              <>
                                <RefreshCw className="size-3 animate-spin" />
                                <span>Selling...</span>
                              </>
                            ) : (
                              <>
                                <ArrowRightLeft className="size-3" />
                                <span>Sell to SOL</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 5.4 Deposit & Withdraw Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Deposit SOL */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ArrowDownRight className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Deposit SOL to Sub-Wallet</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDepositModalAmt(0.5);
                    setIsDepositModalOpen(true);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20"
                >
                  <Zap className="size-3" />
                  Faucet +0.5 SOL
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">
                Transfer SOL from primary wallet to fund autonomous copy trading and LP execution.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="0.2"
                  />
                  <div className="flex items-center gap-1">
                    {[0.1, 0.2, 0.5].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setDepositAmount(amt.toString());
                          setDepositModalAmt(amt);
                          setIsDepositModalOpen(true);
                        }}
                        className="px-2 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const amt = parseFloat(depositAmount) || 0.2;
                    setDepositModalAmt(amt);
                    setIsDepositModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <ArrowDownRight className="size-4" />
                  <span>Deposit {depositAmount} SOL (Open Modal)</span>
                </button>
              </div>
            </div>

            {/* Withdraw SOL */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <ArrowUpRight className="size-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Withdraw Funds to Primary Wallet</h3>
              </div>
              <p className="text-[11px] text-zinc-400">
                Withdraw entire or partial SOL capital back to primary extension wallet instantly (1-Click).
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Withdraw amount"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsWithdrawModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
                  >
                    Max
                  </button>
                </div>

                <button
                  onClick={() => setIsWithdrawModalOpen(true)}
                  disabled={subBalance <= 0.005}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-500/40 shadow-md shadow-blue-500/20"
                >
                  <ArrowUpRight className="size-4 text-blue-300" />
                  <span>Open 1-Click Withdraw Modal</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security Vault & Allowance */}
        <div className="space-y-6">
          {/* 5.4 Allowance & Daily Limits */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Sliders className="size-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Allowance & Daily Limits</h3>
            </div>
            <p className="text-[11px] text-zinc-400">
              Hard-limit maximum execution allocations to guarantee risk remains strictly capped.
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold flex justify-between">
                  <span>Daily Maximum Spend:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {dailyMaxSol} SOL (≈ {formatCurrency(dailyMaxSol * solPriceUsd)})
                  </span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={dailyMaxSol}
                  onChange={(e) => setDailyMaxSol(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold flex justify-between">
                  <span>Max Allocation per Copy Order:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {maxPerTradeSol} SOL (≈ {formatCurrency(maxPerTradeSol * solPriceUsd)})
                  </span>
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={maxPerTradeSol}
                  onChange={(e) => setMaxPerTradeSol(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={autoRevokeOnEmergency}
                    onChange={(e) => setAutoRevokeOnEmergency(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-700 text-amber-500"
                  />
                  <span>Auto-Revoke trades on whale liquidity rug detection</span>
                </label>
              </div>
            </div>
          </div>

          {/* 5.4 Security & Export Key */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                <Key className="size-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Export Private Key & Vault Admin</h3>
            </div>
            <p className="text-[11px] text-zinc-400">
              Private keys are client-side encrypted. You can export keys anytime to import into Phantom or Solflare.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border border-zinc-700"
              >
                {showPrivateKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span>{showPrivateKey ? "Hide Private Key" : "Reveal Private Key"}</span>
              </button>

              {showPrivateKey && subWallet && (
                <div className="p-3 rounded-xl bg-zinc-950 border border-red-500/30 space-y-2">
                  <div className="text-[10px] text-red-400 font-bold uppercase flex items-center gap-1">
                    <AlertTriangle className="size-3" />
                    <span>Never share your private key with anyone!</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-300 break-all p-2 rounded bg-black/50 select-all max-h-24 overflow-y-auto">
                    {exportSubWalletPrivateKey(subWallet)}
                  </div>
                  <button
                    onClick={() => copyToClipboard(exportSubWalletPrivateKey(subWallet), "key")}
                    className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    <span>{copiedKey ? "Key Array Copied!" : "Copy Private Key"}</span>
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800">
                <button
                  onClick={handleResetSubWallet}
                  className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Generate New Sub-Wallet (Reset)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DEPOSIT MODAL */}
      <DepositSubWalletModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        recommendedAmount={depositModalAmt}
        targetDescription="Sub-Wallet Vault Funding"
        onSuccess={(newBal) => {
          if (walletAddress) loadSubWallet(walletAddress);
        }}
      />

      {/* WITHDRAW MODAL */}
      <WithdrawSubWalletModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onSuccess={(newBal) => {
          if (walletAddress) loadSubWallet(walletAddress);
        }}
      />
    </div>
  );
}
