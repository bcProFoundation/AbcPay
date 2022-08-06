import { Component, Input, SimpleChanges, ViewChild } from '@angular/core';
import * as _ from 'lodash';
import * as moment from 'moment';
import { FormatCurrencyPipe } from '../../../pipes/format-currency';

import { Card } from '../../../components/exchange-rates/exchange-rates';
import { PriceChart } from '../../../components/price-chart/price-chart';



import { DateRanges, RateProvider } from 'src/app/providers/rate/rate';
import { ConfigProvider } from 'src/app/providers/config/config';
import { Logger } from 'src/app/providers/logger/logger';
import { WalletProvider } from 'src/app/providers/wallet/wallet';
import { AnalyticsProvider } from 'src/app/providers/analytics/analytics';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { PlatformProvider } from 'src/app/providers';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'price-page',
  templateUrl: 'price-page.html',
  styleUrls: ['price-page.scss']
})
export class PricePage {
  wallet: any;
  wallets: any[];
  @Input() cardPrice: Card;
  @ViewChild('canvas', {static: true}) canvas: PriceChart;
  card: Card;
  public isDonation: boolean = false;
  public activeOption: string = '1D';
  public availableOptions;
  public updateOptions = [
    { label: '1D', dateRange: DateRanges.Day },
    { label: '1W', dateRange: DateRanges.Week },
    { label: '1M', dateRange: DateRanges.Month }
  ];
  public isFiatIsoCodeSupported: boolean;
  public fiatIsoCode: string;
  public fiatCodes;
  private dateActiveOption = DateRanges.Day;
  navParamsData;
  constructor(
    private router: Router,
    private rateProvider: RateProvider,
    private formatCurrencyPipe: FormatCurrencyPipe,
    private configProvider: ConfigProvider,
    private logger: Logger,
    private walletProvider: WalletProvider,
    private analyticsProvider: AnalyticsProvider,
    private loadingCtr: LoadingController,
    private translate: TranslateService,
    public platformProvider: PlatformProvider
  ) {
    this.getCoinDonate();
    if (this.router.getCurrentNavigation()) {
      this.navParamsData = this.router.getCurrentNavigation().extras.state;
    } else {
      this.navParamsData =  history ? history.state : undefined;
    }
    this.card = this.navParamsData?.card;
    this.setFiatIsoCode();
    this.card = this.cardPrice;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.card = changes.cardPrice.currentValue;
    this.ngOnInit();
  }

  ngOnInit() {
    const loading = this.loadingCtr.create({
      message: this.translate.instant('Please wait...')
    })
    loading.then(loadingEl => loadingEl.present());
    this.drawCanvas();
    // Let the canvas settle
    setTimeout(() => {
      this.getPrice(this.dateActiveOption);
      loading.then(loadingEl => loadingEl.dismiss());
    }, 1000);
  }

  private getCoinDonate() {
    this.walletProvider.getDonationInfo().then((data: any) => {
      const donationSupportCoins = data.donationSupportCoins;
      this.isDonation = _.some(donationSupportCoins, (item: any) => item.coin === this.navParamsData.card.unitCode);
    });
  }

  private getPrice(dateRange) {
    this.canvas.loading = true;
    this.rateProvider.fetchHistoricalRates(this.fiatIsoCode, dateRange).then(
      response => {
        this.card.historicalRates = response[this.card.unitCode];
        this.updateValues();
        this.setPrice();
        if (this.canvas.chart) {
          this.redrawCanvas();
        } else {
          this.canvas.loading = false;
        }
      },
      err => {
        this.canvas.loading = false;
        this.logger.error('Error getting rates:', err);
      }
    );
  }

  private formatDate(date) {
    if (this.activeOption === '1Y') {
      return `${moment(date).format('MMM DD YYYY')}`;
    } else if (this.activeOption === '1M') {
      return `${moment(date).format('MMM DD hh A')}`;
    } else if (this.activeOption === '1W') {
      return `${moment(date).format('ddd hh:mm A')}`;
    } else {
      return `${moment(date).format('hh:mm A')}`;
    }
  }

  public setPrice(points: { date?: number; price?: number } = {}) {
    const { date = this.card.currentTime, price = this.card.currentPrice } = points;
    const displayDate = date
      ? this.formatDate(date)
      :  undefined
    const minPrice = this.card.historicalRates[
      this.card.historicalRates.length - 1
    ].rate;
    this.card.totalBalanceChangeAmount = price - minPrice;
    this.card.totalBalanceChange =
      (this.card.totalBalanceChangeAmount * 100) / minPrice;
    const customPrecision =
      this.card.unitCode === 'xrp' || this.card.unitCode === 'doge' ? 4 : 2 || this.card.unitCode === 'xpi' ? 6 : 2;
    document.getElementById(
      'displayPrice'
    ).textContent = `${this.formatCurrencyPipe.transform(
      price,
      this.fiatIsoCode,
      customPrecision
    )}`;
    if (displayDate) document.getElementById('displayDate').textContent = `${displayDate}`;
    document.getElementById(
      'averagePriceAmount'
    ).textContent = `${this.formatCurrencyPipe.transform(
      this.card.totalBalanceChangeAmount,
      this.fiatIsoCode,
      customPrecision
    )}`;
    document.getElementById(
      'averagePricePercent'
    ).textContent = `${this.formatCurrencyPipe.transform(
      this.card.totalBalanceChange,
      '%',
      2
    )}`;
  }

  private redrawCanvas() {
    const data = this.card.historicalRates.map(rate => [rate.ts, rate.rate]);
    this.canvas.chart.updateOptions(
      {
        chart: {
          animations: {
            enabled: false
          }
        },
        series: [
          {
            data
          }
        ],
        tooltip: {
          x: {
            show: false
          }
        }
      },
      false,
      false,
      false
    );
    this.canvas.loading = false;
  }

  private drawCanvas() {
    const dataSeries = this.card.historicalRates.map(historicalRate => [
      historicalRate.ts,
      historicalRate.rate
    ]);
    this.canvas.initChartData({
      data: dataSeries,
      color: this.card.backgroundColor
    });
  }

  public updateChart(option) {
    const { label, dateRange } = option;
    this.activeOption = label;
    this.dateActiveOption = dateRange;
    this.getPrice(dateRange);
  }

  private updateValues() {
    this.card.currentPrice = this.card.historicalRates[0].rate;
    this.card.currentTime = this.card.historicalRates[0].ts;
    const minPrice = this.card.historicalRates[
      this.card.historicalRates.length - 1
    ].rate;
    this.card.totalBalanceChangeAmount = this.card.currentPrice - minPrice;
    this.card.totalBalanceChange =
      (this.card.totalBalanceChangeAmount * 100) / minPrice;
  }

  private setFiatIsoCode() {
    const { alternativeIsoCode } = this.configProvider.get().wallet.settings;
    this.fiatIsoCode = this.rateProvider.isAltCurrencyAvailable(
      alternativeIsoCode
    )
      ? alternativeIsoCode
      : 'USD';
    this.isFiatIsoCodeSupported = _.includes(this.fiatCodes, this.fiatIsoCode);
  }

  public goToAmountPage(): void {
    this.analyticsProvider.logEvent('buy_crypto_button_clicked', {
      from: 'priceChartsPage',
      coin: this.card.unitCode
    });
    this.router.navigate(['/amount'], {
      state: {
        coin: this.card.unitCode,
        fromBuyCrypto: true,
        nextPage: 'CryptoOrderSummaryPage',
        currency: this.configProvider.get().wallet.settings.alternativeIsoCode
      }
    })
  }

  public goToDonation(){
    this.router.navigate(['/accounts-page'], {
      state: {
        isDonation: true
      }
    });
  }
}
