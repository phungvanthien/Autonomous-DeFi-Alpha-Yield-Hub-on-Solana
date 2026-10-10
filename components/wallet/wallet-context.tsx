"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, ComputeBudgetProgram } from "@solana/web3.js";
import { getSafeConnection, recordSubWalletDeposit } from "@/lib/sub-wallet-manager";

interface SolanaWalletProviderValue {
  walletAddress: string | null;
  walletName: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: number;
  connect: (walletType?: "phantom" | "solflare" | "backpack") => Promise<boolean>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  sendSolToSubWallet: (subWalletAddress: string, amountSol: number, isFaucet?: boolean) => Promise<string | null>;
  depositDemoSolToSubWallet: (subWalletAddress: string, amountSol?: number) => Promise<string | null>;
  installedWallets: {
    phantom: boolean;
    solflare: boolean;
    backpack: boolean;
  };
}

const WalletContext = createContext<SolanaWalletProviderValue>({
  walletAddress: null,
  walletName: null,
  isConnected: false,
  isConnecting: false,
  balance: 0,
  connect: async () => false,
  disconnect: () => {},
  refreshBalance: async () => {},
  sendSolToSubWallet: async () => null,
  depositDemoSolToSubWallet: async () => null,
  installedWallets: { phantom: false, solflare: false, backpack: false },
});

export const useSolanaWallet = () => useContext(WalletContext);

// RPC Connection dự phòng
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [installedWallets, setInstalledWallets] = useState({
    phantom: false,
    solflare: false,
    backpack: false,
  });

  const getProvider = (type?: "phantom" | "solflare" | "backpack") => {
    if (typeof window === "undefined") return null;

    if (type === "phantom") {
      const p = (window as any)?.phantom?.solana || (window as any)?.solana;
      if (p?.isPhantom) return p;
    }
    if (type === "solflare") {
      const s = (window as any)?.solflare;
      if (s?.isSolflare) return s;
    }
    if (type === "backpack") {
      const b = (window as any)?.backpack;
      if (b) return b;
    }

    // Tự động tìm ví có sẵn bất kỳ
    if ((window as any)?.phantom?.solana?.isPhantom) return (window as any).phantom.solana;
    if ((window as any)?.solflare?.isSolflare) return (window as any).solflare;
    if ((window as any)?.solana) return (window as any).solana;

    return null;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkInstalled = () => {
      setInstalledWallets({
        phantom: Boolean((window as any)?.phantom?.solana?.isPhantom || (window as any)?.solana?.isPhantom),
        solflare: Boolean((window as any)?.solflare?.isSolflare),
        backpack: Boolean((window as any)?.backpack),
      });
    };

    checkInstalled();
    const timer = setTimeout(checkInstalled, 1000);

    // Tự động kết nối lại nếu trước đó đã kết nối (Eager connect)
    const savedWallet = localStorage.getItem("solana_connected_wallet");
    if (savedWallet) {
      const provider = getProvider(savedWallet as any);
      if (provider) {
        provider.connect({ onlyIfTrusted: true })
          .then((res: any) => {
            const pubKey = res?.publicKey?.toString?.() || provider.publicKey?.toString?.();
            if (pubKey) {
              setWalletAddress(pubKey);
              setWalletName(savedWallet);
              setIsConnected(true);
            }
          })
          .catch(() => {
            // Không phải lỗi, chỉ là chưa được tin cậy
          });
      }
    }

    return () => clearTimeout(timer);
  }, []);

  // Lấy số dư SOL của ví chính
  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const conn = new Connection(RPC_ENDPOINT, "confirmed");
      const pubKey = new PublicKey(walletAddress);
      const lamports = await conn.getBalance(pubKey);
      setBalance(Number((lamports / LAMPORTS_PER_SOL).toFixed(4)));
    } catch (err) {
      console.warn("Lỗi cập nhật số dư ví chính:", err);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      refreshBalance();
      const interval = setInterval(refreshBalance, 20000);
      return () => clearInterval(interval);
    } else {
      setBalance(0);
    }
  }, [walletAddress, refreshBalance]);

  const connect = async (walletType?: "phantom" | "solflare" | "backpack"): Promise<boolean> => {
    setIsConnecting(true);
    try {
      const provider = getProvider(walletType);
      if (!provider) {
        const target = walletType ? walletType.toUpperCase() : "Solana";
        alert(`Wallet extension ${target} not found. Please install a browser extension (Phantom, Solflare) to proceed.`);
        setIsConnecting(false);
        return false;
      }

      const response = await provider.connect();
      const pubKey = response?.publicKey?.toString?.() || provider.publicKey?.toString?.();

      if (pubKey) {
        setWalletAddress(pubKey);
        const name = walletType || (provider.isPhantom ? "phantom" : provider.isSolflare ? "solflare" : "extension");
        setWalletName(name);
        setIsConnected(true);
        localStorage.setItem("solana_connected_wallet", name);
        setIsConnecting(false);
        return true;
      }
    } catch (error: any) {
      console.error("Wallet extension connection error:", error);
      if (error?.code !== 4001) { // 4001: User rejected connection
        alert(`Connection error: ${error?.message || "Failed to connect wallet"}`);
      }
    }
    setIsConnecting(false);
    return false;
  };

  const disconnect = () => {
    try {
      const provider = getProvider(walletName as any);
      if (provider?.disconnect) {
        provider.disconnect();
      }
    } catch (e) {
      console.warn(e);
    }
    setWalletAddress(null);
    setWalletName(null);
    setIsConnected(false);
    setBalance(0);
    localStorage.removeItem("solana_connected_wallet");
  };

  // Fund SOL from main wallet to delegated Sub-Wallet
  const sendSolToSubWallet = async (
    subWalletAddress: string,
    amountSol: number,
    isFaucet: boolean = false
  ): Promise<string | null> => {
    if (!walletAddress || !isConnected) {
      alert("Please connect your extension wallet first");
      return null;
    }

    if (amountSol <= 0) {
      alert("Amount must be greater than 0 SOL");
      return null;
    }

    // Nếu chọn chế độ Faucet / Demo Testnet nhanh
    if (isFaucet) {
      const mockSig = `faucet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      recordSubWalletDeposit(walletAddress, amountSol);
      return mockSig;
    }

    try {
      const provider = getProvider(walletName as any);
      if (!provider) throw new Error("Wallet provider not found");

      const conn = getSafeConnection();
      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(subWalletAddress);
      const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");

      const transaction = new Transaction({
        feePayer: fromPubkey,
        recentBlockhash: blockhash,
      })
        .add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 100000,
          })
        )
        .add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          })
        );

      // Sign and send transaction via extension
      let signature = "";
      if (provider.signAndSendTransaction) {
        const res = await provider.signAndSendTransaction(transaction);
        signature = res.signature || res;
      } else if (provider.sendTransaction) {
        signature = await provider.sendTransaction(transaction, conn);
      } else if (provider.signTransaction) {
        const signed = await provider.signTransaction(transaction);
        signature = await conn.sendRawTransaction(signed.serialize());
      } else {
        throw new Error("Wallet does not support transaction signing");
      }

      // Đợi xác nhận giao dịch (bắt lỗi timeout nhẹ nhàng để không chặn người dùng khi mạng Solana nghẽn)
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
        console.warn("Lưu ý xác nhận on-chain, transaction đã phát:", confirmErr);
      }

      // Ghi nhận số dư vào Sub-wallet ngay lập tức
      recordSubWalletDeposit(walletAddress, amountSol);

      await refreshBalance();
      return signature;
    } catch (error: any) {
      console.error("Deposit SOL to Sub-Wallet error:", error);
      alert(`Deposit SOL failed: ${error?.message || error}`);
      return null;
    }
  };

  // Nạp SOL thử nghiệm nhanh vào sub-wallet
  const depositDemoSolToSubWallet = async (
    subWalletAddress: string,
    amountSol: number = 0.5
  ): Promise<string | null> => {
    if (!walletAddress) {
      alert("Please connect your wallet first");
      return null;
    }
    const mockSig = `demo_deposit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    recordSubWalletDeposit(walletAddress, amountSol);
    return mockSig;
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        walletName,
        isConnected,
        isConnecting,
        balance,
        connect,
        disconnect,
        refreshBalance,
        sendSolToSubWallet,
        depositDemoSolToSubWallet,
        installedWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
