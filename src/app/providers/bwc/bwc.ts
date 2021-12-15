import { Injectable } from '@angular/core';

import BWC from '@abcpros/bitcore-wallet-client';
import env from '../../../environments';
import { Logger } from '../logger/logger';

@Injectable()
export class BwcProvider {
  public parseSecret = BWC.parseSecret;
  public Client = BWC;
  constructor(private logger: Logger) {
    this.logger.debug('BwcProvider initialized');
  }
  public getBitcore() {
    return BWC.Bitcore;
  }

  public getBitcoreCash() {
    return BWC.BitcoreCash;
  }

  public getBitcoreDoge() {
    return BWC.BitcoreDoge;
  }

  public getBitcoreXec() {
    return BWC.BitcoreXec;
  }

  public getBitcoreXpi() {
    return BWC.BitcoreXpi;
  }

  public getBitcoreLtc() {
    return BWC.BitcoreLtc;
  }

  public getCore() {
    return BWC.Core;
  }

  public getErrors() {
    return BWC.errors;
  }

  public getSJCL() {
    return BWC.sjcl;
  }

  public getUtils() {
    return BWC.Utils;
  }

  public getKey() {
    return BWC.Key;
  }

  public getPayProV2() {
    return BWC.PayProV2;
  }

  public upgradeCredentialsV1(x) {
    return BWC.upgradeCredentialsV1(x);
  }

  public upgradeMultipleCredentialsV1(x) {
    return BWC.upgradeMultipleCredentialsV1(x);
  }

  public getClient(walletData?, opts?) {
    opts = opts || {};

    // note opts use `bwsurl` all lowercase;
    let bwc = new BWC({
		baseUrl: opts.bwsurl || env.awsUrl, // 'http://thunt111984.cameraddns.net:3232/bws/api', 'http://thunt111984.cameraddns.net/bws/api', uncmment for local testing
      verbose: opts.verbose,
      timeout: 100000,
      transports: ['polling'],
      bp_partner: opts.bp_partner,
      bp_partner_version: opts.bp_partner_version
    });

    if (walletData) bwc.fromString(walletData);
    return bwc;
  }
}
