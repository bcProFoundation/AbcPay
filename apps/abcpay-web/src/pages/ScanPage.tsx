export function ScanPage() {
  return (
    <div className="max-w-lg mx-auto">
      <header className="px-4 py-4 border-b border-white/10">
        <h1 className="text-lg font-medium text-center">Scan QR Code</h1>
      </header>

      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-64 h-64 border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-16 h-16 text-[var(--abcpay-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
        </div>
        <p className="text-[var(--abcpay-muted)] text-center">
          Camera access required for QR scanning.
          <br />
          Coming in next release.
        </p>
      </div>
    </div>
  );
}
