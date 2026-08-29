import { z } from 'zod';
import { addressTypeSchema, networkSchema, supportedChains, supportedCoins } from './coins';

export const publicKeyRingEntrySchema = z.object({
  xPubKey: z.string(),
  requestPubKey: z.string()
});

export const copayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  xPubKey: z.string(),
  requestPubKey: z.string(),
  signature: z.string().optional(),
  customData: z.string().optional()
});

export const walletStatusSchema = z.enum(['pending', 'complete', 'deleted']);
export type WalletStatus = z.infer<typeof walletStatusSchema>;

export const walletResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  m: z.number(),
  n: z.number(),
  version: z.string(),
  createdOn: z.number(),
  coin: z.enum(supportedCoins),
  chain: z.enum(supportedChains),
  network: networkSchema,
  addressType: addressTypeSchema,
  status: walletStatusSchema,
  publicKeyRing: z.array(publicKeyRingEntrySchema),
  copayers: z.array(copayerSchema),
  singleAddress: z.boolean().optional(),
  nativeCashAddr: z.boolean().optional(),
  usePurpose48: z.boolean().optional()
});

export type WalletResponse = z.infer<typeof walletResponseSchema>;

export const createWalletRequestSchema = z.object({
  name: z.string().min(1).max(100),
  m: z.number().int().min(1),
  n: z.number().int().min(1),
  coin: z.enum(supportedCoins),
  chain: z.enum(supportedChains).optional(),
  network: networkSchema.default('livenet'),
  addressType: addressTypeSchema.default('P2SH'),
  pubKey: z.string(),
  singleAddress: z.boolean().optional(),
  nativeCashAddr: z.boolean().optional(),
  usePurpose48: z.boolean().optional()
});

export type CreateWalletRequest = z.infer<typeof createWalletRequestSchema>;

export const joinWalletRequestSchema = z.object({
  walletId: z.string(),
  coin: z.enum(supportedCoins),
  name: z.string().min(1).max(100),
  xPubKey: z.string(),
  requestPubKey: z.string(),
  customData: z.string().optional(),
  copayerSignature: z.string().optional()
});

export type JoinWalletRequest = z.infer<typeof joinWalletRequestSchema>;

export const addressResponseSchema = z.object({
  version: z.string(),
  createdOn: z.number(),
  address: z.string(),
  path: z.string(),
  publicKeys: z.array(z.string()),
  coin: z.enum(supportedCoins),
  network: networkSchema,
  type: addressTypeSchema,
  isChange: z.boolean()
});

export type AddressResponse = z.infer<typeof addressResponseSchema>;

export const balanceResponseSchema = z.object({
  totalAmount: z.number(),
  lockedAmount: z.number(),
  availableAmount: z.number(),
  totalConfirmedAmount: z.number(),
  lockedConfirmedAmount: z.number(),
  availableConfirmedAmount: z.number(),
  byAddress: z.record(z.string(), z.number()).optional()
});

export type BalanceResponse = z.infer<typeof balanceResponseSchema>;

export const utxoSchema = z.object({
  txid: z.string(),
  vout: z.number(),
  satoshis: z.number(),
  amount: z.number(),
  address: z.string(),
  scriptPubKey: z.string().optional(),
  confirmations: z.number().optional(),
  locked: z.boolean().optional(),
  path: z.string().optional()
});

export type Utxo = z.infer<typeof utxoSchema>;

export const txHistoryItemSchema = z.object({
  txid: z.string(),
  action: z.enum(['received', 'sent', 'moved']),
  amount: z.number(),
  fees: z.number().optional(),
  time: z.number(),
  confirmations: z.number(),
  blockheight: z.number().optional(),
  address: z.string().optional(),
  message: z.string().optional(),
  feePerKb: z.number().optional(),
  createdOn: z.number().optional(),
  outputs: z
    .array(
      z.object({
        address: z.string(),
        amount: z.number()
      })
    )
    .optional()
});

export type TxHistoryItem = z.infer<typeof txHistoryItemSchema>;

export const txProposalStatusSchema = z.enum([
  'temporary',
  'pending',
  'accepted',
  'rejected',
  'broadcasted'
]);

export const txProposalSchema = z.object({
  id: z.string(),
  walletId: z.string(),
  creatorId: z.string(),
  coin: z.enum(supportedCoins),
  chain: z.enum(supportedChains),
  network: networkSchema,
  outputs: z.array(
    z.object({
      toAddress: z.string(),
      amount: z.number(),
      message: z.string().optional()
    })
  ),
  amount: z.number(),
  fee: z.number(),
  feePerKb: z.number(),
  excludeUnconfirmedUtxos: z.boolean().optional(),
  message: z.string().optional(),
  payProUrl: z.string().optional(),
  changeAddress: z.object({ address: z.string(), path: z.string() }).optional(),
  requiredSignatures: z.number(),
  requiredRejections: z.number(),
  status: txProposalStatusSchema,
  createdOn: z.number(),
  updatedOn: z.number(),
  txid: z.string().optional(),
  raw: z.string().optional(),
  actions: z.array(
    z.object({
      type: z.enum(['accept', 'reject']),
      copayerId: z.string(),
      copayerName: z.string(),
      comment: z.string().optional(),
      createdOn: z.number()
    })
  ),
  signatures: z.record(z.string(), z.string()).optional()
});

export type TxProposal = z.infer<typeof txProposalSchema>;

export const createTxProposalRequestSchema = z.object({
  proposalSignature: z.string().optional(),
  proposals: z.array(
    z.object({
      outputs: z.array(
        z.object({
          toAddress: z.string(),
          amount: z.number(),
          message: z.string().optional()
        })
      ),
      feePerKb: z.number().optional(),
      excludeUnconfirmedUtxos: z.boolean().optional(),
      message: z.string().optional(),
      payProUrl: z.string().optional()
    })
  )
});

export type CreateTxProposalRequest = z.infer<typeof createTxProposalRequestSchema>;

export const feeLevelSchema = z.object({
  level: z.enum(['urgent', 'priority', 'normal', 'economy', 'superEconomy']),
  feePerKb: z.number(),
  nbBlocks: z.number()
});

export type FeeLevel = z.infer<typeof feeLevelSchema>;

export const fiatRateSchema = z.object({
  rate: z.number(),
  fetchedOn: z.number()
});

export type FiatRate = z.infer<typeof fiatRateSchema>;
