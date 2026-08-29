import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SupportedCoin, WalletResponse } from '@bcpros/abcpay-models';
import { COIN_CONFIGS } from '@bcpros/abcpay-models';

export interface LocalWallet {
  id: string;
  name: string;
  coin: SupportedCoin;
  m: number;
  n: number;
  copayerId: string;
  copayerName: string;
  balance: number;
  fiatBalance: string;
  status: string;
}

interface WalletContextValue {
  wallets: LocalWallet[];
  addWallet: (wallet: LocalWallet) => void;
  removeWallet: (id: string) => void;
  refreshBalances: () => Promise<void>;
  showBalance: boolean;
  setShowBalance: (show: boolean) => void;
  totalFiatBalance: string;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = 'abcpay_v2_wallets';

function loadWallets(): LocalWallet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWallets(wallets: LocalWallet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<LocalWallet[]>(loadWallets);
  const [showBalance, setShowBalance] = useState(true);
  const [totalFiatBalance, setTotalFiatBalance] = useState('$0.00');

  useEffect(() => {
    saveWallets(wallets);
  }, [wallets]);

  const addWallet = useCallback((wallet: LocalWallet) => {
    setWallets(prev => {
      if (prev.some(w => w.id === wallet.id)) return prev;
      return [...prev, wallet];
    });
  }, []);

  const removeWallet = useCallback((id: string) => {
    setWallets(prev => prev.filter(w => w.id !== id));
  }, []);

  const refreshBalances = useCallback(async () => {
    const { api } = await import('../lib/api');
    let totalFiat = 0;

    const updated = await Promise.all(
      wallets.map(async wallet => {
        try {
          const balance = await api.getBalance(wallet.id);
          const fiat = await api.getFiatRate(wallet.coin);
          const config = COIN_CONFIGS[wallet.coin];
          const amount = balance.totalAmount / config.unitToSatoshi;
          const fiatAmount = amount * fiat.rate;
          totalFiat += fiatAmount;

          return {
            ...wallet,
            balance: balance.totalAmount,
            fiatBalance: `$${fiatAmount.toFixed(2)}`
          };
        } catch {
          return wallet;
        }
      })
    );

    setWallets(updated);
    setTotalFiatBalance(`$${totalFiat.toFixed(2)}`);
  }, [wallets]);

  useEffect(() => {
    if (wallets.length > 0) {
      refreshBalances();
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallets,
        addWallet,
        removeWallet,
        refreshBalances,
        showBalance,
        setShowBalance,
        totalFiatBalance
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallets() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallets must be used within WalletProvider');
  return ctx;
}

export function walletFromResponse(
  response: WalletResponse,
  copayerId: string,
  copayerName: string
): LocalWallet {
  return {
    id: response.id,
    name: response.name,
    coin: response.coin,
    m: response.m,
    n: response.n,
    copayerId,
    copayerName,
    balance: 0,
    fiatBalance: '$0.00',
    status: response.status
  };
}
