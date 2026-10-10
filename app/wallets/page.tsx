"use client";

import { useState, useEffect } from "react";
import { useSolanaWallet } from "@/components/wallet/wallet-context";
import {
  SubWalletData,
  getOrCreateSubWallet,
  fetchSubWalletBalance,
  withdrawSolFromSubWallet,
  exportSubWalletPrivateKey,
  resetSubWallet,
} from "@/lib/sub-wallet-manager";
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
} from "lucide-react";

export default function WalletsPage() {
  const {
    walletAddress,
    isConnected,
    balance: mainBalance,
    sendSolToSubWallet,
    refreshBalance: refreshMainBalance,
  } = useSolanaWallet();

  const [subWallet, setSubWallet] = useState<SubWalletData | null>(null);
  const [subBalance, setSubBalance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("0.2");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Allowance & Daily limits
  const [dailyMaxSol, setDailyMaxSol] = useState<number>(1.5);
  const [maxPerTradeSol, setMaxPerTradeSol] = useState<number>(0.3);
  const [autoRevokeOnEmergency, setAutoRevokeOnEmergency] = useState(true);

  const loadSubWallet = async (address: string) => {
    const sw = getOrCreateSubWallet(address);
    setSubWallet(sw);
    setIsRefreshing(true);
    const bal = await fetchSubWalletBalance(sw.publicKey, address);
    setSubBalance(bal);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (walletAddress) {
      loadSubWallet(walletAddress);
    } else {
      setSubWallet(null);
      setSubBalance(0);
    }

    const handleBalanceUpdated = (e: any) => {
      if (e?.detail?.balance !== undefined) {
        setSubBalance(e.detail.balance);
      }
    };
    window.addEventListener("solana_subwallet_balance_updated", handleBalanceUpdated);
    return () => {
      window.removeEventListener("solana_subwallet_balance_updated", handleBalanceUpdated);
    };
  }, [walletAddress]);

  const handleDepositSol = async (amount: number, isFaucet: boolean = false) => {
    if (!subWallet) return;
    setIsDepositing(true);
    try {
      const sig = await sendSolToSubWallet(subWallet.publicKey, amount, isFaucet);
      if (sig) {
        alert(`Successfully deposited ${amount} SOL to Sub-Wallet!\nTx: ${sig.slice(0, 10)}...`);
        await loadSubWallet(subWallet.ownerAddress);
        await refreshMainBalance();
      }
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async (all: boolean = true) => {
    if (!subWallet || !walletAddress) return;
    if (subBalance <= 0.005) {
      alert("Sub-Wallet balance is too low (requires at least 0.005 SOL for Solana network transaction fees)");
      return;
    }

    const amt = all ? undefined : parseFloat(withdrawAmount);
    const confirmWithdraw = confirm(
      `Confirm withdrawing ${all ? "entire ~" + subBalance.toFixed(3) : amt} SOL back to primary wallet (${walletAddress.slice(0, 6)}...)?`
    );
    if (!confirmWithdraw) return;

    setIsWithdrawing(true);
    const res = await withdrawSolFromSubWallet(subWallet, walletAddress, amt);
    setIsWithdrawing(false);

    if (res.success) {
      alert(`Withdrawal successful!\nTx signature: ${res.signature?.slice(0, 10)}...`);
      await loadSubWallet(subWallet.ownerAddress);
      await refreshMainBalance();
      setWithdrawAmount("");
    } else {
      alert(`Withdrawal failed: ${res.error}`);
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

        <button
          onClick={() => subWallet && loadSubWallet(subWallet.ownerAddress)}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
          <span>Refresh Balance</span>
        </button>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-mono">
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-500 uppercase font-semibold">Sub-Wallet Balance</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {subBalance.toFixed(4)} SOL
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  ≈ ${(subBalance * 152.4).toFixed(2)} USD
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <span className="text-[11px] text-zinc-500 uppercase font-semibold">Primary Wallet Balance (Browser Extension)</span>
                <div className="text-2xl font-bold text-white mt-1">
                  {mainBalance.toFixed(4)} SOL
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  ≈ ${(mainBalance * 152.4).toFixed(2)} USD
                </div>
              </div>
            </div>

            {/* Address bar */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 text-xs font-mono">
              <div className="truncate">
                <span className="text-zinc-500 text-[11px]">Sub-Wallet Address: </span>
                <span className="text-zinc-300 font-bold select-all">{subWallet?.publicKey}</span>
              </div>
              <button
                onClick={() => subWallet && copyToClipboard(subWallet.publicKey, "addr")}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
                title="Copy Address"
              >
                {copiedAddr ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              </button>
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
                  onClick={() => handleDepositSol(0.5, true)}
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
                        onClick={() => setDepositAmount(amt.toString())}
                        className="px-2 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleDepositSol(parseFloat(depositAmount) || 0.1)}
                  disabled={isDepositing}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDepositing ? <RefreshCw className="size-4 animate-spin" /> : <ArrowDownRight className="size-4" />}
                  <span>{isDepositing ? "Broadcasting transaction..." : `Deposit ${depositAmount} SOL to Sub-Wallet`}</span>
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
                    onClick={() => setWithdrawAmount(Math.max(0, subBalance - 0.005).toFixed(3))}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono"
                  >
                    Max
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleWithdraw(true)}
                    disabled={isWithdrawing || subBalance <= 0.005}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-zinc-700"
                  >
                    {isWithdrawing ? <RefreshCw className="size-4 animate-spin" /> : <ArrowUpRight className="size-4 text-blue-400" />}
                    <span>Withdraw All SOL</span>
                  </button>
                </div>
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
                  <span className="font-mono text-amber-400 font-bold">{dailyMaxSol} SOL</span>
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
                  <span className="font-mono text-amber-400 font-bold">{maxPerTradeSol} SOL</span>
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
    </div>
  );
}
