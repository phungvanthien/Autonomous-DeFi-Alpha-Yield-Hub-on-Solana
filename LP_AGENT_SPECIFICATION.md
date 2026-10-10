# ĐẶC TẢ KIẾN TRÚC & KẾ HOẠCH TRIỂN KHAI TOÀN DIỆN
## SOLANA AUTONOMOUS COPY-TRADE & MULTI-DEX LP AGENT PLATFORM

---

## 1. TỔNG QUAN DỰ ÁN & TẦM NHÌN (EXECUTIVE SUMMARY)

Dự án phát triển từ **Solana Copytrade Dashboard** thành một nền tảng tài chính phi tập trung tự hành (**Solana Autonomous DeFi Hub**), kết hợp 2 cánh tay chiến lược:
1. **Chủ động (Active Alpha):** Hệ thống **Whale Copy-Trading** bám sát dòng tiền thông minh, phòng vệ bằng **Anti-Rug & Risk Engine**.
2. **Thụ động (Passive Yield):** Hệ thống **Multi-DEX LP Agent** tự động hoá việc cung cấp thanh khoản, săn phí giao dịch (Fee APR) trên **FluxBeam, Meteora DLMM, Raydium, Orca**, có cơ chế chống lỗ tạm thời (Impermanent Loss - IL) và rút khẩn cấp khi pool gặp rủi ro.

Cả hai cánh tay đều vận hành mượt mà nhờ lớp **Sub-Wallet Engine** (ví phụ tự động ký giao dịch không làm gián đoạn trải nghiệm người dùng) và được trợ lý ảo **AI Co-Pilot** phân tích dữ liệu 24/7.

---

## 2. KIẾN TRÚC TỔNG THỂ HỆ THỐNG (SYSTEM ARCHITECTURE)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    USER INTERFACE                                      │
│   Next.js 16 (App Router) + Tailwind CSS v4 + Lucide Icons + Solana Wallet Adapter      │
│  ┌──────────────────┬─────────────────┬─────────────────┬───────────────────────────┐  │
│  │ / (Command Hub)  │ /copytrade      │ /lp-agent       │ /wallets & /analytics     │  │
│  └──────────────────┴─────────────────┴─────────────────┴───────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                               AI CO-PILOT ASSISTANT                                    │
│   • Phân tích ví cá voi & phát hiện bẫy giá                                            │
│   • Đề xuất Pool LP tối ưu lợi nhuận & dự báo Impermanent Loss (IL)                   │
│   • Phân tích tự nhiên & thực thi lệnh 1-Click                                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                           AUTONOMOUS EXECUTION & RISK ENGINE                           │
│  ┌──────────────────────────────────────────────┬────────────────────────────────────┐  │
│  │         COPY-TRADE RISK ENGINE               │         LP AGENT YIELD ENGINE      │  │
│  │  • Hard Stop-loss & Trailing Stop            │  • Concentrated Range Rebalancer   │  │
│  │  • TP1 / TP2 Multi-stage Take Profit         │  • Auto-Compound Fee Collector     │  │
│  │  • Anti-Rug Shield (Mint/Freeze check)       │  • Emergency Unstake & Dump Guard  │  │
│  │  • Liquidity Drop Instant Exit               │  • FluxBeam Token-2022 Tax Farm    │  │
│  └──────────────────────────────────────────────┴────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                          SUB-WALLET VAULT & KEYPAIR ENGINE                             │
│   • Quản lý khóa riêng tư cục bộ (AES / LocalStorage mã hóa an toàn)                   │
│   • Tự động ký (Zero-Click Confirmation) giao dịch Swap, Add/Remove LP, Rebalance      │
│   • Kiểm soát hạn mức vốn (Capital Allowance & Daily Max Loss)                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                               ON-CHAIN PROTOCOLS & DATA                                │
│   • DEX: FluxBeam (Token-2022 AMM), Meteora DLMM, Raydium (CLMM/CPMM), Orca Whirlpools │
│   • Data: Helius RPC & Webhooks, DexScreener API, Birdeye, Solana RPC WebSocket        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. PHÂN TÍCH CHUYÊN SÂU: ĐÁNH GIÁ NỀN TẢNG LP AGENT

### 3.1. Đánh giá Flux (FluxBeam)
* **Vị thế cốt lõi:** Tiên phong và độc tôn ở mảng **SPL Token-2022 Extensions** (Transfer Fee, Transfer Hook).
* **Cơ hội khai thác cho LP Agent:**
  * **Tax Token Fee Harvesting:** Các meme token áp thuế giao dịch (ví dụ 1-5% mỗi giao dịch) phân phối doanh thu trực tiếp cho LP. LP Agent có thể nạp thanh khoản vào pool FluxBeam để vừa nhận swap fee tiêu chuẩn vừa nhận phần chia thuế volume mà các DEX khác không có.
  * **Độ cạnh tranh thấp:** Ít bot cạnh tranh trên FluxBeam so với Raydium, giúp tỷ lệ chia fee cho mỗi đơn vị thanh khoản cao hơn.
* **Chiến lược áp dụng:** Dành riêng cho nhóm **Strategy: Token-2022 High-Yield Speculation**.

### 3.2. Đánh giá Meteora (DLMM - Dynamic Liquidity Market Maker)
* **Vị thế cốt lõi:** Nền tảng LP tối ưu nhất hiện nay trên Solana cho các biến động mạnh.
* **Lợi thế vượt trội cho LP Agent:**
  * **Dynamic Swap Fees:** Phí tăng vọt lên 5% - 15% khi biến động mạnh, thu siêu lợi nhuận cho người cấp thanh khoản.
  * **Kiến trúc Bins:** Cho phép LP đặt thanh khoản theo từng Bin giá cụ thể với 3 chiến lược: *Spot* (bình ổn), *Curve* (tập trung trung tâm), *Bid-Ask* (hứng đáy bán đỉnh).
  * **Khả năng tự động Rebalance:** Bot tự động rút thanh khoản khỏi các bin đã out-of-range và tái phân bổ vào bin active mới.

### 3.3. Đánh giá Raydium & Orca (Concentrated Liquidity)
* **Raydium CLMM & Orca Whirlpools:** Nơi tập trung volume lớn nhất Solana.
* **Chiến lược áp dụng:** Thích hợp cho chiến lược an toàn **Conservative Bluechip Yield** (cặp SOL/USDC, SOL/JUP, JTO/SOL) với mức phí ổn định, độ sâu thanh khoản lớn và trượt giá cực thấp.

---

## 4. CHI TIẾT TÍNH NĂNG MỚI: LP AGENT YIELD HARVESTER

### 4.1. Ba phân khúc chiến lược (LP Strategies)

| Chiến lược | Cặp Token & Nền tảng | Đặc điểm | Tỷ suất kỳ vọng (APR) | Mức độ rủi ro |
| :--- | :--- | :--- | :--- | :--- |
| **1. Bluechip Stable** | SOL-USDC / SOL-USDT (Orca / Meteora) | Range giá rộng (±15%), rủi ro IL cực thấp, hưởng fee bền vững. | 25% - 60% APR | **Thấp** |
| **2. Dynamic Volatility** | SOL + Trending Memes (Meteora DLMM) | Range hẹp (±5%), Dynamic Fee cao, Rebalance linh hoạt theo sóng. | 150% - 800% APR | **Trung bình - Cao** |
| **3. Tax Token Harvester** | Token-2022 Pairs (FluxBeam) | Hưởng Transfer Tax và Pool Fee trên các token có cơ chế chia cổ tức. | 100% - 400% APR | **Trung bình** |

### 4.2. Các cơ chế tự hành của LP Agent (Autonomous Mechanisms)

1. **Auto-Rebalance (Tự động cân bằng vùng giá):**
   * Khi thị trường biến động khiến giá vượt khỏi biên độ (Out of Range), vị thế ngừng sinh phí.
   * Agent tự động kích hoạt Sub-Wallet rút thanh khoản, swap tái cân bằng tỷ lệ token 50:50 và mở lại vị thế ở dải giá hoạt động mới.
2. **Auto-Compound (Tái đầu tư lợi nhuận):**
   * Định kỳ (hoặc khi phí chưa thu gom vượt ngưỡng 0.05 SOL), bot tự động `claimFee` và nạp ngược lại vào pool để hưởng lãi kép.
3. **Emergency Unstake & Dump Guard (Lá chắn cắt lỗ thanh khoản):**
   * Kế thừa hệ sinh thái Anti-Rug: nếu token bị dump >15% trong 5 phút hoặc thanh khoản pool bị dev rút >20%, Agent lập tức tháo LP và swap toàn bộ token dự án về SOL/USDC để bảo toàn vốn.

---

## 5. CẤU TRÚC PHÂN TRANG & ĐIỀU HƯỚNG (PAGINATION & ROUTING)

Nhằm nâng cấp trải nghiệm từ Dashboard đơn trang thành một ứng dụng hoàn chỉnh, dự án được tái cấu trúc thành các trang chuyên biệt theo mô hình **Next.js App Router**:

```
app/
├── layout.tsx                  # Khung Navigation chung (Sidebar/Header, Wallet Connector, Status Bar)
├── page.tsx                    # Trang 1: Command Center (Tổng quan hệ thống)
├── copytrade/
│   └── page.tsx                # Trang 2: Whale Discovery & Copy-Trade Engine
├── lp-agent/
│   └── page.tsx                # Trang 3: Multi-DEX LP Harvester & Pool Discovery
├── wallets/
│   └── page.tsx                # Trang 4: Sub-Wallet Management & Security Vault
└── analytics/
    └── page.tsx                # Trang 5: Performance & PnL History
```

### 5.1. Trang 1: Command Center (`/`)
* **Mục đích:** Bảng điều khiển trung tâm, cung cấp cái nhìn 360 độ về tài sản.
* **Thành phần giao diện:**
  * **Metric Ribbon:** Tổng tài sản (Main Wallet + Sub-Wallet), Tổng PnL 24h, Số vị thế Copytrade đang chạy, Số Pool LP đang thu phí.
  * **Active Operations Split-view:**
    * Cột trái: 3 vị thế Copy-Trade gần nhất (PnL live, trailing stop).
    * Cột phải: 3 Pool LP hiệu quả nhất (APR, Unclaimed Fees, Range status).
  * **Quick Action Buttons:** "Bật Copy Cá Voi Mới" & "Khởi tạo LP Agent".

### 5.2. Trang 2: Whale Copy-Trade Hub (`/copytrade`)
* **Mục đích:** Tìm kiếm, phân tích và sao chép lệnh cá voi Solana.
* **Thành phần giao diện:**
  * **Bộ lọc phân trang Cá Voi:** Tìm kiếm theo Win Rate, ROI trung bình, Khối lượng ví.
  * **Drawer Chi tiết Cá Voi:** Lịch sử swap thời gian thực, danh mục token nắm giữ, nút "Copy Trade".
  * **Active Positions Table:** Bảng quản trị lệnh đang mở, nút đóng lệnh thủ công (Emergency Close), điều chỉnh SL/TP trực tiếp.
  * **Anti-Rug Configuration:** Bảng cài đặt ngưỡng thanh khoản tối thiểu, từ chối token có Freeze/Mint authority.

### 5.3. Trang 3: Multi-DEX LP Harvester (`/lp-agent`)
* **Mục đích:** Khai thác lợi nhuận thanh khoản tự động trên FluxBeam, Meteora, Raydium, Orca.
* **Thành phần giao diện:**
  * **Tab 1: Pool Explorer & Scanner:**
    * Bảng danh sách các pool tiềm năng nhất phân trang (10 pool/trang).
    * Cột thông tin: DEX Icon (FluxBeam / Meteora / Raydium), Cặp Token, TVL, 24h Volume, Fee APR, Chỉ số rủi ro IL.
    * Nút "Deploy Agent": Mở modal cấu hình chiến lược.
  * **Tab 2: My Active LP Positions:**
    * Danh sách các vị thế đang cấp thanh khoản.
    * Đèn tín hiệu: `IN-RANGE` (Xanh lá) hoặc `OUT-OF-RANGE` (Vàng/Đỏ).
    * Nút "Harvest Fees", "Rebalance Now", "Withdraw to SOL".
  * **Tab 3: LP Strategy & Automation Settings:**
    * Cài đặt biên độ giá (Slippage, Price Range % Min/Max).
    * Ngưỡng kích hoạt Auto-Compound.
    * Cài đặt Emergency Exit (ngưỡng cắt lỗ khi giá sập).

### 5.4. Trang 4: Sub-Wallet & Security Vault (`/wallets`)
* **Mục đích:** Quản lý ví ký tự động, bảo mật và nguồn vốn.
* **Thành phần giao diện:**
  * **Sub-Wallet Balance Card:** Số dư SOL, token SPL hiện tại.
  * **Deposit & Withdraw:** Nạp nhanh SOL từ ví chính sang ví phụ và rút toàn bộ về ví chính 1-click.
  * **Security & Export Key:** Hiển thị địa chỉ ví phụ, nút sao chép, chức năng xuất Private Key (yêu cầu xác thực), nút tạo ví phụ mới.
  * **Allowance & Daily Limits:** Giới hạn khối lượng giao dịch tối đa mỗi ngày để tránh rủi ro bot vượt ngưỡng an toàn.

### 5.5. Trang 5: Performance Analytics (`/analytics`)
* **Mục đích:** Thống kê hiệu suất và báo cáo doanh thu tài chính.
* **Thành phần giao diện:**
  * Biểu đồ tăng trưởng PnL (Copy-Trade vs LP Fee Yield).
  * Tỷ lệ thành công (Win rate) của từng cá voi đã theo dõi.
  * Bảng tổng hợp phí swap đã gặt hái từ các pool Meteora và FluxBeam.

---

## 6. SƠ ĐỒ DỮ LIỆU & LOGIC KỸ THUẬT (DATA SCHEMAS)

### 6.1. Cấu trúc Vị thế LP (`LpAgentPosition`)
```typescript
export interface LpPoolData {
  id: string;
  dex: "METEORA_DLMM" | "FLUXBEAM" | "RAYDIUM_CLMM" | "ORCA_WHIRLPOOL";
  poolAddress: string;
  tokenA: { symbol: string; mint: string; decimals: number };
  tokenB: { symbol: string; mint: string; decimals: number };
  tvlUsd: number;
  volume24hUsd: number;
  feeApr24h: number;
  currentPrice: number;
  ilRiskScore: "LOW" | "MEDIUM" | "HIGH";
  isToken2022: boolean;
}

export interface LpAgentConfig {
  poolAddress: string;
  dex: string;
  allocatedSol: number;
  strategyType: "BLUECHIP_STABLE" | "VOLATILITY_HARVESTER" | "TAX_TOKEN_FARM";
  priceRangeLowerPct: number;    // Ví dụ: -10% so với giá hiện tại
  priceRangeUpperPct: number;    // Ví dụ: +10% so với giá hiện tại
  autoRebalance: boolean;
  autoCompound: boolean;
  minCompoundYieldSol: number;   // Ví dụ: 0.05 SOL
  emergencyStopLossPct: number;  // Cắt lỗ rút sạch thanh khoản nếu giá tụt quá -15%
}

export interface ActiveLpPosition {
  id: string;
  poolAddress: string;
  dex: string;
  tokenPair: string;
  depositAmountSol: number;
  currentValueUsd: number;
  earnedFeesSol: number;
  status: "IN_RANGE" | "OUT_OF_RANGE" | "REBALANCING" | "EMERGENCY_CLOSED";
  entryTime: number;
  currentApr: number;
}
```

---

## 7. LỘ TRÌNH TRIỂN KHAI THEO GIAI ĐOẠN (ROADMAP & SPRINTS)

### Sprint 1: Nền tảng Core Engine & Kiến trúc Router (1-2 Tuần)
* [x] Đánh giá khả thi kiến trúc FluxBeam & Meteora.
* [x] Xây dựng thư viện tính toán LP: `lib/lp-agent-engine.ts` (mô hình hóa Pool, tính APR, mô phỏng IL).
* [x] Chuyển đổi kiến trúc Next.js sang điều hướng phân trang:
  * Tạo thanh điều hướng toàn cục (Global Sidebar/Navbar) chứa các tab: *Overview*, *Copy-Trade*, *LP Agent*, *Sub-Wallets*.
  * Tạo các route: `/copytrade`, `/lp-agent`, `/wallets`.

### Sprint 2: Hoàn thiện Giao diện LP Harvester (1 Tuần)
* [x] Thiết kế bảng `Pool Discovery Table` với bộ lọc (Meteora, Flux, Raydium, Sắp xếp theo APR/TVL).
* [x] Thiết kế Modal `Deploy LP Agent Modal` (chọn vốn, chọn chiến lược range, nút kích hoạt 1-click).
* [x] Thiết kế bảng theo dõi `Active LP Positions` với cảnh báo trạng thái Range.

### Sprint 3: Tích hợp Tự động hóa qua Sub-Wallet (1-2 Tuần)
* [x] Kết nối hàm tạo giao dịch On-chain qua Sub-Wallet:
  * Tích hợp `@meteora-ag/dlmm` SDK cho chiến lược Bin Liquidity.
  * Tích hợp FluxBeam Swap/Deposit Router cho các cặp Token-2022.
* [x] Xây dựng tiến trình ngầm (Background Worker/Watcher):
  * Kiểm tra vị thế In/Out of Range.
  * Tự động trigger hàm `claimFee` và `rebalancePosition`.
  * Kích hoạt Emergency Panic Exit khi chạm ngưỡng Stop-loss.

### Sprint 4: Nâng cấp AI Co-Pilot & Tối ưu hoá Trải nghiệm (1 Tuần)
* [x] Mở rộng bộ câu hỏi và logic nhận diện lệnh tự nhiên của `AskAgentChatbot`:
  * Cho phép người dùng hỏi: *"Gợi ý cho tôi pool LP có APR cao nhất trên Meteora?"*
  * *"So sánh lợi nhuận giữa copy ví này và add pool SOL-USDC?"*
  * Tích hợp giải đáp cơ chế Tax Token (FluxBeam Token-2022) và Auto-Rebalance/Dump Guard.
  * Tích hợp điều hướng 1-click deploy pool LP và copy ví trực tiếp từ câu trả lời của AI.
* [x] Kiểm thử toàn diện trên Solana Devnet & Mainnet.
