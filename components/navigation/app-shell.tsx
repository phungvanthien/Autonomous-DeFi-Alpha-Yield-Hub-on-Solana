"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "./navbar";
import { AskAgentChatbot } from "@/components/dashboard/ask-agent-chatbot";
import { useSolanaWallet } from "@/components/wallet/wallet-context";
import { getSubWallet, fetchSubWalletBalance } from "@/lib/sub-wallet-manager";
import { Bot } from "lucide-react";
import { useRouter } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { walletAddress, network } = useSolanaWallet();
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [subWalletBalance, setSubWalletBalance] = useState<number>(0);

  const refreshSubBalance = () => {
    if (walletAddress) {
      const sw = getSubWallet(walletAddress);
      if (sw) {
        fetchSubWalletBalance(sw.publicKey, walletAddress, network).then(setSubWalletBalance);
      }
    } else {
      setSubWalletBalance(0);
    }
  };

  useEffect(() => {
    refreshSubBalance();

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
  }, [walletAddress, network]);

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen flex flex-col bg-zinc-950 text-white selection:bg-amber-500/30 selection:text-amber-200"
    >
      {/* Global Navigation Bar */}
      <Navbar onOpenAgent={() => setIsAgentOpen(true)} />

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Global AI Co-Pilot Chatbot */}
      <AskAgentChatbot
        isOpen={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
        subWalletBalance={subWalletBalance}
        mainWalletAddress={walletAddress}
        onOpenCopyTradeConfig={(whale) => {
          setIsAgentOpen(false);
          router.push(`/copytrade?whale=${whale.address}`);
        }}
        onOpenLpDeploy={(poolId) => {
          setIsAgentOpen(false);
          router.push(poolId ? `/lp-agent?pool=${poolId}` : "/lp-agent");
        }}
      />

      {/* Floating Ask Agent Button */}
      {!isAgentOpen && (
        <button
          onClick={() => setIsAgentOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 text-black font-extrabold p-3 sm:px-4 sm:py-3 rounded-2xl shadow-2xl shadow-amber-500/30 flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all cursor-pointer group border border-amber-300/50"
          title="Ask AI Agent for platform guide, whale analysis and LP strategy"
        >
          <div className="relative">
            <Bot className="size-5 text-black" />
            <span className="absolute -top-1 -right-1 size-2.5 bg-emerald-700 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 size-2.5 bg-emerald-600 rounded-full" />
          </div>
          <span className="text-xs tracking-wide hidden sm:inline">Ask Agent</span>
          <span className="text-[10px] bg-black/20 text-black px-1.5 py-0.5 rounded-full font-bold hidden sm:inline">
            AI Live
          </span>
        </button>
      )}
    </div>
  );
}
