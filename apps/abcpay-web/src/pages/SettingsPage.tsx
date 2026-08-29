import { Link } from 'react-router-dom';

export function SettingsPage() {
  return (
    <div className="max-w-lg mx-auto">
      <header className="px-4 py-4 border-b border-white/10">
        <h1 className="text-lg font-medium text-center">Settings</h1>
      </header>

      <div className="px-4 py-6 space-y-2">
        <SettingsItem label="BWS Server URL" value={import.meta.env.VITE_BWS_URL ?? '/bws/api'} />
        <SettingsItem label="Supported Coins" value="XEC, DOGE" />
        <SettingsItem label="Version" value="0.1.0" />

        <div className="pt-6">
          <Link
            to="/"
            className="block w-full py-3 text-center text-[var(--abcpay-accent)] hover:underline"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function SettingsItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-4 bg-[var(--abcpay-surface)] rounded-xl">
      <span className="text-[var(--abcpay-muted)]">{label}</span>
      <span className="text-sm font-mono">{value}</span>
    </div>
  );
}
