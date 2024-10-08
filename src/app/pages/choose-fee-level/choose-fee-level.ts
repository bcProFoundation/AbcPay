import { Component, ViewEncapsulation } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { Coin, CurrencyProvider } from '../../providers/currency/currency';
import { ExternalLinkProvider } from '../../providers/external-link/external-link';
import { FeeProvider } from '../../providers/fee/fee';
import { Logger } from '../../providers/logger/logger';
import { PopupProvider } from '../../providers/popup/popup';

interface FeeOpts {
  feeUnit: string;
  feeUnitAmount: number;
  blockTime: number;
}

enum ethAvgTime {
  normal = '<5m',
  priority = '<2m',
  urgent = 'ASAP'
}

@Component({
  selector: 'page-choose-fee-level',
  templateUrl: 'choose-fee-level.html',
  styleUrls: ['choose-fee-level.scss'],
  encapsulation : ViewEncapsulation.None
})
export class ChooseFeeLevelModal {
  private blockTime: number;
  private FEE_MULTIPLIER: number = 10;
  private FEE_MIN: number = 0;
  private feeUnitAmount: number;
  public feeUnit: string;
  public maxFeeRecommended: number;
  public minFeeRecommended: number;
  private minFeeAllowed: number;
  public maxFeeAllowed: number;

  public network: string;
  public feeLevel: string;
  public customFeePerKB: string;
  public feePerSatByte: string;
  public feeOpts = [];
  public loadingFee: boolean;
  public feeLevels;
  public coin: Coin;
  public avgConfirmationTime: number;
  public customSatPerByte: number;
  public maxFee: number;
  public minFee: number;
  public showError: boolean;
  public showMaxWarning: boolean;
  public showMinWarning: boolean;
  public okText: string;
  public cancelText: string;
  public isERCToken: boolean;

  constructor(
    private currencyProvider: CurrencyProvider,
    private logger: Logger,
    private popupProvider: PopupProvider,
    public feeProvider: FeeProvider,
    private translate: TranslateService,
    private externalLinkProvider: ExternalLinkProvider,
    private navParams: NavParams,
    private viewCtrl: ModalController
  ) {}

  ngOnInit() {
    this.okText = this.translate.instant('Ok');
    this.cancelText = this.translate.instant('Cancel');
    this.network = this.navParams.data.network;
    this.coin = this.navParams.data.coin;
    this.isERCToken = this.currencyProvider.isERCToken(this.coin);
    this.feeLevel = this.navParams.data.feeLevel;
    this.setFeeUnits();

    // IF usingCustomFee
    this.customFeePerKB = this.navParams.data.customFeePerKB
      ? this.navParams.data.customFeePerKB
      : null;
    this.feePerSatByte = this.navParams.data.feePerSatByte
      ? this.navParams.data.feePerSatByte
      : null;

    if (_.isEmpty(this.feeLevel))
      this.showErrorAndClose(
        null,
        this.translate.instant('Fee level is not defined')
      );

    this.loadingFee = true;
    this.feeProvider
      .getFeeLevels(this.coin, this.network)
      .then(response => {
        this.loadingFee = false;
        if (_.isEmpty(response)) {
          this.showErrorAndClose(
            null,
            this.translate.instant('Could not get fee levels')
          );
          return;
        }
        this.feeLevels = response.levels;
        this.setFeeRates();
        if (this.customFeePerKB) this._setCustomFee();
      })
      .catch(err => {
        this.loadingFee = false;
        this.showErrorAndClose(null, err);
        return;
      });
  }

  private setFeeUnits() {
    const {
      feeUnit,
      feeUnitAmount,
      blockTime
    }: FeeOpts = this.currencyProvider.getFeeUnits(this.coin);
    this.feeUnit = feeUnit;
    this.feeUnitAmount = feeUnitAmount;
    this.blockTime = blockTime;
  }

  public setFeeRates() {
    this.feeLevels.forEach((feeLevel, i) => {
      this.feeOpts[i] = feeLevel;
      this.feeOpts[i].feePerSatByte = (
        feeLevel.feePerKb / this.feeUnitAmount
      ).toFixed();
      if (this.isERCToken) {
        this.feeOpts[i].avgConfirmationTime = ethAvgTime[feeLevel.level];
      } else {
        let avgConfirmationTime = feeLevel.nbBlocks * this.blockTime;
        this.feeOpts[i].avgConfirmationTime = avgConfirmationTime;
      }

      if (feeLevel.level == this.feeLevel)
        this.feePerSatByte = (
          this.feeOpts[i].feePerKb / this.feeUnitAmount
        ).toFixed();
    });

    // Warnings
    this.setFeesRecommended();
    this.checkFees(this.feePerSatByte);
  }

  public _setCustomFee() {
    this.avgConfirmationTime = null;
    this.customSatPerByte = Number(this.customFeePerKB) / this.feeUnitAmount;
  }

  public setCustomFee() {
    this.changeSelectedFee('custom');
  }

  private showErrorAndClose(title?: string, msg?: string): void {
    title = title ? title : this.translate.instant('Error');
    this.logger.error(msg);
    this.popupProvider.ionicAlert(title, msg).then(() => {
      this.viewCtrl.dismiss();
    });
  }

  public setFeesRecommended(): void {
    this.maxFeeRecommended = this.getMaxRecommended();
    this.minFeeRecommended = this.getMinRecommended();
    this.minFeeAllowed = this.FEE_MIN;
    this.maxFeeAllowed = this.maxFeeRecommended * this.FEE_MULTIPLIER;
    this.maxFee =
      this.maxFeeRecommended > this.maxFeeAllowed
        ? this.maxFeeRecommended
        : this.maxFeeAllowed;
    this.minFee =
      this.minFeeRecommended < this.minFeeAllowed
        ? this.minFeeRecommended
        : this.minFeeAllowed;
  }

  private getMinRecommended(): number {
    let value = _.map(this.feeLevels, feeLevel => {
      return feeLevel.feePerKb;
    });
    const minValue = Math.min(...value);
    return parseInt((minValue / this.feeUnitAmount).toFixed(), 10);
  }

  private getMaxRecommended(): number {
    let value = _.map(this.feeLevels, feeLevel => {
      return feeLevel.feePerKb;
    });
    const maxValue = Math.max(...value);
    return parseInt((maxValue / this.feeUnitAmount).toFixed(), 10);
  }

  public checkFees(feePerSatByte: string | any): void {
    let fee = Number(feePerSatByte);
    this.showError = fee <= this.minFeeAllowed ? true : false;
    this.showMinWarning =
      fee > this.minFeeAllowed && fee < this.minFeeRecommended ? true : false;
    this.showMaxWarning =
      fee < this.maxFeeAllowed && fee > this.maxFeeRecommended ? true : false;
  }

  public changeSelectedFee(feeLevel): void {
    this.logger.debug('New fee level: ' + feeLevel);
    this.feeLevel = feeLevel;
    this.customFeePerKB = this.customSatPerByte
      ? (this.customSatPerByte * this.feeUnitAmount).toFixed()
      : null;

    this.viewCtrl.dismiss({
      newFeeLevel: this.feeLevel,
      customFeePerKB: this.customFeePerKB,
      showMinWarning: this.showMinWarning
    });
  }

  public close(): void {
    this.viewCtrl.dismiss();
  }

  public openExternalLink(url: string): void {
    this.externalLinkProvider.open(url);
  }
}
