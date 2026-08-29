import * as BitcoreXec from '@bcpros/bitcore-lib-xec';
import * as BitcoreDoge from '@bcpros/bitcore-lib-doge';
import * as bip39 from 'bip39';

export type Coin = 'xec' | 'doge';
export type Network = 'livenet' | 'testnet';

export const COINS = {
  xec: {
    name: 'eCash',
    ticker: 'XEC',
    coinType: 1899,
    decimals: 2,
    unitToSat: 100,
    color: '#0080ca',
    icon: '/assets/img/currencies/xec.svg'
  },
  doge: {
    name: 'Dogecoin',
    ticker: 'DOGE',
    coinType: 3,
    decimals: 8,
    unitToSat: 1e8,
    color: '#ba9f33',
    icon: '/assets/img/currencies/doge.svg'
  }
} as const;

export function getLib(coin: Coin) {
  return coin === 'xec' ? BitcoreXec : BitcoreDoge;
}

function ensureXecNetworks() {
  const Networks = BitcoreXec.Networks;
  if (Networks.get('ecash')) return;
  Networks.add({
    name: 'ecash',
    alias: 'xec',
    prefix: 'ecash',
    pubkeyhash: 28,
    privatekey: 0x80,
    scripthash: 40,
    xpubkey: 0x0488b21e,
    xprivkey: 0x0488ade4
  });
  Networks.add({
    name: 'ectest',
    alias: 'xectest',
    prefix: 'ectest',
    pubkeyhash: 0x6f,
    privatekey: 0xef,
    scripthash: 0xc4,
    xpubkey: 0x043587cf,
    xprivkey: 0x04358394
  });
}

ensureXecNetworks();

export function libNetwork(coin: Coin, network: Network): string {
  if (coin !== 'xec') return network;
  return network === 'testnet' ? 'ectest' : 'ecash';
}

export function accountPath(coin: Coin, n: number, account = 0) {
  const purpose = n > 1 ? 48 : 44;
  return `m/${purpose}'/${COINS[coin].coinType}'/${account}'`;
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic();
}

export function accountFromMnemonic(mnemonic: string, coin: Coin, n = 1) {
  const bitcore = getLib(coin);
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const hd = bitcore.HDPrivateKey.fromSeed(seed);
  const account = hd.deriveChild(accountPath(coin, n));
  return {
    xpriv: account.toString(),
    xpub: account.hdPublicKey.toString()
  };
}

export function deriveRequestKey(accountXpriv: string, coin: Coin) {
  const bitcore = getLib(coin);
  const hd = new bitcore.HDPrivateKey(accountXpriv);
  const derived = hd.deriveChild("m/1'/0");
  return {
    privKey: derived.privateKey.toString(),
    pubKey: derived.publicKey.toString()
  };
}

export function createWalletPrivKey(coin: Coin) {
  const bitcore = getLib(coin);
  const priv = new bitcore.PrivateKey();
  return { privKey: priv.toString(), pubKey: priv.toPublicKey().toString() };
}

export function hashMessage(text: string) {
  const buf = Buffer.from(text);
  let hash = BitcoreXec.crypto.Hash.sha256sha256(buf);
  hash = new BitcoreXec.encoding.BufferReader(hash).readReverse();
  return hash;
}

export function signMessage(message: string, privKey: string) {
  const priv = new BitcoreXec.PrivateKey(privKey);
  const hash = hashMessage(message);
  return BitcoreXec.crypto.ECDSA.sign(hash, priv, { endian: 'little' }).toString();
}

export function verifyMessage(message: string, signature: string, pubKey: string) {
  try {
    const pub = new BitcoreXec.PublicKey(pubKey);
    const hash = hashMessage(message);
    const sig = new BitcoreXec.crypto.Signature.fromString(signature);
    return BitcoreXec.crypto.ECDSA.verify(hash, sig, pub, { endian: 'little' });
  } catch {
    return false;
  }
}

export function requestAuthMessage(method: string, url: string, body: unknown) {
  return `${method.toLowerCase()}|${url}|${JSON.stringify(body ?? {})}`;
}

export function getCopayerHash(name: string, xPubKey: string, requestPubKey: string) {
  return [name, xPubKey, requestPubKey].join('|');
}

export function copayerId(coin: Coin, xPubKey: string) {
  return BitcoreXec.crypto.Hash.sha256(Buffer.from(coin + xPubKey)).toString('hex');
}

export function encodeSecret(payload: object) {
  return BitcoreXec.encoding.Base58.encode(Buffer.from(JSON.stringify(payload), 'utf8'));
}

export function decodeSecret(secret: string) {
  return JSON.parse(Buffer.from(BitcoreXec.encoding.Base58.decode(secret)).toString('utf8'));
}

export function formatAmount(sats: number, coin: Coin) {
  const { unitToSat, decimals } = COINS[coin];
  return (sats / unitToSat).toFixed(decimals);
}

export function parseAmount(value: string, coin: Coin) {
  const { unitToSat } = COINS[coin];
  return Math.round(Number(value) * unitToSat);
}

export function deriveAddress(opts: {
  coin: Coin;
  network: Network;
  m: number;
  n: number;
  xpubs: string[];
  path: string;
}) {
  const bitcore = getLib(opts.coin);
  const net = libNetwork(opts.coin, opts.network);
  const publicKeys = opts.xpubs.map(xpub => new bitcore.HDPublicKey(xpub).deriveChild(opts.path).publicKey);
  const address =
    opts.n === 1
      ? bitcore.Address.fromPublicKey(publicKeys[0], net)
      : bitcore.Address.createMultisig(publicKeys, opts.m, net);
  return opts.coin === 'xec' ? address.toCashAddress() : address.toString();
}

export function signInputs(
  coin: Coin,
  raw: string,
  inputs: Array<{ path: string; redeemScript?: string; txid?: string; vout?: number; satoshis?: number; address?: string; publicKeys?: string[]; scriptPubKey?: string }>,
  accountXpriv: string,
  build?: {
    toAddress: string;
    amount: number;
    changeAddress?: string | null;
    change: number;
    fee: number;
    m: number;
    network: Network;
  }
) {
  const bitcore = getLib(coin);
  const hd = new bitcore.HDPrivateKey(accountXpriv);
  const sighash =
    bitcore.crypto.Signature.SIGHASH_ALL | (coin === 'xec' ? bitcore.crypto.Signature.SIGHASH_FORKID : 0);

  let tx;
  if (build) {
    tx = new bitcore.Transaction();
    for (const input of inputs) {
      const utxo = {
        txId: input.txid,
        outputIndex: input.vout,
        satoshis: input.satoshis,
        address: input.address
      };
      if (input.publicKeys && input.publicKeys.length > 1) {
        tx.from(
          utxo,
          input.publicKeys.map((hex: string) => new bitcore.PublicKey(hex)),
          build.m
        );
      } else {
        tx.from(utxo);
      }
    }
    tx.to(build.toAddress, build.amount);
    if (build.change > 0 && build.changeAddress) tx.change(build.changeAddress);
    tx.fee(build.fee);
  } else {
    tx = new bitcore.Transaction(raw);
  }

  return inputs.map((input, index) => {
    const priv = hd.deriveChild(input.path).privateKey;
    try {
      const found = tx.getSignatures(priv, sighash).find((s: { inputIndex: number }) => s.inputIndex === index);
      if (found) return found.signature.toString();
    } catch {
      // continue
    }
    const subscript = input.redeemScript ? new bitcore.Script(input.redeemScript) : tx.inputs[index].output.script;
    const hashbuf = tx.inputs[index].getSighash(tx, sighash, index, subscript);
    return bitcore.crypto.ECDSA.sign(hashbuf, priv, 'little').set({ nhashtype: sighash }).toString();
  });
}

export function proposalBuildOpts(proposal: {
  toAddress: string;
  amount: string | number;
  changeAddress?: string | null;
  outputs?: Array<{ amount: number }>;
  fee: string | number;
  inputs: unknown[];
}) {
  return {
    toAddress: proposal.toAddress,
    amount: Number(proposal.amount),
    changeAddress: proposal.changeAddress,
    change: Number(proposal.outputs?.[1]?.amount || 0),
    fee: Number(proposal.fee),
    m: 1,
    network: 'livenet' as Network
  };
}

export function applyAndSerialize(coin: Coin, raw: string) {
  const bitcore = getLib(coin);
  return new bitcore.Transaction(raw).uncheckedSerialize();
}

export function validateAddress(coin: Coin, network: Network, address: string) {
  const net = libNetwork(coin, network);
  return getLib(coin).Address.isValid(address, net) || getLib(coin).Address.isValid(address, network);
}
