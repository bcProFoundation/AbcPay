import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, NgZone, ViewChild, ViewEncapsulation } from '@angular/core';

import * as _ from 'lodash';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';

// Pages
import { CopayersPage } from '../add/copayers/copayers';

// Providers
import { AnalyticsProvider } from '../../providers/analytics/analytics';
import { Logger } from '../../providers/logger/logger';
import { PersistenceProvider } from '../../providers/persistence/persistence';
import { PlatformProvider } from '../../providers/platform/platform';
import { ProfileProvider } from '../../providers/profile/profile';
import { WalletProvider } from '../../providers/wallet/wallet';
import { IonItemSliding, MenuController, ModalController, NavParams, Platform, ToastController } from '@ionic/angular';
import { EventManagerService } from 'src/app/providers/event-manager.service';
import { Router } from '@angular/router';
import { TokenProvider } from 'src/app/providers/token-sevice/token-sevice';
import { AddressProvider } from 'src/app/providers/address/address';
import { Token } from 'src/app/providers/currency/token';
import { AppProvider, ConfigProvider, CurrencyProvider, LoadingProvider, OnGoingProcessProvider, PushNotificationsProvider, ThemeProvider } from 'src/app/providers';
import { DecimalFormatBalance } from 'src/app/providers/decimal-format.ts/decimal-format';
import { EventsService } from 'src/app/providers/events.service';
import { TranslateService } from '@ngx-translate/core';
import { DeviceProvider } from 'src/app/providers/device/device';
import { AttendanceDays } from 'src/app/tabs/tabs.page';

interface UpdateWalletOptsI {
  walletId: string;
  force?: boolean;
  alsoUpdateHistory?: boolean;
}

@Component({
  selector: 'page-wallets',
  templateUrl: 'wallets.html',
  styleUrls: ['wallets.scss'],
  encapsulation: ViewEncapsulation.None
})
export class WalletsPage {
  @ViewChild('priceCard')
  priceCard;

  @ViewChild('slidingItem') slidingItem: IonItemSliding;
  public wallets;
  public walletsGroups = [];
  public txpsN: number;

  public collapsedGroups;
  public collapsedToken;

  private zone;
  private onResumeSubscription: Subscription;
  private onPauseSubscription: Subscription;
  public showReorder: boolean = false;
  public currentCurrency;
  public isScroll = false;
  public isDisableBtnMenu: boolean = false;
  public symbolCurrency;
  public keyHiddenBalanceTemp = [];
  public flagOptionRemove: boolean;
  listEToken = ['EAT', 'DoC', 'bcPro', 'LPSe', 'eHNL', 'eLPS', 'USDR', '🎖MVP', 'BUX', 'BTCinu'];
  donationSupportCoins = [];
  navParamsData;
  isShowCreateNewWallet = false;
  groupToken;
  currentTheme;
  totalBalanceKey;
  isShowBalance = true;
  keySelected = [];
  keyNameSelected;
  isLoading: boolean = false;

  constructor(
    public http: HttpClient,
    private plt: Platform,
    private router: Router,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    public platformProvider: PlatformProvider,
    private analyticsProvider: AnalyticsProvider,
    private logger: Logger,
    private events: EventManagerService,
    private eventsService: EventsService,
    private persistenceProvider: PersistenceProvider,
    private modalCtrl: ModalController,
    private navParams: NavParams,
    private tokenProvider: TokenProvider,
    private changeDetectorRef: ChangeDetectorRef,
    private addressProvider: AddressProvider,
    private menu: MenuController,
    private appProvider: AppProvider,
    private currencyProvider: CurrencyProvider,
    private configProvider: ConfigProvider,
    private themeProvider: ThemeProvider,
    private toastController: ToastController,
    private loadingProvider: LoadingProvider,
    private translate: TranslateService,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private deviceProvider: DeviceProvider,
    private pushNotificationProvider: PushNotificationsProvider
  ) {
    let config = this.configProvider.get();
    this.zone = new NgZone({ enableLongStackTrace: false });
    const currentCurrency = config.wallet.settings.alternativeIsoCode;
    switch (currentCurrency) {
      case 'VND':
        this.symbolCurrency = '₫';
        break;
      case 'HNL':
        this.symbolCurrency = 'L';
        break;
      default:
        this.symbolCurrency = '$';
    }
    if (this.router.getCurrentNavigation()) {
      this.navParamsData = this.router.getCurrentNavigation().extras.state ? this.router.getCurrentNavigation().extras.state : {};
    } else {
      this.navParamsData = history ? history.state : undefined;
    }
    const availableChains = this.currencyProvider.getAvailableChains();
    this.currentCurrency = config.wallet.settings.alternativeIsoCode;
    this.currentTheme = this.themeProvider.currentAppTheme;
    this.collapsedGroups = {};
    this.collapsedToken = {};
  }

  async handleScrolling(event) {
    if (event.detail.currentY > 0) {
      this.isScroll = true;
    }
    else {
      this.isScroll = false;
    }
  }

  getWalletGroup(name: string) {
    return this.profileProvider.getWalletGroup(name)
  }

  ionViewDidEnter() {
    this._didEnter();
  }

  goToTokenDetails(wallet, token: Token) {
    this.router.navigate(['/token-details'], {
      state: {
        walletId: wallet.credentials.walletId,
        token: token
      }
    });
  }

  setIconToken(token) {
    const isValid = this.listEToken.includes(token?.tokenInfo?.symbol);
    if (token?.tokenInfo?.name == 'MVP') {
      return `assets/img/currencies/${token?.tokenInfo?.name}.svg`
    }
    return isValid ? `assets/img/currencies/${token?.tokenInfo?.symbol}.svg` : 'assets/img/currencies/eToken.svg';
  }

  private updateTotalBalanceKey(keySelected) {
    let totalAlternativeBalanceToken = 0;
    _.forEach(keySelected, wallet => {
      if (wallet.tokens) {
        totalAlternativeBalanceToken += _.sumBy(wallet.tokens, 'alternativeBalance')
      }
    })
    return totalAlternativeBalanceToken + _.toNumber(this.getTotalBalanceKey(keySelected));
  }

  private async loadTokenWallet() {
    this.isLoading = false;
    // await this.loadingProvider.simpleLoader();
    this.onGoingProcessProvider.set('Loading ...');
    await this.loadTokenData(this.keySelected).then(data => {
      this.keySelected = data;
      this.totalBalanceKey = DecimalFormatBalance(this.updateTotalBalanceKey(data));
      this.changeDetectorRef.detectChanges();
    }).catch(err => {
      this.logger.error(err);
    }).finally(() => {
      this.isLoading = true;
      this.onGoingProcessProvider.clear();
    })
  }

  openMenu() {
    this.menu.open('first');
  }

  closeMenu() {
    this.menu.close('first');
  }

  public async reorderAccounts(indexes) {
    const element = this.walletsGroups[indexes.detail.from];
    this.walletsGroups.splice(indexes.detail.from, 1);
    this.walletsGroups.splice(indexes.detail.to, 0, element);
    _.each(this.walletsGroups, (walletGroup, index: number) => {
      this.profileProvider.setWalletGroupOrder(walletGroup[0].keyId, index);
    });
    this.profileProvider.setOrderedWalletsByGroup();
    indexes.detail.complete();
  }

  private initKeySelected() {
    let keyChange = this.profileProvider.keyChange;
    let walletChange = this.profileProvider.walletChange;
    if (this.walletsGroups.length !== 0) {
      if (this.keySelected.length === 0 || keyChange.isDelete) {
        this.totalBalanceKey = DecimalFormatBalance(this.getTotalBalanceKey(this.walletsGroups[0]));
        this.keySelected = this.walletsGroups[0];
        this.keyNameSelected = this.getWalletGroup(this.keySelected[0].keyId).name;
        this.profileProvider.keyChange.isDelete = false;
      }
      if (keyChange.isStatus && keyChange.keyId) {
        const walletsGroups = this.profileProvider.orderedWalletsByGroup;
        const newAddWallet = walletsGroups.find((item) => {
          return item[0].keyId == keyChange.keyId;
        })
        this.totalBalanceKey = DecimalFormatBalance(this.getTotalBalanceKey(newAddWallet));
        this.keySelected = newAddWallet;
        this.keyNameSelected = this.getWalletGroup(this.keySelected[0].keyId).name;
        this.profileProvider.keyChange.isStatus = false;
      }
      if (walletChange.isStatus && walletChange.keyId) {
        const walletsGroups = this.profileProvider.orderedWalletsByGroup;
        const newAddWallet = walletsGroups.find((item) => {
          return item[0].keyId == walletChange.keyId;
        })
        this.totalBalanceKey = DecimalFormatBalance(this.getTotalBalanceKey(newAddWallet));
        this.keySelected = newAddWallet;
        this.keyNameSelected = this.getWalletGroup(this.keySelected[0].keyId).name;
        this.profileProvider.walletChange.isStatus = false;
      }
    } else {
      this.keySelected = [];
      this.walletsGroups = [];
    }
  }

  public openWalletGroupSettings(keyId: string): void {
    this.router.navigate(['/key-settings'], {
      state: {
        keyId: keyId
      }
    });
  }

  public changShowBalanceKey() {
    let obj = {};
    this.isShowBalance = !this.isShowBalance;
    obj = {
      keyId: this.keySelected[0].keyId,
      isShowBalanceKey: this.isShowBalance
    }
    this.keySelected.forEach(ele => {
      this.profileProvider.toggleHideBalanceFlag(
        ele.credentials.walletId
      )
    });
    this.events.publish('Local/GetListPrimary', true);
    const keyItemTemp = this.keyHiddenBalanceTemp.find((item) => {
      return item.keyId === this.keySelected[0].keyId;
    })
    if (keyItemTemp) {
      keyItemTemp.isShowBalanceKey = this.isShowBalance;
    } else {
      this.keyHiddenBalanceTemp.push(obj);
    }
  }

  public getKeySelected(keyId) {
    const keyItem = this.keyHiddenBalanceTemp.find((item) => {
      return item.keyId === keyId;
    })
    if (keyItem) {
      this.isShowBalance = keyItem.isShowBalanceKey;
    } else {
      this.isShowBalance = true;
    }
    this.keySelected = this.profileProvider.getWalletsFromGroup({ keyId: keyId });
    this.keyNameSelected = this.getWalletGroup(this.keySelected[0].keyId).name;
    this.totalBalanceKey = DecimalFormatBalance(this.getTotalBalanceKey(this.keySelected));
    this.loadTokenWallet();
    this.closeMenu();
  }

  public handleBtnSubMenu(isDisable) {
    return isDisable ? this.isDisableBtnMenu = true : this.isDisableBtnMenu = false;
  }

  private getTotalBalanceKey(key) {
    const totalBalanceAlternative = key.reduce((result, wallet) => {
      if (wallet.cachedStatus && wallet.cachedStatus.totalBalanceAlternative && wallet.network !== 'testnet') {
        result += parseFloat(wallet.cachedStatus.totalBalanceAlternative.replaceAll(',', ''));
      }
      return result;
    }, 0)
    return totalBalanceAlternative;
  }

  public DecimalFormatBalance(amount) {
    return DecimalFormatBalance(amount);
  }

  public addKey(): void {
    this.router.navigate(['/add'], {
      state: {
        isZeroState: true
      },
    })
  }

  public openProposalsNotificationsPage(): void {
    this.router.navigate(['/proposals-notifications']);
  }

  loadEtokenAddress(wallet) {
    return this.profileProvider.setAddress(wallet).then(addr => {
      if (!addr) return '';
      const { prefix, type, hash } = this.addressProvider.decodeAddress(addr);
      const etoken = this.addressProvider.encodeAddress('etoken', type, hash, addr);
      return Promise.resolve(etoken);
    })
  }


  setTokensWallet(walletId, groupToken) {
    return new Promise(resolve => {
      this.profileProvider.setTokensWallet(walletId, groupToken);
      resolve(true)
    });
  }

  private async loadTokenData(keySelected) {
    for (var i = 0; i < keySelected.length; i++) {
      let wallet = keySelected[i];
      wallet = await this.tokenProvider.loadTokenWallet(wallet);
    }
    return keySelected;;
  }

  private filterLotusDonationWallet(walletGroups: any) {
    const walletsGroup = [];
    walletGroups.forEach((el: any) => {
      const wallet = el.filter(wallet => {
        return _.some(this.donationSupportCoins, (item: any) => item.network == wallet.network && item.coin == wallet.coin);
      })
      walletsGroup.push(wallet);
    })
    this.isShowCreateNewWallet = _.isEmpty(walletsGroup) || _.isEmpty(walletsGroup[0]);
    return walletsGroup;
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
    this.debounceSetWallets();
    this.updateTxps();
    this.walletAudienceEvents();
  }

  private walletGetDataHandler = opts => {
    this.logger.debug('RECV Local/GetData @home', opts);
    if (opts) {
      const walletsGroups = this.profileProvider.orderedWalletsByGroup;
      this.walletsGroups = walletsGroups;
      this.initKeySelected();
    }
  };

  ionViewWillEnter() {
    this.walletsGroups = [];
    this.walletsGroups = this.profileProvider.orderedWalletsByGroup;
    this.initKeySelected();
    this.loadTokenWallet();
  }

  ngOnInit() {
    this.logger.info('Loaded: WalletsPage');

    const subscribeEvents = () => {
      // BWS Events: Update Status per Wallet -> Update txps
      // NewBlock, NewCopayer, NewAddress, NewTxProposal, TxProposalAcceptedBy, TxProposalRejectedBy, txProposalFinallyRejected,
      // txProposalFinallyAccepted, TxProposalRemoved, NewIncomingTx, NewOutgoingTx
      this.events.subscribe('bwsEvent', this.bwsEventHandler);
      // Update wallet after change
      this.events.subscribe('Local/GetData', this.walletGetDataHandler);
    };

    //Detect Change theme
    this.themeProvider.themeChange.subscribe(() => {
      this.currentTheme = this.appProvider.themeProvider.currentAppTheme;
    });

    subscribeEvents();
    this.onResumeSubscription = this.plt.resume.subscribe(() => {
      subscribeEvents();
    });

    this.onPauseSubscription = this.plt.pause.subscribe(() => {
      this.events.unsubscribe('bwsEvent', this.bwsEventHandler);
    });
    if (!this.navParamsData.isFirstInstall) {
      // TODO: Feature Marketing Board
      // this.attendanceHandle();
    }
  }

  attendanceHandle() {
    // Condition check in: Enable Location + Active on Account Tabs
    if (this.platformProvider.isCordova) {
      const lcSAttendance = JSON.parse(localStorage.getItem('attendance'));
      const token = this.pushNotificationProvider?._token;
      if (lcSAttendance) {
        let allDay = Object.keys(lcSAttendance);
        let realTimeDay = moment().locale('en-US').format('dddd').toLowerCase();
        const attendance = allDay.includes(realTimeDay) && lcSAttendance[realTimeDay] === false;
          if (attendance) {
            // Call api update attendance
            const currentPosition = Geolocation.getCurrentPosition();
            currentPosition
              .then(coordinates => {
                if (coordinates) {
                  const locationGps =
                    coordinates.coords.latitude +
                    ',' +
                    coordinates.coords.longitude;
                  this.deviceProvider
                    .updateLogDevice({
                      deviceId: this.platformProvider.uid,
                      location: locationGps,
                      attendance: attendance,
                      token: token,
                    })
                    .subscribe(
                      rs => {
                        this.logger.info('Update success', rs);
                        const newLcSAttentionDays: AttendanceDays = {
                          monday: false,
                          tuesday: false,
                          wednesday: false,
                          thursday: false,
                          friday: false,
                          saturday: false,
                          sunday: false
                        };
                        newLcSAttentionDays[realTimeDay] = true;
                        localStorage.setItem('attendance', JSON.stringify(newLcSAttentionDays));
                        this.presentToast('Daily checked');
                      },
                      err => {
                        this.logger.error('Error update:', err);
                      }
                    );
                }
              })
              .catch(err => {
                this.logger.error('CURRENT POSITION NOT ALLOW', err);
              });
          }
      }
    }
  }

  ngOnDestroy() {
    this.onResumeSubscription.unsubscribe();
    this.onPauseSubscription.unsubscribe();
  }

  // BWS events can come many at time (publish,sign, broadcast...)
  private bwsEventHandler = (walletId, type, n) => {
    // NewBlock, NewCopayer, NewAddress, NewTxProposal, TxProposalAcceptedBy, TxProposalRejectedBy, txProposalFinallyRejected,
    // txProposalFinallyAccepted, TxProposalRemoved, NewIncomingTx, NewOutgoingTx

    const wallet = this.profileProvider.getWallet(walletId);
    if (!wallet) return;
    if (wallet.copayerId == n.creatorId) return;

    this.logger.info(`BWS Event: ${type}: `, n);

    let alsoUpdateHistory = false;
    switch (type) {
      case 'NewAddress':
        this.walletProvider.expireAddress(walletId);
        return;
      case 'NewIncomingTx':
      case 'NewOutgoingTx':
      case 'NewBlock':
        alsoUpdateHistory = true;
    }
    this.walletProvider.invalidateCache(wallet);
    this.events.publish('Local/WalletFocus', { walletId, alsoUpdateHistory });
  };

  private debounceSetWallets = _.debounce(
    async () => {
      this.profileProvider.setOrderedWalletsByGroup();
      this.walletsGroups = this.profileProvider.orderedWalletsByGroup;
      this.walletsGroups.forEach(walletArray => {
        walletArray.forEach(wallet => {
          this.events.publish('Local/WalletFocus', {
            walletId: wallet.id,
            force: true
          });
        });

      });
      await this.loadTokenWallet();
    },
    5000,
    {
      leading: true
    }
  );

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
      // TODO: Feature Marketing Board
      // if (this.platformProvider.isCordova) this.checkAppreciationBadge();
  }

  private checkAppreciationBadge() {
    let lcsAppreciation = JSON.parse(localStorage.getItem('appreciation')) || [];
    setTimeout(() => {
      this.zone.run(() => {
        this.txpsN = lcsAppreciation.length;
      });
    }, 500);
  }

  public async goToWalletDetails(wallet) {
    if (wallet.isComplete()) {
      this.router.navigate(['/wallet-details'], {
        state: {
          walletId: wallet.credentials.walletId
        }
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

  public doRefresh(refresher): void {
    this.debounceSetWallets();
    setTimeout(() => {
      refresher.target.complete();
    }, 2000);
  }

  public collapsToken(walletId: string) {
    this.collapsedToken[walletId] = this.collapsedToken[walletId] ? false : true;
  }

  public isCollapsedToken(walletId: string): boolean {
    return this.collapsedToken[walletId] ? true : false;
  }

  public addWallet(keyId): void {
    this.router.navigate(['/add'], {
      state: {
        keyId
      },
    })
  }

  public openBackupPage(keyId) {
    this.router.navigate(['/backup-key'], {
      state: {
        keyId
      },
    })
  }

  public openSettingPage() {
    this.router.navigate(['/setting']);
  }

  public openAddressBookPage() {
    this.router.navigate(['/addressbook']);
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

  public addToGroupsHome(wallet, token?) {
    let walletObj = {
      walletId: wallet?.id,
      tokenId: token?.tokenId
    }
    let result = this.profileProvider.setWalletGroupsHome(walletObj);
    if (result && result.added.status) {
      this.router.navigate(['/tabs/home']).then(() => {
        this.events.publish('Local/GetListPrimary', true);
        this.slidingItem.close();
        this.presentToast(result.added.message);
      });
    } else if (result && result.full.status) {
      this.presentToast(result.full.message, 'toast-warning');
    } else if (result && result.duplicate.status) {
      this.presentToast(result.duplicate.message, 'toast-info');
    }
  }

  public removeOutGroupsHome(wallet, token?) {
    if (this.profileProvider.isLastItemPrimaryList()) {
      this.presentToast('Can not remove the last account in Home!', 'toast-warning');
    } else {
      let walletObj = {
        walletId: wallet.id,
        tokenId: token?.tokenId
      }
      let result = this.profileProvider.removeWalletGroupsHome(walletObj);
      if (result) {
        this.presentToast('Removed account successfully!');
        this.events.publish('Local/GetListPrimary', true);
      } else {
        this.presentToast('Removed account unsuccessfully!');
      }
    }
  }

  public checkCardExistListPrimary(wallet, token?) {
    let data = JSON.parse(localStorage.getItem("listHome"));
    let isExist = _.find(data, item => item.walletId === wallet.id && item.tokenId === token?.tokenId);
    return !!isExist;
  }
}



// WEBPACK FOOTER //
// ./src/pages/wallets/wallets