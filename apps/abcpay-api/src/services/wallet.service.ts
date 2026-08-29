import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { CreateWalletRequest, JoinWalletRequest, SupportedCoin } from '@bcpros/abcpay-models';
import { isSupportedCoin } from '@bcpros/abcpay-models';
import { chainFromCoin, getBalanceForAddress, getUtxosForAddress } from '@bcpros/abcpay-wallet-core';
import { db } from '../db';
import { addresses, copayerLookup, copayers, wallets } from '../db/schema';
import { config } from '../config';

function generateId(): string {
  return randomBytes(16).toString('hex');
}

export class WalletService {
  async createWallet(req: CreateWalletRequest) {
    if (!isSupportedCoin(req.coin)) {
      throw new Error('Unsupported coin');
    }

    if (req.n > 1 && req.m > req.n) {
      throw new Error('Invalid m-of-n configuration');
    }

    const walletId = generateId();
    const chain = req.chain ?? chainFromCoin(req.coin);

    const [wallet] = await db
      .insert(wallets)
      .values({
        walletId,
        name: req.name,
        m: req.m,
        n: req.n,
        coin: req.coin,
        chain,
        network: req.network,
        addressType: req.addressType,
        status: req.n === 1 ? 'complete' : 'pending',
        pubKey: req.pubKey,
        publicKeyRing: [],
        singleAddress: req.singleAddress ?? false,
        nativeCashAddr: req.nativeCashAddr ?? true,
        usePurpose48: req.usePurpose48 ?? req.n > 1
      })
      .returning();

    return this.toWalletResponse(wallet, []);
  }

  async joinWallet(req: JoinWalletRequest) {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.walletId, req.walletId)).limit(1);

    if (!wallet) throw new Error('Wallet not found');
    if (wallet.coin !== req.coin) throw new Error('Coin mismatch');

    const existingCopayers = await db.select().from(copayers).where(eq(copayers.walletId, req.walletId));

    if (existingCopayers.length >= wallet.n) {
      throw new Error('Wallet is full');
    }

    const copayerId = generateId();

    await db.insert(copayers).values({
      copayerId,
      walletId: req.walletId,
      name: req.name,
      xPubKey: req.xPubKey,
      requestPubKey: req.requestPubKey,
      signature: req.copayerSignature,
      customData: req.customData
    });

    await db.insert(copayerLookup).values({ copayerId, walletId: req.walletId });

    const updatedCopayers = await db.select().from(copayers).where(eq(copayers.walletId, req.walletId));

    const publicKeyRing = updatedCopayers.map(c => ({
      xPubKey: c.xPubKey,
      requestPubKey: c.requestPubKey
    }));

    const status = updatedCopayers.length >= wallet.n ? 'complete' : 'pending';

    await db
      .update(wallets)
      .set({ publicKeyRing, status, updatedAt: new Date() })
      .where(eq(wallets.walletId, req.walletId));

    const [updated] = await db.select().from(wallets).where(eq(wallets.walletId, req.walletId)).limit(1);

    return this.toWalletResponse(updated, updatedCopayers);
  }

  async getWallet(walletId: string) {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.walletId, walletId)).limit(1);
    if (!wallet) return null;

    const walletCopayers = await db.select().from(copayers).where(eq(copayers.walletId, walletId));
    return this.toWalletResponse(wallet, walletCopayers);
  }

  async registerAddress(
    walletId: string,
    address: string,
    path: string,
    publicKeys: string[],
    isChange: boolean
  ) {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.walletId, walletId)).limit(1);
    if (!wallet) throw new Error('Wallet not found');

    const [existing] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.walletId, walletId), eq(addresses.address, address)))
      .limit(1);

    if (existing) return existing;

    const [addr] = await db
      .insert(addresses)
      .values({
        walletId,
        address,
        path,
        publicKeys,
        coin: wallet.coin,
        network: wallet.network,
        type: wallet.addressType,
        isChange
      })
      .returning();

    return addr;
  }

  async getWalletAddresses(walletId: string) {
    return db.select().from(addresses).where(eq(addresses.walletId, walletId));
  }

  async getBalance(walletId: string) {
    const walletAddresses = await this.getWalletAddresses(walletId);
    const chain = chainFromCoin(walletAddresses[0]?.coin as SupportedCoin ?? 'xec');

    let total = 0;
    const byAddress: Record<string, number> = {};

    for (const addr of walletAddresses) {
      const balance = await getBalanceForAddress(chain, addr.address, {
        xecUrls: config.chronik.xecUrls,
        dogeUrls: config.chronik.dogeUrls
      });
      byAddress[addr.address] = balance;
      total += balance;
    }

    return {
      totalAmount: total,
      lockedAmount: 0,
      availableAmount: total,
      totalConfirmedAmount: total,
      lockedConfirmedAmount: 0,
      availableConfirmedAmount: total,
      byAddress
    };
  }

  async getUtxos(walletId: string) {
    const walletAddresses = await this.getWalletAddresses(walletId);
    if (walletAddresses.length === 0) return [];

    const chain = chainFromCoin(walletAddresses[0].coin as SupportedCoin);
    const allUtxos = [];

    for (const addr of walletAddresses) {
      const utxos = await getUtxosForAddress(chain, addr.address, {
        xecUrls: config.chronik.xecUrls,
        dogeUrls: config.chronik.dogeUrls
      });

      for (const utxo of utxos) {
        allUtxos.push({
          ...utxo,
          vout: utxo.vout,
          amount: utxo.satoshis,
          path: addr.path,
          locked: false
        });
      }
    }

    return allUtxos;
  }

  private toWalletResponse(wallet: typeof wallets.$inferSelect, walletCopayers: (typeof copayers.$inferSelect)[]) {
    return {
      id: wallet.walletId,
      name: wallet.name,
      m: wallet.m,
      n: wallet.n,
      version: '1.0.0',
      createdOn: wallet.createdAt.getTime(),
      coin: wallet.coin,
      chain: wallet.chain,
      network: wallet.network,
      addressType: wallet.addressType,
      status: wallet.status,
      publicKeyRing: wallet.publicKeyRing as Array<{ xPubKey: string; requestPubKey: string }>,
      copayers: walletCopayers.map(c => ({
        id: c.copayerId,
        name: c.name,
        xPubKey: c.xPubKey,
        requestPubKey: c.requestPubKey,
        signature: c.signature ?? undefined,
        customData: c.customData ?? undefined
      })),
      singleAddress: wallet.singleAddress ?? false,
      nativeCashAddr: wallet.nativeCashAddr ?? true,
      usePurpose48: wallet.usePurpose48 ?? false
    };
  }
}

export const walletService = new WalletService();
