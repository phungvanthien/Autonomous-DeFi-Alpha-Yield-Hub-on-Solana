# ⚡ Solana Autonomous Copy-Trade & Multi-DEX LP Agent Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.4.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Solana Web3](https://img.shields.io/badge/Solana-Web3.js_1.99-14F195?style=for-the-badge&logo=solana)](https://solana.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

> An autonomous decentralized finance hub (**Solana Autonomous DeFi Hub**) combining two core strategic pillars: **Active Alpha** (Smart Whale Copy-Trading backed by an Anti-Rug Shield) and **Passive Yield** (Automated Multi-DEX Liquidity Provisioning on Meteora DLMM, FluxBeam Token-2022, Raydium, and Orca). Powered by a local **Delegated Sub-Wallet Engine (Zero-Click Execution)** and an **AI Co-Pilot Assistant**.

---

## 📑 Table of Contents

- [1. Overview & Vision](#-1-overview--vision)
- [2. Core Features](#-2-core-features)
  - [2.1. Whale Copy-Trading & Anti-Rug Shield (Active Alpha)](#21-whale-copy-trading--anti-rug-shield-active-alpha)
  - [2.2. Multi-DEX LP Agent Yield Harvester (Passive Yield)](#22-multi-dex-lp-agent-yield-harvester-passive-yield)
  - [2.3. Delegated Sub-Wallet & Security Vault (Zero-Click)](#23-delegated-sub-wallet--security-vault-zero-click)
  - [2.4. AI Co-Pilot Assistant](#24-ai-co-pilot-assistant)
  - [2.5. Analytics & 360° Command Hub](#25-analytics--360-command-hub)
- [3. System Architecture](#-3-system-architecture)
- [4. Project Directory Structure](#-4-project-directory-structure)
- [5. Getting Started & Installation](#-5-getting-started--installation)
- [6. Environment Variables (.env)](#-6-environment-variables-env)
- [7. Technology Stack](#-7-technology-stack)
- [8. Security Model & Risk Disclaimer](#-8-security-model--risk-disclaimer)
- [9. Roadmap](#-9-roadmap)
- [10. License](#-10-license)

---

## 🎯 1. Overview & Vision

In the Solana ecosystem, high volatility and sub-second transaction speeds create two fundamental challenges for retail traders:
1. **Speed Deficit & Toxic Token Traps:** Manual whale tracking lags behind, exposes traders to high slippage, and risks capital to rug-pulls (unrevoked mint/freeze authorities, sudden liquidity drain).
2. **Operational Friction in Liquidity Provision (LP):** Concentrated LP yields dry up when market prices move out of range, unhedged Impermanent Loss (IL) cuts into gains, and manual compounding incurs high cognitive overhead.

**Solana Autonomous Copy-Trade & LP Agent Platform** solves this by unifying:
* **Active Execution Engine:** Monitors verified high-win-rate smart money wallets and executes copy trades shielded by automated multi-parameter anti-rug checks.
* **Passive Yield Engine:** Dynamically rebalances out-of-range positions, auto-compounds accumulated fees, and triggers emergency exits if underlying tokens suffer malicious drops.
* **Delegated Sub-Wallet Architecture:** Local browser-isolated keypair delegation allows automated swaps and rebalances with zero popup interruptions, keeping your primary cold/hot wallet safe.

---

## 🚀 2. Core Features

### 2.1. Whale Copy-Trading & Anti-Rug Shield (Active Alpha)
* **Whale Discovery & Scoring:** Discover and rank smart money wallets using metrics like Win Rate, Average ROI, 24h PnL, token holding history, and recent swap frequency.
* **Granular Volume & Execution Control:** Configure maximum SOL per trade (e.g., `0.15 SOL`), slippage tolerance, and priority fee tiers (`NORMAL`, `HIGH`, `TURBO_JITO`).
* **Multi-Tier Capital Preservation:**
  * **Hard Stop-Loss:** Guarantees exit at a designated loss threshold (e.g., -15%) regardless of whether the target whale has sold.
  * **Trailing Stop-Loss:** Dynamically trails peak profits to lock in upside gains during pumps.
  * **Multi-Stage Take Profit (TP1 & TP2):** Partial profit-taking milestones (e.g., sell 50% at +50% ROI, liquidate remaining balance at +100% ROI).
* **Anti-Rug Shield:**
  * Pre-execution verification of token metadata: blocks tokens retaining **Freeze Authority** (blacklisting risk) or **Mint Authority** (inflation/dump risk).
  * Minimum DEX pool liquidity filter before matching any trade.
  * **Instant Exit on Whale Sell:** Listens for target whale sell transactions and front-runs the exit with high priority fees.
  * **Liquidity Drop Panic Exit:** Aborts position immediately upon detecting an abnormal drain in pool liquidity.

### 2.2. Multi-DEX LP Agent Yield Harvester (Passive Yield)
* **Cross-DEX Protocol Support:** Native routing for **Meteora DLMM**, **FluxBeam (SPL Token-2022)**, **Raydium (CLMM/CPMM)**, and **Orca Whirlpools**.
* **3 Standardized LP Strategies:**
  1. `Bluechip Stable` (SOL-USDC / SOL-USDT): Wide price boundary (±15%), minimal IL exposure, sustainable fee APR (25% - 60% APR).
  2. `Dynamic Volatility` (SOL + Trending Memes on Meteora DLMM): Narrow bins (±5%), captures surging dynamic swap fees during high volatility (150% - 800% APR).
  3. `Tax Token Harvester` (Token-2022 Pairs on FluxBeam): Harvests transfer fee tax dividends combined with standard swap fees.
* **Autonomous Background Watcher:**
  * **Auto-Rebalance:** Monitors active price bins; when out-of-range, initiates sub-wallet withdrawal, swaps back to 50:50 ratio, and re-deploys liquidity into the active range.
  * **Auto-Compound:** Periodically claims accrued fees and re-supplies them to the position for compounding yields.
  * **Emergency Dump Guard:** Automatically pulls LP tokens and swaps back to SOL/USDC if pool liquidity drops or price collapses past safety tolerances.
* **Interactive Impermanent Loss Calculator:** Simulates real-time IL curves against projected fee revenue before capital deployment.

### 2.3. Delegated Sub-Wallet & Security Vault (Zero-Click)
* **Zero-Popup User Experience:** Generates a dedicated local Solana `Keypair` stored in encrypted client-side storage to sign routine trading transactions without annoying wallet extension prompts.
* **Capital Ring-Fencing:** Deposit only a dedicated operational allowance (e.g., 1.0 - 2.0 SOL) into the sub-wallet. Your primary wallet address is never exposed to private key compromise.
* **1-Click Funding & Sweeping:** Fund sub-wallets seamlessly from your primary wallet and sweep remaining funds back in a single transaction.
* **Security & Transparency:** Real-time on-chain balance verification, revealed/hidden private key export with confirmation checks, and one-click key rotation.

### 2.4. AI Co-Pilot Assistant
* Real-time conversational assistant accessible from anywhere on the platform.
* Evaluates whale wallets, detects potential honeypots, and estimates impermanent loss risk.
* Recommends high-yielding LP pools matched to user risk profiles.
* Triggers one-click configuration modals for Copy-Trade and LP Deployment directly from the conversation.

### 2.5. Analytics & 360° Command Hub
* **Command Center (`/`):** Unified dashboard displaying consolidated net worth, 24h PnL, active copy trades, and live LP farming positions.
* **Performance Analytics (`/analytics`):** Comprehensive breakdown of trade win rates, cumulative fee yield, and comparative analysis of active trading vs. passive LP earnings.

---

## 🏗️ 3. System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    USER INTERFACE                                      │
│           Next.js 16 (App Router) + Tailwind CSS v4 + Lucide Icons + Wallet Adapter    │
│  ┌──────────────────┬─────────────────┬─────────────────┬───────────────────────────┐  │
│  │ / (Command Hub)  │ /copytrade      │ /lp-agent       │ /wallets & /analytics     │  │
│  └──────────────────┴─────────────────┴─────────────────┴───────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                               AI CO-PILOT ASSISTANT                                    │
│   • Smart Money & Whale Profile Evaluation                                             │
│   • Optimal LP Pool Discovery & Impermanent Loss Forecasting                           │
│   • Conversational 1-Click Action Dispatcher                                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                           AUTONOMOUS EXECUTION & RISK ENGINE                           │
│  ┌──────────────────────────────────────────────┬────────────────────────────────────┐  │
│  │         COPY-TRADE RISK ENGINE               │         LP AGENT YIELD ENGINE      │  │
│  │  • Hard Stop-Loss & Trailing Stop            │  • Concentrated Range Rebalancer   │  │
│  │  • TP1 / TP2 Multi-Stage Take Profit         │  • Auto-Compound Fee Collector     │  │
│  │  • Anti-Rug Shield (Mint/Freeze check)       │  • Emergency Unstake & Dump Guard  │  │
│  │  • Liquidity Drop Instant Exit               │  • FluxBeam Token-2022 Tax Farm    │  │
│  └──────────────────────────────────────────────┴────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                          SUB-WALLET VAULT & KEYPAIR ENGINE                             │
│   • Client-Side Key Management (Secure Encrypted Local Storage)                        │
│   • Automated Signing (Zero-Click Confirmation for Swap, Add/Remove LP, Rebalance)     │
│   • Capital Allowance Limits & Max Daily Loss Caps                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                               ON-CHAIN PROTOCOLS & DATA                                │
│   • DEX: Meteora DLMM, FluxBeam (Token-2022), Raydium (CLMM), Orca Whirlpools          │
│   • Data: Solana RPC (WebSockets), Helius RPC, DexScreener API, Birdeye                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 4. Project Directory Structure

```
solana-copytrade-dashboard/
├── app/                                # Next.js App Router
│   ├── layout.tsx                      # Root Layout, App Navigation Shell & Wallet Provider
│   ├── page.tsx                        # Home Page: Command Center
│   ├── copytrade/
│   │   └── page.tsx                    # Copy-Trade Hub: Whale Discovery & Anti-Rug
│   ├── lp-agent/
│   │   └── page.tsx                    # LP Harvester: Pool Discovery & Automation
│   ├── wallets/
│   │   └── page.tsx                    # Sub-Wallet Management & Security Vault
│   ├── analytics/
│   │   └── page.tsx                    # Performance Analytics & PnL History
│   ├── api/                            # Next.js Server Route Handlers
│   │   ├── lp-pools/route.ts           # Multi-DEX pool discovery API
│   │   └── whale-detail/route.ts       # On-chain whale transaction details API
│   └── globals.css                     # Tailwind CSS v4 setup & theme styles
├── components/                         # React UI Components
│   ├── dashboard/                      # Dashboard modules & modals
│   │   ├── ask-agent-chatbot.tsx       # AI Co-Pilot floating assistant
│   │   ├── copytrade-config-modal.tsx  # Copy-trade configuration & risk modal
│   │   ├── sub-wallet-panel.tsx        # Quick sub-wallet oversight panel
│   │   └── whale-discovery-panel.tsx   # Whale discovery list and filters
│   ├── lp-agent/                       # LP Harvester components
│   │   ├── pool-discovery-table.tsx    # Multi-DEX pool discovery table
│   │   ├── active-positions-grid.tsx   # Active LP position monitor cards
│   │   ├── deploy-lp-modal.tsx         # Liquidity deployment modal
│   │   ├── il-calculator-modal.tsx     # Impermanent loss simulation modal
│   │   └── autonomous-watcher-panel.tsx# Background watcher controls & live activity logs
│   ├── navigation/                     # Navigation & App Shell
│   │   ├── app-shell.tsx               # Responsive application wrapper
│   │   └── navbar.tsx                  # Header bar with wallet connection & status
│   ├── ui/                             # Reusable UI primitives (Badge, etc.)
│   └── wallet/                         # Solana wallet connection components
│       ├── wallet-context.tsx          # React Context providing wallet state
│       ├── wallet-connect-button.tsx   # Multi-wallet connection button
│       └── deposit-subwallet-modal.tsx # Sub-wallet funding modal
├── lib/                                # Core business logic & algorithmic engines
│   ├── copytrade-engine.ts             # Copy-trade execution, TP/SL, and anti-rug engine
│   ├── lp-agent-engine.ts              # LP position management & strategy presets
│   ├── lp-background-watcher.ts        # Autonomous watcher (auto-rebalance & compound)
│   ├── sub-wallet-manager.ts           # Keypair generation, balance query, delegation
│   ├── format-utils.ts                 # Formatting utilities (currency, SOL, numbers)
│   └── dex-router/                     # DEX Protocol adapters
│       ├── meteora-dlmm.ts             # Meteora DLMM pool & bin interaction adapter
│       └── fluxbeam-token2022.ts       # FluxBeam Token-2022 AMM adapter
├── LP_AGENT_SPECIFICATION.md           # In-depth architectural specification
├── package.json                        # Project dependencies and npm scripts
└── tsconfig.json                       # TypeScript compiler configuration
```

---

## 💻 5. Getting Started & Installation

### Prerequisites
* **Node.js**: Version 18.18.0 or higher (Node.js 20 LTS recommended)
* **Package Manager**: `npm`, `pnpm`, `yarn`, or `bun`
* A Solana wallet browser extension (Phantom, Solflare, Backpack, etc.)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/solana-copytrade-dashboard.git
   cd solana-copytrade-dashboard
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory (refer to Section 6).

4. **Launch development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

5. **Build for production:**
   ```bash
   npm run build
   npm run start
   ```

---

## ⚙️ 6. Environment Variables (.env)

Create a `.env.local` file in your root folder:

```env
# Primary Solana RPC Endpoint (Helius, QuickNode, or Triton recommended)
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com

# Solana WebSocket Endpoint (For real-time on-chain events)
NEXT_PUBLIC_SOLANA_WSS=wss://api.mainnet-beta.solana.com

# (Optional) Helius API Key for enhanced transaction parsing and webhooks
HELIUS_API_KEY=your_helius_api_key_here

# (Optional) Birdeye API Key for live token pricing and liquidity data
BIRDEYE_API_KEY=your_birdeye_api_key_here
```

---

## 🛠️ 7. Technology Stack

| Domain | Technology / Library | Role |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router, Turbopack) | Multi-page routing, SSR, and API route handlers |
| **UI Library** | React 19 & Tailwind CSS v4 | Cyberpunk/DeFi dark theme and responsive layout |
| **Icons** | Lucide React | Modern iconography system |
| **Blockchain Client** | `@solana/web3.js` & `@solana/spl-token` | On-chain queries, transaction signing, and token extensions |
| **Delegated Wallet** | Solana Keypair Engine (Client Vault) | Zero-click autonomous transaction signing |
| **DEX Protocol Routers** | Meteora DLMM SDK & FluxBeam AMM Integration | Concentrated liquidity and Token-2022 dividend handling |
| **Type Safety** | TypeScript 5 | Strict static typing across all data models |

---

## 🛡️ 8. Security Model & Risk Disclaimer

1. **Isolated Wallet Risk (Ring-Fencing):**
   * Users **never** import or expose their primary wallet's private keys.
   * Only sub-wallets created locally are granted automated signing rights. You can sweep funds back to your primary wallet and reset keys with one click at any time.
2. **Slippage & MEV Front-Running Protection:**
   * Swaps feature strict slippage limits and support priority fees / Jito bundles to mitigate Sandwich attacks.
3. **DeFi & Market Risk Disclaimer:**
   * Cryptocurrency assets on Solana, especially memecoins and concentrated liquidity pools, carry high volatility.
   * Auto-rebalancing, copy-trading, and stop-loss mechanisms are automated execution tools and do not guarantee profits or complete elimination of losses. Always allocate capital responsibly.

---

## 🗺️ 9. Roadmap

- [x] **Phase 1:** Core Sub-Wallet keypair generation & Command Center interface.
- [x] **Phase 2:** Whale Discovery pipeline with Anti-Rug Copy-Trading protection.
- [x] **Phase 3:** Multi-DEX LP Harvester integration (Meteora DLMM & FluxBeam Token-2022).
- [x] **Phase 4:** Autonomous Background Watcher for Auto-Rebalance & Auto-Compound.
- [x] **Phase 5:** Interactive AI Co-Pilot Chatbot with one-click action dispatch.
- [ ] **Phase 6:** Direct Jito MEV bundle integration for sub-wallet trade submissions.
- [ ] **Phase 7:** Telegram and Discord webhook notifications for trade and rebalance alerts.
- [ ] **Phase 8:** Multi-subwallet allocation system for strategy-isolated bankrolls.

---

## 📄 10. License

This project is licensed under the **MIT License**. Contributions, issues, and feature requests are welcome!
