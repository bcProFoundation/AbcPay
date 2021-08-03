import { Component } from '@angular/core';
import * as _ from 'lodash';

// Providers
import { ConfigProvider } from '../../../providers/config/config';
import { ExchangeCryptoProvider } from '../../../providers/exchange-crypto/exchange-crypto';
import { HomeIntegrationsProvider } from '../../../providers/home-integrations/home-integrations';
import { Logger } from '../../../providers/logger/logger';
import { ThemeProvider } from '../../../providers/theme/theme';

@Component({
  selector: 'page-exchange-crypto-settings',
  templateUrl: 'exchange-crypto-settings.html'
})
export class ExchangeCryptoSettingsPage {
  private serviceName: string = 'exchangecrypto';

  public showInHome = false;
  public service;
  public changellySwapTxs: any[];

  constructor(
    private configProvider: ConfigProvider,
    private homeIntegrationsProvider: HomeIntegrationsProvider,
    private logger: Logger,
    public themeProvider: ThemeProvider,
    private exchangeCryptoProvider: ExchangeCryptoProvider,
  ) {
    this.service = _.filter(this.homeIntegrationsProvider.get(), {
      name: this.serviceName
    });
    // this.showInHome = !!this.service[0].show;
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: ExchangeCryptoSettingsPage');
  }

  ionViewWillEnter() {
    this.exchangeCryptoProvider.getSwapTxs().then(res => {
      this.changellySwapTxs = res.changellySwapTxs;
      // this.shpeshiftSwapTxs = res.shpeshiftSwapTxs;
    });
  }

  public showInHomeSwitch(): void {
    let opts = {
      showIntegration: { [this.serviceName]: this.showInHome }
    };
    this.homeIntegrationsProvider.updateConfig(
      this.serviceName,
      this.showInHome
    );
    this.configProvider.set(opts);
  }
}
