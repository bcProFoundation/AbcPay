import { Link } from 'react-router-dom';
import { COIN_CONFIGS } from '@bcpros/abcpay-models';
import { AbcPayLogo, CoinBadge, MultisigBadge } from '../components/ui';
import { useWallets } from '../context/WalletContext';

export function WalletsPage() {
  const { wallets, showBalance } = useWallets();

  return (
    <div className="max-w-lg mx-auto">
      <header className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <AbcPayLogo />
        <h1 className="text-lg font-medium">Wallets</h1>
        <div className="w-20" />
      </header>

      <div className="px-4 py-6">
        <div className="flex gap-3 mb-6">
          <Link
            to="/create-wallet"
            className="flex-1 py-3 text-center bg-[var(--abcpay-accent)] rounded-xl font-medium hover:opacity-90"
          >
            Create Wallet
          </Link>
          <Link
            to="/join-wallet"
            className="flex-1 py-3 text-center bg-[var(--abcpay-surface-2)] rounded-xl font-medium hover:bg-[var(--abcpay-surface)]"
          >
            Join Wallet
          </Link>
        </div>

        {wallets.length === 0 ? (
          <p className="text-center text-[var(--abcpay-muted)] py-8">No wallets configured</p>
        ) : (
          <div className="space-y-3">
            {wallets.map(wallet => {
              const config = COIN_CONFIGS[wallet.coin];
              return (
                <Link
                  key={wallet.id}
                  to={`/wallet/${wallet.id}`}
                  className="flex items-center gap-4 p-4 bg-[var(--abcpay-surface)] rounded-2xl hover:bg-[var(--abcpay-surface-2)] transition-colors"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold"
                    style={{ backgroundColor: config.backgroundColor }}
                  >
                    {config.unitName[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{wallet.name}</span>
                      <CoinBadge coin={wallet.coin} />
                      <MultisigBadge m={wallet.m} n={wallet.n} />
                    </div>
                    <p className="text-sm text-[var(--abcpay-muted)]">
                      {showBalance
                        ? `${(wallet.balance / config.unitToSatoshi).toFixed(config.unitDecimals)} ${config.unitName}`
                        : '****'}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-[var(--abcpay-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
