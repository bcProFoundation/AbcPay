import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: varchar('wallet_id', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  m: integer('m').notNull(),
  n: integer('n').notNull(),
  coin: varchar('coin', { length: 10 }).notNull(),
  chain: varchar('chain', { length: 10 }).notNull(),
  network: varchar('network', { length: 20 }).notNull().default('livenet'),
  addressType: varchar('address_type', { length: 10 }).notNull().default('P2SH'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  pubKey: text('pub_key').notNull(),
  publicKeyRing: jsonb('public_key_ring').notNull().default([]),
  singleAddress: boolean('single_address').default(false),
  nativeCashAddr: boolean('native_cash_addr').default(true),
  usePurpose48: boolean('use_purpose48').default(false),
  addressIndex: integer('address_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const copayers = pgTable('copayers', {
  id: uuid('id').primaryKey().defaultRandom(),
  copayerId: varchar('copayer_id', { length: 64 }).notNull().unique(),
  walletId: varchar('wallet_id', { length: 64 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  xPubKey: text('x_pub_key').notNull(),
  requestPubKey: text('request_pub_key').notNull(),
  signature: text('signature'),
  customData: text('custom_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: varchar('wallet_id', { length: 64 }).notNull(),
  address: varchar('address', { length: 128 }).notNull(),
  path: varchar('path', { length: 64 }).notNull(),
  publicKeys: jsonb('public_keys').notNull().default([]),
  coin: varchar('coin', { length: 10 }).notNull(),
  network: varchar('network', { length: 20 }).notNull(),
  type: varchar('type', { length: 10 }).notNull(),
  isChange: boolean('is_change').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const txProposals = pgTable('tx_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: varchar('proposal_id', { length: 64 }).notNull().unique(),
  walletId: varchar('wallet_id', { length: 64 }).notNull(),
  creatorId: varchar('creator_id', { length: 64 }).notNull(),
  coin: varchar('coin', { length: 10 }).notNull(),
  chain: varchar('chain', { length: 10 }).notNull(),
  network: varchar('network', { length: 20 }).notNull(),
  outputs: jsonb('outputs').notNull(),
  amount: integer('amount').notNull(),
  fee: integer('fee').notNull().default(0),
  feePerKb: integer('fee_per_kb').notNull(),
  message: text('message'),
  changeAddress: jsonb('change_address'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  raw: text('raw'),
  txid: varchar('txid', { length: 128 }),
  signatures: jsonb('signatures').default({}),
  actions: jsonb('actions').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const fiatRates = pgTable('fiat_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  coin: varchar('coin', { length: 10 }).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
  rate: varchar('rate', { length: 32 }).notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull()
});

export const copayerLookup = pgTable('copayer_lookup', {
  id: uuid('id').primaryKey().defaultRandom(),
  copayerId: varchar('copayer_id', { length: 64 }).notNull().unique(),
  walletId: varchar('wallet_id', { length: 64 }).notNull()
});
