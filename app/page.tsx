"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSolanaWallet } from "@/components/wallet/wallet-context";
import { DepositSubWalletModal } from "@/components/wallet/deposit-subwallet-modal";
import { WithdrawSubWalletModal } from "@/components/wallet/withdraw-subwallet-modal";
import { getSubWallet, fetchSubWalletBalance } from "@/lib/sub-wallet-manager";
import { fetchLiveSolPrice } from "@/lib/token-price-service";
import { getSavedPositions, CopyTradePosition } from "@/lib/copytrade-engine";
import { getSavedLpPositions, ActiveLpPosition } from "@/lib/lp-agent-engine";
import { formatCurrency, formatSol } from "@/lib/format-utils";
import {
  Zap,
  Layers,
  Wallet,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Coins,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Activity,
  Bot,
  Lock,
  Flame,
  ArrowUpRight,
  RefreshCw,
  Cpu,
  BarChart3,
  Sliders,
  Check,
  HelpCircle,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  Percent,
  Compass,
} from "lucide-react";

export default function HomePage() {
  const { walletAddress, isConnected, balance, network } = useSolanaWallet();
  const [subWalletBalance, setSubWalletBalance] = useState<number>(0);
  const [solPriceUsd, setSolPriceUsd] = useState<number>(185.0);
  const [copyPositions, setCopyPositions] = useState<CopyTradePosition[]>([]);
  const [lpPositions, setLpPositions] = useState<ActiveLpPosition[]>([]);

  // Interactive tab selector for features
  const [activeTab, setActiveTab] = useState<"copytrade" | "lp" | "subwallet" | "copilot">("copytrade");

  // Interactive FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Sub-Wallet Deposit & Withdraw Modals
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const refreshSubBalance = useCallback(() => {
    if (walletAddress) {
      const sw = getSubWallet(walletAddress);
      if (sw) {
        fetchSubWalletBalance(sw.publicKey, walletAddress, network).then(setSubWalletBalance);
      }
    } else {
      setSubWalletBalance(0);
    }
  }, [walletAddress, network]);

  useEffect(() => {
    refreshSubBalance();
    setCopyPositions(getSavedPositions());
    setLpPositions(getSavedLpPositions());
    fetchLiveSolPrice().then((price) => {
      if (price > 0) setSolPriceUsd(price);
    });

    const handleSubBalanceUpdate = (e: any) => {
      if (e?.detail?.balance !== undefined) {
        setSubWalletBalance(e.detail.balance);
      } else {
        refreshSubBalance();
      }
    };

    window.addEventListener("solana_subwallet_balance_updated", handleSubBalanceUpdate);
    return () => {
      window.removeEventListener("solana_subwallet_balance_updated", handleSubBalanceUpdate);
    };
  }, [walletAddress, network, refreshSubBalance]);

  const totalSolAssets = (isConnected ? balance : 0) + subWalletBalance;
  const totalUsdAssets = totalSolAssets * solPriceUsd;

  const openCopyTrades = copyPositions.filter((p) => p.status === "OPEN" || p.status === "TP1_TAKEN");
  const activeLpPools = lpPositions.filter((p) => p.status === "IN_RANGE" || p.status === "OUT_OF_RANGE");

  const faqs = [
    {
      question: "How does the Sub-Wallet Vault work and is it secure?",
      answer:
        "The Sub-Wallet is an autonomous Solana Keypair generated locally inside your browser and stored with client-side encryption in your browser storage. It is used exclusively to auto-sign swaps and liquidity operations without interrupting you with constant wallet approval popups. Your private key is never transmitted to any external server or backend. You retain 100% control to deposit, withdraw funds in 1-click, or export your private key at any time.",
    },
    {
      question: "Why do Meteora DLMM and FluxBeam yield exceptionally high Fee APRs?",
      answer:
        "Meteora DLMM utilizes concentrated price bins with Dynamic Swap Fees that surge up to 15% during heavy volatility, delivering maximum revenue to active liquidity providers. FluxBeam is the pioneer DEX supporting SPL Token-2022 Extensions, where liquidity providers harvest both standard swap fees and a direct share of token transfer taxes (1-5%). The LP Agent autonomously screens for high-volume pools to maximize your compounded fee yield.",
    },
    {
      question: "How does the Anti-Rug Shield protect against malicious tokens?",
      answer:
        "Before copying any transaction from tracked whales, the Risk Engine performs immediate on-chain RPC and liquidity depth verifications: confirming pool liquidity exceeds $10,000, and ensuring both Mint Authority and Freeze Authority are permanently revoked. If liquidity is suddenly pulled (>20%) or an abnormal dump occurs, the system rejects the trade or immediately activates the Emergency Dump Guard to exit back into SOL.",
    },
    {
      question: "What is the minimum capital required to get started?",
      answer:
        "You can begin with as little as 0.1 to 0.5 SOL deposited into your Sub-Wallet. This gives you full access to both whale copy-trading with automated stop-loss/take-profit and high-yielding multi-DEX liquidity pools. Solana's sub-penny transaction fees ensure all your capital goes directly toward generating returns.",
    },
    {
      question: "What capabilities does the 24/7 AI Co-Pilot provide?",
      answer:
        "The AI Co-Pilot is accessible 24/7 via the floating badge in the bottom-right corner. It inspects on-chain whale wallets to detect wash-trading or insider activity, simulates Impermanent Loss across various price ranges, recommends optimal liquidity pools, and enables 1-click execution shortcuts directly from natural language conversations.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-4 pb-28 sm:pb-32 space-y-12 sm:space-y-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950 border border-zinc-800 p-6 sm:p-10 lg:p-12 shadow-2xl text-center md:text-left">
        {/* Glowing backdrop ambient orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6 max-w-4xl">
          {/* Top Pill Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-800/80 border border-amber-500/30 text-amber-300 text-xs font-semibold backdrop-blur-md shadow-sm">
            <Sparkles className="size-3.5 text-amber-400" />
            <span>Solana Autonomous DeFi Hub • Next-Gen Architecture</span>
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
            <span className="text-[10px] text-emerald-400 font-mono">Mainnet Active</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight sm:leading-tight">
            Autonomous DeFi Alpha & Yield Hub on{" "}
            <span className="bg-gradient-to-r from-amber-400 via-emerald-300 to-blue-400 bg-clip-text text-transparent">
              Solana
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed font-normal max-w-3xl">
            Unified <strong className="text-amber-300 font-semibold">Dual-Engine</strong> platform: Track smart money momentum with real-time{" "}
            <strong className="text-amber-300 font-semibold">Whale Copy-Trading</strong>, while harvesting high-yield passive swap fees via our{" "}
            <strong className="text-emerald-400 font-semibold">Multi-DEX LP Harvester</strong> on Meteora DLMM, FluxBeam Token-2022, Raydium & Orca.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5 pt-2">
            <Link
              href="/copytrade"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm flex items-center gap-2.5 shadow-xl shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Zap className="size-4 fill-black" />
              <span>Explore Whale Copy-Trade</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href="/lp-agent"
              className="px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 hover:border-emerald-500/60 font-bold text-sm flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg"
            >
              <Layers className="size-4 text-emerald-400" />
              <span>Deploy LP Harvester</span>
              <ArrowUpRight className="size-4 text-zinc-400" />
            </Link>

            <Link
              href="/wallets"
              className="px-5 py-3.5 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Wallet className="size-4 text-blue-400" />
              <span>Sub-Wallet Vault</span>
            </Link>
          </div>

          {/* Key Advantages Checklist */}
          <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>&lt; 400ms Sub-Wallet Execution</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Zero-Click Auto-Signing</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Anti-Rug Risk Guard</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>24/7 AI Co-Pilot Assistant</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE SYSTEM STATS RIBBON */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span className="font-medium">Execution Latency</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="size-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-white">
            &lt; 380 ms
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 font-mono">
            <span className="text-emerald-400 font-bold">Zero-Click</span>
            <span>No popup delays</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span className="font-medium">Peak LP Fee APR</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
            Up to 800%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span>Meteora DLMM & FluxBeam</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span className="font-medium">Integrated DEXs</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-purple-300">
            4 Multi-DEX
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span>FluxBeam, Meteora, Raydium, Orca</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span className="font-medium">Keypair Security</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-blue-400">
            100% Client-Side
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span>Encrypted local storage only</span>
          </div>
        </div>
      </section>

      {/* QUICK STATUS BAR IF CONNECTED */}
      {isConnected && (
        <section className="p-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-zinc-950 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Wallet className="size-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Connected Wallet:</div>
              <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                <span>{walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}</span>
                <span className="text-xs text-emerald-400 font-sans font-normal">
                  (Total: {formatSol(totalSolAssets)} ≈ {formatCurrency(totalUsdAssets)})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
              <span className="text-zinc-400">Sub-Wallet: </span>
              <span className="text-emerald-400 font-bold">{subWalletBalance.toFixed(3)} SOL</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
              <span className="text-zinc-400">Open Trades: </span>
              <span className="text-amber-400 font-bold">{openCopyTrades.length} Active</span>
            </div>
            <Link
              href="/copytrade"
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold transition-colors"
            >
              Open Dashboard →
            </Link>
          </div>
        </section>
      )}

      {/* 3. DUAL-ENGINE STRATEGIC PILLARS */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
            <Cpu className="size-3.5 text-amber-400" />
            <span>Dual Core Engines</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Dual-Engine Strategy: Active Alpha & Passive Yield
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Combine rapid directional breakout trading with sustainable, automated fee generation across Solana&apos;s deepest liquidity venues.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Active Alpha - Whale Copy-Trade */}
          <div className="rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-900/70 to-zinc-950 border border-zinc-800 hover:border-amber-500/50 p-6 sm:p-8 space-y-6 shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/15 transition-all" />

            <div className="space-y-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <Zap className="size-6" />
                </div>
                <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold uppercase tracking-wider">
                  Active Alpha • Momentum
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-300 transition-colors">
                  Whale Copy-Trade Hub
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Track top-tier Solana smart money wallets with win rates exceeding 70%. Automatically replicate their buy and sell orders the instant they hit the block validator.
                </p>
              </div>

              {/* Feature Points */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <CheckCircle2 className="size-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-white block font-semibold">Multi-Stage Take Profit & Trailing Stop (TP / SL)</strong>
                    <span className="text-zinc-400">
                      Automated tiered exits at TP1 (+50%) and TP2 (+120%) with dynamic trailing stop-loss to lock in profits while protecting downside risk.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <ShieldCheck className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-white block font-semibold">Anti-Rug Shield Security Protection</strong>
                    <span className="text-zinc-400">
                      Real-time verification of Mint Authority, Freeze Authority, and pool liquidity depth to proactively block honeypot tokens before execution.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <Sliders className="size-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-white block font-semibold">Granular Smart Money Whale Filters</strong>
                    <span className="text-zinc-400">
                      Filter target wallets by verified Win Rate, historical ROI, total portfolio balance, and trading style (Meme vs Bluechip).
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800 relative z-10">
              <Link
                href="/copytrade"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <span>Start Copying Smart Whales</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Passive Yield - Multi-DEX LP Harvester */}
          <div className="rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-900/70 to-zinc-950 border border-zinc-800 hover:border-emerald-500/50 p-6 sm:p-8 space-y-6 shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/15 transition-all" />

            <div className="space-y-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Layers className="size-6" />
                </div>
                <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  Passive Yield • Automated Fees
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors">
                  Multi-DEX LP Harvester
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Automated concentrated liquidity management across 4 leading Solana DEXs. Harvest swap fees 24/7 with built-in Impermanent Loss protection and auto-rebalancing.
                </p>
              </div>

              {/* Feature Points */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <Flame className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-white block font-semibold">Meteora DLMM & FluxBeam Token-2022</strong>
                    <span className="text-zinc-400">
                      Capture surge Dynamic Fees during volatile swings on Meteora and harvest exclusive Transfer Tax shares on FluxBeam token pairs.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <RefreshCw className="size-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-white block font-semibold">Autonomous Price Range Rebalancing</strong>
                    <span className="text-zinc-400">
                      When market price drifts out of range, the Agent automatically withdraws liquidity, rebalances token ratios, and redeploys into active bins.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                  <Coins className="size-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-white block font-semibold">Auto-Compound Fee Reinvestment</strong>
                    <span className="text-zinc-400">
                      Automatically claims accumulated fees once exceeding 0.05 SOL and reinvests into the active pool to compound yields exponentially.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800 relative z-10">
              <Link
                href="/lp-agent"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <span>Deploy LP Harvester Agent</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE TABBED FEATURE EXPLORER */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
            <Compass className="size-3.5 text-blue-400" />
            <span>Interactive Explorer</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Comprehensive Suite for Solana DeFi Traders
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Select a module below to inspect its operational workflow, parameters, and interactive preview.
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center justify-center flex-wrap gap-2 p-1.5 bg-zinc-900/80 rounded-2xl border border-zinc-800 max-w-2xl mx-auto">
          <button
            onClick={() => setActiveTab("copytrade")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "copytrade"
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Zap className="size-4" />
            <span>Copy-Trade Hub</span>
          </button>

          <button
            onClick={() => setActiveTab("lp")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "lp"
                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Layers className="size-4" />
            <span>LP Harvester</span>
          </button>

          <button
            onClick={() => setActiveTab("subwallet")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "subwallet"
                ? "bg-blue-500 text-black shadow-lg shadow-blue-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Wallet className="size-4" />
            <span>Sub-Wallet Vault</span>
          </button>

          <button
            onClick={() => setActiveTab("copilot")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "copilot"
                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Bot className="size-4" />
            <span>AI Co-Pilot 24/7</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-6 sm:p-8 lg:p-10 shadow-2xl">
          {/* TAB 1: COPYTRADE */}
          {activeTab === "copytrade" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                  <Zap className="size-3.5" />
                  <span>Whale Copy-Trade Operational Flow</span>
                </div>
                <h3 className="text-2xl font-black text-white">
                  Zero-Latency Smart Money Execution
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Eliminate chart fatigue and manual group signals. Our on-chain RPC monitor continuously tracks Solana&apos;s top-ranked traders directly at the validator layer.
                </p>

                <div className="space-y-3 pt-2 text-xs text-zinc-300">
                  <div className="flex items-start gap-3">
                    <span className="size-5 rounded-full bg-amber-500 text-black font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <strong className="text-white block">Mempool & Block Ingestion:</strong>
                      Helius WebSocket captures target wallet transactions at the earliest slot confirmation.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="size-5 rounded-full bg-amber-500 text-black font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <strong className="text-white block">Anti-Rug Safety Gate:</strong>
                      Risk Engine verifies the token contract to ensure mint authority is burned and liquidity is locked.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="size-5 rounded-full bg-amber-500 text-black font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <strong className="text-white block">Sub-Wallet Autonomous Signing:</strong>
                      Executes the swap with your pre-set SOL budget in under 400ms without manual confirmation.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="size-5 rounded-full bg-amber-500 text-black font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                      4
                    </span>
                    <div>
                      <strong className="text-white block">Multi-Stage Profit Taking:</strong>
                      Deploys multi-tier Take Profit (TP1 & TP2) and monitors trailing stop triggers automatically.
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/copytrade"
                    className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-bold text-xs group"
                  >
                    <span>Launch Whale Copy-Trade Hub</span>
                    <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Mockup Card */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-white">Live Copy Position Preview</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    Auto-Signed
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-white">$BONK</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">Raydium</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">Allocated: 0.50 SOL • Entry: $0.000018</div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="text-sm font-mono font-bold text-emerald-400">+64.8%</div>
                    <div className="text-[10px] text-emerald-400 font-mono">TP1 Taken (50%)</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-white">$WIF</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">Jupiter</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">Allocated: 0.35 SOL • Entry: $1.82</div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="text-sm font-mono font-bold text-emerald-400">+31.2%</div>
                    <div className="text-[10px] text-zinc-400 font-mono">Trailing SL: -15%</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2.5">
                  <ShieldCheck className="size-4 shrink-0 text-amber-400" />
                  <span>Anti-Rug Shield rejected 14 high-risk and unverified mint tokens in the last 24h.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LP HARVESTER */}
          {activeTab === "lp" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  <Layers className="size-3.5" />
                  <span>Concentrated LP Yield Strategies</span>
                </div>
                <h3 className="text-2xl font-black text-white">
                  3 High-Yield Liquidity Archetypes
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Transform idle SOL into an automated fee-generating asset through pre-configured, institutional-grade liquidity provision strategies:
                </p>

                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span className="size-2 rounded-full bg-blue-400" />
                        1. Bluechip Stable (SOL-USDC / Orca)
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">25% - 60% APR</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      Broad price range (±15%), minimal Impermanent Loss risk, reliable 24/7 swap fee generation.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span className="size-2 rounded-full bg-purple-400" />
                        2. Dynamic Volatility (Meteora DLMM)
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">150% - 800% APR</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      Concentrated tight bins (±5%) designed to capture surging dynamic swap fees during high volatility.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span className="size-2 rounded-full bg-amber-400" />
                        3. Tax Token Harvester (FluxBeam SPL-2022)
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">100% - 400% APR</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      Harvests both baseline swap fees and exclusive token transfer taxes distributed to liquidity providers.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/lp-agent"
                    className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold text-xs group"
                  >
                    <span>Browse High-Yield LP Pools</span>
                    <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Mockup LP Pool View */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="text-xs font-mono font-bold text-white">Active Harvester Positions</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Auto-Compound &gt; 0.05 SOL
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-white">SOL / USDC</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-purple-300 font-mono">Meteora DLMM</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">Deposit: 2.0 SOL • Fee APR: <strong className="text-emerald-400">+142%</strong></div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="text-xs font-mono font-bold text-emerald-400">+0.185 SOL Fee</div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      ● IN-RANGE
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-white">FLUX / SOL</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-blue-300 font-mono">FluxBeam</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">Deposit: 1.2 SOL • Fee APR: <strong className="text-emerald-400">+280%</strong></div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="text-xs font-mono font-bold text-emerald-400">+0.312 SOL Fee</div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      ● TAX-HARVEST
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2.5">
                  <RefreshCw className="size-4 shrink-0 text-emerald-400 animate-spin" />
                  <span>Agent automatically shifts price bins to maintain in-range status without manual input.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUB-WALLET VAULT */}
          {activeTab === "subwallet" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                  <Lock className="size-3.5" />
                  <span>Maximum Security & Frictionless Experience</span>
                </div>
                <h3 className="text-2xl font-black text-white">
                  Sub-Wallet Vault: Zero-Click Autonomous Execution
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Unlike traditional Telegram bots that demand your primary wallet keys on external servers or dApps that bombard you with wallet popups, the Sub-Wallet Vault provides true security and autonomy.
                </p>

                <div className="space-y-3 pt-2 text-xs text-zinc-300">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <ShieldCheck className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-semibold">Complete Main Wallet Isolation:</strong>
                      Your primary wallet and major assets remain untouched. You simply transfer a small working allowance (e.g., 0.2 SOL) into your Sub-Wallet.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <Lock className="size-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-semibold">Client-Side Local Encryption:</strong>
                      Keypairs are generated and stored strictly inside your browser environment. Zero private keys or seed phrases are ever uploaded to cloud servers.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <Zap className="size-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-semibold">1-Click Instant Sweep & Key Export:</strong>
                      Sweep all SOL back to your main wallet with a single click, or securely export your raw private key whenever needed.
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/wallets"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold text-xs group"
                  >
                    <span>Manage Your Sub-Wallet Vault</span>
                    <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Mockup Sub-Wallet Card */}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-blue-400" />
                    <span className="text-xs font-mono font-bold text-white">Sub-Wallet Security Guard</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                    Local AES Storage
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 space-y-2">
                  <div className="text-xs text-zinc-400">Autonomous Active Balance</div>
                  <div className="text-2xl font-mono font-bold text-emerald-400">
                    {subWalletBalance > 0 ? `${subWalletBalance.toFixed(3)} SOL` : "0.500 SOL"}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Daily Maximum Loss Cap: 5.0 SOL (Automated Risk Limiter)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button
                    onClick={() => setIsDepositOpen(true)}
                    className="p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 text-center space-y-1 transition-all cursor-pointer group"
                  >
                    <span className="text-zinc-400 group-hover:text-amber-300 block text-[11px] font-semibold">
                      Instant Deposit
                    </span>
                    <strong className="text-white font-mono group-hover:text-amber-400">
                      +0.2 / +0.5 SOL
                    </strong>
                  </button>
                  <button
                    onClick={() => setIsWithdrawOpen(true)}
                    disabled={subWalletBalance <= 0.005}
                    className="p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-blue-500/40 text-center space-y-1 transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <span className="text-zinc-400 group-hover:text-blue-300 block text-[11px] font-semibold">
                      Sweep to Main
                    </span>
                    <strong className="text-emerald-400 font-mono group-hover:text-blue-400">
                      1-Click Instant
                    </strong>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2.5">
                  <ShieldCheck className="size-4 shrink-0 text-blue-400" />
                  <span>Autonomous execution guarantees execution continues while your screen is locked.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI COPILOT */}
          {activeTab === "copilot" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">
                  <Bot className="size-3.5" />
                  <span>24/7 Intelligent On-Chain Assistant</span>
                </div>
                <h3 className="text-2xl font-black text-white">
                  AI Co-Pilot: On-Chain Analytics & Natural Commands
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Specialized for Solana DeFi, the native AI Co-Pilot assists you in evaluating on-chain risk, projecting yield scenarios, and executing 1-click trades via natural language.
                </p>

                <div className="space-y-3 pt-2 text-xs text-zinc-300">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <Sparkles className="size-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-semibold">Whale Portfolio Due Diligence:</strong>
                      Evaluates swap consistency, volume authenticity, and insider trading patterns across tracked whale addresses.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <Percent className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-semibold">Impermanent Loss Risk Simulation:</strong>
                      Simulates potential IL under historical volatility models to ensure optimal fee-to-risk ratios.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <ArrowRight className="size-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-semibold">1-Click Execution Prompts:</strong>
                      Simply prompt: &quot;Copy whale 7xKX... with 0.2 SOL&quot; or &quot;Deploy SOL/USDC on Meteora&quot; to auto-configure transactions instantly.
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-purple-400 font-semibold flex items-center gap-1.5">
                    <Bot className="size-4" />
                    <span>Click &quot;Ask Agent&quot; at the bottom right to start a live consultation anytime!</span>
                  </span>
                </div>
              </div>

              {/* Mockup Chatbot View */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-white">Ask Agent • AI Chat Simulation</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono">
                    Model: Claude Sonnet
                  </span>
                </div>

                {/* Simulated Chat Messages */}
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-zinc-900 text-xs text-zinc-200 max-w-[85%] ml-auto border border-zinc-800">
                    Which Meteora pool offers the highest Fee APR with low Impermanent Loss?
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900/90 text-xs text-zinc-300 space-y-2 border border-zinc-800/80">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Bot className="size-3.5" />
                      <span>Solana DeFi Agent:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      I recommend the <strong className="text-white">SOL-USDC (DLMM Dynamic)</strong> pool, currently generating an annualized Fee APR of <strong className="text-emerald-400">54.2%</strong>.
                    </p>
                    <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80 text-[10px] font-mono text-zinc-400">
                      • TVL: $18.4M • 24h Vol: $42.1M • Suggested Bin Range: ±8% • IL Risk: Low
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2 text-xs text-zinc-500">
                  <div className="flex-1 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-[11px]">
                    Ask about smart whales or LP pools...
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500 text-black font-bold">
                    <ArrowRight className="size-3.5" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. MULTI-DEX ECOSYSTEM SHOWCASE */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
            <Coins className="size-3.5 text-emerald-400" />
            <span>Protocol Ecosystem</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Integrated Deeply Across 4 Solana DEX Venues
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Harness the distinct architectural strengths of each decentralized exchange to extract peak risk-adjusted yields.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* DEX 1: Meteora */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/50 transition-all space-y-3 group">
            <div className="flex items-center justify-between">
              <span className="text-base font-extrabold text-white group-hover:text-purple-300 transition-colors">
                Meteora DLMM
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono font-bold">
                Bins Tech
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Proprietary Dynamic Fee model that surges during price breakouts. Deploy liquidity across discrete bins for concentrated fee capture.
            </p>
            <div className="text-[11px] font-mono text-emerald-400 font-bold pt-1">
              Dynamic Fees: Up to 15%
            </div>
          </div>

          {/* DEX 2: FluxBeam */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-blue-500/50 transition-all space-y-3 group">
            <div className="flex items-center justify-between">
              <span className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors">
                FluxBeam AMM
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono font-bold">
                Token-2022
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Market leader for SPL Token-2022 extensions. Enables LPs to collect standard swap fees alongside built-in token transfer taxes (1-5%).
            </p>
            <div className="text-[11px] font-mono text-emerald-400 font-bold pt-1">
              Exclusive Tax Harvesting
            </div>
          </div>

          {/* DEX 3: Raydium */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/50 transition-all space-y-3 group">
            <div className="flex items-center justify-between">
              <span className="text-base font-extrabold text-white group-hover:text-amber-300 transition-colors">
                Raydium CLMM
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-bold">
                Top Volume
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Solana&apos;s most liquid decentralized exchange by trading volume. Ensures near-instant fill rates and minimal slippage on major token pairs.
            </p>
            <div className="text-[11px] font-mono text-emerald-400 font-bold pt-1">
              Multi-Billion Volume Depth
            </div>
          </div>

          {/* DEX 4: Orca */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/50 transition-all space-y-3 group">
            <div className="flex items-center justify-between">
              <span className="text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                Orca Whirlpools
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                High Stability
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Battle-tested Concentrated Liquidity protocol. Optimal for long-term, conservative Bluechip Yield strategies with low volatility risk.
            </p>
            <div className="text-[11px] font-mono text-emerald-400 font-bold pt-1">
              Lowest Relative IL Risk
            </div>
          </div>
        </div>
      </section>

      {/* 6. COMPARISON MATRIX: TRADITIONAL VS SOLANA AUTONOMOUS HUB */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
            <BarChart3 className="size-3.5 text-amber-400" />
            <span>Benchmark Comparison</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Manual Trading vs Solana Autonomous DeFi Hub
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            A transparent overview highlighting the execution speed, risk defense, and effortless automation delivered by our platform.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase text-[10px] font-mono border-b border-zinc-800">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Evaluation Metric</th>
                <th className="py-3.5 px-4 sm:px-6 text-zinc-400">Manual Trading / Basic Bots</th>
                <th className="py-3.5 px-4 sm:px-6 text-amber-400 font-bold bg-amber-500/5">
                  Solana Autonomous DeFi Hub
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">Whale Follow Execution Speed</td>
                <td className="py-3.5 px-4 sm:px-6 text-rose-400">Slow (10s to minutes, heavy slippage)</td>
                <td className="py-3.5 px-4 sm:px-6 text-emerald-400 font-mono font-bold bg-amber-500/5">
                  &lt; 400ms (Automated Sub-Wallet Sign)
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">User Interaction Overhead</td>
                <td className="py-3.5 px-4 sm:px-6 text-rose-400">Constant wallet approval popup prompts</td>
                <td className="py-3.5 px-4 sm:px-6 text-emerald-400 font-bold bg-amber-500/5">
                  Zero-Click fully autonomous execution
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">Private Key Custody</td>
                <td className="py-3.5 px-4 sm:px-6 text-amber-400">Delegated to cloud servers / Telegram bot hosts</td>
                <td className="py-3.5 px-4 sm:px-6 text-emerald-400 font-bold bg-amber-500/5">
                  100% Client-side encrypted in browser
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">Anti-Rug & Scam Defense</td>
                <td className="py-3.5 px-4 sm:px-6 text-rose-400">Frequent exposure to honeypots & mint dumps</td>
                <td className="py-3.5 px-4 sm:px-6 text-emerald-400 font-bold bg-amber-500/5">
                  Automatic Mint/Freeze check + Dump Guard
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">Out-of-Range LP Management</td>
                <td className="py-3.5 px-4 sm:px-6 text-rose-400">Capital stays stuck and stops earning fees</td>
                <td className="py-3.5 px-4 sm:px-6 text-emerald-400 font-bold bg-amber-500/5">
                  Autonomous Rebalance & Auto-Compound
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. ARCHITECTURE & SECURITY HIGHLIGHT */}
      <section className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              Architecture & Transparency
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Real-Time On-Chain Execution Pipeline
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span>Solana RPC Webhook Active</span>
          </div>
        </div>

        {/* Visual Workflow Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-xs border border-amber-500/20">
              01
            </div>
            <h3 className="font-bold text-sm text-white">On-Chain Stream</h3>
            <p className="text-xs text-zinc-400">
              Captures block and mempool events via Helius WebSocket RPC & Birdeye.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs border border-emerald-500/20">
              02
            </div>
            <h3 className="font-bold text-sm text-white">Risk Engine Filter</h3>
            <p className="text-xs text-zinc-400">
              Verifies pool liquidity depth, checks mint/freeze flags, and screens slippage.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-mono font-bold text-xs border border-blue-500/20">
              03
            </div>
            <h3 className="font-bold text-sm text-white">Sub-Wallet Signer</h3>
            <p className="text-xs text-zinc-400">
              Signs raw transactions locally in the browser with sub-400ms validator submission.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
            <div className="size-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-mono font-bold text-xs border border-purple-500/20">
              04
            </div>
            <h3 className="font-bold text-sm text-white">DEX Routing & Harvest</h3>
            <p className="text-xs text-zinc-400">
              Routes swaps or deploys active LP bins on Meteora, FluxBeam, Raydium, and Orca.
            </p>
          </div>
        </div>
      </section>

      {/* 8. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
            <HelpCircle className="size-3.5 text-amber-400" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Everything you need to know before putting our autonomous DeFi engines to work.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`size-4 text-zinc-400 shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-amber-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/60 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. BOTTOM CALL TO ACTION BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-blue-500/20 border border-amber-500/30 p-8 sm:p-12 text-center space-y-6 shadow-2xl">
        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md -z-10" />

        <div className="max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>Ready to Elevate Your DeFi Returns?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
            Deploy Autonomous Capital Strategies Today
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300">
            Connect your wallet, allocate working capital to your Sub-Wallet, and experience automated DeFi execution on Solana.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/copytrade"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm flex items-center gap-2 shadow-xl shadow-amber-500/25 transition-all hover:scale-105 cursor-pointer"
          >
            <Zap className="size-4" />
            <span>Launch Whale Copy-Trade</span>
            <ArrowRight className="size-4" />
          </Link>

          <Link
            href="/lp-agent"
            className="px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 font-bold text-sm flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
          >
            <Layers className="size-4 text-emerald-400" />
            <span>Deploy LP Harvester</span>
          </Link>
        </div>

        <div className="text-[11px] text-zinc-400 pt-4 font-mono">
          Non-Custodial • Zero Hidden Platform Fees • Full Asset Autonomy
        </div>
      </section>

      {/* DEPOSIT MODAL */}
      <DepositSubWalletModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        targetDescription="Sub-Wallet Vault Funding"
        onSuccess={() => {
          refreshSubBalance();
        }}
      />

      {/* WITHDRAW MODAL */}
      <WithdrawSubWalletModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={() => {
          refreshSubBalance();
        }}
      />
    </div>
  );
}
