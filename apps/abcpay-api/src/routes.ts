import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createWalletRequestSchema, joinWalletRequestSchema, createTxProposalRequestSchema } from '@bcpros/abcpay-models';
import { getFeeEstimate, chainFromCoin } from '@bcpros/abcpay-wallet-core';
import { walletService } from './services/wallet.service';
import { txProposalService } from './services/tx-proposal.service';
import { config } from './config';

export function createApp() {
  const app = new Hono().basePath(config.basePath);

  app.use('*', cors());

  app.get('/health', c => c.json({ status: 'ok', version: '0.1.0' }));

  // Wallet creation (BWS-compatible)
  app.post('/v1/wallets/', async c => {
    try {
      const body = createWalletRequestSchema.parse(await c.req.json());
      const wallet = await walletService.createWallet(body);
      return c.json(wallet, 201);
    } catch (err) {
      return c.json({ code: 'BAD_REQUEST', message: (err as Error).message }, 400);
    }
  });

  app.post('/v2/wallets/', async c => {
    try {
      const body = createWalletRequestSchema.parse(await c.req.json());
      const wallet = await walletService.createWallet(body);
      return c.json(wallet, 201);
    } catch (err) {
      return c.json({ code: 'BAD_REQUEST', message: (err as Error).message }, 400);
    }
  });

  // Join wallet
  app.post('/v1/wallets/:id/copayers/', async c => {
    try {
      const walletId = c.req.param('id');
      const body = joinWalletRequestSchema.parse({ ...(await c.req.json()), walletId });
      const wallet = await walletService.joinWallet(body);
      return c.json(wallet);
    } catch (err) {
      return c.json({ code: 'BAD_REQUEST', message: (err as Error).message }, 400);
    }
  });

  // Get wallet
  app.get('/v1/wallets/', async c => {
    const walletId = c.req.header('x-wallet-id');
    if (!walletId) return c.json({ code: 'NOT_FOUND', message: 'Wallet not found' }, 404);
    const wallet = await walletService.getWallet(walletId);
    if (!wallet) return c.json({ code: 'NOT_FOUND', message: 'Wallet not found' }, 404);
    return c.json(wallet);
  });

  app.get('/v2/wallets/', async c => {
    const walletId = c.req.header('x-wallet-id');
    if (!walletId) return c.json({ code: 'NOT_FOUND', message: 'Wallet not found' }, 404);
    const wallet = await walletService.getWallet(walletId);
    if (!wallet) return c.json({ code: 'NOT_FOUND', message: 'Wallet not found' }, 404);
    return c.json(wallet);
  });

  app.get('/v3/wallets/', async c => {
    const walletId = c.req.header('x-wallet-id');
    if (!walletId) return c.json({ code: 'NOT_FOUND', message: 'Wallet not found' }, 404);
    const wallet = await walletService.getWallet(walletId);
    if (!wallet) return c.json({ code: 'NOT_FOUND', message: 'Wallet not found' }, 404);
    return c.json(wallet);
  });

  // Register address
  app.post('/v3/addresses/', async c => {
    try {
      const walletId = c.req.header('x-wallet-id');
      if (!walletId) return c.json({ code: 'NOT_FOUND', message: 'Wallet not found' }, 404);

      const body = await c.req.json();
      const addr = await walletService.registerAddress(
        walletId,
        body.address,
        body.path,
        body.publicKeys ?? [],
        body.isChange ?? false
      );

      return c.json({
        version: '1.0.0',
        createdOn: addr.createdAt.getTime(),
        address: addr.address,
        path: addr.path,
        publicKeys: addr.publicKeys,
        coin: addr.coin,
        network: addr.network,
        type: addr.type,
        isChange: addr.isChange
      });
    } catch (err) {
      return c.json({ code: 'BAD_REQUEST', message: (err as Error).message }, 400);
    }
  });

  // Balance
  app.get('/v1/balance/', async c => {
    const walletId = c.req.header('x-wallet-id');
    if (!walletId) return c.json({ code: 'NOT_FOUND', message: 'Wallet not found' }, 404);
    const balance = await walletService.getBalance(walletId);
    return c.json(balance);
  });

  // UTXOs
  app.get('/v1/utxos/', async c => {
    const walletId = c.req.header('x-wallet-id');
    if (!walletId) return c.json({ code: 'NOT_FOUND', message: 'Wallet not found' }, 404);
    const utxos = await walletService.getUtxos(walletId);
    return c.json(utxos);
  });

  // Tx history (placeholder - enriched from Chronik per address)
  app.get('/v1/txhistory/', async c => {
    return c.json([]);
  });

  // Tx proposals
  app.post('/v3/txproposals/', async c => {
    try {
      const walletId = c.req.header('x-wallet-id');
      const copayerId = c.req.header('x-copayer-id');
      if (!walletId || !copayerId) {
        return c.json({ code: 'BAD_REQUEST', message: 'Missing wallet or copayer id' }, 400);
      }

      const body = createTxProposalRequestSchema.parse(await c.req.json());
      const proposal = await txProposalService.createProposal(walletId, copayerId, body);
      return c.json(proposal, 201);
    } catch (err) {
      return c.json({ code: 'BAD_REQUEST', message: (err as Error).message }, 400);
    }
  });

  app.get('/v1/txproposals/', async c => {
    const walletId = c.req.header('x-wallet-id');
    if (!walletId) return c.json({ code: 'NOT_FOUND', message: 'Wallet not found' }, 404);
    const proposals = await txProposalService.getProposals(walletId);
    return c.json(proposals);
  });

  app.get('/v1/txproposals/:id/', async c => {
    const proposal = await txProposalService.getProposal(c.req.param('id'));
    if (!proposal) return c.json({ code: 'NOT_FOUND', message: 'Proposal not found' }, 404);
    return c.json(proposal);
  });

  app.post('/v1/txproposals/:id/signatures/', async c => {
    try {
      const copayerId = c.req.header('x-copayer-id');
      if (!copayerId) return c.json({ code: 'BAD_REQUEST', message: 'Missing copayer id' }, 400);

      const body = await c.req.json();
      const proposal = await txProposalService.signProposal(c.req.param('id'), copayerId, body.signatures);
      return c.json(proposal);
    } catch (err) {
      return c.json({ code: 'BAD_REQUEST', message: (err as Error).message }, 400);
    }
  });

  app.post('/v1/txproposals/:id/rejections/', async c => {
    try {
      const copayerId = c.req.header('x-copayer-id');
      if (!copayerId) return c.json({ code: 'BAD_REQUEST', message: 'Missing copayer id' }, 400);

      const body = await c.req.json();
      const proposal = await txProposalService.rejectProposal(c.req.param('id'), copayerId, body.reason);
      return c.json(proposal);
    } catch (err) {
      return c.json({ code: 'BAD_REQUEST', message: (err as Error).message }, 400);
    }
  });

  app.post('/v1/txproposals/:id/broadcast/', async c => {
    try {
      const body = await c.req.json();
      const proposal = await txProposalService.broadcastProposal(c.req.param('id'), body.raw);
      return c.json(proposal);
    } catch (err) {
      return c.json({ code: 'BAD_REQUEST', message: (err as Error).message }, 400);
    }
  });

  // Raw broadcast
  app.post('/v1/broadcast_raw/', async c => {
    try {
      const body = await c.req.json();
      const result = await txProposalService.broadcastRaw(body.coin ?? 'xec', body.raw);
      return c.json(result);
    } catch (err) {
      return c.json({ code: 'BAD_REQUEST', message: (err as Error).message }, 400);
    }
  });

  // Fee levels
  app.get('/v1/feelevels/', async c => {
    const coin = (c.req.query('coin') ?? 'xec') as 'xec' | 'doge';
    const chain = chainFromCoin(coin);
    const feePerKb = await getFeeEstimate(chain);

    return c.json([
      { level: 'urgent', feePerKb: feePerKb * 2, nbBlocks: 1 },
      { level: 'priority', feePerKb: feePerKb * 1.5, nbBlocks: 2 },
      { level: 'normal', feePerKb, nbBlocks: 3 },
      { level: 'economy', feePerKb: feePerKb * 0.75, nbBlocks: 6 },
      { level: 'superEconomy', feePerKb: feePerKb * 0.5, nbBlocks: 12 }
    ]);
  });

  // Fiat rates (placeholder - integrate CoinGecko later)
  app.get('/v3/fiatrates/:code/', async c => {
    const code = c.req.param('code');
    const rates: Record<string, number> = {
      xec: 0.00004,
      doge: 0.35
    };
    return c.json({
      rate: rates[code] ?? 0,
      fetchedOn: Date.now()
    });
  });

  return app;
}
