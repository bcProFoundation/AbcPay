import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { COIN_CONFIGS, supportedCoins } from '@bcpros/abcpay-models';
import { api } from '../lib/api';
import { useWallets, walletFromResponse } from '../context/WalletContext';

const createWalletSchema = z.object({
  name: z.string().min(1, 'Wallet name is required'),
  copayerName: z.string().min(1, 'Your name is required'),
  coin: z.enum(supportedCoins),
  m: z.coerce.number().int().min(1),
  n: z.coerce.number().int().min(1),
  isMultisig: z.boolean()
});

type CreateWalletForm = z.infer<typeof createWalletSchema>;

function generateKeyPair() {
  const id = crypto.randomUUID().replace(/-/g, '');
  return {
    pubKey: `02${id.slice(0, 62)}`,
    copayerId: id.slice(0, 32),
    xPubKey: `xpub${id}`,
    requestPubKey: `03${id.slice(0, 62)}`
  };
}

export function CreateWalletPage() {
  const navigate = useNavigate();
  const { addWallet } = useWallets();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, watch, setValue } = useForm<CreateWalletForm>({
    resolver: zodResolver(createWalletSchema),
    defaultValues: {
      name: '',
      copayerName: '',
      coin: 'xec',
      m: 1,
      n: 1,
      isMultisig: false
    }
  });

  const isMultisig = watch('isMultisig');
  const coin = watch('coin');

  const onSubmit = async (data: CreateWalletForm) => {
    setLoading(true);
    setError('');

    try {
      const keys = generateKeyPair();
      const m = data.isMultisig ? data.m : 1;
      const n = data.isMultisig ? data.n : 1;

      const wallet = await api.createWallet({
        name: data.name,
        m,
        n,
        coin: data.coin,
        network: 'livenet',
        addressType: 'P2SH',
        pubKey: keys.pubKey,
        usePurpose48: n > 1
      });

      const localWallet = walletFromResponse(wallet, keys.copayerId, data.copayerName);
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
        <h1 className="text-lg font-medium text-center">Create Wallet</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 space-y-5">
        <Field label="Wallet Name" name="name" control={control} placeholder="My Wallet" />
        <Field label="Your Name" name="copayerName" control={control} placeholder="Alice" />

        <div>
          <label className="block text-sm text-[var(--abcpay-muted)] mb-2">Currency</label>
          <Controller
            name="coin"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-3">
                {supportedCoins.map(c => {
                  const config = COIN_CONFIGS[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => field.onChange(c)}
                      className={`p-4 rounded-xl border-2 transition-colors ${
                        field.value === c
                          ? 'border-[var(--abcpay-accent)]'
                          : 'border-transparent bg-[var(--abcpay-surface)]'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-bold"
                        style={{ backgroundColor: config.backgroundColor }}
                      >
                        {config.unitName[0]}
                      </div>
                      <p className="font-medium">{config.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>

        {COIN_CONFIGS[coin].hasMultiSig && (
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <Controller
                name="isMultisig"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={e => {
                      field.onChange(e.target.checked);
                      if (e.target.checked) {
                        setValue('m', 2);
                        setValue('n', 3);
                      } else {
                        setValue('m', 1);
                        setValue('n', 1);
                      }
                    }}
                    className="w-5 h-5 rounded"
                  />
                )}
              />
              <span>Shared Wallet (Multisig)</span>
            </label>
          </div>
        )}

        {isMultisig && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Required signatures (m)" name="m" control={control} type="number" />
            <Field label="Total copayers (n)" name="n" control={control} type="number" />
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[var(--abcpay-accent)] rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Wallet'}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  control,
  placeholder,
  type = 'text'
}: {
  label: string;
  name: 'name' | 'copayerName' | 'm' | 'n';
  control: ReturnType<typeof useForm<CreateWalletForm>>['control'];
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-[var(--abcpay-muted)] mb-2">{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <>
            <input
              {...field}
              type={type}
              placeholder={placeholder}
              className="w-full px-4 py-3 bg-[var(--abcpay-surface)] rounded-xl border border-white/10 focus:border-[var(--abcpay-accent)] outline-none"
            />
            {fieldState.error && (
              <p className="text-red-400 text-sm mt-1">{fieldState.error.message}</p>
            )}
          </>
        )}
      />
    </div>
  );
}
