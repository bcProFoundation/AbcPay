import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { ActionSheetProvider, EventManagerService, LoadingProvider, PersistenceProvider } from 'src/app/providers';

// providers
import { AppProvider } from '../../../providers/app/app';
import { BwcErrorProvider } from '../../../providers/bwc-error/bwc-error';
import { ConfigProvider } from '../../../providers/config/config';
import { DerivationPathHelperProvider } from '../../../providers/derivation-path-helper/derivation-path-helper';
import { ErrorsProvider } from '../../../providers/errors/errors';
import { ExternalLinkProvider } from '../../../providers/external-link/external-link';
import { KeyProvider } from '../../../providers/key/key';
import { Logger } from '../../../providers/logger/logger';
import { LogsProvider } from '../../../providers/logs/logs';
import { OnGoingProcessProvider } from '../../../providers/on-going-process/on-going-process';
import { PlatformProvider } from '../../../providers/platform/platform';
import { PopupProvider } from '../../../providers/popup/popup';
import { ProfileProvider } from '../../../providers/profile/profile';
import { PushNotificationsProvider } from '../../../providers/push-notifications/push-notifications';
import {
  WalletOptions,
  WalletProvider
} from '../../../providers/wallet/wallet';


@Component({
  selector: 'page-key-settings',
  templateUrl: 'key-settings.html',
  styleUrls: ['key-settings.scss'],
  encapsulation: ViewEncapsulation.None
})
export class KeySettingsPage {
  public encryptEnabled: boolean;
  public touchIdEnabled: boolean;
  public touchIdPrevValue: boolean;
  public touchIdAvailable: boolean;
  public deleted: boolean = false;
  public noFromWalletGroup: boolean;
  public walletsGroup;
  public wallets;
  public canSign: boolean;
  public isDeletedSeed: boolean;
  public needsBackup: boolean;
  public derivationStrategy: string;
  public isScroll = false;
  public showReorder: boolean = false;

  private keyId: string;
  navParamsData: any;

  constructor(
    private actionSheetProvider: ActionSheetProvider,
    private profileProvider: ProfileProvider,
    private logger: Logger,
    private walletProvider: WalletProvider,
    private router: Router,
    private externalLinkProvider: ExternalLinkProvider,
    private translate: TranslateService,
    private keyProvider: KeyProvider,
    private derivationPathHelperProvider: DerivationPathHelperProvider,
    private events: EventManagerService,
    private errorsProvider: ErrorsProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private persistanceProvider: PersistenceProvider,
    private pushNotificationsProvider: PushNotificationsProvider,
    private bwcErrorProvider: BwcErrorProvider,
    private popupProvider: PopupProvider,
    private platformProvider: PlatformProvider,
    private logsProvider: LogsProvider,
    private appProvider: AppProvider,
    private configProvider: ConfigProvider,
    private loadingProvider: LoadingProvider
  ) {
    if (this.router.getCurrentNavigation()) {
       this.navParamsData = this.router.getCurrentNavigation().extras.state ? this.router.getCurrentNavigation().extras.state : {};
    } else {
      this.navParamsData =  history ? history.state : undefined;
    }
    this.logger.info('Loaded:  KeySettingsPage');
    this.keyId = this.navParamsData.keyId;
  }

  async handleScrolling(event) {
    if (event.detail.currentY > 0) {
      this.isScroll = true;
    }
    else {
      this.isScroll = false;
    }
  }

  ionViewWillEnter() {
    this.loadingProvider.autoLoader();
    this.walletsGroup = this.profileProvider.getWalletGroup(this.keyId);
    this.wallets = this.profileProvider.getWalletsFromGroup({
      keyId: this.keyId,
      showHidden: true
    });
    this.derivationStrategy = this.derivationPathHelperProvider.getDerivationStrategy(
      this.wallets[0].credentials.rootPath
    );
    this.canSign = this.walletsGroup.canSign;
    this.isDeletedSeed = this.walletsGroup.isDeletedSeed;
    this.needsBackup = this.walletsGroup.needsBackup;
    this.encryptEnabled = this.walletsGroup.isPrivKeyEncrypted;
  }

  public touchIdChange(): void {
    if (this.touchIdPrevValue == this.touchIdEnabled) return;
    const newStatus = this.touchIdEnabled;
    this.walletProvider
      .setTouchId(this.wallets, newStatus)
      .then(() => {
        this.touchIdPrevValue = this.touchIdEnabled;
        this.logger.debug('Touch Id status changed: ' + newStatus);
      })
      .catch(err => {
        this.logger.error('Error with fingerprint:', err);
        this.touchIdEnabled = this.touchIdPrevValue;
      });
  }

  public encryptChange(): void {
    const val = this.encryptEnabled;
    const key = this.keyProvider.getKey(this.keyId);

    this.profileProvider.removeProfileLegacy();

    if (val && !this.walletsGroup.isPrivKeyEncrypted) {
      this.logger.debug('Encrypting private key for', this.walletsGroup.name);
      this.profileProvider.showEncryptPasswordInfoModalSmall({isEncryptPasswordSmall: true}).then((password) => {
        console.log(password);
        try {
          this.keyProvider.encryptPrivateKey(key, password);
          const replaceKey = true;
          this.keyProvider.addKey(key, replaceKey);
          this.profileProvider.walletsGroups[
            this.keyId
          ].isPrivKeyEncrypted = true;
          this.logger.debug('Key encrypted');
        } catch (error) {
          this.encryptEnabled = false;
          const title = this.translate.instant('Could not encrypt account');
          this.showErrorInfoSheet(error, title);
        }
      })
    } else if (!val && this.walletsGroup.isPrivKeyEncrypted) {
      this.keyProvider
        .decrypt(this.keyId)
        .then(() => {
          const key = this.keyProvider.getKey(this.keyId);
          const replaceKey = true;
          this.keyProvider.addKey(key, replaceKey);
          this.profileProvider.walletsGroups[
            this.keyId
          ].isPrivKeyEncrypted = false;
          this.logger.debug('Key decrypted');
        })
        .catch(err => {
          this.encryptEnabled = true;
          if (err === 'WRONG_PASSWORD') {
            this.errorsProvider.showWrongEncryptPasswordError();
          } else {
            const title = this.translate.instant('Could not decrypt account');
            this.showErrorInfoSheet(err, title);
          }
        });
    }
  }

  private showErrorInfoSheet(
    err: Error | string,
    infoSheetTitle: string
  ): void {
    if (!err) return;
    this.logger.warn('Could not encrypt/decrypt group wallets:', err);
    this.errorsProvider.showDefaultError(err, infoSheetTitle);
  }

  public openBackupSettings(): void {
    if (this.derivationStrategy == 'BIP45') {
      this.router.navigate(['/wallet-export'], {
        state: {
          walletId: this.wallets[0].credentials.walletId
        }
      });
    } else {
      this.router.navigate(['/backup-key'], {
        state: {
          keyId: this.keyId
        }
      });
    }
  }

  public openClearEncryptPasswordPage(): void {
    this.router.navigate(['/clear-encrypt-password'], {
      state: {
        keyId: this.keyId
      }
    });
  }

  public openWalletGroupDelete(): void {
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'delete-key',
      { secondBtnGroup: true }
    );
    infoSheet.present();
    infoSheet.onDidDismiss(option => {
      if (!option) return;
      this.deleteWalletGroup();
    });
  }

  private handleDeletePrimaryAccount(wallets: Array<any>) {
    let listPrimaryAccount = JSON.parse(localStorage.getItem('listHome'));
    wallets.forEach(item => {
      const isExist = listPrimaryAccount.find(walletObj => walletObj.walletId == item.id);
      if (isExist) this.profileProvider.removeWalletGroupsHome({walletId: item.id});
    });
    this.events.publish('Local/GetListPrimary', true);
  }

  private deleteWalletGroup(): void {
    this.onGoingProcessProvider.set('deletingWallet');
    this.profileProvider.removeProfileLegacy();
    const opts = {
      keyId: this.keyId,
      showHidden: true
    };
    const wallets = this.profileProvider.getWalletsFromGroup(opts);
    this.handleDeletePrimaryAccount(wallets);
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
          this.router.navigate(['tabs/wallets']).then(() => {
            this.events.publish('Local/GetData', true);
          })
        } else {
          this.logger.warn('Key was not removed. Still in use');
          this.router.navigate(['tabs/wallets']).then(() => {
            this.events.publish('Local/GetData', true);
          })
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

  public openQrExport(): void {
    this.router.navigate(['/key-qr-export'], {
      state: {
        keyId: this.keyId
      }
    });
  }

  public openWalletGroupExtendedPrivateKey(): void {
    this.router.navigate(['/extended-private-key'], {
      state: {
        keyId: this.keyId
      }
    });
  }

  public openLink(url) {
    this.externalLinkProvider.open(url);
  }

  public openSupportEncryptPassword(): void {
    const url =
      'https://support.bitpay.com/hc/en-us/articles/360000244506-What-Does-a-Spending-Password-Do-';
    const optIn = true;
    const title = null;
    const message = this.translate.instant('Read more in our support page');
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

  openWalletSettings(id) {
    this.router.navigate(['/wallet-settings'], {
      state: {
        walletId: id
      }
    });
  }

  public goToAddPage() {
    this.router.navigate(['/add'], {
      state: {
        keyId: this.keyId
      }
    });
  }

  public openWalletGroupName(): void {
    this.router.navigate(['/key-name'], {
      state: {
        keyId: this.keyId
      }
    });
  }

  public reorder(): void {
    this.showReorder = !this.showReorder;
  }

  public async reorderAccounts(indexes) {
    const element = this.wallets[indexes.detail.from];
    this.wallets.splice(indexes.detail.from, 1);
    this.wallets.splice(indexes.detail.to, 0, element);
    _.each(this.wallets, (wallet, index: number) => {
      this.profileProvider.setWalletOrder(wallet.id, index);
    });
    this.profileProvider.setOrderedWalletsByGroup(this.keyId);
    indexes.detail.complete();
    this.events.publish('Local/GetData', true);
  }

  public syncWallets(): void {
    this.keyProvider
      .handleEncryptedWallet(this.keyId)
      .then((password: string) => {
        let keys;
        try {
          keys = this.keyProvider.get(this.keyId, password);
        } catch (err) {
          const title = this.translate.instant('Your account is in a corrupt state. Please contact support and share the logs provided.');
          let message;
          try {
            message =
              err instanceof Error ? err.toString() : JSON.stringify(err);
          } catch (error) {
            message = 'Unknown error';
          }
          this.popupProvider.ionicAlert(title, message).then(() => {
            // Share logs
            const platform = this.platformProvider.isCordova
              ? this.platformProvider.isAndroid
                ? 'android'
                : 'ios'
              : 'desktop';
            this.logsProvider.get(this.appProvider.info.nameCase, platform);
          });
        }

        const opts: Partial<WalletOptions> = {};
        const defaults = this.configProvider.getDefaults();
        opts.bwsurl = defaults.bws.url;
        opts.mnemonic = keys.mnemonic;

        this._syncWallets(keys.mnemonic, opts);
      })
      .catch(err => {
        if (
          err &&
          err.message != 'FINGERPRINT_CANCELLED' &&
          err.message != 'PASSWORD_CANCELLED'
        ) {
          const title = this.translate.instant('Could not decrypt account');
          if (err.message == 'WRONG_PASSWORD') {
            this.errorsProvider.showWrongEncryptPasswordError();
          } else {
            this.showErrorInfoSheet(this.bwcErrorProvider.msg(err), title);
          }
        }
      });
  }

  private _syncWallets(words: string, opts): void {
    this.onGoingProcessProvider.set('syncWallets');
    this.profileProvider
      .syncWallets(words, opts)
      .then((wallets: any[]) => {
        this.onGoingProcessProvider.clear();
        this.finish(wallets);
      })
      .catch(err => {
        this.onGoingProcessProvider.clear();
        const title = this.translate.instant('Error');
        this.showErrorInfoSheet(title, this.bwcErrorProvider.msg(err));
      });
  }

  private async finish(wallets: any[]) {
    wallets.forEach(wallet => {
      this.walletProvider.updateRemotePreferences(wallet);
      this.pushNotificationsProvider.updateSubscription(wallet);
      this.profileProvider.setWalletBackup(wallet.credentials.walletId);
    });
    if (wallets && wallets[0]) {
      this.profileProvider.setBackupGroupFlag(wallets[0].credentials.keyId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.profileProvider.setNewWalletGroupOrder(wallets[0].credentials.keyId);
    }
    this.wallets = this.profileProvider.getWalletsFromGroup({
      keyId: this.keyId,
      showHidden: true
    });
  }
}
