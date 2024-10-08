import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import {
  BwcErrorProvider,
  ErrorsProvider,
  EventManagerService,
  Logger,
  OnGoingProcessProvider,
  PersistenceProvider,
  PlatformProvider,
  ProfileProvider,
  PushNotificationsProvider,
  WalletProvider
} from 'src/app/providers';
import { ThemeProvider } from 'src/app/providers/theme/theme';

// Providers

@Component({
  selector: 'page-select-flow',
  templateUrl: 'select-flow.html',
  styleUrls: ['select-flow.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SelectFlowPage {
  public unregister;
  public currentTheme: string;
  public flowOptions = [];
  constructor(
    public navCtrl: NavController,
    private logger: Logger,
    private router: Router,
    private themeProvider: ThemeProvider,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private pushNotificationsProvider: PushNotificationsProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private events: EventManagerService,
    private translate: TranslateService,
    private bwcErrorProvider: BwcErrorProvider,
    private errorsProvider: ErrorsProvider,
    private persistenceProvider: PersistenceProvider,
    private platformProvider: PlatformProvider
  ) {
    // this.checkFingerprint();
    // Get Theme
    this.currentTheme = this.themeProvider.currentAppTheme;
  }

  ionViewWillEnter() {
    this.flowOptions = [
      {
        isSimpleFlow: false,
        content: this.translate.instant(
          'Most secure way to store cryptocurrency (Highly Recommended).'
        )
      },
      {
        isSimpleFlow: true,
        content: this.translate.instant(
          'I’m just playing around. Skip all the security steps and show me the wallet.'
        )
      }
    ];
  }

  public navigateNextView(isSimpleFlow) {
    if (isSimpleFlow) {
      this.createSimpleFlow();
    } else {
      this.router.navigate(['/feature-education'], {
        state: { isSimpleFlow: true }
      });
    }
  }

  private createSimpleFlow() {
    this.onGoingProcessProvider.set('creatingWallet');
    this.profileProvider
      .createDefaultWalletsForSimpleFlow(true)
      .then(async wallets => {
        this.walletProvider.updateRemotePreferences(wallets);
        this.pushNotificationsProvider.updateSubscription(wallets);
        await new Promise(resolve => setTimeout(resolve, 1000));

        this.profileProvider.setNewWalletGroupOrder(
          wallets[0].credentials.keyId
        );
        // if case full flow do not skip recover phrase
        this.endProcess(wallets[0].credentials.keyId);
      })
      .catch(e => {
        this.showError(e);
        this.onGoingProcessProvider.clear();
      });
  }

  private showError(err) {
    this.onGoingProcessProvider.clear();
    this.logger.error('Create: could not create wallet', err);
    const title = this.translate.instant('Error');
    err = this.bwcErrorProvider.msg(err);
    this.errorsProvider.showDefaultError(err, title);
  }

  private endProcess(keyId: string) {
    this.onGoingProcessProvider.clear();
    this.profileProvider.setBackupGroupFlag(keyId);
    this.persistenceProvider.setKeyOnboardingFlag();
    const opts = {
      keyId: keyId,
      showHidden: true
    };
    const wallets = this.profileProvider.getWalletsFromGroup(opts);
    wallets.forEach(w => {
      this.profileProvider.setWalletBackup(w.credentials.walletId);
    });
    this.router.navigate(['']).then(() => {
      this.events.publish('Local/FetchWallets');
    });
  }
}
