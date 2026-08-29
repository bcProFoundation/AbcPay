import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { CreateTxProposalRequest } from '@bcpros/abcpay-models';
import { chainFromCoin } from '@bcpros/abcpay-wallet-core';
import { broadcastTx } from '@bcpros/abcpay-wallet-core';
import { db } from '../db';
import { txProposals, wallets } from '../db/schema';
import { config } from '../config';

function generateId(): string {
  return randomBytes(16).toString('hex');
}

export class TxProposalService {
  async createProposal(walletId: string, copayerId: string, req: CreateTxProposalRequest) {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.walletId, walletId)).limit(1);
    if (!wallet) throw new Error('Wallet not found');

    const proposal = req.proposals[0];
    if (!proposal) throw new Error('No proposal provided');

    const amount = proposal.outputs.reduce((sum, o) => sum + o.amount, 0);
    const proposalId = generateId();

    const [created] = await db
      .insert(txProposals)
      .values({
        proposalId,
        walletId,
        creatorId: copayerId,
        coin: wallet.coin,
        chain: wallet.chain,
        network: wallet.network,
        outputs: proposal.outputs,
        amount,
        fee: 0,
        feePerKb: proposal.feePerKb ?? 1000,
        message: proposal.message,
        status: 'pending',
        signatures: {},
        actions: []
      })
      .returning();

    return this.toResponse(created, wallet.m);
  }

  async getProposals(walletId: string) {
    const rows = await db.select().from(txProposals).where(eq(txProposals.walletId, walletId));
    const [wallet] = await db.select().from(wallets).where(eq(wallets.walletId, walletId)).limit(1);
    return rows.map(r => this.toResponse(r, wallet?.m ?? 1));
  }

  async getProposal(proposalId: string) {
    const [proposal] = await db.select().from(txProposals).where(eq(txProposals.proposalId, proposalId)).limit(1);
    if (!proposal) return null;

    const [wallet] = await db.select().from(wallets).where(eq(wallets.walletId, proposal.walletId)).limit(1);
    return this.toResponse(proposal, wallet?.m ?? 1);
  }

  async signProposal(proposalId: string, copayerId: string, signatures: string) {
    const [proposal] = await db.select().from(txProposals).where(eq(txProposals.proposalId, proposalId)).limit(1);
    if (!proposal) throw new Error('Proposal not found');

    const sigs = (proposal.signatures as Record<string, string>) ?? {};
    sigs[copayerId] = signatures;

    const actions = [
      ...((proposal.actions as Array<Record<string, unknown>>) ?? []),
      {
        type: 'accept',
        copayerId,
        copayerName: copayerId,
        createdOn: Date.now()
      }
    ];

    const [wallet] = await db.select().from(wallets).where(eq(wallets.walletId, proposal.walletId)).limit(1);
    const sigCount = Object.keys(sigs).length;
    const status = sigCount >= (wallet?.m ?? 1) ? 'accepted' : 'pending';

    const [updated] = await db
      .update(txProposals)
      .set({ signatures: sigs, actions, status, updatedAt: new Date() })
      .where(eq(txProposals.proposalId, proposalId))
      .returning();

    return this.toResponse(updated, wallet?.m ?? 1);
  }

  async rejectProposal(proposalId: string, copayerId: string, comment?: string) {
    const [proposal] = await db.select().from(txProposals).where(eq(txProposals.proposalId, proposalId)).limit(1);
    if (!proposal) throw new Error('Proposal not found');

    const actions = [
      ...((proposal.actions as Array<Record<string, unknown>>) ?? []),
      {
        type: 'reject',
        copayerId,
        copayerName: copayerId,
        comment,
        createdOn: Date.now()
      }
    ];

    const [updated] = await db
      .update(txProposals)
      .set({ actions, status: 'rejected', updatedAt: new Date() })
      .where(eq(txProposals.proposalId, proposalId))
      .returning();

    const [wallet] = await db.select().from(wallets).where(eq(wallets.walletId, proposal.walletId)).limit(1);
    return this.toResponse(updated, wallet?.m ?? 1);
  }

  async broadcastProposal(proposalId: string, raw: string) {
    const [proposal] = await db.select().from(txProposals).where(eq(txProposals.proposalId, proposalId)).limit(1);
    if (!proposal) throw new Error('Proposal not found');

    const chain = chainFromCoin(proposal.coin as 'xec' | 'doge');
    const txid = await broadcastTx(chain, raw, {
      xecUrls: config.chronik.xecUrls,
      dogeUrls: config.chronik.dogeUrls
    });

    const [updated] = await db
      .update(txProposals)
      .set({ raw, txid, status: 'broadcasted', updatedAt: new Date() })
      .where(eq(txProposals.proposalId, proposalId))
      .returning();

    const [wallet] = await db.select().from(wallets).where(eq(wallets.walletId, proposal.walletId)).limit(1);
    return this.toResponse(updated, wallet?.m ?? 1);
  }

  async broadcastRaw(coin: 'xec' | 'doge', raw: string) {
    const chain = chainFromCoin(coin);
    const txid = await broadcastTx(chain, raw, {
      xecUrls: config.chronik.xecUrls,
      dogeUrls: config.chronik.dogeUrls
    });
    return { txid };
  }

  private toResponse(proposal: typeof txProposals.$inferSelect, requiredM: number) {
    const sigs = (proposal.signatures as Record<string, string>) ?? {};
    return {
      id: proposal.proposalId,
      walletId: proposal.walletId,
      creatorId: proposal.creatorId,
      coin: proposal.coin,
      chain: proposal.chain,
      network: proposal.network,
      outputs: proposal.outputs,
      amount: proposal.amount,
      fee: proposal.fee,
      feePerKb: proposal.feePerKb,
      message: proposal.message ?? undefined,
      changeAddress: proposal.changeAddress ?? undefined,
      requiredSignatures: requiredM,
      requiredRejections: 1,
      status: proposal.status,
      createdOn: proposal.createdAt.getTime(),
      updatedOn: proposal.updatedAt.getTime(),
      txid: proposal.txid ?? undefined,
      raw: proposal.raw ?? undefined,
      actions: (proposal.actions as Array<Record<string, unknown>>) ?? [],
      signatures: sigs
    };
  }
}

export const txProposalService = new TxProposalService();
