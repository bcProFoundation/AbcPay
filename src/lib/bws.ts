import {
  Coin,
  Network,
  requestAuthMessage,
  signMessage
} from './crypto';

export interface BwsConfig {
  baseUrl: string;
}

export class BwsClient {
  constructor(
    private config: BwsConfig,
    private identity?: { copayerId: string; requestPrivKey: string }
  ) {}

  withIdentity(identity: { copayerId: string; requestPrivKey: string }) {
    return new BwsClient(this.config, identity);
  }

  async createWallet(body: {
    name: string;
    m: number;
    n: number;
    pubKey: string;
    coin: Coin;
    network: Network;
  }) {
    return this.request('POST', '/bws/api/v1/wallets', body, false);
  }

  async joinWallet(
    walletId: string,
    body: { name: string; xPubKey: string; requestPubKey: string; copayerSignature: string }
  ) {
    return this.request('POST', `/bws/api/v1/wallets/${walletId}/copayers`, body, false);
  }

  getWallet() {
    return this.request('GET', '/bws/api/v1/wallets');
  }

  createAddress() {
    return this.request('POST', '/bws/api/v3/addresses', {});
  }

  listAddresses() {
    return this.request('GET', '/bws/api/v4/addresses');
  }

  getBalance() {
    return this.request('GET', '/bws/api/v1/balance');
  }

  getUtxos() {
    return this.request('GET', '/bws/api/v1/utxos');
  }

  createProposal(body: { toAddress: string; amount: number; message?: string; feePerKb?: number }) {
    return this.request('POST', '/bws/api/v3/txproposals', body);
  }

  publishProposal(id: string) {
    return this.request('POST', `/bws/api/v2/txproposals/${id}/publish`, {});
  }

  signProposal(id: string, signatures: string[]) {
    return this.request('POST', `/bws/api/v1/txproposals/${id}/signatures`, { signatures });
  }

  rejectProposal(id: string) {
    return this.request('POST', `/bws/api/v1/txproposals/${id}/rejections`, {});
  }

  broadcastProposal(id: string, signedHex?: string) {
    return this.request('POST', `/bws/api/v1/txproposals/${id}/broadcast`, signedHex ? { signedHex } : {});
  }

  listProposals() {
    return this.request('GET', '/bws/api/v2/txproposals');
  }

  getHistory() {
    return this.request('GET', '/bws/api/v1/txhistory');
  }

  getRates(coin: Coin) {
    return this.request('GET', `/bws/api/v3/fiatrates/${coin}`, undefined, false);
  }

  private async request(method: string, url: string, body?: unknown, auth = true) {
    const headers: Record<string, string> = { 'content-type': 'application/json', 'x-client-version': 'abcpay-3.0.0' };
    if (auth) {
      if (!this.identity) throw new Error('Not authorized');
      const payload = method === 'GET' || method === 'DELETE' ? {} : body ?? {};
      headers['x-identity'] = this.identity.copayerId;
      headers['x-signature'] = signMessage(
        requestAuthMessage(method, url.split('?')[0], payload),
        this.identity.requestPrivKey
      );
    }
    const res = await fetch(`${this.config.baseUrl}${url}`, {
      method,
      headers,
      body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(body ?? {})
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || json.code || `Request failed (${res.status})`);
    }
    return json;
  }
}
