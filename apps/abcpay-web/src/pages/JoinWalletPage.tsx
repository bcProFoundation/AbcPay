import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supportedCoins } from '@bcpros/abcpay-models';
import { api } from '../lib/api';
import { useWallets, walletFromResponse } from '../context/WalletContext';

const joinWalletSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  name: z.string().min(1, 'Your name is required'),
  coin: z.enum(supportedCoins)
});

type JoinWalletForm = z.infer<typeof joinWalletSchema>;

function generateKeyPair() {
  const id = crypto.randomUUID().replace(/-/g, '');
  return {
    copayerId: id.slice(0, 32),
    xPubKey: `xpub${id}`,
    requestPubKey: `03${id.slice(0, 62)}`
  };
}

export function JoinWalletPage() {
  const navigate = useNavigate();
  const { addWallet } = useWallets();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<JoinWalletForm>({
    resolver: zodResolver(joinWalletSchema),
    defaultValues: { walletId: '', name: '', coin: 'xec' }
  });

  const onSubmit = async (data: JoinWalletForm) => {
    setLoading(true);
    setError('');

    try {
      const keys = generateKeyPair();
      const wallet = await api.joinWallet(data.walletId, {
        name: data.name,
        coin: data.coin,
        xPubKey: keys.xPubKey,
        requestPubKey: keys.requestPubKey
      });

      const localWallet = walletFromResponse(wallet, keys.copayerId, data.name);
      addWallet(localWallet);
      navigate(`/wallet/${wallet.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <header className="px-4 py-4 border-b border-white/10">
        <h1 className="text-lg font-medium text-center">Join Shared Wallet</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 space-y-5">
        <p className="text-sm text-[var(--abcpay-muted)]">
          Enter the wallet invitation ID shared by the wallet creator.
        </p>

        <div>
          <label className="block text-sm text-[var(--abcpay-muted)] mb-2">Wallet ID</label>
          <Controller
            name="walletId"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <input
                  {...field}
                  placeholder="Paste wallet ID"
                  className="w-full px-4 py-3 bg-[var(--abcpay-surface)] rounded-xl border border-white/10 focus:border-[var(--abcpay-accent)] outline-none font-mono text-sm"
                />
                {fieldState.error && (
                  <p className="text-red-400 text-sm mt-1">{fieldState.error.message}</p>
                )}
              </>
            )}
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--abcpay-muted)] mb-2">Your Name</label>
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <input
                  {...field}
                  placeholder="Bob"
                  className="w-full px-4 py-3 bg-[var(--abcpay-surface)] rounded-xl border border-white/10 focus:border-[var(--abcpay-accent)] outline-none"
                />
                {fieldState.error && (
                  <p className="text-red-400 text-sm mt-1">{fieldState.error.message}</p>
                )}
              </>
            )}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[var(--abcpay-accent)] rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join Wallet'}
        </button>
      </form>
    </div>
  );
}
