import { Component, ViewEncapsulation } from '@angular/core';
import { Logger } from '../../../providers/logger/logger';

// native
import { SplashScreen } from '@ionic-native/splash-screen/ngx';

// Providers
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { ConfigProvider } from '../../../providers/config/config';
import { PersistenceProvider } from '../../../providers/persistence/persistence';
import { PlatformProvider } from '../../../providers/platform/platform';
import { RateProvider } from '../../../providers/rate/rate';

import * as _ from 'lodash';
import { Router } from '@angular/router';

@Component({
  selector: 'page-alt-currency',
  templateUrl: 'alt-currency.html',
  styleUrls: ['alt-currency.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AltCurrencyPage {
  public completeAlternativeList;
  public searchedAltCurrency: string;
  public altCurrencyList;
  public loading;
  public currentCurrency;
  public lastUsedAltCurrencyList;

  private PAGE_COUNTER: number = 3;
  private SHOW_LIMIT: number = 10;
  private unusedCurrencyList;

  constructor(
    private configProvider: ConfigProvider,
    private logger: Logger,
    private router: Router,
    private rate: RateProvider,
    private splashScreen: SplashScreen,
    private platformProvider: PlatformProvider,
    private persistenceProvider: PersistenceProvider,
    private actionSheetProvider: ActionSheetProvider
  ) {
    this.completeAlternativeList = [];
    this.altCurrencyList = [];
    this.unusedCurrencyList = [
      {
        isoCode: 'LTL'
      },
      {
        isoCode: 'BTC'
      },
      {
        isoCode: 'BCH'
      },
      {
        isoCode: 'ETH'
      },
      {
        isoCode: 'XRP'
      },
      {
        isoCode: 'USDC'
      },
      {
        isoCode: 'GUSD'
      },
      {
        isoCode: 'PAX'
      },
      {
        isoCode: 'BUSD'
      },
      {
        isoCode: 'DAI'
      },
      {
        isoCode: 'WBTC'
      }
    ];
  }

  _getCurrenciesSupport() {
    let currenciesSupport = ['HNL', 'AUD', 'USD'];
    const config = this.configProvider.getDefaults();
    const currenciesSupportDefault = _.get(config, 'currenciesSupport', []);
    if (currenciesSupportDefault) {
      currenciesSupport = _.map(currenciesSupportDefault, 'isoCode');
    }
    return currenciesSupport;
  }

  ionViewWillEnter() {
    this.rate
      .whenRatesAvailable('btc')
      .then(() => {
        const listAlternatives = this.rate.listAlternatives(true);
        const currenciesSupport = this._getCurrenciesSupport();
        this.completeAlternativeList = _.filter(listAlternatives, cur => _.includes(currenciesSupport, cur.isoCode));
        let idx = _.keyBy(this.unusedCurrencyList, 'isoCode');
        let idx2 = _.keyBy(this.lastUsedAltCurrencyList, 'isoCode');

        this.completeAlternativeList = _.reject(
          this.completeAlternativeList,
          c => {
            return idx[c.isoCode] || idx2[c.isoCode];
          }
        );
        this.altCurrencyList = this.completeAlternativeList.slice(0, 20);
      })
      .catch(err => {
        this.logger.error(err);
      });

    let config = this.configProvider.get();
    this.currentCurrency = config.wallet.settings.alternativeIsoCode;

    this.persistenceProvider
      .getLastCurrencyUsed()
      .then(lastUsedAltCurrency => {
        this.lastUsedAltCurrencyList = lastUsedAltCurrency
          ? lastUsedAltCurrency
          : [];
      })
      .catch(err => {
        this.logger.error(err);
      });
  }

  public loadAltCurrencies(loading): void {
    if (this.altCurrencyList.length === this.completeAlternativeList.length) {
      loading.target.complete();
      return;
    }
    setTimeout(() => {
      this.altCurrencyList = this.completeAlternativeList.slice(
        0,
        this.PAGE_COUNTER * this.SHOW_LIMIT
      );
      this.PAGE_COUNTER++;

      if (this.searchedAltCurrency) this.findCurrency();

      loading.target.complete();
    }, 300);
  }

  ngOnInit() {
    this.logger.info('Loaded: AltCurrencyPage');
  }

  public save(newAltCurrency): void {
    var opts = {
      wallet: {
        settings: {
          alternativeName: newAltCurrency.name,
          alternativeIsoCode: newAltCurrency.isoCode
        }
      }
    };
    if (
      _.some(this.completeAlternativeList, ['isoCode', newAltCurrency.isoCode])
    ) {
      this.configProvider.set(opts);
      this.saveLastUsed(newAltCurrency);
      setTimeout(() => {
        this.router.navigate([''], { replaceUrl: true }).then(() => {
          this.reload();
        });
      }, 300);
    } else {
      // To stop showing currencies that are no longer supported
      this.showErrorAndRemoveAltCurrency(newAltCurrency);
    }
  }

  private showErrorAndRemoveAltCurrency(altCurrency): void {
    const params = {
      name: altCurrency.name,
      isoCode: altCurrency.isoCode,
      error: true
    };
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'unsupported-alt-currency',
      params
    );
    infoSheet.present();
    infoSheet.onDidDismiss(() => {
      this.lastUsedAltCurrencyList = _.reject(this.lastUsedAltCurrencyList, [
        'isoCode',
        altCurrency.isoCode
      ]);
      this.persistenceProvider
        .setLastCurrencyUsed(JSON.stringify(this.lastUsedAltCurrencyList))
        .then(() => { });
    });
  }

  private reload(): void {
    window.location.reload();
    if (this.platformProvider.isCordova) this.splashScreen.show();
  }

  private saveLastUsed(newAltCurrency): void {
    this.lastUsedAltCurrencyList.unshift(newAltCurrency);
    this.lastUsedAltCurrencyList = _.uniqBy(
      this.lastUsedAltCurrencyList,
      'isoCode'
    );
    this.lastUsedAltCurrencyList = this.lastUsedAltCurrencyList.slice(0, 3);
    this.persistenceProvider
      .setLastCurrencyUsed(JSON.stringify(this.lastUsedAltCurrencyList))
      .then(() => { });
  }

  public findCurrency(): void {
    this.altCurrencyList = _.filter(this.completeAlternativeList, item => {
      var val = item.name;
      var val2 = item.isoCode;
      return (
        _.includes(val.toLowerCase(), this.searchedAltCurrency.toLowerCase()) ||
        _.includes(val2.toLowerCase(), this.searchedAltCurrency.toLowerCase())
      );
    });
  }
}
