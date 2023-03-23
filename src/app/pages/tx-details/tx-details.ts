import { Component, ViewEncapsulation } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import * as _ from 'lodash';
import { Logger } from '../../providers/logger/logger';

// Providers
import { ConfigProvider } from '../../providers/config/config';
import { CurrencyProvider } from '../../providers/currency/currency';
import { ExternalLinkProvider } from '../../providers/external-link/external-link';
import { FilterProvider } from '../../providers/filter/filter';
import { OnGoingProcessProvider } from '../../providers/on-going-process/on-going-process';
import { PopupProvider } from '../../providers/popup/popup';
import { ProfileProvider } from '../../providers/profile/profile';
import { RateProvider } from '../../providers/rate/rate';
import { TxConfirmNotificationProvider } from '../../providers/tx-confirm-notification/tx-confirm-notification';
import { TxFormatProvider } from '../../providers/tx-format/tx-format';
import { WalletProvider } from '../../providers/wallet/wallet';
import { EventManagerService } from 'src/app/providers/event-manager.service';
import { ModalController, NavController, NavParams } from '@ionic/angular';
import { Location } from '@angular/common';
import { PersistenceProvider } from 'src/app/providers/persistence/persistence';
import {
  AddressBookProvider,
  AppProvider,
  TokenProvider
} from 'src/app/providers';
import { Router } from '@angular/router';
import { DecimalFormatBalance } from 'src/app/providers/decimal-format.ts/decimal-format';
import { Token } from 'src/app/models/tokens/tokens.model';

export interface TokenData {
  amountToken: string;
  tokenId: string;
  symbolToken: string;
  name: string;
  addressToShow: string;
}

@Component({
  selector: 'page-tx-details',
  templateUrl: 'tx-details.html',
  styleUrls: ['tx-details.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TxDetailsModal {
  private txId: string;
  public messageOnchain: string = '';
  private config;
  private blockexplorerUrl: string;
  private blockexplorerUrlTestnet: string;
  private retryGetTx: number = 0;

  public wallet;
  public btx;
  public actionList;
  public isShared: boolean;
  public title: string;
  public txNotification;
  public color: string;
  public copayerId: string;
  public txsUnsubscribedForNotifications: boolean;
  public txMemo: string;
  public tokenData: TokenData;
  public token: Token;
  public isNegative: boolean;
  public currentTheme;
  public fiatRateStrToken;

  public addressbook = [];

  constructor(
    private configProvider: ConfigProvider,
    private currencyProvider: CurrencyProvider,
    private events: EventManagerService,
    private externalLinkProvider: ExternalLinkProvider,
    private logger: Logger,
    private navCtrl: NavController,
    private navParams: NavParams,
    private onGoingProcess: OnGoingProcessProvider,
    private popupProvider: PopupProvider,
    private profileProvider: ProfileProvider,
    private txConfirmNotificationProvider: TxConfirmNotificationProvider,
    private txFormatProvider: TxFormatProvider,
    private walletProvider: WalletProvider,
    private translate: TranslateService,
    private filter: FilterProvider,
    private rateProvider: RateProvider,
    private location: Location,
    private viewCtrl: ModalController,
    private persistenceProvider: PersistenceProvider,
    private appProvider: AppProvider,
    private router: Router,
    private tokenProvider: TokenProvider,
    private addressbookProvider: AddressBookProvider
  ) {}

  ngOnInit() {
    this.events.subscribe('bwsEvent', this.bwsEventHandler);
    this.config = this.configProvider.get();
    this.currentTheme = this.appProvider.themeProvider.currentAppTheme;
    this.txId = this.navParams.data.txid;
    if (this.navParams.data && this.navParams.data.messageOnchain) {
      this.messageOnchain = this.navParams.data.messageOnchain;
    }
    this.title = this.translate.instant('Transaction');
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    this.tokenData = this.navParams.data.tokenData;
    this.token = this.navParams.data.token;
    this.color = this.wallet.color;
    this.copayerId = this.wallet.credentials.copayerId;
    this.isShared = this.wallet.credentials.n > 1;
    this.txsUnsubscribedForNotifications = this.config.confirmedTxsNotifications
      ? !this.config.confirmedTxsNotifications.enabled
      : true;

    let defaults = this.configProvider.getDefaults();
    this.blockexplorerUrl = defaults.blockExplorerUrl[this.wallet.coin];
    this.blockexplorerUrlTestnet =
      defaults.blockExplorerUrlTestnet[this.wallet.coin];

    this.txConfirmNotificationProvider.checkIfEnabled(this.txId).then(res => {
      this.txNotification = {
        value: res
      };
    });

    this.addressbookProvider
      .list(this.wallet.network)
      .then(ab => {
        this.addressbook = ab;
      })
      .catch(err => {
        this.logger.error(err);
      });

    this.updateTx();
  }

  converDate(number) {
    return new Date(number);
  }

  ngOnDestroy() {
    this.events.unsubscribe('bwsEvent', this.bwsEventHandler);
  }

  private bwsEventHandler: any = (_, type: string, n) => {
    let match = false;
    if (
      type == 'NewBlock' &&
      n &&
      n.data &&
      this.wallet &&
      n.data &&
      n.data.network == this.wallet.network &&
      n.data.coin == this.wallet.coin
    ) {
      match = true;
      this.updateTxDebounced({ hideLoading: true });
    }
    this.logger.debug('bwsEvent handler @tx-details. Matched: ' + match);
  };

  public readMore(): void {
    let url =
      'https://support.bitpay.com/hc/en-us/articles/115004497783-What-does-the-BitPay-wallet-s-warning-amount-too-low-to-spend-mean-';
    let optIn = true;
    let title = null;
    let message = this.translate.instant('Read more in our support page');
    let okText = this.translate.instant('Open');
    let cancelText = this.translate.instant('Go Back');
    this.externalLinkProvider.open(
      url,
      optIn,
      title,
      message,
      okText,
      cancelText
    );
  }

  private updateMemo(): void {
    this.walletProvider
      .getTxNote(this.wallet, this.btx.txid)
      .then(note => {
        if (!note || note.body == '') return;
        this.btx.note = note;
      })
      .catch(err => {
        this.logger.warn('Could not fetch transaction note: ' + err);
        return;
      });
  }

  private initActionList(): void {
    this.actionList = [];
    if (
      (this.btx.action != 'sent' && this.btx.action != 'moved') ||
      !this.isShared
    )
      return;

    let actionDescriptions = {
      created: this.translate.instant('Proposal Created'),
      failed: this.translate.instant('Execution Failed'),
      accept: this.translate.instant('Accepted'),
      reject: this.translate.instant('Rejected'),
      broadcasted: this.translate.instant('Broadcasted')
    };

    this.actionList.push({
      type: 'created',
      time: this.btx.createdOn,
      description: actionDescriptions.created,
      by: this.btx.creatorName
    });

    _.each(this.btx.actions, action => {
      this.actionList.push({
        type: action.type,
        time: action.createdOn,
        description: actionDescriptions[action.type],
        by: action.copayerName
      });
    });

    this.actionList.push({
      type: 'broadcasted',
      time: this.btx.time,
      description: actionDescriptions.broadcasted
    });

    setTimeout(() => {
      this.actionList.reverse();
    }, 10);
  }

  private updateTxDebounced = _.debounce(
    async hideLoading => {
      this.updateTx({ hideLoading });
    },
    1000,
    {
      leading: true
    }
  );

  async updateInputAddress(txId: string) {
    let inputAddresses = [];
    try {
      const txDetail = await this.walletProvider.getTxDetail(this.wallet, txId);
      if (txDetail) inputAddresses = txDetail.inputAddresses;
    } catch (error) {
      inputAddresses = [];
    }
    return inputAddresses;
  }

  async updateStorageTxhistory(txid: string, inputAddresses: string[]) {
    try {
      const walletId = this.navParams.data.walletId;
      const history = await this.walletProvider.getSavedTxs(walletId);
      if (!history) return;
      const historyByTxId = _.find(history, item => item.txid == txid);
      if (historyByTxId) {
        historyByTxId.inputAddresses = inputAddresses;
        const historyToSave = JSON.stringify(history);
        return await this.persistenceProvider.setTxHistory(
          walletId,
          historyToSave
        );
      }
    } catch (error) {}
  }

  private updateTx(opts?): void {
    opts = opts ? opts : {};
    if (!opts.hideLoading) this.onGoingProcess.set('loadingTxInfo');
    this.walletProvider
      .getTx(this.wallet, this.txId)
      .then(async tx => {
        this.retryGetTx = 0;
        if (!opts.hideLoading) this.onGoingProcess.clear();
        this.btx = this.txFormatProvider.processTx(this.wallet.coin, tx);
        this.btx.network = this.wallet.credentials.network;
        this.btx.coin = this.wallet.coin;

        if (!this.btx.inputAddresses || _.size(this.btx.inputAddresses) == 0) {
          const inputAddresses = await this.updateInputAddress(this.btx.txid);
          if (inputAddresses) {
            this.btx.inputAddresses = inputAddresses;
            await this.updateStorageTxhistory(this.btx.txid, inputAddresses);
          }
        }
        const chain = this.currencyProvider
          .getChain(this.wallet.coin)
          .toLowerCase();
        this.btx.feeFiatStr = this.txFormatProvider.formatAlternativeStr(
          chain,
          tx.fees
        );

        if (this.currencyProvider.isUtxoCoin(this.wallet.coin)) {
          this.btx.feeRateStr =
            ((this.btx.fees / (this.btx.amount + this.btx.fees)) * 100).toFixed(
              2
            ) + '%';
        }

        if (!this.btx.note) {
          this.txMemo = this.btx.message;
        }
        if (this.btx.note && this.btx.note.body) {
          this.txMemo = this.btx.note.body;
        }

        if (this.btx.action != 'invalid') {
          if (this.btx.isGenesis) {
            this.title = this.translate.instant('Genesis');
          } else {
            if (this.btx.action == 'sent') {
              this.title = this.translate.instant('Sent');
              this.isNegative = true;
            }
            if (this.btx.action == 'received') {
              this.title = this.translate.instant('Received');
              this.isNegative = false;
            }
            if (this.btx.action == 'moved') {
              this.title = this.translate.instant('Sent to self');
              this.isNegative = false;
            }
            if (this.btx.action == 'immature') {
              this.title = this.translate.instant('Immature');
              this.isNegative = false;
            }
            if (this.btx.action == 'mined') {
              this.title = this.translate.instant('Mined');
              this.isNegative = false;
            }
          }
        }

        this.updateMemo();
        this.initActionList();

        this.updateFiatRate();
        if (this.token) {
          this.getFiatRateStrToken();
        }
        if (this.currencyProvider.isUtxoCoin(this.wallet.coin)) {
          this.walletProvider
            .getLowAmount(this.wallet)
            .then((amount: number) => {
              this.btx.lowAmount = tx.amount < amount;
            })
            .catch(err => {
              this.logger.warn('Error getting low amounts: ' + err);
              return;
            });
        }
      })
      .catch(err => {
        this.logger.warn('Error getting transaction: ' + err);
        if (err == 'HISTORY_IN_PROGRESS' && this.retryGetTx < 6) {
          this.logger.debug(
            'getTx: wait and retry... ' + ++this.retryGetTx + '/5'
          );
          setTimeout(() => {
            this.updateTx();
          }, 1000);
        } else {
          if (!opts.hideLoading) this.onGoingProcess.clear();
          this.location.back();
          this.popupProvider.ionicAlert(
            'Error',
            this.translate.instant('Transaction not available at this time')
          );
        }
      });
  }

  getContactName(address: string) {
    const existsContact = _.find(this.addressbook, c => c.address === address);
    if (existsContact) return existsContact.name;
    return null;
  }

  public getFiatRateStrToken() {
    const token = {
      amountToken: this.btx?.amountToken,
      tokenInfo: {
        symbol: this.btx?.symbolToken
      }
    };
    const alternativeBalanceToken =
      this.tokenProvider.getAlternativeBalanceToken(token, this.wallet);
    let rate = this.rateProvider.getRate(
      this.wallet.cachedStatus.alternativeIsoCode,
      token.tokenInfo.symbol
    );
    if (!rate) {
      rate = 0;
    }
    this.fiatRateStrToken =
      DecimalFormatBalance(alternativeBalanceToken) +
      ' ' +
      this.wallet.cachedStatus.alternativeIsoCode +
      ' @ ' +
      DecimalFormatBalance(rate) +
      ' ' +
      this.wallet.cachedStatus.alternativeIsoCode +
      ' per ' +
      token.tokenInfo.symbol.toUpperCase();
  }

  public async saveMemoInfo(): Promise<void> {
    this.logger.info('Saving memo: ', this.txMemo);
    this.btx.note = {
      body: this.txMemo
    };
    let args = {
      txid: this.btx.txid,
      body: this.txMemo
    };

    await this.walletProvider
      .editTxNote(this.wallet, args)
      .catch((err: any) => {
        this.logger.error('Could not save tx comment ' + err);
      });

    this.logger.info('Tx Note edited');
  }

  public viewOnBlockchain(): void {
    let btx = this.btx;
    const coin = btx.coin;
    let url;
    switch (coin) {
      case 'doge':
        url =
          this.wallet.credentials.network === 'livenet'
            ? `https://${this.blockexplorerUrl}dogecoin/transaction/${btx.txid}`
            : `https://${this.blockexplorerUrlTestnet}tx/DOGETEST/${btx.txid}`;
        break;
      default:
        url =
          this.wallet.credentials.network === 'livenet'
            ? `https://${this.blockexplorerUrl}tx/${btx.txid}`
            : `https://${this.blockexplorerUrlTestnet}tx/${btx.txid}`;
    }
    let optIn = true;
    let title = null;
    let message = this.translate.instant('View Transaction');
    let okText = this.translate.instant('Open');
    let cancelText = this.translate.instant('Go Back');
    this.externalLinkProvider.open(
      url,
      optIn,
      title,
      message,
      okText,
      cancelText
    );
  }

  public txConfirmNotificationChange(): void {
    if (this.txNotification.value) {
      this.txConfirmNotificationProvider.subscribe(this.wallet, {
        txid: this.txId,
        amount: this.btx.amount
      });
    } else {
      this.txConfirmNotificationProvider.unsubscribe(this.wallet, this.txId);
    }
  }

  public handleClick(btx) {}

  public openExternalLink(url: string): void {
    const optIn = true;
    const title = null;
    const message = this.translate.instant(
      'Help and support information is available at the website.'
    );
    const okText = this.translate.instant('Open');
    const cancelText = this.translate.instant('Go Back');
    this.externalLinkProvider.open(
      url,
      optIn,
      title,
      message,
      okText,
      cancelText
    );
  }

  private updateFiatRate() {
    const settings = this.configProvider.get().wallet.settings;
    this.rateProvider
      .getHistoricFiatRate(
        settings.alternativeIsoCode,
        this.wallet.coin,
        (this.btx.time * 1000).toString()
      )
      .then(fiat => {
        if (fiat && fiat.rate) {
          this.btx.fiatRateStr =
            this.getFiatStr(fiat) +
            ' ' +
            settings.alternativeIsoCode +
            ' @ ' +
            this.getAlternativeIsoCode(fiat) +
            ` ${settings.alternativeIsoCode} per ` +
            this.wallet.coin.toUpperCase();
        } else {
          this.btx.fiatRateStr = this.btx.alternativeAmountStr;
        }
      });
  }

  getAlternativeIsoCode(fiat) {
    return this.btx.coin == 'xpi' || this.btx.coin == 'xec'
      ? parseFloat(fiat.rate).toFixed(6).toString()
      : this.filter.formatFiatAmount(fiat.rate);
  }

  getFiatStr(fiat) {
    return this.btx.coin == 'xpi' || this.btx.coin == 'xec'
      ? parseFloat(
          (fiat.rate * this.btx.amountValueStr.replace(',', '')).toFixed(4)
        ).toString()
      : this.filter.formatFiatAmount(
          parseFloat(
            (fiat.rate * this.btx.amountValueStr.replace(',', '')).toFixed(2)
          )
        );
  }

  close() {
    this.viewCtrl.dismiss();
  }

  sendBack(btx) {
    this.viewCtrl.dismiss();
    this.router.navigate(['/send-page'], {
      state: {
        walletId: this.wallet.id,
        toAddress:
          btx.address || (btx.addressTo && btx.addressTo !== 'false')
            ? btx.addressTo
            : false ||
              (this.tokenData && this.tokenData.addressToShow !== 'false'
                ? this.tokenData.addressToShow
                : btx.inputAddresses[0]) ||
              btx.inputAddresses[0],
        token: this.token
      }
    });
  }
}
