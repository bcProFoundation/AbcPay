import { Coin, Network } from './crypto';

const KEY = 'abcpay.profile.v3';
const SETTINGS_KEY = 'abcpay.settings.v3';

export interface KeyRecord {
  id: string;
  name: string;
  mnemonic: string;
  createdAt: number;
}

export interface WalletRecord {
  id: string;
  keyId: string;
  name: string;
  coin: Coin;
  network: Network;
  m: number;
  n: number;
  walletId: string;
  copayerId: string;
  copayerName: string;
  xpub: string;
  xpriv: string;
  requestPrivKey: string;
  requestPubKey: string;
  secret?: string;
  status: 'pending' | 'complete';
}

export interface AddressBookEntry {
  id: string;
  name: string;
  address: string;
  coin: Coin;
}

export interface Profile {
  keys: KeyRecord[];
  wallets: WalletRecord[];
  addressBook: AddressBookEntry[];
}

export interface Settings {
  theme: 'light' | 'dark';
  currency: 'USD' | 'EUR' | 'GBP';
  bwsUrl: string;
  hideBalance: boolean;
}

export const defaultSettings: Settings = {
  theme: 'light',
  currency: 'USD',
  bwsUrl: import.meta.env.VITE_BWS_URL || 'http://localhost:3232',
  hideBalance: false
};

export const defaultProfile = (): Profile => ({ keys: [], wallets: [], addressBook: [] });

export function loadProfile(): Profile {
  try {
    return { ...defaultProfile(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: Profile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function loadSettings(): Settings {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
