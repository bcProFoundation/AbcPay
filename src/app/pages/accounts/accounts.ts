import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild, ViewEncapsulation } from '@angular/core';

import * as _ from 'lodash';
import { Subscription } from 'rxjs';

// Pages
import { CopayersPage } from '../add/copayers/copayers';

// Providers
import { AnalyticsProvider } from '../../providers/analytics/analytics';
import { TranslateService } from '@ngx-translate/core';

// import { BwcErrorProvider } from '../../providers/bwc-error/bwc-error';
import { Logger } from '../../providers/logger/logger';
import { PersistenceProvider } from '../../providers/persistence/persistence';
import { PlatformProvider } from '../../providers/platform/platform';
import { ProfileProvider } from '../../providers/profile/profile';
import { WalletProvider } from '../../providers/wallet/wallet';
import { LoadingController, ModalController, NavParams, Platform, ToastController } from '@ionic/angular';
import { EventManagerService } from 'src/app/providers/event-manager.service';
import { Router } from '@angular/router';
import { DecimalFormatBalance } from 'src/app/providers/decimal-format.ts/decimal-format';
import { ActionSheetProvider } from 'src/app/providers';

interface UpdateWalletOptsI {
  walletId: string;
  force?: boolean;
  alsoUpdateHistory?: boolean;
}

@Component({
  selector: 'accounts-page ',
  templateUrl: 'accounts.html',
  styleUrls: ['accounts.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AccountsPage {
  @ViewChild('priceCard')
  priceCard;
  public wallets;
  public walletsGroups = [];
  public txpsN: number;

  public collapsedGroups;

  private zone;
  private onResumeSubscription: Subscription;
  private onPauseSubscription: Subscription;
  isDonation;
  donationSupportCoins = [];
  navParamsData;
  listEToken = ['EAT', 'DoC', 'bcPro', 'LPSe', 'eHNL', 'eLPS', 'USDR', '🎖MVP', 'BUX', 'BTCinu'];
  public isToken: boolean;
  public tokenID: string;
  public isShowCreateNewWallet = false;
  public network: string ;
  public coin: string ;
  public titlePage : string = 'Select account';
  public isAddToHome : boolean = false;
  public isSpecificAmount: boolean = false;
  public isShowNoToken = false;
  constructor(
    public http: HttpClient,
    private plt: Platform,
    private router: Router,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private platformProvider: PlatformProvider,
    private analyticsProvider: AnalyticsProvider,
    private logger: Logger,
    private events: EventManagerService,
    private persistenceProvider: PersistenceProvider,
    private modalCtrl: ModalController,
    private loadingCtr: LoadingController,
    private navParams: NavParams,
    private toastController: ToastController,
    private translate: TranslateService,
    private actionSheetProvider: ActionSheetProvider
  ) {
    this.collapsedGroups = {};
    this.zone = new NgZone({ enableLongStackTrace: false });
    
  }

  getWalletGroup(name: string) {
    return this.profileProvider.getWalletGroup(name)
  }

  ionViewDidEnter() {
    this._didEnter();
  }

  ionViewWillEnter() {
  
  }

  private getWalletsGroups() {
    const walletsGroups = this.profileProvider.orderedWalletsByGroup;
    if (this.isDonation) {
      this.walletProvider.getDonationInfo().then((data: any) => {
        this.donationSupportCoins = data.donationSupportCoins;
        this.walletsGroups = this.filterValidWallet(walletsGroups);
      });
    }
    else {
      if (this.navParamsData?.isToken) {
        this.walletsGroups = this.getTokensGroups(walletsGroups);
        this.tokenID ? this.checkCaseExistOneToken(this.walletsGroups) : this.checkCaseExistToken(this.walletsGroups);
      } else {
        this.walletsGroups = this.filterValidWallet(walletsGroups);
      }
    }
  }

  private getTokensGroups(walletsGroups) {
    const filterWalletsGroups = this.filterValidWallet(walletsGroups);
    let tokensGroup = [];
    tokensGroup = filterWalletsGroups.map((wallet) => {
      return wallet.filter(subWallet => subWallet?.tokens);
    });
    return tokensGroup;
  }

  setIconToken(token) {
    const isValid = this.listEToken.includes(token?.tokenInfo?.symbol);
    if (token?.tokenInfo?.name == 'MVP') {
      return `assets/img/currencies/${token?.tokenInfo?.name}.svg`
    }
    return isValid ? `assets/img/currencies/${token?.tokenInfo?.symbol}.svg` : 'assets/img/currencies/eToken.svg';
  }

  private filterValidWallet(walletGroups: any) {
    const walletsGroup = [];
    walletGroups.forEach((el: any) => {
      const wallet = el.filter(wallet => {
        if (this.isDonation) {
          return wallet.isComplete() && !wallet.needsBackup && _.some(this.donationSupportCoins, (item: any) => item.network == wallet.network && item.coin == wallet.coin);
        } else {
          if (this.network && this.coin) {
            return wallet.isComplete() && !wallet.needsBackup && this.network == wallet.network && this.coin == wallet.coin;
          } else {
            return wallet.isComplete() && !wallet.needsBackup;
          }
        }
      })
      walletsGroup.push(wallet);
    })
    const checkIsOneAccount = walletsGroup.filter(key => key.length > 0);
    if (checkIsOneAccount.length == 0) {
      this.isShowCreateNewWallet = true;
    } else if (checkIsOneAccount.length == 1 && checkIsOneAccount[0].length == 1 && !this.isToken && !this.isAddToHome) {
      this.goToSendPage(checkIsOneAccount[0][0], true);
    }
    return walletsGroup;
  }

  private checkCaseExistOneToken(walletsGroups) {
    let tokensGroups = [];
    walletsGroups.map((item) => {
      return item.map((wallet) => {
          let validToken = wallet.tokens.find(token => token.tokenId === this.tokenID);
          if (validToken) {
            validToken.walletId = wallet.credentials.walletId;
            tokensGroups.push(validToken);
          }
      })
    })
    // Only 1 token account in list => go to send page
    if (this.isSpecificAmount && tokensGroups.length === 0) {
      this.isShowNoToken = true;
      this.router.navigate(['']).then(() => {
        const warningSheet = this.actionSheetProvider.createInfoSheet('scan-eToken-error-message');
        warningSheet.present();
      });
    } else if (this.isSpecificAmount && tokensGroups.length === 1) {
      this.goToSendPageForToken(tokensGroups[0].walletId, tokensGroups[0], true);
    }
  }

  private checkCaseExistToken(walletsGroups) {
    let tokensGroups = [];
    walletsGroups.map((key) => {
      return key.map((wallet) => {
          let hasToken = wallet.tokens.find(token => token.tokenId);
          if (hasToken) {
            tokensGroups.push(hasToken);
          }
      })
    })
    // Check ExistToken
    if (tokensGroups.length === 0) {
      this.isShowNoToken = true;
      this.router.navigate(['']).then(() => {
        const warningSheet = this.actionSheetProvider.createInfoSheet('scan-eToken-error-message');
        warningSheet.present();
      });
    }
  }

  public DecimalFormatBalance(amount) {
    return DecimalFormatBalance(amount);
  }

  private async walletAudienceEvents() {
    try {
      const deviceUUID = this.platformProvider.getDeviceUUID();
      const hasCreatedWallet = await this.persistenceProvider.getHasReportedFirebaseWalletCreateFlag();
      const hasSecuredWalletFlag = await this.persistenceProvider.getHasReportedFirebaseSecuredWallet();
      const hasFundedWallet = await this.persistenceProvider.getHasReportedFirebaseHasFundedWallet();
      const hasNotFundedWallet = await this.persistenceProvider.getHasReportedFirebasedNonFundedWallet();
      const keys = await this.persistenceProvider.getKeys();

      if (!hasCreatedWallet) {
        if (keys && keys.length > 0) {
          this.analyticsProvider.logEvent('user_has_created_wallet', {
            uuid: deviceUUID,
            timestamp: Date.now()
          });
          this.persistenceProvider.setHasReportedFirebaseWalletCreateFlag();
        }
      }

      if (!hasSecuredWalletFlag) {
        let hasAtLeastOneMnemonicEncrypted = keys.some(
          key => key.mnemonicEncrypted
        );
        if (hasAtLeastOneMnemonicEncrypted) {
          this.analyticsProvider.logEvent('user_has_secured_wallet', {
            uuid: deviceUUID
          });
          this.persistenceProvider.setHasReportedFirebaseSecuredWallet();
        }
      }

      if (!hasFundedWallet) {
        let totalBalance = await this.persistenceProvider.getTotalBalance();
        if (parseFloat(totalBalance.totalBalanceAlternative)) {
          this.analyticsProvider.logEvent('user_has_funded_wallet', {
            uuid: deviceUUID
          });
          this.persistenceProvider.setHasReportedFirebaseHasFundedWallet();
        } else {
          if (!hasNotFundedWallet) {
            this.analyticsProvider.logEvent('user_has_not_funded_wallet', {
              uuid: deviceUUID
            });
            this.persistenceProvider.setHasReportedFirebaseNonFundedWallet();
          }
        }
      }
    } catch (e) {
      this.logger.debug(
        'Error occurred during wallet audience events: ' + e.message
      );
    }
  }

  private _didEnter() {
    this.updateTxps();
    this.walletAudienceEvents();
  }

  private walletFocusHandler = opts => {
    this.logger.debug('RECV Local/WalletFocus @home', opts);
    opts = opts || {};
    opts.alsoUpdateHistory = true;
    this.fetchWalletStatus(opts);
  };

  private walletActionHandler = opts => {
    this.logger.debug('RECV Local/TxAction @home', opts);
    opts = opts || {};
    opts.alsoUpdateHistory = true;
    this.fetchWalletStatus(opts);
  };

  ngOnInit() {

    const subscribeEvents = () => {

      this.events.subscribe('Local/TxAction', this.walletActionHandler);

      this.events.subscribe('Local/WalletFocus', this.walletFocusHandler);
    };

    subscribeEvents();
    this.onResumeSubscription = this.plt.resume.subscribe(() => {
      subscribeEvents();
    });

    this.onPauseSubscription = this.plt.pause.subscribe(() => {
      this.events.unsubscribe('Local/TxAction', this.walletFocusHandler);
      this.events.unsubscribe('Local/WalletFocus', this.walletFocusHandler);
    });

    this.walletsGroups = [];
    if (this.router.getCurrentNavigation()) {
      this.navParamsData = this.router.getCurrentNavigation().extras.state ? this.router.getCurrentNavigation().extras.state : {};
    } else {
      this.navParamsData = history ? history.state : {};
    }
    if (_.isEmpty(this.navParamsData) && this.navParams && !_.isEmpty(this.navParamsData)) this.navParamsData = this.navParamsData;
    this.isDonation = this.navParamsData.isDonation;
    this.isAddToHome = this.navParamsData.isAddToHome;
    this.isToken = this.navParamsData?.isToken;
    this.isSpecificAmount = this.navParamsData?.isSpecificAmount;
    this.tokenID = this.navParamsData?.tokenID;
    if (this.isDonation) this.titlePage = "Accounts";
    if (this.isAddToHome) this.titlePage = "Add to home";
    this.coin = this.navParamsData.coin;
    this.network = this.navParamsData.network;
    this.getWalletsGroups();
  }

  ngOnDestroy() {
    this.onResumeSubscription.unsubscribe();
    this.onPauseSubscription.unsubscribe();
  }

  private debounceFetchWalletStatus = _.debounce(
    async (walletId, alsoUpdateHistory) => {
      this.fetchWalletStatus({ walletId, alsoUpdateHistory });
    },
    3000
  );

  public goToHome() {
    this.router.navigate(['/tabs/home']);
  }

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

  private updateTxps() {
    this.profileProvider
      .getTxps({ limit: 3 })
      .then(data => {
        this.events.publish('Local/UpdateTxps', {
          n: data.n
        });
        this.zone.run(() => {
          this.txpsN = data.n;
        });
      })
      .catch(err => {
        this.logger.error(err);
      });
  }

  public handleDonation(wallet) {
    const loading = this.loadingCtr.create({
      message: 'Please wait...'
    })
    loading.then(loadingEl => loadingEl.present());
    this.walletProvider.getDonationInfo().then((data: any) => {
      loading.then(loadingEl => loadingEl.dismiss());
      if (_.isEmpty(data)) {
        throw new Error("No data Remaning");
      }
      this.router.navigate(['/send-page'], {
        state: {
          toAddress: _.get(_.find(data.donationToAddresses, item => item.coin == wallet.coin), 'address', ''),
          donationSupportCoins: data.donationSupportCoins,
          id: wallet.credentials.walletId,
          walletId: wallet.credentials.walletId,
          recipientType: 'wallet',
          name: wallet.name,
          coin: wallet.coin,
          network: wallet.network,
          isDonation: true,
          fromWalletDetails: true,
          minMoneydonation: data.minMoneydonation,
          remaining: data.remaining,
          receiveLotus: data.receiveAmountLotus,
          donationCoin: data.donationCoin
        }
      });
    }).catch((err) => {
      console.log(err)
      loading.then(loadingEl => loadingEl.dismiss());
    });
  }

  public async goToSendPage(wallet, isOneAccount?) {
    if (this.isDonation) {
      return this.handleDonation(wallet);
    }
    if (wallet.isComplete()) {
      this.router.navigate(['/send-page'], {
        state: {
          walletId: wallet.credentials.walletId,
          toAddress: this.navParamsData.toAddress
        },
        replaceUrl: !!isOneAccount
      });
    } else {
      const copayerModal = await this.modalCtrl.create({
        component: CopayersPage,
        componentProps: {
          walletId: wallet.credentials.walletId
        },
        cssClass: 'wallet-details-modal'
      });
      await copayerModal.present();
    }
  }

  public async goToSendPageForToken(walletId, token, isOneToken?) {
    this.router.navigate(['/send-page'], {
      state: {
        walletId: walletId,
        toAddress: this.navParamsData.toAddress,
        token: token
      },
      replaceUrl: !!isOneToken
    });
  }
  
  public openBackupPage(keyId) {
    this.router.navigate(['/backup-key'], {
      state: {
        keyId
      },
    })
  }

  async presentToast(finishText, cssClass?) {
    const toast = await this.toastController.create({
      message: this.translate.instant(finishText),
      duration: 3000,
      position: 'bottom',
      animated: true,
      cssClass: `custom-finish-toast ${cssClass}`,
    });
    toast.present();
  }

  public addToGroupsHome(wallet) {
    let walletObj = {
      walletId: wallet?.id
    }
    let result = this.profileProvider.setWalletGroupsHome(walletObj);
    if (result && result.added.status) {
      this.router.navigate(['/tabs/home']).then(() => {
        this.events.publish('Local/GetListPrimary', true);
        this.presentToast(result.added.message);
      });
    } else if (result && result.full.status) {
      this.presentToast(result.full.message, 'toast-warning');
    } else if (result && result.duplicate.status) {
      this.presentToast(result.duplicate.message, 'toast-info');
    }
  }


}
