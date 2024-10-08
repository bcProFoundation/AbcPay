import { Component, NgZone } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AppProvider } from '../providers/app/app';
import { BwcErrorProvider } from '../providers/bwc-error/bwc-error';
import { ClipboardProvider } from '../providers/clipboard/clipboard';
import { EventManagerService } from '../providers/event-manager.service';
import { Logger } from '../providers/logger/logger';
import {
  Network,
  PersistenceProvider
} from '../providers/persistence/persistence';
import { PlatformProvider } from '../providers/platform/platform';
import { ProfileProvider } from '../providers/profile/profile';
import { RateProvider } from '../providers/rate/rate';
import { ThemeProvider } from '../providers/theme/theme';
import { WalletProvider } from '../providers/wallet/wallet';
import * as _ from 'lodash';
import { TokenProvider } from '../providers/token-sevice/token-sevice';


interface UpdateWalletOptsI {
  walletId: string;
  force?: boolean;
  alsoUpdateHistory?: boolean;
}

export interface AttendanceDays {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage {
  appName: string;
  tabs;
  NETWORK = 'livenet';
  currentTheme;
  selectedTab;
  public txpsN: number;
  public clipboardBadge: number;
  public clipboardData: string;
  public cardNotificationBadgeText;
  public scanIconType: string;
  public isCordova: boolean;
  public navigationType: string;
  private zone;

  private onResumeSubscription: Subscription;
  private onPauseSubscription: Subscription;

  constructor(
    private plt: Platform,
    private appProvider: AppProvider,
    private profileProvider: ProfileProvider,
    private logger: Logger,
    private walletProvider: WalletProvider,
    private events: EventManagerService,
    private persistenceProvider: PersistenceProvider,
    private translate: TranslateService,
    private bwcErrorProvider: BwcErrorProvider,
    private rateProvider: RateProvider,
    private platformProvider: PlatformProvider,
    private themeProvider: ThemeProvider,
    private clipboardProvider: ClipboardProvider,
    private tokenProvider: TokenProvider,
  ) {
    this.persistenceProvider.getNetwork().then((network: string) => {
      if (network) {
        this.NETWORK = network;
      }
      this.logger.log(`tabs initialized with ${this.NETWORK}`);
    });

    this.zone = new NgZone({ enableLongStackTrace: false });
    this.logger.info('Loaded: TabsPage');
    this.appName = this.appProvider.info.nameCase;
    this.isCordova = this.platformProvider.isCordova;
    this.scanIconType =
      this.appName == 'BitPay' ? 'tab-scan' : 'tab-copay-scan';
    this.navigationType = this.themeProvider.getSelectedNavigationType();

    if (this.platformProvider.isElectron) {
      this.updateDesktopOnFocus();
    }

    this.persistenceProvider.getCardExperimentFlag().then(status => {
      if (status === 'enabled') {
        this.persistenceProvider
          .getCardNotificationBadge()
          .then(badgeStatus => {
            this.cardNotificationBadgeText =
              badgeStatus === 'disabled' ? null : 'New';
          });
      }
    });
  }

  setCurrentTab(event) {
    this.selectedTab = event?.tab || '';
  }

  setIconHomeTab(selectedTab) {
    return selectedTab === 'home'
      ? `assets/img/tab-home-selected-${this.currentTheme}.svg`
      : `assets/img/tab-home-${this.currentTheme}.svg`;
  }

  setIconWalletsTab(selectedTab) {
    return selectedTab === 'wallets'
      ? `assets/img/tab-wallet-selected-${this.currentTheme}.svg`
      : `assets/img/tab-wallet-${this.currentTheme}.svg`;
  }

  private subscribeEvents() {
    this.events.subscribe('experimentUpdateStart', () => {
      this.tabs.select(2);
    });
    this.events.subscribe('bwsEvent', this.bwsEventHandler);
    this.events.subscribe('Local/UpdateTxps', data => {
      this.setTxps(data);
    });
    this.events.subscribe('Local/FetchWallets', () => {
      this.fetchAllWalletsStatus();
    });
    this.events.subscribe('Local/UpdateNavigationType', () => {
      this.navigationType = this.themeProvider.getSelectedNavigationType();
    });
    // Reject, Remove, OnlyPublish and SignAndBroadcast -> Update Status per Wallet -> Update txps
    this.events.subscribe('Local/TxAction', opts => {
      this.logger.debug('RECV Local/TxAction @home', opts);
      opts = opts || {};
      opts.alsoUpdateHistory = true;
      this.fetchWalletStatus(opts);
    });
    // Wallet is focused on some inner view, therefore, we refresh its status and txs
    this.events.subscribe('Local/WalletFocus', opts => {
      this.logger.debug('RECV Local/TxAction @home', opts);
      opts = opts || {};
      opts.alsoUpdateHistory = true;
      this.fetchWalletStatus(opts);
      this.updateTxps();
    });
  }

  private unsubscribeEvents() {
    this.events.unsubscribe('bwsEvent');
    this.events.unsubscribe('Local/UpdateTxps');
    this.events.unsubscribe('Local/FetchWallets');
    this.events.unsubscribe('Local/UpdateNavigationType');
    this.events.unsubscribe('experimentUpdateStart');
  }

  ngOnInit() {
    this.currentTheme = this.appProvider.themeProvider.currentAppTheme;
    this.subscribeEvents();
    this.onResumeSubscription = this.plt.resume.subscribe(() => {
      this.subscribeEvents();
      setTimeout(() => {
        this.updateTxps();
        this.fetchAllWalletsStatus();
      }, 1000);
    });

    //Detect Change theme
    this.themeProvider.themeChange.subscribe(() => {
      this.currentTheme = this.appProvider.themeProvider.currentAppTheme;
    });

    this.onPauseSubscription = this.plt.pause.subscribe(() => {
      this.unsubscribeEvents();
    });

    this.checkCardEnabled();
    this.checkClipboardData();
    // TODO: Feature Marketing Board
    // this.initializeAttendanceDays();
  }

  ngOnDestroy() {
    this.onResumeSubscription.unsubscribe();
    this.onPauseSubscription.unsubscribe();
    this.unsubscribeEvents();
  }

  initializeAttendanceDays() {
    // Initialize Attendance Days
    const lcS = JSON.parse(localStorage.getItem('attendance'));
    if (!lcS) {
      const attentionDays: AttendanceDays = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      };
      localStorage.setItem('attendance', JSON.stringify(attentionDays));
    }
  }

  // Names:
  // .fetch => from BWS
  // .update => to UI
  /* This is the only .getStatus call in Copay */
  private fetchWalletStatus = (opts: UpdateWalletOptsI): void => {
    if (!opts.walletId) {
      this.logger.error('Error no walletId in update Wallet');
      return;
    }
    this.events.publish('Local/WalletUpdate', {
      walletId: opts.walletId,
      finished: false
    });

    this.logger.debug(
      'fetching status for: ' +
        opts.walletId +
        ' alsohistory:' +
        opts.alsoUpdateHistory
    );
    const wallet = this.profileProvider.getWallet(opts.walletId);
    if (!wallet) return;

    this.walletProvider
      .fetchStatus(wallet, opts)
      .then(status => {
        wallet.cachedStatus = status;
        wallet.error = wallet.errorObj = null;

        const balance =
          wallet.coin === 'xrp'
            ? wallet.cachedStatus.availableBalanceStr
            : wallet.cachedStatus.totalBalanceStr;

        this.persistenceProvider.setLastKnownBalance(wallet.id, balance);

        // Update txps
        this.updateTxps();
        this.events.publish('Local/WalletUpdate', {
          walletId: opts.walletId,
          finished: true
        });

        if (opts.alsoUpdateHistory) {
          this.fetchTxHistory({ walletId: opts.walletId, force: opts.force });
        }
      })
      .catch(err => {
        if (err == 'INPROGRESS') return;

        this.logger.warn('Update error:', err);

        // this.processWalletError(wallet, err);

        this.events.publish('Local/WalletUpdate', {
          walletId: opts.walletId,
          finished: true,
          error: wallet.error
        });

        if (opts.alsoUpdateHistory) {
          this.fetchTxHistory({ walletId: opts.walletId, force: opts.force });
        }
      });
  };

  private fetchTxHistory(opts: UpdateWalletOptsI) {
    if (!opts.walletId) {
      this.logger.error('Error no walletId in update History');
      return;
    }
    const wallet = this.profileProvider.getWallet(opts.walletId);

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
      .fetchTxHistory(wallet, progressFn, opts)
      .then(txHistory => {
        wallet.completeHistory = txHistory;
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

  private async checkCardEnabled() {
    let cardExperimentEnabled =
      (await this.persistenceProvider.getCardExperimentFlag()) === 'enabled';

    const cards = await this.persistenceProvider.getBitpayDebitCards(
      Network[this.NETWORK]
    );

    if (!cardExperimentEnabled) {
      try {
        this.logger.debug('BitPay: setting country');
      } catch (err) {
        this.logger.error('Error setting country: ', err);
      }
    }

    // set banner advertisement in home.ts
    this.events.publish('CardAdvertisementUpdate', {
      status: cards ? 'connected' : null,
      cardExperimentEnabled,
      cards
    });
  }

  disableCardNotificationBadge() {
    this.persistenceProvider.getCardExperimentFlag().then(status => {
      if (status === 'enabled') {
        this.cardNotificationBadgeText = null;
        this.persistenceProvider.setCardNotificationBadge('disabled');
      }
    });
  }

  updateTxps() {
    this.profileProvider.getTxps({ limit: 3 }).then(data => {
      this.setTxps(data);
    });
  }

  setTxps(data) {
    this.zone.run(() => {
      this.txpsN = data.n;
    });
  }

  private updateDesktopOnFocus() {
    const { remote } = (window as any).require('electron');
    const win = remote.getCurrentWindow();
    win.on('focus', () => {
      this.events.publish('Desktop/onFocus');
      this.checkClipboardData();
      setTimeout(() => {
        this.updateTxps();
        this.fetchAllWalletsStatus();
      }, 1000);
    });
  }

  private async checkClipboardData(): Promise<void> {
    this.clipboardData = await this.clipboardProvider.getValidData();
    this.clipboardBadge = this.clipboardData ? 1 : 0;
  }

  private bwsEventHandler: any = (walletId: string, type: string) => {
    _.each(
      [
        'TxProposalRejectedBy',
        'TxProposalAcceptedBy',
        'transactionProposalRemoved',
        'TxProposalRemoved',
        'NewOutgoingTx',
        'UpdateTx',
        'NewIncomingTx'
      ],
      (eventName: string) => {
        if (
          walletId &&
          type == eventName &&
          (type === 'NewIncomingTx' || type === 'NewOutgoingTx')
        ) {
          this.fetchAllWalletsStatus();
        }
      }
    );
  };

  private updateTotalBalance(wallets) {
    this.rateProvider.getLastDayRates().then(lastDayRatesArray => {
      this.walletProvider
        .getTotalAmount(wallets, lastDayRatesArray)
        .then(data => {
          this.logger.debug('Total Balance and Price Updated');
          this.events.publish('Local/HomeBalance', data);
          this.events.publish('Local/PriceUpdate');
        });
    });
  }

  private processWalletError(wallet, err): void {
    wallet.error = wallet.errorObj = null;

    if (!err || err == 'INPROGRESS') return;

    wallet.cachedStatus = null;
    wallet.errorObj = err;

    if (err.message === '403') {
      this.events.publish('Local/AccessDenied');
      wallet.error = this.translate.instant('Access denied');
    } else if (err === 'WALLET_NOT_REGISTERED') {
      wallet.error = this.translate.instant('Wallet not registered');
    } else {
      wallet.error = this.bwcErrorProvider.msg(err);
    }
    this.logger.warn(
      this.bwcErrorProvider.msg(
        wallet.error,
        'Error updating status for ' + wallet.id
      )
    );
  }

  private connectionError = _.debounce(
    async () => {
      this.events.publish('Local/ConnectionError');
    },
    5000,
    {
      leading: false
    }
  );

  private fetchAllWalletsStatus = _.debounce(
    async () => {
      await this._fetchAllWallets();
    },
    5000,
    {
      leading: true
    }
  );

  private async loadToken(wallets) {
    for (const i in wallets) {
      const wallet = wallets[i];
      await this.tokenProvider.loadTokenWallet(wallet);
    }
    return wallets;
  }

  private async _fetchAllWallets() {
    let hasConnectionError: boolean = false;

    this.profileProvider.setLastKnownBalance();

    let wallets = this.profileProvider.wallet;
    if (_.isEmpty(wallets)) {
      this.events.publish('Local/HomeBalance');
      return;
    }

    this.logger.debug('Fetching All Wallets and Updating Total Balance');
    wallets = _.filter(this.profileProvider.wallet, w => {
      return !w.hidden;
    });
    const opts = { force: true };
    const pr = wallet => {
      return this.walletProvider
        .fetchStatus(wallet, opts)
        .then(st => {
          wallet.cachedStatus = st;
          wallet.error = wallet.errorObj = null;
          const balance =
            wallet.coin === 'xrp'
              ? wallet.cachedStatus.availableBalanceStr
              : wallet.cachedStatus.totalBalanceStr;

          this.persistenceProvider.setLastKnownBalance(wallet.id, balance);

          this.events.publish('Local/WalletUpdate', {
            walletId: wallet.id,
            finished: true
          });

          if (!_.isEmpty(st.serverMessages)) {
            this.events.publish('Local/ServerMessages', {
              serverMessages: st.serverMessages
            });
          }

          return Promise.resolve();
        })
        .catch(err => {
          this.processWalletError(wallet, err);
          if (err && err.message == 'Wallet service connection error.') {
            hasConnectionError = true;
            this.connectionError();
          }
          return Promise.resolve();
        });
    };

    const promises = [];

    _.each(wallets, wallet => {
      promises.push(pr(wallet));
    });

    Promise.all(promises).then(async () => {
      if (!hasConnectionError) {
        wallets = await this.loadToken(wallets);
        this.updateTotalBalance(wallets);
      }
      this.updateTxps();
    });
  }
  
}
