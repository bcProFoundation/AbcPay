import { Injectable } from '@angular/core';

// providers
import 'rxjs/add/observable/fromEvent';
import { Observable } from 'rxjs/Observable';
import { ElectronProvider } from '../electron/electron';
import { EventManagerService } from '../event-manager.service';
import { Logger } from '../logger/logger';
import { PlatformProvider } from '../platform/platform';
import { PopupProvider } from '../popup/popup';

declare var cordova: any;

@Injectable({
  providedIn: 'root'
})
export class ExternalLinkProvider {
  constructor(
    private popupProvider: PopupProvider,
    private logger: Logger,
    private platformProvider: PlatformProvider,
    private electronProvider: ElectronProvider,
    private events: EventManagerService
  ) {
    this.logger.debug('ExternalLinkProvider initialized');
  }

  private restoreHandleOpenURL(old: string): void {
    setTimeout(() => {
      (window as any).handleOpenURL = old;
    }, 500);
  }

  public open(
    url: string,
    optIn?: boolean,
    title?: string,
    message?: string,
    okText?: string,
    cancelText?: string
  ) {
    return new Promise(resolve => {
      if (optIn) {
        this.popupProvider
          .ionicConfirm(title, message, okText, cancelText)
          .then((res: boolean) => {
            this.openBrowser(res, url);
            resolve(undefined);
          });
      } else {
        this.openBrowser(true, url);
        resolve(undefined);
      }
    });
  }

  private openBrowser(res: boolean, url: string) {
    let old = (window as any).handleOpenURL;

    // Ignore external URLs: avoid opening action sheet
    (window as any).handleOpenURL = url => {
      this.logger.debug('Skip: ' + url);
    };

    if (res) {
      if (this.platformProvider.isElectron) {
        this.electronProvider.openExternalLink(url);
      } else {
        // workaround for an existing cordova inappbrowser plugin issue - redirecting events back to the iab ref
        const w = this.platformProvider.isCordova
          ? cordova.InAppBrowser.open(url, '_system')
          : window.open(url, '_system');
        Observable.fromEvent(w, 'message').subscribe(e =>
          this.events.publish('iab_message_update', e)
        );
      }
    }

    this.restoreHandleOpenURL(old);
  }
}
