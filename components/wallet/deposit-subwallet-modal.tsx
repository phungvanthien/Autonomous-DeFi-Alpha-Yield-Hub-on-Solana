"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  ArrowRight,
  Zap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Coins,
  Layers,
  AlertCircle,
} from "lucide-react";
import { useSolanaWallet } from "./wallet-context";
import {
  getOrCreateSubWallet,
  fetchSubWalletBalance,
  SubWalletData,
  depositSolSimulatedOrFaucet,
} from "@/lib/sub-wallet-manager";

interface DepositSubWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDescription?: string;
  recommendedAmount?: number;
  onSuccess?: (newBalance: number) => void;
}

export function DepositSubWalletModal({
  isOpen,
  onClose,
  targetDescription,
  recommendedAmount = 0.3,
  onSuccess,
}: DepositSubWalletModalProps) {
  const {
    walletAddress,
    isConnected,
    balance: mainBalance,
    network,
    sendSolToSubWallet,
    refreshBalance: refreshMainBalance,
    connect,
  } = useSolanaWallet();

  const [subWallet, setSubWallet] = useState<SubWalletData | null>(null);
  const [subBalance, setSubBalance] = useState<number>(0);
  const [amountStr, setAmountStr] = useState<string>(recommendedAmount.toString());
  const [transferMode, setTransferMode] = useState<"ONCHAIN" | "FAUCET">("ONCHAIN");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (recommendedAmount > 0) {
      setAmountStr(recommendedAmount.toString());
    }
  }, [recommendedAmount]);

  useEffect(() => {
    if (walletAddress) {
      const sw = getOrCreateSubWallet(walletAddress);
      setSubWallet(sw);
      fetchSubWalletBalance(sw.publicKey, walletAddress, network).then(setSubBalance);
    } else {
      setSubWallet(null);
      setSubBalance(0);
    }
    setSuccessMsg(null);
    setErrorMsg(null);
    setTxSignature(null);
  }, [walletAddress, isOpen, network]);

  // Listen for balance updates from other sources
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

  const handleCopyAddr = () => {
    if (subWallet?.publicKey) {
      navigator.clipboard.writeText(subWallet.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExecuteTransfer = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!walletAddress || !subWallet) {
      setErrorMsg("Please connect your primary wallet before depositing.");
      return;
    }

    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Please enter a valid SOL amount (> 0).");
      return;
    }

    if (transferMode === "ONCHAIN" && mainBalance < amt) {
      setErrorMsg(`Primary wallet balance (${mainBalance.toFixed(3)} SOL) is insufficient to deposit ${amt} SOL.`);
      return;
    }

    setIsProcessing(true);
    setTxSignature(null);
    try {
      if (transferMode === "FAUCET") {
        // Instant deposit via Testnet / Demo Faucet
        const newBal = depositSolSimulatedOrFaucet(walletAddress, amt);
        setSubBalance(newBal);
        setSuccessMsg(`Successfully credited +${amt} SOL into Sub-Wallet via Testnet Faucet!`);
        if (onSuccess) onSuccess(newBal);
        setTimeout(() => {
          onClose();
        }, 1600);
      } else {
        // Sign on-chain transaction via extension wallet (Phantom/Solflare)
        const sig = await sendSolToSubWallet(subWallet.publicKey, amt, false);
        if (sig) {
          setTxSignature(sig);
          await refreshMainBalance();
          const newBal = await fetchSubWalletBalance(subWallet.publicKey, walletAddress, network);
          setSubBalance(newBal);
          setSuccessMsg(`Successfully deposited ${amt} SOL on-chain to Sub-Wallet!`);
          if (onSuccess) onSuccess(newBal);
          setTimeout(() => {
            onClose();
          }, 2200);
        } else {
          setErrorMsg("Transaction failed or was canceled by user.");
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error depositing SOL into Sub-Wallet.");
    } finally {
      setIsProcessing(false);
    }
  };

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
        <div className="absolute -top-24 -right-24 size-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Coins className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                Deposit SOL to Sub-Wallet
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Autonomous Vault
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Fund autonomous whale copy-trade delegation & LP agents
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

        {/* Target Context (if opened from a specific action) */}
        {targetDescription && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
            <Sparkles className="size-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-200">Funding Purpose: </span>
              {targetDescription}
            </div>
          </div>
        )}

        {/* Connect Wallet Prompt if not connected */}
        {!isConnected ? (
          <div className="mt-5 p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-center space-y-3">
            <Wallet className="size-8 text-zinc-500 mx-auto" />
            <p className="text-xs text-zinc-400">
              Wallet extension not connected (Phantom / Solflare). Please connect your primary wallet to deposit SOL.
            </p>
            <button
              onClick={() => connect("phantom")}
              className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors cursor-pointer"
            >
              Connect Phantom Now
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Wallet Balance Comparison Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Connected Primary Wallet */}
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Connected Primary Wallet</span>
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {mainBalance.toFixed(3)} <span className="text-xs text-zinc-400">SOL</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono truncate">
                  {walletAddress ? `${walletAddress.slice(0, 5)}...${walletAddress.slice(-5)}` : ""}
                </div>
              </div>

              {/* Sub-Wallet Vault */}
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-emerald-400">
                  <span>Sub-Wallet Vault</span>
                  <Zap className="size-3 text-emerald-400" />
                </div>
                <div className="font-mono text-base font-bold text-emerald-400">
                  {subBalance.toFixed(3)} <span className="text-xs text-emerald-500">SOL</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                  <span>{subWallet ? `${subWallet.publicKey.slice(0, 5)}...${subWallet.publicKey.slice(-5)}` : ""}</span>
                  <button onClick={handleCopyAddr} className="hover:text-white cursor-pointer ml-1">
                    {copied ? <Check className="size-2.5 text-emerald-400" /> : <Copy className="size-2.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Select deposit method */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Deposit Method:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferMode("ONCHAIN")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    transferMode === "ONCHAIN"
                      ? "bg-amber-500/15 border-amber-500/50 text-white shadow-md shadow-amber-500/5"
                      : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Wallet className="size-3.5" />
                    On-Chain Wallet Sign
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Transfer real SOL from Phantom / Solflare to Sub-Wallet
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTransferMode("FAUCET")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    transferMode === "FAUCET"
                      ? "bg-emerald-500/15 border-emerald-500/50 text-white shadow-md shadow-emerald-500/5"
                      : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <Zap className="size-3.5" />
                    Testnet Faucet (Demo)
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Quickly fund 0.5-2 SOL for risk-free delegation testing
                  </p>
                </button>
              </div>
            </div>

            {/* Input SOL amount */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-zinc-300">SOL Amount to Deposit:</label>
                {transferMode === "ONCHAIN" && (
                  <button
                    onClick={() => setAmountStr(Math.max(0, mainBalance - 0.01).toFixed(3))}
                    className="text-amber-400 hover:underline font-mono text-[11px] cursor-pointer"
                  >
                    Max: {(Math.max(0, mainBalance - 0.01)).toFixed(3)} SOL
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.3"
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-amber-400 transition-colors pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 font-mono">
                  SOL
                </span>
              </div>

              {/* Quick Pills */}
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[0.1, 0.2, 0.5, 1.0, 2.0].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountStr(amt.toString())}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      amountStr === amt.toString()
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700/80 text-zinc-300"
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification messages */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

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
                    className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 hover:underline pt-0.5"
                  >
                    <span>View on Solscan Explorer</span>
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            )}

            {/* Explanatory security banner */}
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                Sub-Wallet Capital Protection
              </div>
              <p>
                The Sub-Wallet is a dedicated isolated keypair for autonomous bots. Private keys are encrypted and stored locally
                in your browser. You can withdraw all SOL back to your primary wallet at any time.
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleExecuteTransfer}
              disabled={isProcessing}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                transferMode === "FAUCET"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                  : "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Processing SOL deposit...</span>
                </>
              ) : (
                <>
                  <span>
                    {transferMode === "FAUCET"
                      ? `Deposit +${amountStr} SOL via Faucet Demo`
                      : `Confirm Deposit of ${amountStr} SOL to Sub-Wallet`}
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
