import { Component, ElementRef, NgZone, ViewChild, ViewEncapsulation } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import * as moment from 'moment';
import { ReCaptchaV3Service } from 'ng-recaptcha';

// Providers
import {
  AppProvider,
  DynamicLinksProvider,
  EmailNotificationsProvider,
  EventManagerService,
  ExternalLinkProvider,
  FeedbackProvider,
  LixiLotusProvider,
  LoadingProvider,
  Logger,
  NewFeatureData,
  PersistenceProvider,
  PlatformProvider,
  PopupProvider,
  ProfileProvider,
  RateProvider,
  ReleaseProvider,
  ThemeProvider,
  TokenProvider,
  WalletProvider
} from '../../providers';
import { ActionSheetProvider } from '../../providers/action-sheet/action-sheet';
import { ConfigProvider } from '../../providers/config/config';

// Pages
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { IonContent, IonSlides, LoadingController, ModalController } from '@ionic/angular';
import { Network } from 'src/app/providers/persistence/persistence';
import { Router } from '@angular/router';
import { AddFundsPage } from '../onboarding/add-funds/add-funds';
import { NewFeaturePage } from '../new-feature/new-feature';
import { ClaimVoucherModalComponent } from 'src/app/components/page-claim-modal/claim-voucher-modal.component';

export interface Advertisement {
  name: string;
  advertisementId?: string;
  title: string;
  country?: string;
  body: string;
  app: string;
  linkText: string;
  link: any;
  isTesting: boolean;
  linkParams?: any;
  dismissible: true;
  imgSrc: string;
  signature?: string;
}

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  styleUrls: ['home.scss'],
  encapsulation: ViewEncapsulation.None
})
export class HomePage {
  public tapped = 0;
  showBuyCryptoOption: boolean;
  showExchangeCryptoOption: boolean;
  showShoppingOption: boolean;
  showWalletConnect: boolean;
  @ViewChild('showCard')
  showCard;

  @ViewChild(IonSlides) slides: IonSlides;

  @ViewChild('homeToolbar') homeToolbar: ElementRef;
  public serverMessages: any[];
  public showServerMessage: boolean;
  public showAdvertisements: boolean;
  public advertisements: Advertisement[] = [];
  public productionAds: Advertisement[] = [];
  public testingAds: Advertisement[] = [];
  public totalBalanceAlternative: string;
  public totalBalanceAlternativeIsoCode: string;
  public totalBalanceChange: number;
  public showTotalBalance: boolean = true;
  public fetchingStatus: boolean;
  public showRateCard: boolean;
  public accessDenied: boolean;
  public newReleaseAvailable: boolean = false;
  public cardExperimentEnabled: boolean;
  public testingAdsEnabled: boolean;
  public showCoinbase: boolean = false;
  public bitPayIdUserInfo: any;
  public accountInitials: string;
  public isCopay: boolean;
  private newReleaseVersion: string;
  private pagesMap: any;
  public currentTheme: any;

  public isCordova: boolean;
  private zone;
  public txpsN: number;
  public isScroll: boolean;
  public walletGroupsHome: Array<any> = [];
  public removeAllItem: boolean = false;
  public isShowBalance: boolean = false;
  public loading: boolean = false;

  constructor(
    private persistenceProvider: PersistenceProvider,
    private logger: Logger,
    private appProvider: AppProvider,
    private externalLinkProvider: ExternalLinkProvider,
    private router: Router,
    private feedbackProvider: FeedbackProvider,
    private translate: TranslateService,
    private configProvider: ConfigProvider,
    private events: EventManagerService,
    private releaseProvider: ReleaseProvider,
    public platformProvider: PlatformProvider,
    private modalCtrl: ModalController,
    private profileProvider: ProfileProvider,
    private actionSheetProvider: ActionSheetProvider,
    private dynamicLinkProvider: DynamicLinksProvider,
    private newFeatureData: NewFeatureData,
    private emailProvider: EmailNotificationsProvider,
    private popupProvider: PopupProvider,
    private splashScreen: SplashScreen,
    private rateProvider: RateProvider,
    private themeProvider: ThemeProvider,
    private tokenProvider: TokenProvider,
    private loadingProvider: LoadingProvider,
    private lixiLotusProvider: LixiLotusProvider,
    private recaptchaV3Service: ReCaptchaV3Service,
    private walletProvider: WalletProvider
  ) {
    this.currentTheme = this.themeProvider.currentAppTheme;
    this.logger.info('Loaded: HomePage');
    this.isCopay = this.appProvider.info.name === 'copay';
    this.zone = new NgZone({ enableLongStackTrace: false });
    this.subscribeEvents();
    this.persistenceProvider
      .getCardExperimentFlag()
      .then(status => (this.cardExperimentEnabled = status === 'enabled'));
    this.isCordova = this.platformProvider.isCordova;
  }

  async handleScrolling(event) {
    if (event.detail.currentY > 0) {
      this.isScroll = true;
    }
    else {
      this.isScroll = false;
    }
  }

  public async loadToken(wallets) {
    for (const i in wallets) {
      const wallet = wallets[i];
      await this.tokenProvider.loadTokenWallet(wallet);
    }
  }

  public async getWalletGroupsHome() {
    this.loading = true;
    let wallets = this.profileProvider.wallet;
    await this.loadToken(wallets);
    this.walletGroupsHome = await this.profileProvider.getWalletGroupsHome();
    if (this.walletGroupsHome.length <= 1) this.removeAllItem = false;
    this.loading = false
  }
  
  private showNewFeatureSlides() {
    if (this.appProvider.isLockModalOpen) return;
    this.events.unsubscribe('Local/showNewFeaturesSlides');
    const disclaimerAccepted = this.profileProvider.profile.disclaimerAccepted;
    const currentVs =
      this.appProvider.version.major + '.' + this.appProvider.version.minor;
    if (!disclaimerAccepted) {
      // first time using the App -> don't show
      this.persistenceProvider.setNewFeatureSlidesFlag(currentVs);
      return;
    }
    this.persistenceProvider.getNewFeatureSlidesFlag().then(value => {
      if (!value || String(value) !== currentVs) {
        this.newFeatureData.get().then(async feature_list => {
          if (feature_list && feature_list.features.length > 0) {
            const modal = await this.modalCtrl.create({
              component: NewFeaturePage,
              componentProps: { featureList: feature_list },
              showBackdrop: false,
              backdropDismiss: false
            });
            modal.present();
            modal.onDidDismiss().then(({ data }) => {
              if (data) {
                if (typeof data.done === 'boolean' && data.done === true) {
                  this.persistenceProvider.setNewFeatureSlidesFlag(currentVs);
                }
                if (typeof data.data !== 'boolean') {
                  this.events.publish('IncomingDataRedir', data.data);
                }
              }
            });
          } else {
            this.persistenceProvider.setNewFeatureSlidesFlag(currentVs);
          }
        });
      }
    });
  }

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

  ionViewWillEnter() {
    const config = this.configProvider.get();
    this.totalBalanceAlternativeIsoCode =
      config.wallet.settings.alternativeIsoCode;
    this.events.publish('Local/showNewFeaturesSlides');
    this.checkFeedbackInfo();
    this.showTotalBalance = config.totalBalance.show;
    if (this.showTotalBalance)
      this.updateTotalBalance(this.appProvider.homeBalance);
    if (this.platformProvider.isElectron) this.checkNewRelease();
    this.persistenceProvider.getDynamicLink().then((deepLink: string) => {
      if (deepLink) {
        this.persistenceProvider.setOnboardingFlowFlag('disabled');
        this.persistenceProvider.removeDynamicLink();
        this.dynamicLinkProvider.processDeepLink(deepLink);
      } else {
        this.persistenceProvider
          .getOnboardingFlowFlag()
          .then(async (value: string) => {
            // TODO: Disable advertisement value = disable
            value = 'disable';
            if (value === 'enabled' && this.appProvider.info.name !== 'copay')
              await this.openAddFunds();
          });
      }
    });
    this.updateTxps();
  }

  ngOnInit() {
    this.preFetchWallets();
    //Detect Change theme
    this.themeProvider.themeChange.subscribe(() => {
      this.currentTheme = this.appProvider.themeProvider.currentAppTheme;
    });
    this.getWalletGroupsHome();
    // Required delay to improve performance loading
    setTimeout(() => {
      this.checkEmailLawCompliance();
      this.checkAltCurrency(); // Check if the alternative currency setted is no longer supported
    }, 2000);
  }

  getAdPageOrLink(link) {
    let linkTo;
    // link is of formate page:PAGE_TITLE or url e.g. https://google.com

    if (link.startsWith('page:')) {
      let pageArray = link.split(':');
      let pageTitle = pageArray[1];
      if (pageTitle in this.pagesMap) {
        linkTo = this.pagesMap[pageTitle];
        return linkTo;
      }
    } else if (link.startsWith('https://')) {
      linkTo = link;
    }

    return linkTo;
  }

  private updateTotalBalance(data) {
    if (!data) return;
    this.zone.run(() => {
      this.totalBalanceAlternative = data.totalBalanceAlternative;
      this.totalBalanceChange = data.totalBalanceChange;
      this.totalBalanceAlternativeIsoCode = data.totalBalanceAlternativeIsoCode;
    });
  }

  private setTotalBalance(data) {
    this.updateTotalBalance(data);
    this.appProvider.homeBalance = data;
    this.persistenceProvider.setTotalBalance(data);
  }

  private subscribeEvents() {
    this.events.subscribe('Local/HomeBalance', data => {
      if (data && this.showTotalBalance) this.setTotalBalance(data);
      else {
        this.totalBalanceAlternative = '0';
      }
      this.fetchingStatus = false;
    });
    this.events.subscribe('Local/GetListPrimary', data => {
      if (data) this.getWalletGroupsHome();
    });
    this.events.subscribe('Local/ServerMessages', data => {
      this.serverMessages = _.orderBy(
        data.serverMessages,
        ['priority'],
        ['asc']
      );
      this.serverMessages.forEach(serverMessage => {
        this.checkServerMessage(serverMessage);
      });
    });
    this.events.subscribe('Local/AccessDenied', () => {
      this.accessDenied = true;
    });
    this.events.subscribe('Local/TestAdsToggle', testAdsStatus => {
      this.testingAdsEnabled = testAdsStatus;
    });
    this.events.subscribe('Local/ConnectionError', () => {
      this.fetchingStatus = false;
    });
    this.events.subscribe('Local/showNewFeaturesSlides', () => {
      this.showNewFeatureSlides();
    });
    this.events.subscribe('Local/ClaimVoucher', (claimCode) => {
      this.handleQrScanVoucher(claimCode);
    } )
  }

  private preFetchWallets() {
    // Avoid heavy tasks that can slow down the unlocking experience
    if (this.appProvider.isLockModalOpen) return;
    this.fetchingStatus = true;
    this.events.publish('Local/FetchWallets');
  }

  public doRefresh(refresher) {
    this.preFetchWallets();
    setTimeout(() => {
      refresher.target.complete();
      this.updateTxps();
    }, 2000);
  }

  private removeServerMessage(id): void {
    this.serverMessages = _.filter(this.serverMessages, s => s.id !== id);
  }

  public dismissServerMessage(serverMessage): void {
    this.showServerMessage = false;
    this.logger.debug(`Server message id: ${serverMessage.id} dismissed`);
    this.persistenceProvider.setServerMessageDismissed(serverMessage.id);
    this.removeServerMessage(serverMessage.id);
  }

  public dismissNewReleaseMessage(): void {
    this.newReleaseAvailable = false;
    this.logger.debug(
      `New release message dismissed. version: ${this.newReleaseVersion}`
    );
    this.persistenceProvider.setNewReleaseMessageDismissed(
      this.newReleaseVersion
    );
  }

  public checkServerMessage(serverMessage): void {
    if (serverMessage.app && serverMessage.app != this.appProvider.info.name) {
      this.removeServerMessage(serverMessage.id);
      return;
    }

    this.persistenceProvider
      .getServerMessageDismissed(serverMessage.id)
      .then((value: string) => {
        if (value === 'dismissed') {
          this.removeServerMessage(serverMessage.id);
          return;
        }
        this.showServerMessage = true;
      });
  }

  public openServerMessageLink(url): void {
    this.externalLinkProvider.open(url);
  }

  private checkNewRelease() {
    this.persistenceProvider
      .getNewReleaseMessageDismissed()
      .then(dismissedVersion => {
        this.releaseProvider.getLatestAppVersion().then((data: any) => {
          if (data && data.version === dismissedVersion) return;
          this.newReleaseVersion = data.version;
          this.newReleaseAvailable = this.releaseProvider.newReleaseAvailable(
            data.version
          );
        });
      });
  }

  private checkFeedbackInfo() {
    this.persistenceProvider.getFeedbackInfo().then(info => {
      if (!info) {
        this.initFeedBackInfo();
      } else {
        const feedbackInfo = info;
        // Check if current version is greater than saved version
        const currentVersion = this.appProvider.info.version;
        const savedVersion = feedbackInfo.version;
        const isVersionUpdated = this.feedbackProvider.isVersionUpdated(
          currentVersion,
          savedVersion
        );
        if (!isVersionUpdated) {
          this.initFeedBackInfo();
          return;
        }
        const now = moment().unix();
        const timeExceeded = now - feedbackInfo.time >= 24 * 7 * 60 * 60;
        this.showRateCard = timeExceeded && !feedbackInfo.sent;
      }
    });
  }

  private initFeedBackInfo() {
    this.persistenceProvider.setFeedbackInfo({
      time: moment().unix(),
      version: this.appProvider.info.version,
      sent: false
    });
    this.showRateCard = false;
  }

  public openCountryBannedLink(): void {
    const url =
      "https://github.com/bitpay/copay/wiki/Why-can't-I-use-BitPay's-services-in-my-country%3F";
    this.externalLinkProvider.open(url);
  }

  public toggleTestnet() {
    this.tapped++;
    if (this.tapped >= 10) {
      this.persistenceProvider
        .getNetwork()
        .then((currentNetwork: Network | undefined) => {
          const newNetwork =
            !currentNetwork || currentNetwork === Network.livenet
              ? Network.testnet
              : Network.livenet;
          this.persistenceProvider.setNetwork(newNetwork);
          const infoSheet = this.actionSheetProvider.createInfoSheet(
            'in-app-notification',
            {
              title: 'Network Changed',
              body: `Network changed to ${newNetwork}. Restarting app.`
            }
          );
          infoSheet.present();
          infoSheet.onDidDismiss(() => {
            window.location.reload();
            if (this.platformProvider.isCordova) this.splashScreen.show();
          });

          this.tapped = 0;
        });
    }
  }

  private async openAddFunds() {
    const wallets = this.profileProvider.getWallets();
    const modal = await this.modalCtrl.create({
      component: AddFundsPage,
      componentProps: {
        keyId: wallets[0].credentials.keyId
      }
    });
    await modal.present().then(() => {
      this.persistenceProvider.setOnboardingFlowFlag('disabled');
    });
  }

  private showInfoSheet(altCurrency): void {
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'unsupported-alt-currency',
      altCurrency
    );
    infoSheet.present();
    infoSheet.onDidDismiss(option => {
      if (option) {
        this.router.navigate(['/tabs/setting']).then(() => {
          this.router.navigate(['/alt-curency']);
        })
      }
    });
  }

  private openEmailDisclaimer() {
    const message = this.translate.instant(
      'By providing your email address, you give explicit consent to BitPay to use your email address to send you email notifications about payments.'
    );
    const title = this.translate.instant('Privacy Notice update');
    const okText = this.translate.instant('Accept');
    const cancelText = this.translate.instant('Disable notifications');
    this.popupProvider
      .ionicConfirm(title, message, okText, cancelText)
      .then(ok => {
        if (ok) {
          // Accept new Privacy Notice
          this.persistenceProvider.setEmailLawCompliance('accepted');
        } else {
          // Disable email notifications
          this.persistenceProvider.setEmailLawCompliance('rejected');
          this.emailProvider.updateEmail({
            enabled: false,
            email: 'null@email'
          });
        }
      });
  }

  private checkEmailLawCompliance(): void {
    setTimeout(() => {
      if (this.emailProvider.getEmailIfEnabled()) {
        this.persistenceProvider.getEmailLawCompliance().then(value => {
          if (!value) this.openEmailDisclaimer();
        });
      }
    }, 2000);
  }

  private checkAltCurrency(): void {
    const config = this.configProvider.get();
    const altCurrency = {
      name: config.wallet.settings.alternativeName,
      isoCode: config.wallet.settings.alternativeIsoCode
    };
    if (
      !this.rateProvider.isAltCurrencyAvailable(altCurrency.isoCode) &&
      !_.isEmpty(this.rateProvider.alternatives)
    ) {
      this.showInfoSheet(altCurrency);
    }
  }

  public openSettingPage() {
    this.router.navigate(['/setting']);
  }

  public openProposalsNotificationsPage(): void {
    this.router.navigate(['/proposals-notifications']);
  }

  public openChartViewPage(): void {
    this.router.navigate(['/chart-view']);
  }

  public addToHome(coin?: string, network?: string) {
    this.router.navigateByUrl('/accounts-page', {
      state: {
        isAddToHome: true,
        coin: coin,
        network: network
      }
    });
  }

  public async handleQrScanVoucher(claimCode) {
    // Get first wallet lotus in home list
    let wallet = this.profileProvider.getFirstLotusWalletHome();
    this.executeImportantAction();
    if (!_.isEmpty(wallet)) {
      let message = 'Loading...';
      let claimWalletAddress = '';
      let codeClaimSplit = claimCode?.value ? claimCode.value.replace('lixi_','') : '';
      this.loadingProvider.simpleLoader(message);
      await this.walletProvider
      .getAddress(wallet, false)
      .then(addr => {
        return addr ? claimWalletAddress = addr : claimWalletAddress = '';
      })
      if (claimCode?.value) claimCode.value.replace('lixi_','')
      const bodyClaim = {
        captchaToken: 'isAbcpay',
        claimAddress: claimWalletAddress,
        claimCode: codeClaimSplit
      }
      // Call provider to claim xpi from lixilotus/api
      await this.lixiLotusProvider.claimVoucher(bodyClaim)
      .then(async (data) => {
        const copayerModal = await this.modalCtrl.create({
          component: ClaimVoucherModalComponent,
          componentProps: {
            result: {...data, ...wallet}
          },
          cssClass: 'recevied-voucher-success',
          initialBreakpoint: 0.4,
        });
        // Update balance card home
        this.events.publish('Local/FetchWallets');
        await copayerModal.present();
        this.events.publish('Local/GetListPrimary', true);
        this.loadingProvider.dismissLoader();
        copayerModal.onDidDismiss().then(({ data }) => {
        });
      })
      .catch(err => {
        const infoSheet = this.actionSheetProvider.createInfoSheet(
          'process-fail-voucher'
        );
        infoSheet.present();
        this.loadingProvider.dismissLoader();
        infoSheet.onDidDismiss(async option => {
          if (option) {
            this.router.navigate(['/tabs/scan']);
          }
        });
      });
    } else {
      const infoSheet = this.actionSheetProvider.createInfoSheet(
        'process-select-wallet'
      );
      infoSheet.present();
      this.loadingProvider.dismissLoader();
      infoSheet.onDidDismiss(async option => {
        if (option) {
          this.addToHome('xpi', 'livenet');
        }
      });
    }
  }

  public executeImportantAction(): void {
    this.recaptchaV3Service.execute('getTokenForVoucher')
      .subscribe((token) => console.log('****** TOKEN' + token));
  }
}
