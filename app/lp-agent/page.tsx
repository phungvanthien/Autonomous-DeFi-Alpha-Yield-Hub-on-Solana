"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MOCK_LP_POOLS,
  LpPoolData,
  ActiveLpPosition,
  LpAgentConfig,
  STRATEGY_PRESETS,
  StrategyType,
  getSavedLpPositions,
  deployLpPosition,
  harvestLpFees,
  rebalanceLpPosition,
  emergencyExitLpPosition,
} from "@/lib/lp-agent-engine";
import { useSolanaWallet } from "@/components/wallet/wallet-context";
import {
  getSubWallet,
  fetchSubWalletBalance,
  recordSubWalletDeduction,
  recordSubWalletDeposit,
} from "@/lib/sub-wallet-manager";
import { fetchLiveSolPrice } from "@/lib/token-price-service";
import { PoolDiscoveryTable } from "@/components/lp-agent/pool-discovery-table";
import { DeployLpModal } from "@/components/lp-agent/deploy-lp-modal";
import { ActivePositionsGrid } from "@/components/lp-agent/active-positions-grid";
import { IlCalculatorModal } from "@/components/lp-agent/il-calculator-modal";
import { AutonomousWatcherPanel } from "@/components/lp-agent/autonomous-watcher-panel";
import { DepositSubWalletModal } from "@/components/wallet/deposit-subwallet-modal";
import { WithdrawSubWalletModal } from "@/components/wallet/withdraw-subwallet-modal";
import {
  Layers,
  Coins,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Zap,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  DollarSign,
  ArrowRight,
  ArrowUpRight,
  Search,
  Lock,
  Calculator,
  Bot,
  Activity,
  PlusCircle,
} from "lucide-react";

export default function LpAgentPage() {
  const { walletAddress, isConnected, network } = useSolanaWallet();
  const [subWalletBalance, setSubWalletBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"EXPLORER" | "POSITIONS" | "WATCHER" | "SETTINGS">("EXPLORER");

  // Real on-chain pools state
  const [pools, setPools] = useState<LpPoolData[]>(MOCK_LP_POOLS);
  const [isLoadingPools, setIsLoadingPools] = useState<boolean>(true);
  const [lastPoolSync, setLastPoolSync] = useState<number | null>(null);

  // State vị thế LP
  const [positions, setPositions] = useState<ActiveLpPosition[]>([]);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Modal State
  const [selectedPoolForDeploy, setSelectedPoolForDeploy] = useState<LpPoolData | null>(null);
  const [selectedPoolForCalculator, setSelectedPoolForCalculator] = useState<LpPoolData | null>(null);

  // Deposit & Withdraw Modal State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositTargetDesc, setDepositTargetDesc] = useState<string>("Fund LP Agent Deployment");
  const [depositRecommendedAmt, setDepositRecommendedAmt] = useState<number>(0.5);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const fetchLivePools = useCallback(async () => {
    setIsLoadingPools(true);
    try {
      const res = await fetch("/api/lp-pools");
      if (res.ok) {
        const data = await res.json();
        if (data.pools && Array.isArray(data.pools) && data.pools.length > 0) {
          setPools(data.pools);
          setLastPoolSync(data.timestamp || Date.now());
        }
      }
    } catch (err) {
      console.error("Failed to load real pools:", err);
    } finally {
      setIsLoadingPools(false);
    }
  }, []);

  const refreshPositions = useCallback(() => {
    setPositions(getSavedLpPositions());
  }, []);

  useEffect(() => {
    fetchLivePools();
  }, [fetchLivePools]);

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
    refreshPositions();

    const handlePosUpdated = () => {
      refreshPositions();
    };
    const handleSubBalanceUpdate = (e: any) => {
      if (e?.detail?.balance !== undefined) {
        setSubWalletBalance(e.detail.balance);
      } else {
        refreshSubBalance();
      }
    };

    window.addEventListener("solana_lp_positions_updated", handlePosUpdated);
    window.addEventListener("solana_subwallet_balance_updated", handleSubBalanceUpdate);
    return () => {
      window.removeEventListener("solana_lp_positions_updated", handlePosUpdated);
      window.removeEventListener("solana_subwallet_balance_updated", handleSubBalanceUpdate);
    };
  }, [walletAddress, refreshPositions, refreshSubBalance]);

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 4500);
  };

  const handleDeployConfirm = async (pool: LpPoolData, config: LpAgentConfig) => {
    // Khấu trừ vốn từ Sub-Wallet tương ứng
    if (walletAddress && config.allocatedSol > 0) {
      recordSubWalletDeduction(walletAddress, config.allocatedSol);
    }

    const solPrice = await fetchLiveSolPrice();
    const newPos = deployLpPosition(pool, config, solPrice);
    refreshPositions();
    showToast(`Successfully deployed LP Agent for ${newPos.tokenPair} (${config.allocatedSol} SOL)`);
    setSelectedPoolForDeploy(null);
    setActiveTab("POSITIONS");
  };

  const handleHarvest = (posId: string) => {
    const res = harvestLpFees(posId);
    if (res.success) {
      if (walletAddress && res.harvestedSol > 0) {
        recordSubWalletDeposit(walletAddress, res.harvestedSol);
      }
      refreshPositions();
      showToast(`Successfully harvested +${res.harvestedSol.toFixed(4)} SOL in trading fees!`);
    }
  };

  const handleRebalance = (posId: string, newRange: [number, number]) => {
    const res = rebalanceLpPosition(posId, newRange);
    if (res.success) {
      refreshPositions();
      showToast("Triggered Sub-Wallet active bin rebalancing (50:50)!");
    }
  };

  const handleEmergencyExit = (posId: string) => {
    const confirmExit = confirm("WARNING: Panic exit will withdraw all LP liquidity and swap back to SOL. Proceed?");
    if (!confirmExit) return;

    const targetPos = positions.find((p) => p.id === posId);
    if (walletAddress && targetPos?.depositAmountSol) {
      recordSubWalletDeposit(walletAddress, targetPos.depositAmountSol);
    }

    emergencyExitLpPosition(posId);
    refreshPositions();
    showToast("Emergency Panic Exit executed! Funds secured to Sub-Wallet.");
  };

  const totalUnclaimedFeesSol = positions.reduce((acc, p) => acc + (p.unclaimedFeesSol || 0), 0);
  const totalLpCapitalSol = positions.reduce((acc, p) => acc + (p.depositAmountSol || 0), 0);
  const activePositionsCount = positions.filter((p) => p.status !== "EMERGENCY_CLOSED").length;
  const outOfRangeCount = positions.filter((p) => p.status === "OUT_OF_RANGE").length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-6 pb-28 sm:pb-32 space-y-6">
      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-[calc(100vw-2rem)] sm:max-w-md p-4 rounded-2xl bg-emerald-500 text-black font-bold text-xs shadow-2xl flex items-center gap-2.5 border border-emerald-300 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="leading-snug">{toastNotification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Layers className="size-5" />
            </div>
            <h1 className="text-xl font-black text-white">Multi-DEX LP Harvester</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Autonomous liquidity provider & fee collector on <strong className="text-purple-300">Meteora DLMM</strong>,{" "}
            <strong className="text-amber-300">FluxBeam (Token-2022 Tax)</strong>, Raydium & Orca with Auto-Rebalance.
          </p>
          <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live On-Chain Pool Feeds (Meteora DLMM • DexScreener • Raydium CLMM)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {outOfRangeCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
              <AlertTriangle className="size-3.5" />
              <span>{outOfRangeCount} Out of Range</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs font-mono px-3.5 py-2 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-inner">
            <span className="text-zinc-500">Unclaimed Fees:</span>
            <span className="text-emerald-400 font-bold">+{totalUnclaimedFeesSol.toFixed(3)} SOL</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono px-3.5 py-2 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-inner">
            <span className="text-zinc-500">LP Capital:</span>
            <span className="text-white font-bold">{totalLpCapitalSol.toFixed(2)} SOL</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono px-3.5 py-2 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-inner">
            <span className="text-zinc-500">Sub-Wallet:</span>
            <span className="text-purple-300 font-bold">{subWalletBalance.toFixed(3)} SOL</span>
          </div>
          <button
            onClick={() => {
              setDepositTargetDesc("Fund delegation for LP Agent Harvester");
              setDepositRecommendedAmt(0.5);
              setIsDepositOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-extrabold text-xs shadow-md shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Coins className="size-3.5" />
            <span>Deposit SOL</span>
          </button>
          <button
            onClick={() => setIsWithdrawOpen(true)}
            disabled={subWalletBalance <= 0.005}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-extrabold text-xs transition-all cursor-pointer disabled:opacity-50"
            title="Withdraw capital from Sub-Wallet back to primary wallet"
          >
            <ArrowUpRight className="size-3.5 text-blue-400" />
            <span>Withdraw Funds</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab("EXPLORER")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "EXPLORER"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-md shadow-purple-500/5"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Search className="size-3.5" />
          <span>Pool Explorer & Scanner</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-zinc-300 font-bold">
            {pools.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("POSITIONS")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "POSITIONS"
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-500/5"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Coins className="size-3.5" />
          <span>My Active LP Positions</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-zinc-300 font-bold">
            {activePositionsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("WATCHER")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "WATCHER"
              ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-md shadow-indigo-500/5"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Bot className="size-3.5" />
          <span>Autonomous Watcher & Logs</span>
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          onClick={() => setActiveTab("SETTINGS")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "SETTINGS"
              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/5"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Sliders className="size-3.5" />
          <span>LP Strategy & Automation Settings</span>
        </button>
      </div>

      {/* TAB 1: POOL EXPLORER */}
      {activeTab === "EXPLORER" && (
        <PoolDiscoveryTable
          pools={pools}
          isLoading={isLoadingPools}
          onRefresh={fetchLivePools}
          lastUpdated={lastPoolSync}
          onDeploy={(pool) => setSelectedPoolForDeploy(pool)}
          onOpenCalculator={(pool) => setSelectedPoolForCalculator(pool)}
        />
      )}

      {/* TAB 2: MY ACTIVE LP POSITIONS */}
      {activeTab === "POSITIONS" && (
        <ActivePositionsGrid
          positions={positions}
          onHarvest={handleHarvest}
          onRebalance={handleRebalance}
          onEmergencyExit={handleEmergencyExit}
          onExplorePools={() => setActiveTab("EXPLORER")}
        />
      )}

      {/* TAB 3: AUTONOMOUS WATCHER & LOGS */}
      {activeTab === "WATCHER" && (
        <AutonomousWatcherPanel
          positions={positions}
          ownerAddress={walletAddress || undefined}
          onRefreshPositions={refreshPositions}
        />
      )}

      {/* TAB 4: LP STRATEGY & AUTOMATION SETTINGS */}
      {activeTab === "SETTINGS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-5 shadow-xl">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="size-4 text-amber-400" />
                  <span>Price Range Configuration & LP Automation Settings</span>
                </h2>

                <div className="space-y-4 text-xs">
                  {/* 1. Auto-Rebalance */}
                  <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white text-sm">Auto-Rebalance (Active Bin Realignment)</span>
                        <p className="text-zinc-400 text-[11px] mt-0.5">
                          When price moves out of the active range, Sub-Wallet withdraws LP, rebalances 50:50 and deploys a fresh active band.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                        ENABLED
                      </span>
                    </div>
                  </div>

                  {/* 2. Auto-Compound */}
                  <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white text-sm">Auto-Compound (Automated Re-investment)</span>
                        <p className="text-zinc-400 text-[11px] mt-0.5">
                          Automatically claims accumulated fees and deposits back into the pool once unclaimed fees cross 0.05 SOL.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                        Threshold 0.05 SOL
                      </span>
                    </div>
                  </div>

                  {/* 3. Emergency Dump Guard */}
                  <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white text-sm">Emergency Dump Guard (Stop-Loss Protection)</span>
                        <p className="text-zinc-400 text-[11px] mt-0.5">
                          If the pool token dumps &gt;15% in 5 minutes or liquidity drops &gt;20%, immediately withdraw all LP and swap to SOL/USDC.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 font-mono font-bold">
                        Stop-Loss -15%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Presets Guide */}
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4 shadow-xl">
                <h3 className="font-bold text-sm text-white">3 Core LP Strategies</h3>

                <div className="space-y-3 text-xs">
                  {(Object.keys(STRATEGY_PRESETS) as StrategyType[]).map((stKey) => {
                    const s = STRATEGY_PRESETS[stKey];
                    return (
                      <div key={stKey} className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1.5">
                        <div className="font-bold text-amber-300">{s.name}</div>
                        <p className="text-zinc-400 text-[11px] leading-relaxed">{s.description}</p>
                        <div className="text-[10px] text-zinc-500 font-mono pt-1">
                          Recommended Range: {s.recommendedRangePct[0]}% to +{s.recommendedRangePct[1]}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Watcher Logs in Settings as well */}
          <AutonomousWatcherPanel
            positions={positions}
            ownerAddress={walletAddress || undefined}
            onRefreshPositions={refreshPositions}
          />
        </div>
      )}

      {/* DEPLOY AGENT MODAL */}
      {selectedPoolForDeploy && (
        <DeployLpModal
          pool={selectedPoolForDeploy}
          isOpen={!!selectedPoolForDeploy}
          onClose={() => setSelectedPoolForDeploy(null)}
          subWalletBalance={subWalletBalance}
          onDeploy={handleDeployConfirm}
          onOpenDepositModal={(amt) => {
            setDepositTargetDesc(`Fund ${amt} SOL to open LP position for ${selectedPoolForDeploy.tokenA.symbol}/${selectedPoolForDeploy.tokenB.symbol}`);
            setDepositRecommendedAmt(amt);
            setIsDepositOpen(true);
          }}
        />
      )}

      {/* IL CALCULATOR MODAL */}
      {selectedPoolForCalculator && (
        <IlCalculatorModal
          pool={selectedPoolForCalculator}
          isOpen={!!selectedPoolForCalculator}
          onClose={() => setSelectedPoolForCalculator(null)}
          onDeployFromCalculator={(pool) => setSelectedPoolForDeploy(pool)}
        />
      )}

      {/* DEPOSIT MODAL */}
      <DepositSubWalletModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        targetDescription={depositTargetDesc}
        recommendedAmount={depositRecommendedAmt}
        onSuccess={(newBal) => {
          setSubWalletBalance(newBal);
          showToast(`Deposit successful! Current Sub-Wallet balance: ${newBal.toFixed(3)} SOL`);
        }}
      />

      {/* WITHDRAW MODAL */}
      <WithdrawSubWalletModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={(newBal) => {
          setSubWalletBalance(newBal);
          showToast(`Withdrawal successful! Remaining Sub-Wallet balance: ${newBal.toFixed(3)} SOL`);
        }}
      />
    </div>
  );
}
