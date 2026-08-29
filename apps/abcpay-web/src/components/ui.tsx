import { COIN_CONFIGS } from '@bcpros/abcpay-models';
import type { SupportedCoin } from '@bcpros/abcpay-models';

export function AbcPayLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#016cbf] to-[#0080CA] flex items-center justify-center font-bold text-sm">
        A
      </div>
      <span className="font-semibold text-lg tracking-tight">AbcPay</span>
    </div>
  );
}

export function CoinBadge({ coin }: { coin: SupportedCoin }) {
  const config = COIN_CONFIGS[coin];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: config.backgroundColor + '33', color: config.coinColor }}
    >
      {config.unitName}
    </span>
  );
}

export function MultisigBadge({ m, n }: { m: number; n: number }) {
  if (n <= 1) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
      {m}-of-{n}
    </span>
  );
}

export function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="p-1 text-[var(--abcpay-muted)] hover:text-white transition-colors"
      aria-label={show ? 'Hide balance' : 'Show balance'}
    >
      {show ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      )}
    </button>
  );
}

import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function TabBar() {
  const location = useLocation();
  const tabs = [
    { icon: 'home', label: 'Home', to: '/' },
    { icon: 'scan', label: 'Scan', to: '/scan' },
    { icon: 'wallet', label: 'Wallets', to: '/wallets' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--abcpay-surface)] border-t border-white/10 safe-area-bottom">
      <div className="max-w-lg mx-auto flex justify-around py-2">
        {tabs.map(tab => (
          <TabItem
            key={tab.to}
            icon={tab.icon}
            label={tab.label}
            to={tab.to}
            active={location.pathname === tab.to}
          />
        ))}
      </div>
    </nav>
  );
}

function TabItem({
  icon,
  label,
  to,
  active = false
}: {
  icon: string;
  label: string;
  to: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 px-4 py-1 text-xs transition-colors ${
        active ? 'text-[var(--abcpay-accent)]' : 'text-[var(--abcpay-muted)]'
      }`}
    >
      <TabIcon name={icon} />
      {label}
    </Link>
  );
}

function TabIcon({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    home: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    scan: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
        />
      </svg>
    ),
    wallet: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    )
  };
  return <>{icons[name]}</>;
}
