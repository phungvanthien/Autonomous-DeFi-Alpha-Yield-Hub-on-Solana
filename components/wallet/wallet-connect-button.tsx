"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  ChevronDown,
  LogOut,
  Copy,
  ExternalLink,
  Check,
  ShieldCheck,
  Sparkles,
  X,
  ChevronRight,
  RefreshCw,
  Globe,
} from "lucide-react";
import { useSolanaWallet } from "./wallet-context";

export function WalletConnectButton() {
  const {
    walletAddress,
    walletName,
    isConnected,
    isConnecting,
    balance,
    network,
    setNetwork,
    devnetBalance,
    refreshBalance,
    connect,
    disconnect,
    installedWallets,
  } = useSolanaWallet();

  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [isOpenSelectModal, setIsOpenSelectModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle click outside for dropdown menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle ESC key and scroll lock for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenSelectModal) {
        setIsOpenSelectModal(false);
      }
    };

    if (isOpenSelectModal) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpenSelectModal]);

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnectChoice = async (type: "phantom" | "solflare" | "backpack") => {
    setIsOpenSelectModal(false);
    await connect(type);
  };

  const renderSelectModal = () => {
    if (!isOpenSelectModal || !mounted) return null;

    const modalContent = (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
        onClick={() => setIsOpenSelectModal(false)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
      >
        <div
          className="relative w-full max-w-[420px] bg-zinc-900/95 border border-zinc-700/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/80 ring-1 ring-white/10 overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle ambient background glow */}
          <div className="absolute -top-20 -right-20 size-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 size-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="relative flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 via-blue-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
                <ShieldCheck className="size-5 text-indigo-400" />
              </div>
              <div>
                <h3 id="wallet-modal-title" className="font-bold text-sm sm:text-base text-white tracking-tight">
                  Connect Solana Wallet
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Select your provider to interact with DeFi Agent
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpenSelectModal(false)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700 transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Wallet List */}
          <div className="relative flex flex-col gap-2.5 my-4">
            {/* Phantom */}
            <button
              onClick={() => handleConnectChoice("phantom")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 hover:border-purple-500/50 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-lg hover:shadow-purple-950/20 hover:-translate-y-0.5 active:translate-y-0 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-lg text-purple-300 group-hover:scale-105 transition-transform shrink-0">
                  👻
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-xs sm:text-sm text-white group-hover:text-purple-300 transition-colors">
                      Phantom Wallet
                    </p>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5">
                    {installedWallets.phantom ? "Browser extension detected" : "Solana & Multi-chain"}
                  </p>
                </div>
              </div>
              {installedWallets.phantom ? (
                <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ready
                </span>
              ) : (
                <ChevronRight className="size-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0" />
              )}
            </button>

            {/* Solflare */}
            <button
              onClick={() => handleConnectChoice("solflare")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 hover:border-amber-500/50 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-lg hover:shadow-amber-950/20 hover:-translate-y-0.5 active:translate-y-0 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                  🔥
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors">
                      Solflare Wallet
                    </p>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5">
                    {installedWallets.solflare ? "Browser extension detected" : "Popular Solana native wallet"}
                  </p>
                </div>
              </div>
              {installedWallets.solflare ? (
                <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ready
                </span>
              ) : (
                <ChevronRight className="size-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0" />
              )}
            </button>

            {/* Backpack */}
            <button
              onClick={() => handleConnectChoice("backpack")}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 hover:border-red-500/50 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-lg hover:shadow-red-950/20 hover:-translate-y-0.5 active:translate-y-0 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-lg text-red-300 group-hover:scale-105 transition-transform shrink-0">
                  🎒
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-xs sm:text-sm text-white group-hover:text-red-300 transition-colors">
                      Backpack Wallet
                    </p>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5">
                    {installedWallets.backpack ? "Browser extension detected" : "xNFT & Solana Ecosystem"}
                  </p>
                </div>
              </div>
              {installedWallets.backpack ? (
                <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ready
                </span>
              ) : (
                <ChevronRight className="size-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0" />
              )}
            </button>
          </div>

          {/* Security Notice & Redesigned Close Button */}
          <div className="relative pt-3 border-t border-zinc-800/80 flex flex-col gap-3">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 text-center">
              <Sparkles className="size-3.5 text-indigo-400 shrink-0" />
              <span>Non-custodial. Funds & keys stay under your control.</span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpenSelectModal(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-600 text-zinc-200 hover:text-white text-xs font-semibold transition-all shadow-sm cursor-pointer active:scale-[0.99]"
            >
              <X className="size-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  if (isConnected && walletAddress) {
    const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    const displayBalance =
      balance === 0
        ? "0.00"
        : balance < 0.01
        ? balance.toFixed(4)
        : balance < 10
        ? balance.toFixed(3)
        : balance.toFixed(2);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpenMenu(!isOpenMenu)}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:border-zinc-600 text-white transition-all shadow-sm cursor-pointer text-xs"
        >
          <div className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${network === "devnet" ? "bg-purple-400" : "bg-emerald-400"} animate-pulse`} />
            <span className={`font-mono font-medium ${network === "devnet" ? "text-purple-300" : "text-emerald-400"}`}>
              {displayBalance} SOL
            </span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="font-mono font-semibold text-zinc-200">{shortAddress}</span>
          <ChevronDown className="size-3.5 text-zinc-400" />
        </button>

        {isOpenMenu && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 shadow-2xl z-50 p-2 text-xs ring-1 ring-white/10 animate-in fade-in duration-150">
            <div className="px-3 py-2.5 border-b border-zinc-800 mb-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">Main Wallet (Extension)</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 capitalize font-medium border border-zinc-700/60">
                  {walletName || "Solana"}
                </span>
              </div>
              <p className="font-mono text-zinc-200 text-xs truncate mt-1 select-all">{walletAddress}</p>
            </div>

            {/* Detailed Balance & Network Box */}
            <div className="px-3 py-2 bg-zinc-950/80 rounded-xl border border-zinc-800/80 my-1.5 space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-sans">SOL Balance:</span>
                <span className={`font-bold text-sm ${network === "devnet" ? "text-purple-300" : "text-emerald-400"}`}>
                  {balance.toFixed(4)} SOL
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-zinc-800/60 font-sans">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Globe className="size-3" />
                  Cluster:
                </span>
                <button
                  type="button"
                  onClick={() => setNetwork(network === "mainnet" ? "devnet" : "mainnet")}
                  className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  title="Click to toggle Mainnet / Devnet cluster"
                >
                  <span className={`size-1.5 rounded-full ${network === "mainnet" ? "bg-emerald-400" : "bg-purple-400"}`} />
                  <span className="capitalize">{network}</span>
                  <span className="text-zinc-500 text-[9px]">(toggle)</span>
                </button>
              </div>
            </div>

            {/* Devnet Balance Detected Hint */}
            {network === "mainnet" && typeof devnetBalance === "number" && devnetBalance > 0 && (
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-300 my-1">
                <div className="flex items-center justify-between">
                  <span>Devnet: {devnetBalance.toFixed(3)} SOL</span>
                  <button
                    onClick={() => setNetwork("devnet")}
                    className="text-[10px] underline hover:text-purple-200 cursor-pointer font-bold ml-1"
                  >
                    Switch to Devnet
                  </button>
                </div>
              </div>
            )}

            {/* Refresh Balance Action */}
            <button
              onClick={async () => {
                setIsRefreshing(true);
                await refreshBalance();
                setIsRefreshing(false);
              }}
              disabled={isRefreshing}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
                <span>{isRefreshing ? "Updating Balance..." : "Refresh Balance"}</span>
              </span>
            </button>

            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                {copied ? "Copied!" : "Copy Address"}
              </span>
            </button>

            <a
              href={`https://solscan.io/account/${walletAddress}${network === "devnet" ? "?cluster=devnet" : ""}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="size-3.5" />
                View on Solscan
              </span>
            </a>

            <div className="border-t border-zinc-800 my-1" />

            <button
              onClick={() => {
                setIsOpenMenu(false);
                disconnect();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors cursor-pointer"
            >
              <LogOut className="size-3.5" />
              Disconnect Wallet
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpenSelectModal(true)}
        disabled={isConnecting}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-950/40 cursor-pointer disabled:opacity-50"
      >
        <Wallet className="size-4" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>

      {renderSelectModal()}
    </>
  );
}
