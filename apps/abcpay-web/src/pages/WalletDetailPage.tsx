import { useParams } from 'react-router-dom';
import { COIN_CONFIGS } from '@bcpros/abcpay-models';
import { CoinBadge, MultisigBadge } from '../components/ui';
import { useWallets } from '../context/WalletContext';

export function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { wallets, showBalance } = useWallets();
  const wallet = wallets.find(w => w.id === id);

  if (!wallet) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-[var(--abcpay-muted)]">Wallet not found</p>
      </div>
    );
  }

  const config = COIN_CONFIGS[wallet.coin];

  return (
    <div className="max-w-lg mx-auto">
      <header
        className="px-4 py-8 text-center"
        style={{ background: `linear-gradient(180deg, ${config.backgroundColor}44 0%, transparent 100%)` }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <CoinBadge coin={wallet.coin} />
          <MultisigBadge m={wallet.m} n={wallet.n} />
        </div>
        <h1 className="text-xl font-medium mb-2">{wallet.name}</h1>
        <p className="text-3xl font-bold">
          {showBalance
            ? `${(wallet.balance / config.unitToSatoshi).toFixed(config.unitDecimals)} ${config.unitName}`
            : '****'}
        </p>
        <p className="text-[var(--abcpay-muted)] mt-1">
          {showBalance ? wallet.fiatBalance : '****'}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 px-4 py-6">
        <ActionButton label="Send" icon="send" disabled />
        <ActionButton label="Receive" icon="receive" disabled />
        <ActionButton label="History" icon="history" disabled />
      </div>

      {wallet.n > 1 && (
        <div className="mx-4 p-4 bg-[var(--abcpay-surface)] rounded-2xl">
          <h3 className="font-medium mb-2">Shared Wallet</h3>
          <p className="text-sm text-[var(--abcpay-muted)]">
            This is a {wallet.m}-of-{wallet.n} multisig wallet. Transaction proposals require{' '}
            {wallet.m} copayer signature{wallet.m > 1 ? 's' : ''} before broadcasting.
          </p>
          <p className="text-xs text-[var(--abcpay-muted)] mt-3 font-mono break-all">
            Wallet ID: {wallet.id}
          </p>
        </div>
      )}

      <div className="mx-4 mt-4 p-4 bg-[var(--abcpay-surface)] rounded-2xl">
        <h3 className="font-medium mb-2">Status</h3>
        <p className="text-sm capitalize text-[var(--abcpay-muted)]">{wallet.status}</p>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';

function ActionButton({
  label,
  icon,
  disabled
}: {
  label: string;
  icon: string;
  disabled?: boolean;
}) {
  const icons: Record<string, ReactNode> = {
    send: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    receive: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    history: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <button
      disabled={disabled}
      className="flex flex-col items-center gap-2 p-4 bg-[var(--abcpay-surface)] rounded-xl hover:bg-[var(--abcpay-surface-2)] disabled:opacity-40 transition-colors"
    >
      {icons[icon]}
      <span className="text-sm">{label}</span>
    </button>
  );
}
