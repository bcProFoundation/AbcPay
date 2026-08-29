# AbcPay

Rebuilt AbcPay wallet for **eCash (XEC)** and **Dogecoin (DOGE)**.

- Ionic React (same visual language as the previous AbcPay app: Home / Scan / Wallets)
- Personal and **m-of-n multisig** accounts
- Keys stay on the device; the wallet service never sees private keys
- Chronik-backed BWS in the Bitcore repo (`packages/abcpay-wallet-service`)
- BTC, BCH, LTC, XPI, ETH, BitPay buy/exchange/gift-card extras are gone

## Stack

| Layer | Choice |
| ----- | ------ |
| UI | Ionic React + Vite |
| Client crypto | `@bcpros/bitcore-lib-xec` / `@bcpros/bitcore-lib-doge` |
| Wallet service | TypeScript Fastify + Postgres |
| Chain data | Chronik |

React was chosen to stay aligned with Atisha Health. Node.js (not Bun) is used on the server because the Bitcore libraries expect Node `Buffer` / crypto.

## Run

```sh
# Wallet service (from bitcore/packages/abcpay-wallet-service)
docker compose up -d postgres
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev

# App
cp .env.example .env
pnpm install
pnpm dev
```

Open `http://localhost:8100`.

`VITE_BWS_URL` defaults to `http://localhost:3232`.

## What this replica keeps

- Home total value, account cards, pull to refresh
- Wallets tab with key name and accounts
- Request (QR + BIP44/48 address) and Send
- Shared wallet create / join via invitation secret
- Pending proposal sign / reject
- Address book, theme, display currency, backup phrase
- Copay request signing (`x-identity` / `x-signature`)

## What was dropped

Buy crypto, Coinbase, WalletConnect, gift cards, debit cards, Lotus/XPI, BTC/BCH/LTC, eToken conversion, merchant/Raipay, BitPay ID.

## Security model

1. BIP39 mnemonic on device
2. Account xpub registered with BWS
3. Receive addresses derived locally and checked against the server
4. Spends are transaction proposals; `m` copayer signatures required before Chronik broadcast
