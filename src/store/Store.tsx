import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BwsClient } from '../lib/bws';
import {
  accountFromMnemonic,
  Coin,
  createWalletPrivKey,
  deriveRequestKey,
  decodeSecret,
  encodeSecret,
  generateMnemonic,
  getCopayerHash,
  Network,
  signMessage
} from '../lib/crypto';
import {
  AddressBookEntry,
  defaultProfile,
  KeyRecord,
  loadProfile,
  loadSettings,
  Profile,
  saveProfile,
  saveSettings,
  Settings,
  WalletRecord
} from '../lib/storage';

interface StoreValue {
  profile: Profile;
  settings: Settings;
  client: BwsClient;
  selectedKeyId?: string;
  setSettings: (patch: Partial<Settings>) => void;
  createKey: (name: string) => KeyRecord;
  importKey: (name: string, mnemonic: string) => KeyRecord;
  createWallet: (opts: {
    keyId: string;
    name: string;
    coin: Coin;
    network: Network;
    m: number;
    n: number;
    copayerName: string;
  }) => Promise<{ wallet: WalletRecord; secret?: string; mnemonic?: string }>;
  joinWallet: (opts: { keyId: string; secret: string; copayerName: string }) => Promise<WalletRecord>;
  deleteWallet: (id: string) => void;
  addAddress: (entry: Omit<AddressBookEntry, 'id'>) => void;
  removeAddress: (id: string) => void;
  authed: (wallet: WalletRecord) => BwsClient;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());

  useEffect(() => saveProfile(profile), [profile]);
  useEffect(() => {
    saveSettings(settings);
    document.body.classList.toggle('dark', settings.theme === 'dark');
  }, [settings]);

  const client = useMemo(() => new BwsClient({ baseUrl: settings.bwsUrl.replace(/\/$/, '') }), [settings.bwsUrl]);

  const value: StoreValue = {
    profile,
    settings,
    client,
    selectedKeyId: profile.keys[0]?.id,
    setSettings: patch => setSettingsState(s => ({ ...s, ...patch })),
    createKey: name => {
      const key: KeyRecord = {
        id: crypto.randomUUID(),
        name,
        mnemonic: generateMnemonic(),
        createdAt: Date.now()
      };
      setProfile(p => ({ ...p, keys: [...p.keys, key] }));
      return key;
    },
    importKey: (name, mnemonic) => {
      const key: KeyRecord = { id: crypto.randomUUID(), name, mnemonic: mnemonic.trim(), createdAt: Date.now() };
      setProfile(p => ({ ...p, keys: [...p.keys, key] }));
      return key;
    },
    createWallet: async opts => {
      const key = profile.keys.find(k => k.id === opts.keyId);
      if (!key) throw new Error('Key not found');
      const account = accountFromMnemonic(key.mnemonic, opts.coin, opts.n);
      const request = deriveRequestKey(account.xpriv, opts.coin);
      const walletKeys = createWalletPrivKey(opts.coin);
      const created = await client.createWallet({
        name: opts.name,
        m: opts.m,
        n: opts.n,
        pubKey: walletKeys.pubKey,
        coin: opts.coin,
        network: opts.network
      });
      const joined = await client.joinWallet(created.walletId, {
        name: opts.copayerName,
        xPubKey: account.xpub,
        requestPubKey: request.pubKey,
        copayerSignature: signMessage(
          getCopayerHash(opts.copayerName, account.xpub, request.pubKey),
          walletKeys.privKey
        )
      });
      const secret =
        opts.n > 1
          ? encodeSecret({
              walletId: created.walletId,
              coin: opts.coin,
              network: opts.network,
              m: opts.m,
              n: opts.n,
              name: opts.name,
              walletPrivKey: walletKeys.privKey
            })
          : undefined;
      const wallet: WalletRecord = {
        id: crypto.randomUUID(),
        keyId: key.id,
        name: opts.name,
        coin: opts.coin,
        network: opts.network,
        m: opts.m,
        n: opts.n,
        walletId: created.walletId,
        copayerId: joined.copayerId,
        copayerName: opts.copayerName,
        xpub: account.xpub,
        xpriv: account.xpriv,
        requestPrivKey: request.privKey,
        requestPubKey: request.pubKey,
        secret,
        status: joined.wallet.status
      };
      setProfile(p => ({ ...p, wallets: [...p.wallets, wallet] }));
      return { wallet, secret, mnemonic: key.mnemonic };
    },
    joinWallet: async opts => {
      const key = profile.keys.find(k => k.id === opts.keyId);
      if (!key) throw new Error('Key not found');
      const secret = decodeSecret(opts.secret);
      const account = accountFromMnemonic(key.mnemonic, secret.coin, secret.n);
      const request = deriveRequestKey(account.xpriv, secret.coin);
      const joined = await client.joinWallet(secret.walletId, {
        name: opts.copayerName,
        xPubKey: account.xpub,
        requestPubKey: request.pubKey,
        copayerSignature: signMessage(
          getCopayerHash(opts.copayerName, account.xpub, request.pubKey),
          secret.walletPrivKey
        )
      });
      const wallet: WalletRecord = {
        id: crypto.randomUUID(),
        keyId: key.id,
        name: secret.name,
        coin: secret.coin,
        network: secret.network,
        m: secret.m,
        n: secret.n,
        walletId: secret.walletId,
        copayerId: joined.copayerId,
        copayerName: opts.copayerName,
        xpub: account.xpub,
        xpriv: account.xpriv,
        requestPrivKey: request.privKey,
        requestPubKey: request.pubKey,
        secret: opts.secret,
        status: joined.wallet.status
      };
      setProfile(p => ({ ...p, wallets: [...p.wallets, wallet] }));
      return wallet;
    },
    deleteWallet: id => setProfile(p => ({ ...p, wallets: p.wallets.filter(w => w.id !== id) })),
    addAddress: entry =>
      setProfile(p => ({ ...p, addressBook: [...p.addressBook, { ...entry, id: crypto.randomUUID() }] })),
    removeAddress: id => setProfile(p => ({ ...p, addressBook: p.addressBook.filter(a => a.id !== id) })),
    authed: wallet => client.withIdentity({ copayerId: wallet.copayerId, requestPrivKey: wallet.requestPrivKey })
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('Store missing');
  return ctx;
}

export { defaultProfile };
