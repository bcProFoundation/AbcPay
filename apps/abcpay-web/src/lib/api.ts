import type {
  BalanceResponse,
  CreateWalletRequest,
  JoinWalletRequest,
  SupportedCoin,
  TxProposal,
  WalletResponse
} from '@bcpros/abcpay-models';

const BWS_URL = import.meta.env.VITE_BWS_URL ?? '/bws/api';

interface RequestHeaders {
  walletId?: string;
  copayerId?: string;
}

async function bwsFetch<T>(
  path: string,
  options: RequestInit = {},
  headers: RequestHeaders = {}
): Promise<T> {
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (headers.walletId) reqHeaders['x-wallet-id'] = headers.walletId;
  if (headers.copayerId) reqHeaders['x-copayer-id'] = headers.copayerId;

  const res = await fetch(`${BWS_URL}${path}`, { ...options, headers: reqHeaders });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Request failed');
  }

  return res.json();
}

export const api = {
  createWallet(data: CreateWalletRequest): Promise<WalletResponse> {
    return bwsFetch('/v2/wallets/', { method: 'POST', body: JSON.stringify(data) });
  },

  joinWallet(walletId: string, data: Omit<JoinWalletRequest, 'walletId'>): Promise<WalletResponse> {
    return bwsFetch(`/v1/wallets/${walletId}/copayers/`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getWallet(walletId: string): Promise<WalletResponse> {
    return bwsFetch('/v3/wallets/', {}, { walletId });
  },

  registerAddress(
    walletId: string,
    address: string,
    path: string,
    publicKeys: string[],
    isChange = false
  ) {
    return bwsFetch(
      '/v3/addresses/',
      {
        method: 'POST',
        body: JSON.stringify({ address, path, publicKeys, isChange })
      },
      { walletId }
    );
  },

  getBalance(walletId: string): Promise<BalanceResponse> {
    return bwsFetch('/v1/balance/', {}, { walletId });
  },

  getTxProposals(walletId: string, copayerId: string): Promise<TxProposal[]> {
    return bwsFetch('/v1/txproposals/', {}, { walletId, copayerId });
  },

  getFiatRate(coin: SupportedCoin): Promise<{ rate: number; fetchedOn: number }> {
    return bwsFetch(`/v3/fiatrates/${coin}/`);
  },

  getFeeLevels(coin: SupportedCoin) {
    return bwsFetch(`/v1/feelevels/?coin=${coin}`);
  }
};
