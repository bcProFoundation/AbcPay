import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewEncapsulation } from '@angular/core';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import env from '../../../environments';

// providers
import { DecimalFormatBalance } from '../../providers/decimal-format.ts/decimal-format';
import { ErrorsProvider } from '../../providers/errors/errors';
import { ExternalLinkProvider } from '../../providers/external-link/external-link';
import {
  ActionSheetProvider,
  AddressBookProvider,
  AddressProvider,
  AnalyticsProvider,
  AppProvider,
  BwcErrorProvider,
  ConfigProvider,
  CurrencyProvider,
  EventManagerService,
  LoadingProvider,
  OnGoingProcessProvider
} from '../../providers/index';
import { Logger } from '../../providers/logger/logger';
import { PlatformProvider } from '../../providers/platform/platform';
import { ProfileProvider } from '../../providers/profile/profile';
import { ThemeProvider } from '../../providers/theme/theme';
import { TimeProvider } from '../../providers/time/time';
import { WalletProvider } from '../../providers/wallet/wallet';

import { TxDetailsModal } from '../../pages/tx-details/tx-details';
import { SearchTxModalPage } from './search-tx-modal/search-tx-modal';
import { WalletBalanceModal } from './wallet-balance/wallet-balance';
import { LoadingController, ModalController, Platform, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { NgxQrcodeErrorCorrectionLevels } from '@techiediaries/ngx-qrcode';
import { EventsService } from 'src/app/providers/events.service';
const HISTORY_SHOW_LIMIT = 10;
const MIN_UPDATE_TIME = 2000;
const TIMEOUT_FOR_REFRESHER = 1000;

interface UpdateWalletOptsI {
  walletId: string;
  force?: boolean;
  alsoUpdateHistory?: boolean;
}
@Component({
  selector: 'page-wallet-details',
  templateUrl: 'wallet-details.html',
  styleUrls: ['wallet-details.scss'],
  encapsulation: ViewEncapsulation.None
})
export class WalletDetailsPage {
  private currentPage: number = 0;
  private showBackupNeededMsg: boolean = true;
  private onResumeSubscription: Subscription;
  private analyzeUtxosDone: boolean;
  private zone;
  private blockexplorerUrl: string;
  private blockexplorerUrlTestnet: string;
  public hiddenBalance: boolean;
  public address: string;
  public currentTheme: string;

  public requiresMultipleSignatures: boolean;
  public wallet;
  public history = [];
  public groupedHistory = [];
  public walletNotRegistered: boolean;
  public updateError: boolean;
  public updateStatusError;
  public updatingStatus: boolean;
  public updatingTxHistory: boolean;
  public updateTxHistoryError: boolean;
  public updatingTxHistoryProgress: number = 0;
  public showNoTransactionsYetMsg: boolean;
  public showBalanceButton: boolean = false;
  public addressbook = [];
  public txps = [];
  public txpsPending: any[];
  public lowUtxosWarning: boolean;
  public associatedWallet: string;
  public backgroundColor: string;
  private isCordova: boolean;
  public isDarkModeEnabled: boolean;
  public showBuyCrypto: boolean;
  public showExchangeCrypto: boolean;
  public isShowDonationBtn: boolean;
  public selectedTheme;
  public navPramss: any;
  public finishParam: any;
  public isScroll = false;
  public isSendFromHome: boolean = false;
  public isGenNewAddress: boolean = false;
  toast?: HTMLIonToastElement;

  typeErrorQr = NgxQrcodeErrorCorrectionLevels;
  constructor(
    public http: HttpClient,
    private currencyProvider: CurrencyProvider,
    private loadingProvider: LoadingProvider,
    private router: Router,
    private walletProvider: WalletProvider,
    private addressbookProvider: AddressBookProvider,
    private events: EventManagerService,
    private logger: Logger,
    private timeProvider: TimeProvider,
    private translate: TranslateService,
    private modalCtrl: ModalController,
    private externalLinkProvider: ExternalLinkProvider,
    private actionSheetProvider: ActionSheetProvider,
    private platform: Platform,
    private profileProvider: ProfileProvider,
    private viewCtrl: ModalController,
    public platformProvider: PlatformProvider,
    private socialSharing: SocialSharing,
    private bwcErrorProvider: BwcErrorProvider,
    private errorsProvider: ErrorsProvider,
    private themeProvider: ThemeProvider,
    private configProvider: ConfigProvider,
    private analyticsProvider: AnalyticsProvider,
    private appProvider: AppProvider,
    private location: Location,
    public toastController: ToastController,
    private loadingCtrl: LoadingController,
    private eventsService: EventsService,
    private addressProvider: AddressProvider,
    private onGoingProcessProvider: OnGoingProcessProvider
  ) {
    this.currentTheme = this.appProvider.themeProvider.currentAppTheme;
    if (this.router.getCurrentNavigation()) {
      this.navPramss = this.router.getCurrentNavigation().extras.state;
    } else {
      this.navPramss = history ? history.state : {};
    }
    this.isSendFromHome = this.navPramss.isSendFromHome;
    this.selectedTheme = this.themeProvider.currentAppTheme;
    this.zone = new NgZone({ enableLongStackTrace: false });
    this.isCordova = this.platformProvider.isCordova;

    this.wallet = this.profileProvider.getWallet(this.navPramss.walletId);
    this.walletProvider.getAddress(this.wallet, undefined).then(addr => {
      if (!addr) return;
      const address = this.walletProvider.getAddressView(
        this.wallet.coin,
        this.wallet.network,
        addr
      );
      this.address = address;
    });
    this.isDarkModeEnabled = this.themeProvider.isDarkModeEnabled();
    this.showBuyCrypto =
      this.wallet.network == 'livenet' ||
      (this.wallet.network == 'testnet' && env.name == 'development');
    this.showExchangeCrypto = this.wallet.network == 'livenet';

    // Check is show btn Donate
    this.walletProvider.getDonationInfo().then((data: any) => {
      this.isShowDonationBtn = _.some(
        data.donationSupportCoins,
        (item: any) =>
          item.network == this.wallet.network && item.coin == this.wallet.coin
      );
    });

    // Getting info from cache
    if (this.navPramss.clearCache) {
      this.clearHistoryCache();
    } else {
      if (this.wallet.completeHistory) this.showHistory();
      else {
        this.events.publish('Local/WalletFocus', {
          walletId: this.wallet.credentials.walletId,
          force: true,
          alsoUpdateHistory: true
        });
      }
    }

    this.requiresMultipleSignatures = this.wallet.credentials.m > 1;

    this.addressbookProvider
      .list(this.wallet.network)
      .then(ab => {
        this.addressbook = ab;
      })
      .catch(err => {
        this.logger.error(err);
      });

    let defaults = this.configProvider.getDefaults();
    this.blockexplorerUrl = defaults.blockExplorerUrl[this.wallet.coin];
    this.blockexplorerUrlTestnet =
      defaults.blockExplorerUrlTestnet[this.wallet.coin];
  }

  handleGenNewAddress(event: boolean) {
    this.isGenNewAddress = event;
  }

  async handleScrolling(event) {
    if (event.detail.currentY > 0) {
      this.isScroll = true;
    } else {
      this.isScroll = false;
    }
  }

  async presentToast() {
    const toast = await this.toastController.create({
      message: this.finishParam.finishText,
      duration: 3000,
      position: 'top',
      animated: true,
      cssClass: 'custom-finish-toast',
      buttons: [
        {
          side: 'start',
          icon: 'checkmark-circle',
          handler: () => {
            console.log('');
          }
        }
      ]
    });
    toast.present();
    this.navPramss.finishParam = null;
  }

  subscribeEvents() {
    this.events.subscribe('Local/WalletUpdate', this.updateStatus);
    this.events.subscribe('Local/WalletHistoryUpdate', this.updateHistory);
  }

  public openLink(url) {
    this.externalLinkProvider.open(url);
  }

  openWalletSettings(id) {
    this.router.navigate(['/wallet-settings'], {
      state: {
        walletId: id
      }
    });
  }

  public hiddenBalanceChange(): void {
    this.hiddenBalance = !this.hiddenBalance;
    this.profileProvider.toggleHideBalanceFlag(
      this.wallet.credentials.walletId
    );
  }

  async ionViewWillEnter() {
    this.hiddenBalance = this.wallet.balanceHidden;
    this.backgroundColor =
      this.themeProvider.getThemeInfo().walletDetailsBackgroundStart;
    this.onResumeSubscription = this.platform.resume.subscribe(() => {
      this.profileProvider.setFastRefresh(this.wallet);
      this.subscribeEvents();
    });
    this.profileProvider.setFastRefresh(this.wallet);
    this.events.publish('Local/WalletFocus', {
      walletId: this.wallet.credentials.walletId
    });
    this.subscribeEvents();
    setTimeout(() => {
      if (this.router.getCurrentNavigation()) {
        this.navPramss = this.router.getCurrentNavigation().extras.state;
      } else {
        this.navPramss = history ? history.state : {};
      }
      if (this.navPramss && this.navPramss.finishParam) {
        this.finishParam = this.navPramss.finishParam;
        this.presentToast();
      }
    }, 100);
  }

  ionViewWillLeave() {
    this.profileProvider.setSlowRefresh(this.wallet);
    this.events.unsubscribe('Local/WalletUpdate', this.updateStatus);
    this.events.unsubscribe('Local/WalletHistoryUpdate', this.updateHistory);
    this.onResumeSubscription.unsubscribe();
  }

  ionViewDidLeave() {
    // this.events.publish('Local/GetData', true);
    this.eventsService.publishRefresh({
      keyId: this.wallet.keyId
    });
  }

  shouldShowZeroState() {
    return this.showNoTransactionsYetMsg && !this.updateStatusError;
  }

  shouldShowSpinner() {
    return (
      (this.updatingStatus || this.updatingTxHistory) &&
      !this.walletNotRegistered &&
      !this.updateStatusError &&
      !this.updateTxHistoryError
    );
  }

  private fetchTxHistory(opts: UpdateWalletOptsI) {
    if (!opts.walletId) {
      this.logger.error('Error no walletId in update History');
      return;
    }

    const progressFn = ((_, newTxs) => {
      let args = {
        walletId: opts.walletId,
        finished: false,
        progress: newTxs
      };
      this.events.publish('Local/WalletHistoryUpdate', args);
    }).bind(this);

    // Fire a startup event, to allow UI to show the spinner
    this.events.publish('Local/WalletHistoryUpdate', {
      walletId: opts.walletId,
      finished: false
    });
    this.walletProvider
      .fetchTxHistory(this.wallet, progressFn, opts)
      .then(txHistory => {
        this.wallet.completeHistory = txHistory;
        this.events.publish('Local/WalletHistoryUpdate', {
          walletId: opts.walletId,
          finished: true
        });
      })
      .catch(err => {
        if (err != 'HISTORY_IN_PROGRESS') {
          this.logger.warn('WalletHistoryUpdate ERROR', err);
          this.events.publish('Local/WalletHistoryUpdate', {
            walletId: opts.walletId,
            finished: false,
            error: err
          });
        }
      });
  }

  public isUtxoCoin(): boolean {
    return this.currencyProvider.isUtxoCoin(this.wallet.coin);
  }

  private clearHistoryCache() {
    this.history = [];
    this.currentPage = 0;
  }

  private groupHistory(history) {
    return history.reduce((groups, tx, txInd) => {
      if (tx.isSlpToken) {
        this.updateHistoryToken(tx);
      }
      this.isFirstInGroup(txInd)
        ? groups.push([tx])
        : groups[groups.length - 1].push(tx);
      return groups;
    }, []);
  }

  converDate(number) {
    return new Date(number);
  }

  private handleTxAddressEcash() {
    this.history.forEach((tx) => {
      if (tx.action == 'received' && !tx?.tokenId) {
        const addressToken = tx.inputAddresses[0] || null;
        if (addressToken) {
          const { prefix, type, hash } = this.addressProvider.decodeAddress(addressToken);
          const eCashAddess = this.addressProvider.encodeAddress('ecash', type, hash, addressToken);
          tx.inputAddresses[0] = eCashAddess;
        }
      }
    })
  }
 
  private async showHistory(loading?: boolean) {
    this.onGoingProcessProvider.set('Loading ...');
    if (!this.wallet.completeHistory) {
      this.onGoingProcessProvider.clear();
      return;
    }
    this.history = this.wallet.completeHistory.slice(
      0,
      (this.currentPage + 1) * HISTORY_SHOW_LIMIT
    );
    if (this.wallet.coin == 'xec') this.handleTxAddressEcash();
    this.zone.run(() => {
      this.groupedHistory = this.groupHistory(this.history);
    });
    if (loading) this.currentPage++;
    setTimeout(async () => {
      this.onGoingProcessProvider.clear();
    }, 1000);
  }

  updateAddressToShowToken(tx) {
    const outputAddr = tx.outputs[0].address;
    let addressToShow = this.walletProvider.getAddressView(
      this.wallet.coin,
      this.wallet.network,
      outputAddr,
      true
    );
    return addressToShow;
  }

  private updateHistoryToken(tx) {
    const token = _.find(
      this.wallet.tokens,
      item => item.tokenId == tx.tokenId
    );
    if (token && token.tokenInfo) {
      if (tx.action == 'sent') {
        tx.addressTo = this.updateAddressToShowToken(tx);
      }
      tx.amountToken =
        tx.amountTokenUnit / Math.pow(10, token.tokenInfo.decimals);
      tx.symbolToken = token.tokenInfo.symbol;
      tx.name = token.tokenInfo.name;
      tx.isGenesis = tx.txType == 'GENESIS';
      if (tx.txType == 'GENESIS') tx.action = 'received';
    }
  }

  private setPendingTxps(txps) {
    this.txps = !txps ? [] : _.sortBy(txps, 'createdOn').reverse();
    this.txpsPending = [];
    this.txps.forEach(txp => {
      const action: any = _.find(txp.actions, {
        copayerId: txp.wallet.copayerId
      });

      if ((!action || action.type === 'failed') && txp.status == 'pending') {
        this.txpsPending.push(txp);
      }

      // For unsent transactions
      if (action && txp.status == 'accepted') {
        this.txpsPending.push(txp);
      }
    });
  }

  public openProposalsNotificationsPage(): void {
    if (this.wallet.credentials.multisigEthInfo) {
      this.router.navigate(['/proposals-notifications'], {
        state: {
          multisigContractAddress:
            this.wallet.credentials.multisigEthInfo.multisigContractAddress
        }
      });
    } else {
      this.router.navigate(['/proposals-notifications'], {
        state: { walletId: this.wallet.id }
      });
    }
  }

  public updateAll = _.debounce(
    (opts?) => {
      opts = opts || {};
      this.events.publish('Local/WalletFocus', {
        walletId: this.wallet.credentials.walletId,
        force: true,
        alsoUpdateHistory: true
      });
    },
    MIN_UPDATE_TIME,
    {
      leading: true
    }
  );

  public toggleBalance() {
    this.hiddenBalance = !this.hiddenBalance;
    this.profileProvider.toggleHideBalanceFlag(
      this.wallet.credentials.walletId
    );
  }

  public loadHistory(loading) {
    if (
      this.history &&
      this.wallet.completeHistory &&
      this.history.length === this.wallet.completeHistory.length
    ) {
      loading.target.complete();
      return;
    }
    setTimeout(() => {
      this.showHistory(true); // loading in true
      loading.target.complete();
    }, 300);
  }

  private analyzeUtxos(): void {
    if (this.analyzeUtxosDone) return;

    this.walletProvider
      .getLowUtxos(this.wallet)
      .then(resp => {
        if (!resp) return;
        this.analyzeUtxosDone = true;
        this.lowUtxosWarning = !!resp.warning;
        // this.logger.debug('Low UTXOs warning: ', this.lowUtxosWarning);
      })
      .catch(err => {
        this.logger.warn('Analyze UTXOs: ', err);
      });
  }

  // no network //
  private updateHistory = opts => {
    this.logger.debug('RECV Local/WalletHistoryUpdate @walletDetails', opts);
    if (opts.walletId != this.wallet.id) return;

    if (opts.finished) {
      this.updatingTxHistoryProgress = 0;
      this.updatingTxHistory = false;
      this.updateTxHistoryError = false;

      const hasTx = !!this.wallet.completeHistory[0];

      this.showNoTransactionsYetMsg = !hasTx;

      if (this.wallet.needsBackup && hasTx && this.showBackupNeededMsg)
        this.openBackupModal();
      this.showHistory();
    } else {
      if (opts.error) {
        this.updatingTxHistory = false;
        this.updateTxHistoryError = true;

        // show what we have.
        this.showHistory();
      } else {
        this.updatingTxHistory = true;
        this.updatingTxHistoryProgress = opts.progress;
        this.updateTxHistoryError = false;

        // show what we have
        this.showHistory();

        // Hide prev history if long downlad is happending...
        //  if (opts.progress > 5) {
        //  this.history = null;
        //  }
      }
    }
  };

  // no network //
  private updateStatus = opts => {
    if (opts.walletId != this.wallet.id) return;
    this.logger.debug('RECV Local/WalletUpdate @walletDetails', opts);

    if (!opts.finished) {
      this.updatingStatus = true;
      return;
    }

    this.updatingStatus = false;

    if (!this.wallet.error) {
      this.logger.debug(
        ' Updating wallet with amount ',
        this.wallet.cachedStatus.balance.totalAmount
      );
      let status = this.wallet.cachedStatus;
      this.setPendingTxps(status.pendingTxps);
      this.showBalanceButton = status.totalBalanceSat != status.spendableAmount;

      const minXrpBalance = 20000000; // 20 XRP * 1e6
      if (this.wallet.coin === 'xrp') {
        this.showBalanceButton =
          status.totalBalanceSat &&
          status.totalBalanceSat != status.spendableAmount + minXrpBalance;
      }

      if (this.isUtxoCoin()) {
        this.analyzeUtxos();
      }

      this.updateStatusError = null;
      this.walletNotRegistered = false;
    } else {
      this.showBalanceButton = false;

      let err = this.wallet.errorObj;
      if (err.name && err.name.match(/WALLET_NOT_FOUND/)) {
        this.walletNotRegistered = true;
      }
      if (err === 'WALLET_NOT_REGISTERED') {
        this.walletNotRegistered = true;
      } else {
        this.updateStatusError = this.wallet.errorObj;
      }
    }
  };

  public itemTapped(tx) {
    if (tx.hasUnconfirmedInputs) {
      const infoSheet =
        this.actionSheetProvider.createInfoSheet('unconfirmed-inputs');
      infoSheet.present();
      infoSheet.onDidDismiss(() => {
        this.goToTxDetails(tx);
      });
    } else if (tx.isRBF) {
      const infoSheet = this.actionSheetProvider.createInfoSheet('rbf-tx');
      infoSheet.present();
      infoSheet.onDidDismiss(option => {
        option ? this.speedUpTx(tx) : this.goToTxDetails(tx);
      });
    } else if (this.canSpeedUpTx(tx)) {
      const infoSheet = this.actionSheetProvider.createInfoSheet('speed-up-tx');
      infoSheet.present();
      infoSheet.onDidDismiss(option => {
        option ? this.speedUpTx(tx) : this.goToTxDetails(tx);
      });
    } else {
      this.goToTxDetails(tx);
    }
  }

  private speedUpTx(tx) {
    this.walletProvider.getAddress(this.wallet, false).then(addr => {
      const data = {
        amount: 0,
        network: this.wallet.network,
        coin: this.wallet.coin,
        speedUpTx: true,
        toAddress: this.wallet.coin === 'eth' ? tx.addressTo : addr,
        walletId: this.wallet.credentials.walletId,
        fromWalletDetails: true,
        txid: tx.txid,
        recipientType: 'wallet',
        name:
          this.wallet.coin === 'eth' && tx.customData
            ? tx.customData.toWalletName
            : this.wallet.name,
        nonce: tx.nonce
      };
      const nextView = {
        name: 'ConfirmPage',
        params: data
      };
      this.events.publish('IncomingDataRedir', nextView);
    });
  }

  public goToTxDetails(tx) {
    const txDetailModal = this.modalCtrl
      .create({
        component: TxDetailsModal,
        componentProps: {
          walletId: this.wallet.credentials.walletId,
          txid: tx.txid
        }
      })
      .then(res => {
        res.present();
      });
  }

  public openBackupModal(): void {
    this.showBackupNeededMsg = false;
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'backup-needed-with-activity'
    );
    infoSheet.present();
    infoSheet.onDidDismiss(option => {
      if (option) this.openBackup();
    });
  }

  public openBackup() {
    this.router.navigate(['/backup-key'], {
      state: {
        keyId: this.wallet.credentials.keyId
      }
    });
  }

  public openAddresses() {
    this.router.navigate(['/wallet-addresses'], {
      // WalletAddressesPage
      state: {
        walletId: this.wallet.credentials.walletId
      }
    });
  }

  public getDate(txCreated) {
    const date = new Date(txCreated * 1000);
    return date;
  }

  public trackByFn(index) {
    return index;
  }

  public isFirstInGroup(index) {
    if (index === 0) {
      return true;
    }
    const curTx = this.history[index];
    const prevTx = this.history[index - 1];
    return !this.createdDuringSameMonth(curTx, prevTx);
  }

  private createdDuringSameMonth(curTx, prevTx) {
    return this.timeProvider.withinSameMonth(
      curTx.time * 1000,
      prevTx.time * 1000
    );
  }

  public isDateInCurrentMonth(date) {
    return this.timeProvider.isDateInCurrentMonth(date);
  }

  public createdWithinPastDay(time) {
    return this.timeProvider.withinPastDay(time);
  }

  public isUnconfirmed(tx) {
    return !tx.confirmations || tx.confirmations === 0;
  }

  public canSpeedUpTx(tx): boolean {
    if (this.wallet.coin !== 'btc' && this.wallet.coin !== 'eth') return false;

    const currentTime = moment();
    const txTime = moment(tx.time * 1000);

    // Can speed up the tx after 4 hours without confirming
    return (
      currentTime.diff(txTime, 'hours') >= 4 &&
      this.isUnconfirmed(tx) &&
      ((tx.action === 'received' && this.wallet.coin == 'btc') ||
        ((tx.action === 'sent' || tx.action === 'moved') &&
          this.wallet.coin === 'eth'))
    );
  }

  public openBalanceDetails(): void {
    this.modalCtrl
      .create({
        component: WalletBalanceModal,
        componentProps: {
          status: this.wallet.cachedStatus
        }
      })
      .then(res => {
        res.present();
      });
  }

  public back(): void {
    this.location.back();
  }

  public async openSearchModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: SearchTxModalPage,
      componentProps: {
        addressbook: this.addressbook,
        completeHistory: this.wallet.completeHistory,
        wallet: this.wallet
      },
      showBackdrop: false,
      backdropDismiss: true
    });
    await modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.txid) return;
      this.goToTxDetails(data);
    });
  }

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

  public doRefresh(refresher) {
    this.updateAll({ force: true });

    setTimeout(() => {
      refresher.target.complete();
    }, TIMEOUT_FOR_REFRESHER);
  }

  public close() {
    this.viewCtrl.dismiss();
  }

  public goToReceivePage() {
    if (this.wallet && this.wallet.isComplete() && this.wallet.needsBackup) {
      const needsBackup = this.actionSheetProvider.createNeedsBackup();
      needsBackup.present();
      needsBackup.onDidDismiss(data => {
        if (data === 'goToBackup') this.goToBackup();
      });
    } else {
      const params = {
        wallet: this.wallet
      };
      const receive = this.actionSheetProvider.createWalletReceive(params);
      receive.present();
      receive.onDidDismiss(data => {
        if (data) this.showErrorInfoSheet(data);
      });
    }
  }

  public goToSendPage() {
    this.router.navigate(['/send-page'], {
      state: {
        walletId: this.wallet.id
      }
    });
  }

  public goToBuyCryptoPage() {
    if (this.wallet && this.wallet.isComplete() && this.wallet.needsBackup) {
      const needsBackup = this.actionSheetProvider.createNeedsBackup();
      needsBackup.present();
      needsBackup.onDidDismiss(data => {
        if (data === 'goToBackup') this.goToBackup();
      });
    } else {
      this.analyticsProvider.logEvent('buy_crypto_button_clicked', {
        from: 'walletDetails',
        coin: this.wallet.coin
      });
      this.router.navigate(['/amount'], {
        state: {
          coin: this.wallet.coin,
          fromBuyCrypto: true,
          nextPage: 'CryptoOrderSummaryPage',
          currency:
            this.configProvider.get().wallet.settings.alternativeIsoCode,
          walletId: this.wallet.id
        }
      });
    }
  }

  public showMoreOptions(): void {
    const showRequest =
      this.wallet && this.wallet.isComplete() && !this.wallet.needsBackup;
    const showShare = showRequest && this.isCordova;
    const optionsSheet = this.actionSheetProvider.createOptionsSheet(
      'wallet-options',
      { showShare, showRequest }
    );
    optionsSheet.present();

    optionsSheet.onDidDismiss(option => {
      if (option == 'request-amount') this.requestSpecificAmount();
      if (option == 'share-address') this.shareAddress();
    });
  }

  public handleDonation() {
    this.walletProvider
      .getDonationInfo()
      .then((data: any) => {
        if (_.isEmpty(data)) throw new Error('No data Remaning');
        this.router.navigate(['/send-page'], {
          state: {
            toAddress: _.get(
              _.find(
                data.donationToAddresses,
                item => item.coin == this.wallet.coin
              ),
              'address',
              ''
            ),
            donationSupportCoins: data.donationSupportCoins,
            id: this.wallet.credentials.walletId,
            walletId: this.wallet.credentials.walletId,
            recipientType: 'wallet',
            name: this.wallet.name,
            coin: this.wallet.coin,
            network: this.wallet.network,
            isDonation: true,
            fromWalletDetails: true,
            minMoneydonation: data.minMoneydonation,
            remaining: data.remaining,
            receiveLotus: data.receiveAmountLotus,
            donationCoin: data.donationCoin
          }
        });
      })
      .catch(err => {
        console.log(err);
      });
  }

  public requestSpecificAmount(): void {
    this.walletProvider.getAddress(this.wallet, false).then(addr => {
      this.router.navigate(['/custom-amount'], {
        state: {
          toAddress: addr,
          id: this.wallet.credentials.walletId,
          recipientType: 'wallet',
          name: this.wallet.name,
          color: this.wallet.color,
          coin: this.wallet.coin,
          nextPage: 'CustomAmountPage',
          network: this.wallet.network
        }
      });
    });
  }

  private shareAddress(): void {
    if (!this.isCordova) return;
    this.walletProvider.getAddress(this.wallet, false).then(addr => {
      if (this.platformProvider.isAndroid)
        this.appProvider.skipLockModal = true;
      this.socialSharing.share(addr);
    });
  }

  public showErrorInfoSheet(error: Error | string): void {
    const infoSheetTitle = this.translate.instant('Error');
    this.errorsProvider.showDefaultError(
      this.bwcErrorProvider.msg(error),
      infoSheetTitle
    );
  }

  public goToBackup(): void {
    this.router.navigate(['/backup-key'], {
      state: { keyId: this.wallet.credentials.keyId }
    });
  }

  public getBalance() {
    const lastKnownBalance = this.wallet.lastKnownBalance;
    if (this.wallet.coin === 'xrp') {
      const availableBalanceStr =
        this.wallet.cachedStatus &&
        this.wallet.cachedStatus.availableBalanceStr;
      return availableBalanceStr || lastKnownBalance;
    } else {
      const totalBalanceStr =
        this.wallet.cachedStatus && this.wallet.cachedStatus.totalBalanceStr;
      return totalBalanceStr || lastKnownBalance;
    }
  }

  public getAlternativeBalance() {
    const totalBalanceAlternative =
      this.wallet.cachedStatus &&
      this.wallet.cachedStatus.totalBalanceAlternative;
    return DecimalFormatBalance(totalBalanceAlternative);
  }

  public formatTxAmount(amount: any) {
    return DecimalFormatBalance(amount);
  }

  public async viewOnBlockchain() {
    if (
      this.wallet.coin !== 'eth' &&
      this.wallet.coin !== 'xrp' &&
      !this.currencyProvider.isERCToken(this.wallet.coin)
    )
      return;
    const address = await this.walletProvider.getAddress(this.wallet, false);
    let url;
    if (this.wallet.coin === 'xrp') {
      url =
        this.wallet.credentials.network === 'livenet'
          ? `https://${this.blockexplorerUrl}account/${address}`
          : `https://${this.blockexplorerUrlTestnet}account/${address}`;
    }
    if (this.wallet.coin === 'eth') {
      url =
        this.wallet.credentials.network === 'livenet'
          ? `https://${this.blockexplorerUrl}address/${address}`
          : `https://${this.blockexplorerUrlTestnet}address/${address}`;
    }
    if (this.currencyProvider.isERCToken(this.wallet.coin)) {
      url =
        this.wallet.credentials.network === 'livenet'
          ? `https://${this.blockexplorerUrl}address/${address}#tokentxns`
          : `https://${this.blockexplorerUrlTestnet}address/${address}#tokentxns`;
    }
    let optIn = true;
    let title = null;
    let message = this.translate.instant('View History');
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

  getContactName(address: string) {
    const existsContact = _.find(this.addressbook, c => c.address === address);
    if (existsContact) return existsContact.name;
    return null;
  }

  public viewTxOnBlockchain(txId): void {
    const url =
      this.wallet.credentials.network === 'livenet'
        ? `https://${this.blockexplorerUrl}tx/${txId}`
        : `https://${this.blockexplorerUrlTestnet}tx/${txId}`;

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

  public viewAddressOnBlockchain(address): void {
    const url =
      this.wallet.credentials.network === 'livenet'
        ? `https://${this.blockexplorerUrl}address/${address}`
        : `https://${this.blockexplorerUrlTestnet}address/${address}`;

    let optIn = true;
    let title = null;
    let message = this.translate.instant('View Address');
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

  public handleNavigateBack() {
    if (this.isSendFromHome) {
      this.router.navigate(['/tabs/home']);
    } else if (this.isGenNewAddress) {
      this.isGenNewAddress = false;
      this.router.navigate(['/tabs/home']).then(() => {
        this.router.navigate(['/tabs/wallets']);
      });
    } else {
      this.router.navigate(['/tabs/wallets']);
    }
  }
}
