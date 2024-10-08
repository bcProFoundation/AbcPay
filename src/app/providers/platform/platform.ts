import { Injectable } from '@angular/core';
import { Device } from '@ionic-native/device/ngx';
import { Platform } from '@ionic/angular';
import { Logger } from '../logger/logger';
import { UniqueDeviceID } from '@ionic-native/unique-device-id/ngx';


@Injectable({
  providedIn: 'root'
})
export class PlatformProvider {
  public isAndroid: boolean;
  public isIOS: boolean;
  public isSafari: boolean;
  public isCordova: boolean;
  public isElectron: boolean;
  public isMac: boolean;
  public isWindows: boolean;
  public isLinux: boolean;
  public ua: string;
  public isMobile: boolean;
  public isDevel: boolean;
  public uid: string;

  constructor(
    private platform: Platform,
    private logger: Logger,
    private device: Device,
    private uniqueDeviceID: UniqueDeviceID
  ) {
    let ua = navigator ? navigator.userAgent : null;

    if (!ua) {
      this.logger.info('Could not determine navigator. Using fixed string');
      ua = 'dummy user-agent';
    }

    // Fixes IOS WebKit UA
    ua = ua.replace(/\(\d+\)$/, '');

    this.isAndroid = this.platform.is('android');
    this.isIOS = this.platform.is('ios');
    this.ua = ua;
    this.isCordova = this.platform.is('cordova');
    this.isElectron = this.isElectronPlatform();
    this.isMobile = this.platform.is('mobile');
    this.isDevel = !this.isMobile && !this.isElectron;
    this.isMac = this.isMacApp();
    this.isWindows = this.isWindowsApp();
    this.isLinux = this.isLinuxApp();
    this.getUniqueDeviceID();

    this.logger.debug('PlatformProvider initialized');
  }

  public getPlatform(): string {
    return this.isAndroid
      ? 'android'
      : this.isIOS
      ? 'ios'
      : this.isCordova
      ? 'cordova'
      : this.isMac
      ? 'macintosh'
      : this.isWindows
      ? 'windows'
      : this.isLinux
      ? 'linux'
      : this.isMobile
      ? 'mobile'
      : undefined;
  }

  public getBrowserName(): string {
    let userAgent = window.navigator.userAgent;
    let browsers = {
      chrome: /chrome/i,
      safari: /safari/i,
      firefox: /firefox/i,
      ie: /internet explorer/i
    };

    for (let key in browsers) {
      if (browsers[key].test(userAgent)) {
        return key;
      }
    }

    return 'unknown';
  }

  public getUserAgent(): string {
    return window.navigator.userAgent;
  }

  public isMacApp(): boolean {
    return (
      this.isElectronPlatform() &&
      this.getUserAgent().toLowerCase().includes('macintosh')
    );
  }

  public isWindowsApp(): boolean {
    return (
      this.isElectronPlatform() &&
      this.getUserAgent().toLowerCase().includes('windows')
    );
  }

  public isLinuxApp(): boolean {
    return (
      this.isElectronPlatform() &&
      this.getUserAgent().toLowerCase().includes('linux')
    );
  }

  public isElectronPlatform(): boolean {
    const userAgent =
      navigator && navigator.userAgent
        ? navigator.userAgent.toLowerCase()
        : null;
    if (userAgent && userAgent.indexOf('electron/') > -1) {
      return true;
    } else {
      return false;
    }
  }

  public getOS() {
    let OS = {
      OSName: '',
      extension: ''
    };

    if (this.isElectron) {
      if (navigator.appVersion.indexOf('Win') != -1) {
        OS.OSName = 'Windows';
        OS.extension = '.exe';
      }
      if (navigator.appVersion.indexOf('Mac') != -1) {
        OS.OSName = 'MacOS';
        OS.extension = '.dmg';
      }
      if (navigator.appVersion.indexOf('Linux') != -1) {
        OS.OSName = 'Linux';
        OS.extension = '-linux.zip';
      }
    }

    return OS;
  }

  public getDeviceInfo(): string {
    let info: string;

    if (this.isElectron) {
      info = ' (' + navigator.appVersion + ')';
    } else {
      info =
        ' (' +
        this.device.platform +
        ' ' +
        this.device.version +
        ' - ' +
        this.device.model +
        ')';
    }

    return info;
  }

  public getDeviceUUID() {
    return this.device.uuid;
  }

  public getUniqueDeviceID() {
    if (this.isAndroid) {
      this.uid = this.device.uuid;
      this.logger.info('DEVICE', this.uid);
    } else if (this.isIOS) {
      this.uniqueDeviceID.get()
        .then((uuid: any) => {
          this.logger.info('DEVICE', uuid);
          this.uid = uuid;
        })
        .catch((error: any) => {
          this.logger.error('UUID NOT FOUND', error);
        });
    }
  }
}
