import { describe, expect, it } from 'vitest';
import { accountFromMnemonic, accountPath, deriveAddress, generateMnemonic, formatAmount } from './crypto';

describe('wallet crypto', () => {
  it('derives matching xec receive addresses for the same mnemonic', () => {
    const mnemonic = generateMnemonic();
    const a = accountFromMnemonic(mnemonic, 'xec', 1);
    const b = accountFromMnemonic(mnemonic, 'xec', 1);
    expect(a.xpub).toBe(b.xpub);
    const addr = deriveAddress({
      coin: 'xec',
      network: 'livenet',
      m: 1,
      n: 1,
      xpubs: [a.xpub],
      path: 'm/0/0'
    });
    expect(addr.startsWith('ecash:')).toBe(true);
  });

  it('uses BIP48 for shared doge wallets', () => {
    expect(accountPath('doge', 2)).toBe("m/48'/3'/0'");
  });

  it('formats units', () => {
    expect(formatAmount(250, 'xec')).toBe('2.50');
  });
});
