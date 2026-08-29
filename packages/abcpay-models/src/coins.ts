import { z } from 'zod';

export const supportedChains = ['XEC', 'DOGE'] as const;
export type SupportedChain = (typeof supportedChains)[number];

export const supportedCoins = ['xec', 'doge'] as const;
export type SupportedCoin = (typeof supportedCoins)[number];

export const networkSchema = z.enum(['livenet', 'testnet']);
export type Network = z.infer<typeof networkSchema>;

export const addressTypeSchema = z.enum(['P2PKH', 'P2SH', 'P2WSH']);
export type AddressType = z.infer<typeof addressTypeSchema>;

export const coinConfigSchema = z.object({
  name: z.string(),
  chain: z.enum(supportedChains),
  coin: z.enum(supportedCoins),
  unitName: z.string(),
  unitToSatoshi: z.number(),
  unitDecimals: z.number(),
  hasMultiSig: z.boolean(),
  protocolPrefix: z.object({
    livenet: z.string(),
    testnet: z.string()
  }),
  coinColor: z.string(),
  backgroundColor: z.string(),
  bip44CoinType: z.number()
});

export type CoinConfig = z.infer<typeof coinConfigSchema>;

export const COIN_CONFIGS: Record<SupportedCoin, CoinConfig> = {
  xec: {
    name: 'eCash',
    chain: 'XEC',
    coin: 'xec',
    unitName: 'XEC',
    unitToSatoshi: 100,
    unitDecimals: 2,
    hasMultiSig: true,
    protocolPrefix: { livenet: 'ecash', testnet: 'ectest' },
    coinColor: '#016cbf',
    backgroundColor: '#0080CA',
    bip44CoinType: 1899
  },
  doge: {
    name: 'Dogecoin',
    chain: 'DOGE',
    coin: 'doge',
    unitName: 'DOGE',
    unitToSatoshi: 100_000_000,
    unitDecimals: 8,
    hasMultiSig: true,
    protocolPrefix: { livenet: 'dogecoin', testnet: 'dogecoin' },
    coinColor: '#C2A633',
    backgroundColor: '#C2A633',
    bip44CoinType: 3
  }
};

export function isSupportedCoin(coin: string): coin is SupportedCoin {
  return (supportedCoins as readonly string[]).includes(coin);
}

export function isSupportedChain(chain: string): chain is SupportedChain {
  return (supportedChains as readonly string[]).includes(chain);
}
