"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  ArrowUpRight,
  ArrowRight,
  Zap,
  ShieldCheck,
  CheckCircle2,
  X,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Coins,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useSolanaWallet } from "./wallet-context";
import {
  getOrCreateSubWallet,
  fetchSubWalletBalance,
  SubWalletData,
  withdrawSolFromSubWallet,
} from "@/lib/sub-wallet-manager";
import { fetchLiveSolPrice } from "@/lib/token-price-service";

interface WithdrawSubWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
}

export function WithdrawSubWalletModal({
  isOpen,
  onClose,
  onSuccess,
}: WithdrawSubWalletModalProps) {
  const {
    walletAddress,
    isConnected,
    balance: mainBalance,
    network,
    refreshBalance: refreshMainBalance,
    connect,
  } = useSolanaWallet();

  const [subWallet, setSubWallet] = useState<SubWalletData | null>(null);
  const [subBalance, setSubBalance] = useState<number>(0);
  const [solPriceUsd, setSolPriceUsd] = useState<number>(185.0);
  const [amountStr, setAmountStr] = useState<string>("");
  const [isAll, setIsAll] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      const sw = getOrCreateSubWallet(walletAddress);
      setSubWallet(sw);
      fetchSubWalletBalance(sw.publicKey, walletAddress, network).then((bal) => {
        setSubBalance(bal);
        if (bal > 0) {
          setAmountStr(bal.toFixed(3));
        } else {
          setAmountStr("");
        }
      });
      fetchLiveSolPrice().then((p) => {
        if (p > 0) setSolPriceUsd(p);
      });
    } else {
      setSubWallet(null);
      setSubBalance(0);
      setAmountStr("");
    }
    setSuccessMsg(null);
    setErrorMsg(null);
    setTxSignature(null);
    setIsAll(true);
  }, [walletAddress, isOpen, network]);

  useEffect(() => {
    const handleBalanceUpdated = (e: any) => {
      if (e?.detail?.balance !== undefined) {
        setSubBalance(e.detail.balance);
      }
    };
    window.addEventListener("solana_subwallet_balance_updated", handleBalanceUpdated);
    return () => {
      window.removeEventListener("solana_subwallet_balance_updated", handleBalanceUpdated);
    };
  }, []);

  if (!isOpen || !mounted) return null;

  const handleCopySubAddr = () => {
    if (subWallet?.publicKey) {
      navigator.clipboard.writeText(subWallet.publicKey);
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    }
  };

  const handleSetMax = () => {
    setIsAll(true);
    setAmountStr(subBalance.toFixed(3));
  };

  const handleSetPercentage = (pct: number) => {
    if (pct === 100) {
      handleSetMax();
      return;
    }
    setIsAll(false);
    const amt = (subBalance * (pct / 100)).toFixed(3);
    setAmountStr(amt);
  };

  const handleExecuteWithdraw = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setTxSignature(null);

    if (!walletAddress || !subWallet) {
      setErrorMsg("Please connect your primary wallet first.");
      return;
    }

    if (subBalance <= 0.005) {
      setErrorMsg(
        "Sub-Wallet balance is too low to withdraw. A minimum of 0.005 SOL is required to cover network fees."
      );
      return;
    }

    const amt = isAll ? undefined : parseFloat(amountStr);
    if (!isAll && (amt === undefined || isNaN(amt) || amt <= 0)) {
      setErrorMsg("Please enter a valid SOL withdrawal amount (> 0).");
      return;
    }

    if (!isAll && amt !== undefined && amt > subBalance) {
      setErrorMsg(
        `Withdrawal amount (${amt} SOL) exceeds available Sub-Wallet balance (${subBalance.toFixed(3)} SOL).`
      );
      return;
    }

    setIsProcessing(true);
    try {
      const freshWallet = getOrCreateSubWallet(walletAddress);
      freshWallet.balance = subBalance;

      const res = await withdrawSolFromSubWallet(freshWallet, walletAddress, amt, network);

      if (res.success) {
        await refreshMainBalance();
        const updatedBal = await fetchSubWalletBalance(subWallet.publicKey, walletAddress, network);
        setSubBalance(updatedBal);
        if (res.signature) setTxSignature(res.signature);

        const withdrawnText = isAll ? `all ~${subBalance.toFixed(3)}` : `${amountStr}`;
        setSuccessMsg(
          `Successfully reclaimed ${withdrawnText} SOL back to primary wallet!`
        );

        if (onSuccess) onSuccess(updatedBal);

        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setErrorMsg(res.error || "Withdrawal failed. Please check network connection and try again.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred during withdrawal.");
    } finally {
      setIsProcessing(false);
    }
  };

  const numericAmt = parseFloat(amountStr) || 0;
  const estUsd = numericAmt * solPriceUsd;

  const solscanUrl = txSignature
    ? txSignature.startsWith("sim_")
      ? null
      : `https://solscan.io/tx/${txSignature}${network === "devnet" ? "?cluster=devnet" : ""}`
    : null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/80 ring-1 ring-white/10 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient */}
        <div className="absolute -top-24 -right-24 size-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <ArrowUpRight className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                Withdraw from Sub-Wallet
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  1-Click Exit
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Reclaim SOL capital back to your connected primary wallet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Connect Wallet Prompt if not connected */}
        {!isConnected ? (
          <div className="mt-5 p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-center space-y-3">
            <Wallet className="size-8 text-zinc-500 mx-auto" />
            <p className="text-xs text-zinc-400">
              Primary wallet not connected. Please connect your wallet (Phantom / Solflare) to receive withdrawn funds.
            </p>
            <button
              onClick={() => connect("phantom")}
              className="py-2.5 px-5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Connect Wallet Now
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Wallet Balance Comparison Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Sub-Wallet Vault (Source) */}
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-emerald-400">
                  <span>Source: Sub-Wallet</span>
                  <Zap className="size-3 text-emerald-400" />
                </div>
                <div className="font-mono text-base font-bold text-emerald-400">
                  {subBalance.toFixed(3)} <span className="text-xs text-emerald-500">SOL</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                  <span>
                    {subWallet
                      ? `${subWallet.publicKey.slice(0, 5)}...${subWallet.publicKey.slice(-5)}`
                      : "Loading..."}
                  </span>
                  <button onClick={handleCopySubAddr} className="hover:text-white cursor-pointer ml-1" title="Copy Address">
                    {copiedAddr ? <Check className="size-2.5 text-emerald-400" /> : <Copy className="size-2.5" />}
                  </button>
                </div>
              </div>

              {/* Primary Wallet (Destination) */}
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Destination: Primary</span>
                  <span className="size-2 rounded-full bg-blue-400 animate-pulse" />
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {mainBalance.toFixed(3)} <span className="text-xs text-zinc-400">SOL</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono truncate">
                  {walletAddress ? `${walletAddress.slice(0, 5)}...${walletAddress.slice(-5)}` : ""}
                </div>
              </div>
            </div>

            {/* Input SOL amount */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-zinc-300">Amount to Withdraw:</label>
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="text-blue-400 hover:text-blue-300 hover:underline font-mono text-[11px] cursor-pointer font-bold"
                >
                  Withdraw All ({subBalance.toFixed(3)} SOL)
                </button>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0.001"
                  max={subBalance}
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    setIsAll(false);
                  }}
                  placeholder="0.0"
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-blue-400 transition-colors pr-24"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 font-mono">
                  {numericAmt > 0 && (
                    <span className="text-xs text-zinc-500">
                      ≈ ${estUsd.toFixed(2)}
                    </span>
                  )}
                  <span className="text-sm font-bold text-zinc-400">
                    SOL
                  </span>
                </div>
              </div>

              {/* Quick Percentage Presets */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleSetPercentage(pct)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      (pct === 100 && isAll) ||
                      (!isAll && Math.abs(numericAmt - (subBalance * pct) / 100) < 0.01 && numericAmt > 0)
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700/80 text-zinc-300"
                    }`}
                  >
                    {pct === 100 ? "Max (100%)" : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success message */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
                {solscanUrl && (
                  <a
                    href={solscanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 hover:underline pt-0.5"
                  >
                    <span>View on Solscan Explorer</span>
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            )}

            {/* Non-custodial explanation banner */}
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
              <div className="flex items-center justify-between text-zinc-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-blue-400" />
                  Direct Client-Side Execution
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Network Fee: ~0.000005 SOL
                </span>
              </div>
              <p>
                Funds are signed and transferred directly from your browser&apos;s encrypted Sub-Wallet keypair to your primary wallet.
                Zero approvals needed from your browser extension.
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleExecuteWithdraw}
              disabled={isProcessing || subBalance <= 0.005}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Signing & broadcasting withdrawal...</span>
                </>
              ) : (
                <>
                  <span>
                    {isAll
                      ? `Withdraw All ~${subBalance.toFixed(3)} SOL to Primary`
                      : `Withdraw ${amountStr || "0"} SOL to Primary`}
                  </span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
