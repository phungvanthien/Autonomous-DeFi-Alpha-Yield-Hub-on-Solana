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
    sendSolToSubWallet,
    refreshBalance: refreshMainBalance,
    connect,
  } = useSolanaWallet();

  const [subWallet, setSubWallet] = useState<SubWalletData | null>(null);
  const [subBalance, setSubBalance] = useState<number>(0);
  const [amountStr, setAmountStr] = useState<string>(recommendedAmount.toString());
  const [transferMode, setTransferMode] = useState<"ONCHAIN" | "FAUCET">("ONCHAIN");
  const [isProcessing, setIsProcessing] = useState(false);
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
      fetchSubWalletBalance(sw.publicKey, walletAddress).then(setSubBalance);
    } else {
      setSubWallet(null);
      setSubBalance(0);
    }
    setSuccessMsg(null);
    setErrorMsg(null);
  }, [walletAddress, isOpen]);

  // Lắng nghe cập nhật số dư từ các nguồn khác
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
      setErrorMsg("Vui lòng kết nối ví chính trước khi nạp.");
      return;
    }

    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Vui lòng nhập số lượng SOL hợp lệ (> 0).");
      return;
    }

    if (transferMode === "ONCHAIN" && mainBalance < amt) {
      setErrorMsg(`Số dư ví chính (${mainBalance.toFixed(3)} SOL) không đủ để nạp ${amt} SOL.`);
      return;
    }

    setIsProcessing(true);
    try {
      if (transferMode === "FAUCET") {
        // Nạp tức thì qua Faucet Testnet / Demo
        const newBal = depositSolSimulatedOrFaucet(walletAddress, amt);
        setSubBalance(newBal);
        setSuccessMsg(`Đã nạp thành công ${amt} SOL vào Sub-Wallet via Faucet!`);
        if (onSuccess) onSuccess(newBal);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        // Ký giao dịch On-chain qua ví Extension (Phantom/Solflare)
        const sig = await sendSolToSubWallet(subWallet.publicKey, amt, false);
        if (sig) {
          await refreshMainBalance();
          const newBal = await fetchSubWalletBalance(subWallet.publicKey, walletAddress);
          setSubBalance(newBal);
          setSuccessMsg(`Chuyển ${amt} SOL on-chain thành công! Tx: ${sig.slice(0, 8)}...`);
          if (onSuccess) onSuccess(newBal);
          setTimeout(() => {
            onClose();
          }, 1800);
        } else {
          setErrorMsg("Giao dịch không thành công hoặc người dùng huỷ xác nhận.");
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Lỗi khi chuyển SOL vào Sub-Wallet.");
    } finally {
      setIsProcessing(false);
    }
  };

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
                Chuyển SOL vào Sub-Wallet
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Autonomous Vault
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cấp vốn cho uỷ thác Copy-Trade cá voi & LP Agent tự động
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

        {/* Target Context (nếu được mở từ hành động cụ thể) */}
        {targetDescription && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
            <Sparkles className="size-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-200">Mục đích cấp vốn: </span>
              {targetDescription}
            </div>
          </div>
        )}

        {/* Connect Wallet Prompt if not connected */}
        {!isConnected ? (
          <div className="mt-5 p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-center space-y-3">
            <Wallet className="size-8 text-zinc-500 mx-auto" />
            <p className="text-xs text-zinc-400">
              Bạn chưa kết nối ví extension (Phantom / Solflare). Hãy kết nối ví chính để thực hiện nạp SOL.
            </p>
            <button
              onClick={() => connect("phantom")}
              className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors cursor-pointer"
            >
              Kết nối Phantom ngay
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Wallet Balance Comparison Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Ví chính */}
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Ví chính đã kết nối</span>
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

            {/* Chọn hình thức nạp */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Phương thức nạp SOL:</label>
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
                    Ký ví On-Chain
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Chuyển SOL thật từ Phantom / Solflare vào Sub-Wallet
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
                    Nạp nhanh 0.5-2 SOL thử nghiệm uỷ thác không tốn phí
                  </p>
                </button>
              </div>
            </div>

            {/* Input số lượng SOL */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-zinc-300">Số lượng SOL chuyển vào:</label>
                {transferMode === "ONCHAIN" && (
                  <button
                    onClick={() => setAmountStr(Math.max(0, mainBalance - 0.01).toFixed(3))}
                    className="text-amber-400 hover:underline font-mono text-[11px] cursor-pointer"
                  >
                    Tối đa: {(Math.max(0, mainBalance - 0.01)).toFixed(3)} SOL
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
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Explanatory security banner */}
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                Cơ chế bảo vệ vốn Sub-Wallet
              </div>
              <p>
                Sub-Wallet là ví con riêng biệt dành riêng cho bot uỷ thác. Khóa bí mật chỉ lưu trữ mã hóa cục bộ
                trên trình duyệt của bạn. Bạn có thể rút toàn bộ SOL về ví chính bất cứ lúc nào.
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
                  <span>Đang xử lý nạp SOL...</span>
                </>
              ) : (
                <>
                  <span>
                    {transferMode === "FAUCET"
                      ? `Nạp ngay +${amountStr} SOL via Faucet Demo`
                      : `Xác nhận chuyển ${amountStr} SOL vào Sub-Wallet`}
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
