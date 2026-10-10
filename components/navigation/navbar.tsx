"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Zap,
  Layers,
  Wallet,
  BarChart3,
  Bot,
  Activity,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";
import { useSolanaWallet } from "@/components/wallet/wallet-context";
import { getSubWallet, fetchSubWalletBalance } from "@/lib/sub-wallet-manager";

const NAV_ITEMS = [
  {
    name: "Overview",
    href: "/",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: "Whale Copy-Trade",
    href: "/copytrade",
    icon: Zap,
    badge: "Live Alpha",
  },
  {
    name: "LP Agent Harvester",
    href: "/lp-agent",
    icon: Layers,
    badge: "Auto Yield",
  },
  {
    name: "Sub-Wallets Vault",
    href: "/wallets",
    icon: Wallet,
    badge: null,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    badge: null,
  },
];

interface NavbarProps {
  onOpenAgent?: () => void;
}

export function Navbar({ onOpenAgent }: NavbarProps) {
  const pathname = usePathname();
  const { walletAddress, isConnected, balance } = useSolanaWallet();
  const [subWalletBalance, setSubWalletBalance] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const refreshSubBalance = () => {
    if (walletAddress) {
      const sw = getSubWallet(walletAddress);
      if (sw) {
        fetchSubWalletBalance(sw.publicKey, walletAddress).then(setSubWalletBalance);
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
  }, [walletAddress]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 via-blue-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-400 group-hover:scale-105 transition-transform">
                <Zap className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
                    SOLANA DEFI AGENT
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    AUTONOMOUS
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 hidden sm:block">
                  Whale Copy-Trading & Multi-DEX LP Harvester
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                      isActive
                        ? "bg-zinc-800 text-amber-300 shadow-sm border border-zinc-700"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                    }`}
                  >
                    <Icon className={`size-3.5 ${isActive ? "text-amber-400" : "text-zinc-400"}`} />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Ask AI Agent Trigger */}
            {onOpenAgent && (
              <button
                onClick={onOpenAgent}
                className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title="Ask AI Co-Pilot Assistant"
              >
                <Bot className="size-4 text-black" />
                <span className="hidden sm:inline">Ask Agent</span>
                <span className="text-[9px] bg-black/20 text-black px-1.5 py-0.5 rounded-full font-mono font-bold">
                  AI 24/7
                </span>
              </button>
            )}

            {/* Sub-Wallet Quick Indicator (when connected) */}
            {isConnected && (
              <Link
                href="/wallets"
                className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                title="Automated Sub-Wallet balance"
              >
                <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-[11px] font-mono">
                  <span className="text-zinc-400">Sub-Wallet: </span>
                  <span className="font-bold text-emerald-400">
                    {subWalletBalance.toFixed(3)} SOL
                  </span>
                </div>
              </Link>
            )}

            {/* Network Badge */}
            <span className="hidden xl:flex text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-xl font-mono items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Mainnet
            </span>

            {/* Wallet Connect Button */}
            <WalletConnectButton />

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white md:hidden"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 pt-3 pb-5 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-zinc-800 text-amber-300 border border-zinc-700"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`size-4 ${isActive ? "text-amber-400" : "text-zinc-400"}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {isConnected && (
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
              <span>Automated Sub-Wallet:</span>
              <span className="text-emerald-400 font-bold">{subWalletBalance.toFixed(3)} SOL</span>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
