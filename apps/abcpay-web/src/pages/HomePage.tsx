import { Link } from 'react-router-dom';
import { COIN_CONFIGS } from '@bcpros/abcpay-models';
import { AbcPayLogo, CoinBadge, EyeToggle, MultisigBadge } from '../components/ui';
import { useWallets } from '../context/WalletContext';

export function HomePage() {
  const { wallets, showBalance, setShowBalance, totalFiatBalance, refreshBalances } = useWallets();

  return (
    <div className="max-w-lg mx-auto">
      <header className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <AbcPayLogo />
        <div className="flex items-center gap-2">
          <Link to="/settings" className="p-2 text-[var(--abcpay-muted)] hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>
        </div>
      </header>

      <div className="px-4 py-6">
        <div className="text-center mb-8">
          <p className="text-sm text-[var(--abcpay-muted)] mb-2">Total cash value</p>
          <div className="flex items-center justify-center gap-2">
            <EyeToggle show={showBalance} onToggle={() => setShowBalance(!showBalance)} />
            <span className="text-3xl font-semibold">
              {showBalance ? totalFiatBalance : '******'}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Your Wallets</h2>
          <button
            onClick={() => refreshBalances()}
            className="text-sm text-[var(--abcpay-accent)] hover:underline"
          >
            Refresh
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="text-center py-12 bg-[var(--abcpay-surface)] rounded-2xl">
            <p className="text-[var(--abcpay-muted)] mb-4">No wallets yet</p>
            <Link
              to="/create-wallet"
              className="inline-block px-6 py-3 bg-[var(--abcpay-accent)] rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Create Wallet
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map(wallet => {
              const config = COIN_CONFIGS[wallet.coin];
              return (
                <Link
                  key={wallet.id}
                  to={`/wallet/${wallet.id}`}
                  className="block p-4 rounded-2xl transition-transform hover:scale-[1.01]"
                  style={{ backgroundColor: config.backgroundColor + '22' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{wallet.name}</span>
                    <div className="flex gap-2">
                      <CoinBadge coin={wallet.coin} />
                      <MultisigBadge m={wallet.m} n={wallet.n} />
                    </div>
                  </div>
                  <p className="text-2xl font-semibold">
                    {showBalance ? wallet.fiatBalance : '******'}
                  </p>
                  <p className="text-sm text-[var(--abcpay-muted)]">
                    {showBalance
                      ? `${(wallet.balance / config.unitToSatoshi).toFixed(config.unitDecimals)} ${config.unitName}`
                      : '****'}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
