import { ChronikClient } from 'chronik-client';
import type { SupportedChain, SupportedCoin } from '@bcpros/abcpay-models';

export interface ChronikConfig {
  xecUrls: string[];
  dogeUrls: string[];
}

const DEFAULT_CONFIG: ChronikConfig = {
  xecUrls: ['https://chronik.e.cash', 'https://chronik.pay2stay.com/xec'],
  dogeUrls: ['https://chronik.dogecoin.com']
};

const clients = new Map<SupportedChain, ChronikClient>();

export function getChronikClient(chain: SupportedChain, config: ChronikConfig = DEFAULT_CONFIG): ChronikClient {
  const existing = clients.get(chain);
  if (existing) return existing;

  const urls = chain === 'XEC' ? config.xecUrls : config.dogeUrls;
  const client = new ChronikClient(urls);
  clients.set(chain, client);
  return client;
}

export function chainFromCoin(coin: SupportedCoin): SupportedChain {
  return coin === 'xec' ? 'XEC' : 'DOGE';
}

export interface ScriptUtxo {
  txid: string;
  vout: number;
  satoshis: number;
  address: string;
  confirmations: number;
}

export async function getUtxosForAddress(
  chain: SupportedChain,
  address: string,
  config?: ChronikConfig
): Promise<ScriptUtxo[]> {
  const chronik = getChronikClient(chain, config);
  const script = chronik.address(address);
  const utxos = await script.utxos();

  return utxos.utxos.map(utxo => ({
    txid: utxo.outpoint.txid,
    vout: utxo.outpoint.outIdx,
    satoshis: Number(utxo.sats),
    address,
    confirmations: utxo.blockHeight > 0 ? 1 : 0
  }));
}

export async function getBalanceForAddress(
  chain: SupportedChain,
  address: string,
  config?: ChronikConfig
): Promise<number> {
  const utxos = await getUtxosForAddress(chain, address, config);
  return utxos.reduce((sum, u) => sum + u.satoshis, 0);
}

export async function broadcastTx(chain: SupportedChain, rawTxHex: string, config?: ChronikConfig): Promise<string> {
  const chronik = getChronikClient(chain, config);
  const result = await chronik.broadcastTx(rawTxHex);
  return result.txid;
}

export interface TxHistoryEntry {
  txid: string;
  time: number;
  confirmations: number;
  blockheight?: number;
  amount: number;
  fees: number;
}

export async function getTxHistoryForAddress(
  chain: SupportedChain,
  address: string,
  config?: ChronikConfig
): Promise<TxHistoryEntry[]> {
  const chronik = getChronikClient(chain, config);
  const script = chronik.address(address);
  const history = await script.history(0, 50);

  return history.txs.map(tx => ({
    txid: tx.txid,
    time: tx.block?.timestamp ? Number(tx.block.timestamp) : tx.timeFirstSeen || Date.now(),
    confirmations: tx.block ? 1 : 0,
    blockheight: tx.block?.height,
    amount: 0,
    fees: 0
  }));
}

export async function getFeeEstimate(chain: SupportedChain, config?: ChronikConfig): Promise<number> {
  // Chronik doesn't expose fee estimation directly; use conservative defaults per chain
  if (chain === 'XEC') return 2.0;
  return 100_000; // DOGE: 1 DOGE/kB default
}
