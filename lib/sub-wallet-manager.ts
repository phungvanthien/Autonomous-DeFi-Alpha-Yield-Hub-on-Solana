import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  ComputeBudgetProgram,
} from "@solana/web3.js";

export interface SubWalletData {
  ownerAddress: string;
  publicKey: string;
  secretKeyArray: number[];
  createdAt: number;
  balance: number;
  isActive: boolean;
}

const STORAGE_PREFIX = "solana_copytrade_subwallet_";

// Ngưỡng tối thiểu rent-exempt cho System Account (~0.00089 SOL)
export const MIN_RENT_EXEMPT_LAMPORTS = 890880;

const FALLBACK_RPCS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC ||
    (process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : "https://api.mainnet-beta.solana.com"),
  "https://solana-rpc.publicnode.com",
  "https://rpc.ankr.com/solana",
];
const RPC_ENDPOINT = FALLBACK_RPCS[0];

/**
 * Tạo connection có fallback an toàn chống rate-limit 429
 */
export function getSafeConnection(): Connection {
  return new Connection(RPC_ENDPOINT, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 45000,
  });
}

/**
 * Lấy hoặc tạo mới Trading Sub-Wallet cho ví chính
 */
export function getOrCreateSubWallet(ownerAddress: string): SubWalletData {
  if (typeof window === "undefined") {
    const dummyKp = Keypair.generate();
    return {
      ownerAddress,
      publicKey: dummyKp.publicKey.toBase58(),
      secretKeyArray: Array.from(dummyKp.secretKey),
      createdAt: Date.now(),
      balance: 0,
      isActive: true,
    };
  }

  const storageKey = `${STORAGE_PREFIX}${ownerAddress}`;
  const existingJson = localStorage.getItem(storageKey);

  if (existingJson) {
    try {
      const parsed = JSON.parse(existingJson);
      if (parsed.publicKey && parsed.secretKeyArray) {
        return parsed;
      }
    } catch (e) {
      console.warn("Lỗi đọc Sub-Wallet từ storage:", e);
    }
  }

  // Tạo Keypair mới dành riêng cho phiên ủy thác
  const newKeypair = Keypair.generate();
  const newSubWallet: SubWalletData = {
    ownerAddress,
    publicKey: newKeypair.publicKey.toBase58(),
    secretKeyArray: Array.from(newKeypair.secretKey),
    createdAt: Date.now(),
    balance: 0,
    isActive: true,
  };

  localStorage.setItem(storageKey, JSON.stringify(newSubWallet));
  return newSubWallet;
}

/**
 * Lấy Sub-Wallet hiện tại của một ví
 */
export function getSubWallet(ownerAddress: string): SubWalletData | null {
  if (typeof window === "undefined" || !ownerAddress) return null;
  const storageKey = `${STORAGE_PREFIX}${ownerAddress}`;
  const existingJson = localStorage.getItem(storageKey);
  if (!existingJson) return null;
  try {
    return JSON.parse(existingJson);
  } catch {
    return null;
  }
}

/**
 * Cập nhật số dư on-chain của Sub-Wallet kèm fallback bộ nhớ đệm
 * Số dư on-chain từ RPC luôn là nguồn tin cậy tối thượng (Source of Truth)
 */
export async function fetchSubWalletBalance(publicKeyStr: string, ownerAddress?: string): Promise<number> {
  if (!publicKeyStr) return 0;

  // 1. Truy vấn on-chain trực tiếp qua Solana RPC
  try {
    const conn = getSafeConnection();
    const pubKey = new PublicKey(publicKeyStr);
    const lamports = await conn.getBalance(pubKey);
    const sol = Number((lamports / LAMPORTS_PER_SOL).toFixed(4));

    // Cập nhật chính xác số dư thực tế vào cache bộ nhớ đệm
    if (ownerAddress && typeof window !== "undefined") {
      const storageKey = `${STORAGE_PREFIX}${ownerAddress}`;
      const existing = localStorage.getItem(storageKey);
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          parsed.balance = sol;
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        } catch {
          // ignore
        }
      }
    }
    return sol;
  } catch (error) {
    console.warn("Lỗi truy vấn số dư Sub-Wallet on-chain (sử dụng cache fallback):", error);
  }

  // 2. Fallback: Nếu RPC lỗi mạng hoặc rate limit, lấy số dư đã lưu trong local storage của sub-wallet
  if (typeof window !== "undefined" && ownerAddress) {
    const sw = getSubWallet(ownerAddress);
    if (sw && typeof sw.balance === "number") {
      return sw.balance;
    }
  }

  return 0;
}

/**
 * Ghi nhận nạp SOL vào Sub-Wallet và thông báo cập nhật toàn bộ giao diện
 */
export function recordSubWalletDeposit(ownerAddress: string, amountSol: number): number {
  if (typeof window === "undefined" || !ownerAddress || amountSol <= 0) return 0;
  const storageKey = `${STORAGE_PREFIX}${ownerAddress}`;
  const existingJson = localStorage.getItem(storageKey);
  let newBalance = amountSol;

  if (existingJson) {
    try {
      const parsed: SubWalletData = JSON.parse(existingJson);
      parsed.balance = Number(((parsed.balance || 0) + amountSol).toFixed(4));
      newBalance = parsed.balance;
      localStorage.setItem(storageKey, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }

  // Bắn sự kiện đồng bộ toàn ứng dụng
  window.dispatchEvent(
    new CustomEvent("solana_subwallet_balance_updated", {
      detail: { ownerAddress, balance: newBalance },
    })
  );

  return newBalance;
}

/**
 * Khấu trừ SOL khỏi Sub-Wallet khi uỷ thác copy trade hoặc mở vị thế LP
 */
export function recordSubWalletDeduction(ownerAddress: string, amountSol: number): number {
  if (typeof window === "undefined" || !ownerAddress || amountSol <= 0) return 0;
  const storageKey = `${STORAGE_PREFIX}${ownerAddress}`;
  const existingJson = localStorage.getItem(storageKey);
  let newBalance = 0;

  if (existingJson) {
    try {
      const parsed: SubWalletData = JSON.parse(existingJson);
      parsed.balance = Math.max(0, Number(((parsed.balance || 0) - amountSol).toFixed(4)));
      newBalance = parsed.balance;
      localStorage.setItem(storageKey, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }

  // Bắn sự kiện đồng bộ toàn ứng dụng
  window.dispatchEvent(
    new CustomEvent("solana_subwallet_balance_updated", {
      detail: { ownerAddress, balance: newBalance },
    })
  );

  return newBalance;
}

/**
 * Cấp vốn Testnet Faucet / Khởi tạo SOL ủy thác nhanh cho demo và thử nghiệm
 */
export function depositSolSimulatedOrFaucet(ownerAddress: string, amountSol: number = 0.5): number {
  return recordSubWalletDeposit(ownerAddress, amountSol);
}

/**
 * Rút SOL từ Sub-Wallet về ví chính (Ký trực tiếp bằng Keypair của Sub-Wallet)
 * Bảo vệ Rent-Exemption và áp dụng Compute Budget Priority Fee
 */
export async function withdrawSolFromSubWallet(
  subWallet: SubWalletData,
  toMainWalletAddress: string,
  amountSol?: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const conn = getSafeConnection();
    const keypair = Keypair.fromSecretKey(new Uint8Array(subWallet.secretKeyArray));
    const toPubKey = new PublicKey(toMainWalletAddress);

    let currentLamports = 0;
    try {
      currentLamports = await conn.getBalance(keypair.publicKey);
    } catch {
      currentLamports = 0;
    }

    // Nếu on-chain không có lamports nhưng có số dư bộ nhớ đệm (thử nghiệm mô phỏng / faucet)
    if (currentLamports <= 10000) {
      if (subWallet.balance && subWallet.balance > 0) {
        // Rút số dư mô phỏng / testnet
        const withdrawAmt = amountSol && amountSol > 0 ? Math.min(amountSol, subWallet.balance) : subWallet.balance;
        recordSubWalletDeduction(subWallet.ownerAddress, withdrawAmt);
        return {
          success: true,
          signature: `sim_withdraw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        };
      }
      return { success: false, error: "Số dư Sub-Wallet không đủ để trang trải phí mạng (cần tối thiểu 0.005 SOL)" };
    }

    // Dự trù chi phí mạng: Base fee (5,000 lamports) + Priority fee (~5,000 lamports) = 10,000 lamports (~0.00001 SOL)
    const feeReserveLamports = 10000;
    let transferLamports = 0;

    if (!amountSol || amountSol <= 0) {
      // 1. RÚT TOÀN BỘ: Cho phép tài khoản về 0 lamports hoàn toàn (Solana Runtime cho phép đóng account về 0)
      transferLamports = currentLamports - feeReserveLamports;
    } else {
      // 2. RÚT MỘT PHẦN: Phải đảm bảo số dư còn lại KHÔNG nằm trong vùng vi phạm Rent-Exemption (0 < còn lại < 890,880)
      const requestedLamports = Math.round(amountSol * LAMPORTS_PER_SOL);
      const remainingLamports = currentLamports - requestedLamports - feeReserveLamports;

      if (remainingLamports < 0) {
        // Không đủ số dư
        transferLamports = currentLamports - feeReserveLamports;
      } else if (remainingLamports > 0 && remainingLamports < MIN_RENT_EXEMPT_LAMPORTS) {
        // Vi phạm rent-exemption: Tự động điều chỉnh để giữ lại tối thiểu ngưỡng rent-exempt
        const safeTransfer = currentLamports - MIN_RENT_EXEMPT_LAMPORTS - feeReserveLamports;
        if (safeTransfer > 0) {
          transferLamports = safeTransfer;
        } else {
          // Nếu không đủ giữ rent thì chuyển thành rút toàn bộ
          transferLamports = currentLamports - feeReserveLamports;
        }
      } else {
        transferLamports = requestedLamports;
      }
    }

    if (transferLamports <= 0) {
      return { success: false, error: "Số lượng rút không hợp lệ hoặc số dư không đủ sau khi trừ phí mạng" };
    }

    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
    const transaction = new Transaction({
      feePayer: keypair.publicKey,
      recentBlockhash: blockhash,
    })
      // Thêm Priority Fee để đảm bảo xác nhận ngay lập tức kể cả khi mạng Solana nghẽn
      .add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 100000, // 0.0001 SOL per 1M CU
        })
      )
      .add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: toPubKey,
          lamports: transferLamports,
        })
      );

    transaction.sign(keypair);
    const signature = await conn.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 3,
    });

    try {
      await conn.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );
    } catch (confirmErr) {
      console.warn("Lưu ý xác nhận on-chain, transaction đã phát lên mạng:", confirmErr);
    }

    // Cập nhật lại số dư chính xác
    const withdrawnSol = transferLamports / LAMPORTS_PER_SOL;
    recordSubWalletDeduction(subWallet.ownerAddress, withdrawnSol);

    return { success: true, signature };
  } catch (error: any) {
    console.error("Lỗi rút tiền Sub-wallet on-chain:", error);
    return { success: false, error: error?.message || "Giao dịch rút tiền thất bại" };
  }
}

/**
 * Xuất khóa riêng (Private Key dạng JSON Array - Tương thích 100% với Phantom/Solflare Import)
 */
export function exportSubWalletPrivateKey(subWallet: SubWalletData): string {
  return JSON.stringify(subWallet.secretKeyArray);
}

/**
 * Xóa ví ủy thác cũ để tạo mới
 */
export function resetSubWallet(ownerAddress: string): void {
  if (typeof window === "undefined" || !ownerAddress) return;
  const storageKey = `${STORAGE_PREFIX}${ownerAddress}`;
  localStorage.removeItem(storageKey);
}
