import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { AppProvider } from '../app/app';
import { EventManagerService } from '../event-manager.service';
import { Logger } from '../logger/logger';
import { PersistenceProvider } from '../persistence/persistence';
import { PlatformProvider } from '../platform/platform';
import { ModalController,  } from '@ionic/angular';

interface FeatureList {
  app: string[];
  platform: string[];
  majorversion: number;
  minorversion: number;
  country?: string[];
  dummy: string;
  features: Feature[];
}
interface Feature {
  slideTitle?: string;
  title: string;
  details: string;
  image?: Image;
  tryit?: TryIt;
}
interface Image {
  path: string;
  fitClass?: boolean;
}
interface TryIt {
  name: string;
  params?: any;
}
export type TryItType = ((viewCtrl?: ModalController) => void) | TryIt | boolean;

@Injectable({
  providedIn: 'root'
})
export class NewFeatureData {
  private feature_list: FeatureList[];
  private NETWORK = 'livenet';
  constructor(
    private appProv: AppProvider,
    private platProv: PlatformProvider,
    private translate: TranslateService,
    private persistenceProvider: PersistenceProvider,
    private events: EventManagerService,
    private logger: Logger
    
  ) {
    this.persistenceProvider.getNetwork().then((network: string) => {
      if (network) {
        this.NETWORK = network;
      }
      this.logger.log(`persistence initialized with ${this.NETWORK}`);
    });

    this.feature_list = [
      {
        majorversion: 12,
        minorversion: 0,
        app: ['bitpay'],
        platform: ['cordova'],
        dummy: this.translate.instant('dummy'),
        features: [
          {
            title: 'Trading now supported!',
            details:
              'Now you can quickly and safely exchange funds from one crypto wallet to another.',
            image: { path: 'assets/img/new-feature/12/12-1.png' }
          },
          {
            title: 'Exchange directly from your wallets',
            details:
              'Now you can quickly and safely exchange funds from one crypto wallet to another.',
            image: { path: 'assets/img/new-feature/12/12-2.png' }
          },
          {
            title: 'DAI and WBTC added',
            details:
              'Store, Send, and Receive some of the top crypto assets used in Decentralized Finance (DeFi). DAI is a USD pegged stable coin and WBTC is an ERC20 token pegged to Bitcoin.',
            image: { path: 'assets/img/new-feature/12/12-3.png' }
          },
          {
            title: 'Interact with DeFi and other DApps',
            details:
              'Try it out by selecting WalletConnect from settings, then scanning a DApp or DeFi QR code.',
            image: { path: 'assets/img/new-feature/12/12-4.png' }
          }
        ]
      },
      {
        majorversion: 12,
        minorversion: 1,
        app: ['bitpay'],
        platform: ['ios'],
        dummy: this.translate.instant('dummy'),
        country: ['US'],
        features: [
          {
            title: 'Connect to Apple Pay',
            details:
              "Now it's easy to use your BitPay Mastercard with Apple Pay making payments in stores, in apps, and online even easier.",
            image: { path: 'assets/img/new-feature/12.1/12.1-1.png' }
          },
          {
            title: 'Setup your virtual card',
            details:
              'To get started, go to your card settings and select “Add to Apple Wallet”',
            image: { path: 'assets/img/new-feature/12.1/12.1-2.png' },
            tryit: async (viewCtrl: ModalController) => {
              await viewCtrl.dismiss({ done: true });
              const cards = await this.persistenceProvider.getBitpayDebitCards(
                this.NETWORK
              );
              const virtualCard = cards.find(
                c => c.provider === 'galileo' && c.cardType === 'virtual'
              );
              if (virtualCard) {
                return;
              } else {
                // new signup - * using events over navCtrl due to dependency issue
                this.events.publish('IncomingDataRedir', {
                  name: 'BitPayCardIntroPage'
                });
              }
            }
          }
        ]
      },
      {
        majorversion: 12,
        minorversion: 3,
        app: ['*'],
        platform: ['*'],
        dummy: this.translate.instant('dummy'),
        features: [
          {
            slideTitle: '',
            title: 'Dogecoin added',
            details:
              'Store, buy, send and receive Dogecoin, an open source peer-to-peer digital currency favored by Shiba Inus worldwide.',
            image: {
              path: 'assets/img/new-feature/12.3/12-3-doge.svg',
              fitClass: true
            }
          }
        ]
      }
    ];
  }

  async get() {
    const list = this.feature_list.filter(
      vs =>
        vs.majorversion === this.appProv.version.major &&
        vs.minorversion === this.appProv.version.minor &&
        (vs.app.length == 0 ||
          vs.app[0] === '*' ||
          vs.app.find(
            app => app === String(this.appProv.info.name).toLocaleLowerCase()
          )) &&
        (vs.platform.length == 0 ||
          vs.platform[0] === '*' ||
          vs.platform.find(plat => this.platProv.getPlatform() === plat)) &&
        vs.features.length > 0
    );
    return list && list.length > 0
      ? _.orderBy(list, ['majorversion', 'minorversion'], ['desc', 'desc'])[0]
      : undefined;
  }
}
