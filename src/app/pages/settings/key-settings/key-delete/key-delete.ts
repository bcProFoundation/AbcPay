import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

// providers
import { ConfigProvider } from '../../../../providers/config/config';
import { KeyProvider } from '../../../../providers/key/key';
import { Logger } from '../../../../providers/logger/logger';
import { OnGoingProcessProvider } from '../../../../providers/on-going-process/on-going-process';
import { PersistenceProvider } from '../../../../providers/persistence/persistence';
import { PopupProvider } from '../../../../providers/popup/popup';
import { ProfileProvider } from '../../../../providers/profile/profile';
import { PushNotificationsProvider } from '../../../../providers/push-notifications/push-notifications';

@Component({
  selector: 'page-key-delete',
  templateUrl: 'key-delete.html',
  styleUrls: ['key-delete.scss']
})
export class KeyDeletePage {
  public walletsGroup;

  private keyId: string;
  navParamsData;
  constructor(
    private profileProvider: ProfileProvider,
    private router: Router,
    private popupProvider: PopupProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private logger: Logger,
    private translate: TranslateService,
    private keyProvider: KeyProvider,
    private persistanceProvider: PersistenceProvider,
    private configProvider: ConfigProvider,
    private pushNotificationsProvider: PushNotificationsProvider
  ) {
    if (this.router.getCurrentNavigation()) {
       this.navParamsData = this.router.getCurrentNavigation().extras.state ? this.router.getCurrentNavigation().extras.state : {};
    } else {
      this.navParamsData = history ? history.state : undefined;
    }
  }

  ngOnInit() {
    this.logger.info('Loaded: KeyDeletePage');
  }

  ionViewWillEnter() {
    this.keyId = this.navParamsData.keyId;
    this.walletsGroup = this.profileProvider.getWalletGroup(this.keyId);
  }

  public showDeletePopup(): void {
    const title = this.translate.instant('Warning!');
    const message = this.translate.instant(
      'Are you sure you want to delete all accounts using this key?'
    );
    this.popupProvider.ionicConfirm(title, message, null, null).then(res => {
      if (res) this.deleteWalletGroup();
    });
  }

  public deleteWalletGroup(): void {
    this.onGoingProcessProvider.set('deletingWallet');
    this.profileProvider.removeProfileLegacy();
    const opts = {
      keyId: this.keyId,
      showHidden: true
    };
    const wallets = this.profileProvider.getWalletsFromGroup(opts);
    this.profileProvider
      .deleteWalletGroup(this.keyId, wallets)
      .then(async () => {
        this.onGoingProcessProvider.clear();

        const keyInUse = this.profileProvider.isKeyInUse(this.keyId);

        if (!keyInUse) {
          wallets.forEach(wallet => {
            this.pushNotificationsProvider.unsubscribe(wallet);
            this.persistanceProvider.removeLastKnownBalance(wallet.id);
            this.configProvider.removeBwsFor(wallet.credentials.walletId);
          });
          this.keyProvider.removeKey(this.keyId);
          this.goHome();
        } else {
          this.logger.warn('Key was not removed. Still in use');
          this.goHome();
        }
      })
      .catch(err => {
        this.onGoingProcessProvider.clear();
        this.logger.warn('Could not remove all wallet data: ', err);
        this.popupProvider.ionicAlert(
          this.translate.instant('Error'),
          err.message || err
        );
      });
  }

  private goHome() {
    setTimeout(() => {
      this.router.navigate([''], { replaceUrl: true });
    }, 1000);
  }
}
