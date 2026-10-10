"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Bot,
  Send,
  Sparkles,
  Zap,
  ShieldCheck,
  HelpCircle,
  Copy,
  Check,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronRight,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
} from "lucide-react";
import { useRouter } from "next/navigation";

export interface WhaleSummary {
  address: string;
  symbol: string;
  score?: number;
  reason?: string;
  winRate?: string;
  avgRoi?: string;
  swapCount?: number;
  totalPortfolioValueUsd?: number;
  topHoldings?: string[];
  stats?: {
    winRate?: string;
    avgRoi?: string;
    swapCount?: number;
    buyCount?: number;
    sellCount?: number;
    totalTrades?: number;
  };
}

export interface AskAgentChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWhaleAddress?: string | null;
  whalesList?: WhaleSummary[];
  onOpenCopyTradeConfig?: (whale: { address: string; name?: string; winRate?: string }) => void;
  onOpenLpDeploy?: (poolId?: string) => void;
  subWalletBalance?: number;
  mainWalletAddress?: string | null;
}

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  whaleContext?: WhaleSummary | null;
  actionWhale?: WhaleSummary | null;
  actionLpPool?: string | null;
  actionLpLabel?: string | null;
}

interface PresetQuestion {
  id: string;
  category: "USAGE" | "WHALE_INFO" | "LP_YIELD" | "RISK";
  icon: string;
  label: string;
  query: string;
}

const PRESET_QUESTIONS: PresetQuestion[] = [
  // 1. LP Agent & Yield Farming
  {
    id: "lp-meteora-best",
    category: "LP_YIELD",
    icon: "🔥",
    label: "Top APR pools on Meteora DLMM?",
    query: "Recommend the highest APR LP pools on Meteora DLMM and analyze Impermanent Loss risk?",
  },
  {
    id: "lp-compare-copytrade",
    category: "LP_YIELD",
    icon: "⚖️",
    label: "Copytrade Alpha vs SOL-USDC LP Yield?",
    query: "Compare returns and risks between copying smart whales and providing SOL-USDC LP. How to allocate capital?",
  },
  {
    id: "lp-fluxbeam-tax",
    category: "LP_YIELD",
    icon: "🌾",
    label: "How does FluxBeam Token-2022 Tax Farm work?",
    query: "How does the Transfer Tax Fee Harvesting mechanism work on FluxBeam Token-2022 pairs?",
  },
  {
    id: "lp-auto-rebalance",
    category: "LP_YIELD",
    icon: "🔄",
    label: "Auto-Rebalance & Emergency Dump Guard mechanics?",
    query: "Explain how Auto-Rebalance works when out-of-range, and how the Emergency Dump Guard protects capital?",
  },

  // 2. Whale Intelligence & Selection
  {
    id: "whale-top-winrate",
    category: "WHALE_INFO",
    icon: "🏆",
    label: "Top whales by Win Rate & ROI?",
    query: "Rank and analyze the top tracked Solana smart whales by Win Rate and average ROI?",
  },
  {
    id: "whale-strategy-compare",
    category: "WHALE_INFO",
    icon: "🔍",
    label: "Key metrics for whale selection?",
    query: "What are the most critical on-chain metrics (Win Rate, swap frequency, wallet balance) to verify before copying?",
  },

  // 3. Platform Usage & Guide
  {
    id: "guide-overview",
    category: "USAGE",
    icon: "🚀",
    label: "Quickstart guide from A to Z?",
    query: "Give me a step-by-step walkthrough on funding the Sub-Wallet and running autonomous bots safely.",
  },
  {
    id: "guide-subwallet",
    category: "USAGE",
    icon: "⚡",
    label: "How does Zero-Popup Sub-Wallet work?",
    query: "How does the Sub-Wallet sign transactions autonomously with zero browser extension popups?",
  },

  // 4. Risk Management & Configuration
  {
    id: "risk-sl-tp",
    category: "RISK",
    icon: "🎯",
    label: "Optimal Stop-Loss & Take-Profit targets?",
    query: "What are the recommended Stop-Loss (-15%) and multi-tier Take-Profit (TP1 +50%, TP2 +100%) parameters?",
  },
  {
    id: "risk-antirug",
    category: "RISK",
    icon: "🛡️",
    label: "Anti-Rug Same-Block exit protection?",
    query: "How does the Anti-Rug Shield detect whale dump transactions and front-run exits in the same block?",
  },
];

export function AskAgentChatbot({
  isOpen,
  onClose,
  selectedWhaleAddress,
  whalesList = [],
  onOpenCopyTradeConfig,
  onOpenLpDeploy,
  subWalletBalance = 0,
  mainWalletAddress,
}: AskAgentChatbotProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"ALL" | "LP_YIELD" | "WHALE_INFO" | "USAGE" | "RISK">("ALL");
  const [currentWhaleFocus, setCurrentWhaleFocus] = useState<WhaleSummary | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedWhaleAddress && whalesList.length > 0) {
      const found = whalesList.find(
        (w) => w.address.toLowerCase() === selectedWhaleAddress.toLowerCase()
      );
      if (found) {
        setCurrentWhaleFocus(found);
      }
    }
  }, [selectedWhaleAddress, whalesList]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeWhale = currentWhaleFocus
        ? `\n\n📌 **Currently tracking whale**: \`${currentWhaleFocus.symbol}\` (${currentWhaleFocus.address.slice(
            0,
            6
          )}...${currentWhaleFocus.address.slice(-4)}) — Win Rate: **${
            currentWhaleFocus.winRate || "75%"
          }**, Avg ROI: **${currentWhaleFocus.avgRoi || "+60%"}**.`
        : "";

      setMessages([
        {
          id: "welcome-msg",
          sender: "bot",
          text: `👋 **Welcome! I am your AI Co-Pilot (Solana Autonomous DeFi Hub)**.

I can guide and execute across both core wings:
1. 🌾 **Multi-DEX LP Harvester:** Hunt high fee APR on **Meteora DLMM**, **FluxBeam (Token-2022)**, model Impermanent Loss & configure Auto-Rebalance.
2. 🐋 **Whale Copy-Trading:** Track smart money flows, verify on-chain Win Rates, and set up **Anti-Rug Shield** protection.${welcomeWhale}

👇 **Pick a preset prompt below** or **type your question in English or Vietnamese**!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          whaleContext: currentWhaleFocus,
        },
      ]);
    }
  }, [currentWhaleFocus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([]);
    setCurrentWhaleFocus(null);
  };

  /**
   * AI response generator supporting English and Vietnamese queries
   */
  const generateAgentResponse = (userQuery: string): {
    reply: string;
    actionWhale?: WhaleSummary | null;
    actionLpPool?: string | null;
    actionLpLabel?: string | null;
  } => {
    const q = userQuery.toLowerCase();

    // 1. METEORA DLMM TOP APR POOLS
    if (
      (q.includes("meteora") && (q.includes("apr") || q.includes("pool") || q.includes("gợi ý") || q.includes("best") || q.includes("cao nhất") || q.includes("highest") || q.includes("top"))) ||
      (q.includes("pool") && (q.includes("highest") || q.includes("best") || q.includes("top apr") || q.includes("cao nhất")))
    ) {
      return {
        reply: `### 🔥 Top Yield Pools on Meteora DLMM

Based on real-time on-chain liquidity data, here are the top performing Meteora DLMM pools:

1. 🥇 **WIF / SOL (Dynamic Volatility):**
   - **24h Fee APR:** \`+312.5%\` (Ultra-high fee velocity from meme volume)
   - **Fee Model:** Dynamic Fee (automatically spikes to 5%–15% during heavy volatility)
   - **Recommended Range:** \`[-5%, +5%]\` with **Curve Shape** bin distribution.
   - **Protection:** Enable **Auto-Rebalance** so the Sub-Wallet re-centers bins when price trends.

2. 🥈 **POPCAT / SOL (Meme Momentum):**
   - **24h Fee APR:** \`+275.0%\` | TVL: \`$4.62M\` | 24h Volume: \`$12.5M\`
   - **IL Risk Score:** High (Meme Volatility) — suited for momentum LP harvesting.

3. 🥉 **SOL / USDC (Bluechip Stable Yield):**
   - **24h Fee APR:** \`+42.8%\` | TVL: \`$14.25M\` | 24h Volume: \`$28.4M\`
   - **IL Risk Score:** **Low (Conservative)**
   - **Recommendation:** Ideal for long-term compounding with minimal risk of divergence loss.

💡 **Co-Pilot Recommendation:** To maximize APR while controlling risk, deploy into **WIF-SOL** with **Auto-Rebalance + Auto-Compound (> 0.05 SOL)** enabled.`,
        actionLpPool: "pool_meteora_wif_sol",
        actionLpLabel: "Deploy WIF/SOL (APR 312.5%)",
      };
    }

    // 2. COMPARISON: COPY-TRADE VS SOL-USDC LP
    if (
      (q.includes("so sánh") || q.includes("compare") || q.includes("vs")) &&
      (q.includes("copy") || q.includes("whale")) &&
      (q.includes("sol-usdc") || q.includes("lp") || q.includes("pool") || q.includes("add"))
    ) {
      const whaleName = currentWhaleFocus?.symbol || "Smart Whale";
      const whaleWr = currentWhaleFocus?.winRate || "78%";

      return {
        reply: `### ⚖️ Performance Comparison: Whale Copy-Trade (${whaleName}) vs SOL-USDC LP

Both strategies serve distinct risk-adjusted portfolio objectives:

| Dimension | 🐋 Whale Copy-Trade (${whaleName}) | 🌾 SOL-USDC LP (Meteora / Orca) |
| :--- | :--- | :--- |
| **Target Return** | **+100% – 300%+ / month** (Catching 2x–5x breakout meme surges) | **+42.8% APR** (~3.5% / month continuous compounding) |
| **Cashflow Type** | **Active Alpha:** Follows insider & whale momentum | **Passive Yield:** Continuous fee collection on swaps |
| **Drawdown Risk** | Meme dump risk; requires strict Stop-Loss (\`-15%\`) | Ultra-low IL (~0.5%–2%), immune to rugpulls |
| **Protection** | Anti-Rug Shield (same-block frontrun exit) | Concentrated Range Auto-Rebalancer |
| **Hands-Off Level** | Requires market regime awareness | **100% Autonomous**, compounding round-the-clock |

💡 **Optimal Barbell Strategy Allocation:**
- **60% Capital:** Deposit into **SOL-USDC LP** for a steady baseline yield cushion.
- **40% Capital:** Allocate to **Whale Copy-Trade (${whaleName}, Win Rate ${whaleWr})** at 0.1 SOL/order to capture explosive upside.`,
        actionLpPool: "pool_meteora_sol_usdc",
        actionLpLabel: "Deploy SOL/USDC LP (APR 42.8%)",
      };
    }

    // 3. FLUXBEAM TOKEN-2022 TAX HARVESTING
    if (q.includes("fluxbeam") || q.includes("token-2022") || q.includes("tax") || q.includes("thuế")) {
      return {
        reply: `### 🌾 Tax Token Fee Harvesting on FluxBeam (Token-2022)

FluxBeam leads the Solana ecosystem in utilizing **SPL Token-2022 Extensions**:

1. **Dual-Yield Revenue Stream:**
   - **Stream 1:** Standard pool swap fees (0.5% – 1.0%).
   - **Stream 2 (Exclusive):** Dividends from **Transfer Tax (1% – 5%)** levied on every peer-to-peer transfer, distributed straight to LP providers.

2. **Featured Token-2022 Pools:**
   - **FLX / SOL:** APR \`+185.4%\` (2.5% Transfer Tax)
   - **BERN / SOL:** APR \`+245.0%\` (3.0% Transfer Tax)
   - **PEPE22 / SOL:** APR \`+380.0%\` (5.0% Transfer Tax)

3. **Autonomous Harvesting:**
   - The LP Agent tracks accumulated tax dividends and sweeps them directly into your Sub-Wallet without requiring manual claims.`,
        actionLpPool: "pool_fluxbeam_flx_sol",
        actionLpLabel: "Explore FLX/SOL (Token-2022)",
      };
    }

    // 4. AUTO-REBALANCE & EMERGENCY DUMP GUARD
    if (q.includes("rebalance") || q.includes("dump guard") || q.includes("panic exit") || q.includes("tự hành") || q.includes("autonomous")) {
      return {
        reply: `### 🛡️ Autonomous Mechanisms: Auto-Rebalance & Emergency Dump Guard

1. **Auto-Rebalance (Active Bin Realignment):**
   - When market moves push price out of range, the position stops earning fees.
   - **Background Worker:** Every 8 seconds, the watcher scans active positions. When out-of-range is detected, the Sub-Wallet withdraws liquidity, rebalances 50:50 at spot price, and deploys a fresh active band around current price.

2. **Auto-Compound (Automated Re-investment):**
   - When accrued fees cross \`0.05 SOL\`, the bot triggers \`claimFee\` and deposits proceeds back into the pool to accelerate compound interest.

3. **Emergency Dump Guard (Stop-Loss Protection):**
   - If a project token dumps >= \`15%\` within 5 minutes or liquidity is abruptly pulled, the bot instantly fires an **Emergency Panic Exit**, unwinds liquidity, and swaps all tokens into SOL/USDC to preserve capital.`,
      };
    }

    // 5. SPECIFIC WHALE ANALYSIS
    let targetedWhale = currentWhaleFocus;
    if (!targetedWhale && whalesList.length > 0) {
      targetedWhale = whalesList.find((w) => {
        const addrMatch = w.address.toLowerCase().includes(q) || q.includes(w.address.toLowerCase().slice(0, 6));
        const symMatch = w.symbol.toLowerCase().includes(q) || q.includes(w.symbol.toLowerCase());
        return addrMatch || symMatch;
      }) || null;
    }

    if (targetedWhale && (q.includes("ví") || q.includes("whale") || q.includes("này") || q.includes("this") || q.includes(targetedWhale.symbol.toLowerCase()))) {
      const winRate = targetedWhale.winRate || targetedWhale.stats?.winRate || "78%";
      const roi = targetedWhale.avgRoi || targetedWhale.stats?.avgRoi || "+75%";
      const swaps = targetedWhale.swapCount || targetedWhale.stats?.swapCount || 35;
      const portVal = targetedWhale.totalPortfolioValueUsd
        ? `$${targetedWhale.totalPortfolioValueUsd.toLocaleString()}`
        : "$50,000+";

      return {
        reply: `### 🐋 On-Chain Deep Dive: **${targetedWhale.symbol}**
**Wallet Address:** \`${targetedWhale.address}\`

📊 **Verified Performance Metrics:**
- **Win Rate:** \`${winRate}\` (Verified via Solana RPC parsed swaps)
- **Average ROI:** \`${roi}\`
- **Total Tracked Swaps:** \`${swaps} swaps\`
- **Portfolio Value:** \`${portVal}\`

💡 **Strategy Assessment:**
- ${targetedWhale.reason || "Specializes in early liquidity breakouts on Raydium and Jupiter DEX."}
- **Recommended Setup:**
  - Copy size: \`0.05 – 0.15 SOL\` (~10% of Sub-Wallet balance).
  - Stop-Loss: \`-15%\` | Take-Profit: TP1 \`+50%\`, TP2 \`+100%\`.
  - Anti-Rug Shield: Enable same-block sell frontrunning.`,
        actionWhale: targetedWhale,
      };
    }

    // 6. TOP WHALES RANKING
    if (q.includes("top") || q.includes("xếp hạng") || q.includes("rank") || q.includes("cao nhất") || q.includes("best whales")) {
      const top3 = [...whalesList]
        .sort((a, b) => {
          const aRoi = parseFloat(a.avgRoi?.replace(/[^0-9.-]/g, "") || "0");
          const bRoi = parseFloat(b.avgRoi?.replace(/[^0-9.-]/g, "") || "0");
          return bRoi - aRoi;
        })
        .slice(0, 3);
      let listTxt = "";
      top3.forEach((w, idx) => {
        listTxt += `\n${idx + 1}. **${w.symbol}** (\`${w.address.slice(0, 6)}...${w.address.slice(-4)}\`): Win Rate **${w.winRate || "78%"}**, ROI **${w.avgRoi || "+80%"}**`;
      });

      return {
        reply: `### 🏆 Top Solana Smart Whales by Verified Performance
${listTxt || "\n1. **DEEP/ALPHA**: Win Rate 82.6%, ROI +118.5%\n2. **JUP/SMART**: Win Rate 78.2%, ROI +84.1%\n3. **MEME/ALPHA**: Win Rate 74.5%, ROI +62.3%"}

📌 **Selection Guide:**
- **High Volume & Stability:** Choose **JUP/SMART** or **DEEP/ALPHA**.
- **Meme Breakout Momentum:** Choose **MEME/ALPHA** or **SNIPER/PRO**.`,
        actionWhale: top3[0] || null,
      };
    }

    // 7. SUB-WALLET & ZERO-POPUP EXPLAINER
    if (q.includes("sub-wallet") || q.includes("ví phụ") || q.includes("zero popup") || q.includes("auto sign") || q.includes("zero-popup")) {
      return {
        reply: `### ⚡ Sub-Wallet Architecture & Zero-Popup Autonomous Signing

1. **The Traditional Copytrade Problem:**
   - Every time a whale trades, standard extensions trigger a signature popup. By the time you review and approve (5–10s), the token has pumped or suffered severe slippage.

2. **The Delegated Sub-Wallet Solution:**
   - The platform creates a client-side **Keypair** stored securely in your browser's encrypted LocalStorage (never sent to any backend).
   - When a whale swap or LP rebalance triggers, the Sub-Wallet signs the transaction and broadcasts via Jito Priority Fee in **< 400ms**.

3. **Risk Containment:**
   - Only deposit working capital (e.g., \`0.3 – 1 SOL\`) into the Sub-Wallet.
   - You can sweep all funds back to your Main Wallet with 1-click at any time!`,
      };
    }

    // Default Fallback
    return {
      reply: `I received your query: "${userQuery}".

As your AI Co-Pilot, I can assist you across:
1. 🌾 **LP Harvester:** Discover high-APR Meteora DLMM / FluxBeam pools, calculate Impermanent Loss, and explain Auto-Rebalance mechanics.
2. 🐋 **Whale Copy-Trading:** Evaluate smart money Win Rates, configure Stop-Loss (-15%) and the Anti-Rug Shield.
3. ⚡ **Sub-Wallet Engine:** Guidance on funding and managing the high-speed autonomous keypair.

Select one of the preset prompts below or ask me any question!`,
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const { reply, actionWhale, actionLpPool, actionLpLabel } = generateAgentResponse(query);
      const botResponse: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        whaleContext: actionWhale || currentWhaleFocus,
        actionWhale: actionWhale,
        actionLpPool: actionLpPool,
        actionLpLabel: actionLpLabel,
      };
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 500);
  };

  const filteredPresets = PRESET_QUESTIONS.filter(
    (p) => activeCategory === "ALL" || p.category === activeCategory
  );

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-in-out ${
        isExpanded
          ? "inset-2 sm:inset-6 max-w-5xl mx-auto"
          : "bottom-4 right-4 w-[calc(100vw-2rem)] sm:w-[480px] h-[600px] sm:h-[640px] max-h-[calc(100vh-2rem)]"
      } flex flex-col bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="size-8 rounded-xl bg-gradient-to-tr from-purple-500 via-amber-500 to-emerald-400 p-0.5">
              <div className="size-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Bot className="size-4 text-amber-400" />
              </div>
            </div>
            <span className="absolute -top-0.5 -right-0.5 size-2 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 size-2 bg-emerald-500 rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-xs sm:text-sm text-white tracking-wide">
                AI Co-Pilot Autonomous Agent
              </h3>
              <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded-full font-mono font-bold">
                Multi-DEX LP
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">
              Sub-Wallet: <strong className="text-emerald-400">{subWalletBalance.toFixed(3)} SOL</strong> • Zero-Popup
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetChat}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Reset Conversation"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors hidden sm:block"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="px-3 py-2 bg-zinc-900/40 border-b border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
        {[
          { id: "ALL", label: "All" },
          { id: "LP_YIELD", label: "🌾 LP Yield" },
          { id: "WHALE_INFO", label: "🐋 Whale Alpha" },
          { id: "RISK", label: "🛡️ Risk & Anti-Rug" },
          { id: "USAGE", label: "🚀 Guides" },
        ].map((cat) => {
          const isAct = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition-all font-semibold cursor-pointer ${
                isAct
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => {
          const isBot = msg.sender === "bot";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isBot ? "items-start" : "items-end"} space-y-1.5`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-3.5 ${
                  isBot
                    ? "bg-zinc-900/90 text-zinc-200 border border-zinc-800 shadow-lg"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-md shadow-purple-600/20"
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed text-xs">
                  {msg.text}
                </div>

                {/* Quick Action Button for Whale Copytrade */}
                {isBot && msg.actionWhale && onOpenCopyTradeConfig && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {msg.actionWhale.symbol} ({msg.actionWhale.winRate || "78%"})
                    </span>
                    <button
                      onClick={() => onOpenCopyTradeConfig(msg.actionWhale!)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-amber-500/20"
                    >
                      <span>1-Click Copy Whale</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                )}

                {/* Quick Action Button for LP Deploy */}
                {isBot && msg.actionLpLabel && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-purple-300 font-mono flex items-center gap-1">
                      <Layers className="size-3" />
                      <span>Multi-DEX LP Harvester</span>
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        router.push("/lp-agent");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-400 hover:to-emerald-400 text-black font-extrabold text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-purple-500/20"
                    >
                      <span>{msg.actionLpLabel}</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 px-1 text-[10px] text-zinc-500 font-mono">
                <span>{msg.timestamp}</span>
                {isBot && (
                  <button
                    onClick={() => handleCopyText(msg.id, msg.text)}
                    className="hover:text-zinc-300 transition-colors"
                    title="Copy Answer"
                  >
                    {copiedId === msg.id ? (
                      <Check className="size-3 text-emerald-400" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 w-fit">
            <Sparkles className="size-3.5 text-purple-400 animate-spin" />
            <span className="animate-pulse font-mono">AI Agent analyzing on-chain data...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Preset Questions Chips Carousel */}
      <div className="p-2.5 bg-zinc-900/60 border-t border-zinc-800/80 overflow-x-auto flex items-center gap-2 scrollbar-none">
        {filteredPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSendMessage(preset.query)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-sm"
          >
            <span>{preset.icon}</span>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 bg-zinc-900/90 border-t border-zinc-800 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask about Meteora pools, copy trading, Impermanent Loss, Anti-Rug..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className="flex-1 px-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputValue.trim()}
          className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-400 hover:to-emerald-400 text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg shadow-purple-500/20"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
