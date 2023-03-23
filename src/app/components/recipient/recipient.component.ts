import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChange,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';

// Providers
import { ActionSheetProvider } from '../../providers/action-sheet/action-sheet';
import { AddressProvider } from '../../providers/address/address';
import { AppProvider } from '../../providers/app/app';
import { Config, ConfigProvider } from '../../providers/config/config';
import { Coin, CurrencyProvider } from '../../providers/currency/currency';
import { ErrorsProvider } from '../../providers/errors/errors';
import { IncomingDataProvider } from '../../providers/incoming-data/incoming-data';
import { Logger } from '../../providers/logger/logger';
import { PlatformProvider } from '../../providers/platform/platform';
import { TxFormatProvider } from '../../providers/tx-format/tx-format';
import { ModalController, NavParams } from '@ionic/angular';
import { EventManagerService } from 'src/app/providers/event-manager.service';
import { Router } from '@angular/router';
import { ProfileProvider } from 'src/app/providers/profile/profile';
import { timer } from 'rxjs';
import { RecipientModel } from './recipient.model';
import { FilterProvider } from 'src/app/providers/filter/filter';
import { RateProvider } from 'src/app/providers/rate/rate';
import {
  AddressBookProvider,
  ClipboardProvider,
  LixiLotusProvider,
  ThemeProvider
} from 'src/app/providers';
import { Token } from 'src/app/models/tokens/tokens.model';
import { TransferToModalPage } from 'src/app/pages/send/transfer-to-modal/transfer-to-modal';
import { PageDto, PageModel } from 'src/app/providers/lixi-lotus/lixi-lotus';
import { Contact } from 'src/app/providers/address-book/address-book';

@Component({
  selector: 'recipient-component',
  templateUrl: './recipient.component.html',
  styleUrls: ['./recipient.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class RecipientComponent implements OnInit {
  public search: string = '';
  public amount: string = '';
  public amountResult: number = 0;
  navParamsData: any;
  public isCordova: boolean;
  public expression;
  public onlyIntegers: boolean;
  public allowSend: boolean;
  public globalResult: string;
  private availableUnits;
  private altUnitIndex: number;
  private unitIndex: number;
  public fiatCode: string;
  private alternativeCurrency;
  public config: Config;
  public fixedUnit: boolean;
  public unit: string;
  private unitDecimals: number;
  altCurrencyInitial: any;
  public alternativeUnit: string;
  private unitToSatoshi: number;
  private satToUnit: number;
  public alternativeAmount: string;
  public useSendMax: boolean;
  public validDataFromClipboard;
  public darkThemeString: string;
  public searchValue: string;
  validAddress = false;
  validAmount = false;
  validMessage = false;
  isSelectedTotalAmout: boolean = false;
  remaining: number;
  isShowReceiveLotus: boolean;
  receiveLotus: string;
  receiveAmountLotus: number;
  formatRemaining: string;
  messagesReceiveLotus: boolean = false;

  message='';
  Buffer = Buffer;
  @Input()
  recipient: RecipientModel;

  @Input()
  isShowSendMax: boolean;

  @Input()
  isShowDelete: boolean;

  @Input()
  wallet: any;

  @Input()
  token: Token;

  @Input()
  amountFromSelectedInput?: number;

  @Input()
  index?: number;

  @Input()
  isShowSelectInput?: boolean;

  @Input()
  isDonation?: boolean;

  @Input()
  isShowMessage?: boolean;

  @Output() deleteEvent?= new EventEmitter<number>();
  @Output() sendMaxEvent?= new EventEmitter<boolean>();

  @Output() sendOfficialInfo? = new EventEmitter<PageModel>();
  private validDataTypeMap: string[] = [
    'BitcoinAddress',
    'BitcoinCashAddress',
    'ECashAddress',
    'LotusAddress',
    'EthereumAddress',
    'EthereumUri',
    'RippleAddress',
    'DogecoinAddress',
    'LitecoinAddress',
    'RippleUri',
    'BitcoinUri',
    'BitcoinCashUri',
    'DogecoinUri',
    'LitecoinUri',
    'BitPayUri',
    'ECashUri',
    'LotusUri'
  ];
  @ViewChild('transferTo')
  transferTo;
  constructor(
    private configProvider: ConfigProvider,
    private currencyProvider: CurrencyProvider,
    private router: Router,
    private navParams: NavParams,
    private incomingDataProvider: IncomingDataProvider,
    private lixiLotusProvider: LixiLotusProvider,
    private addressProvider: AddressProvider,
    private appProvider: AppProvider,
    private translate: TranslateService,
    private errorsProvider: ErrorsProvider,
    private actionSheetProvider: ActionSheetProvider,
    private platformProvider: PlatformProvider,
    private txFormatProvider: TxFormatProvider,
    private logger: Logger,
    private filterProvider: FilterProvider,
    private rateProvider: RateProvider,
    private events: EventManagerService,
    private clipboardProvider: ClipboardProvider,
    private themeProvider: ThemeProvider,
    private modalCtrl: ModalController,
    private addressBookProvider: AddressBookProvider
  ) {
    this.darkThemeString =
      this.themeProvider.currentAppTheme === 'dark' ? 'dark' : 'light';
    if (this.router.getCurrentNavigation()) {
      this.navParamsData = this.router.getCurrentNavigation().extras.state;
    } else {
      this.navParamsData = history ? history.state : {};
    }
    this.isCordova = this.platformProvider.isCordova;
    this.expression = '';
    this.onlyIntegers = this.navParamsData.onlyIntegers
      ? this.navParamsData.onlyIntegers
      : false;
    this.alternativeCurrency = this.navParamsData.alternativeCurrency;
    this.config = this.configProvider.get();
    this.fixedUnit = this.navParamsData.fixedUnit;
    this.events.subscribe('Local/AddressScan', this.updateAddressHandler);
    this.isDonation = this.navParamsData.isDonation;
    if (this.isDonation) {
      this.remaining = this.navParamsData.remaining;
      this.receiveAmountLotus = this.navParamsData.receiveLotus;
      const coin = _.get(this.navParams, 'data.donationCoin', 'xpi');
      const precision = this.currencyProvider.getPrecision(
        coin as Coin
      ).unitToSatoshi;
      this.formatRemaining = this.txFormatProvider.formatAmount(
        coin,
        precision * this.remaining
      );
    }
    this.config = this.configProvider.get();
  }

  ngOnInit() {
    this.setAvailableUnits(!!(this.token && this.token.tokenId));
    this.updateUnitUI(!!(this.token && this.token.tokenId));
    if (this.recipient && this.recipient.toAddress && !this.isDonation) {
      this.searchValue = this.recipient.toAddress;
      this.processInput();
    }
  }

  ngOnChanges(changes: { [property: string]: SimpleChange }) {
    if (this.isSelectedTotalAmout) {
      const currentAmountInput = _.get(
        changes,
        'amountFromSelectedInput.currentValue',
        undefined
      );
      if (!_.isUndefined(currentAmountInput)) {
        this.expression = this.amountFromSelectedInput;
        this.processAmount();
      }
    }
  }

  public changeUnit(isToken?: boolean, isSendMax?: boolean): void {
    if (this.fixedUnit) return;

    this.unitIndex++;
    if (this.unitIndex >= this.availableUnits.length) this.unitIndex = 0;

    if (this.availableUnits[this.unitIndex].isFiat) {
      // Always return to BTC... TODO?
      this.altUnitIndex = 0;
    } else {
      this.altUnitIndex = _.findIndex(this.availableUnits, {
        isFiat: true
      });
    }

    this.expression = '';
    this.updateUnitUI(!!isToken);
  }

  public changeMessage() {
    if (this.message.trim().length > 0) {
      this.validMessage = true;
      this.recipient.message = this.message;
      this.checkRecipientValid();
    } else {
      this.validMessage = false;
      this.checkRecipientValid();
    }
  }

  private updateAddressHandler: any = data => {
    if (data.recipientId === this.recipient.id) {
      this.searchValue = data.value;
    }
  };

  private updateUnitUI(isToken?: boolean): void {
    this.unit = this.availableUnits[this.unitIndex].shortName;
    this.alternativeUnit = this.availableUnits[this.altUnitIndex].shortName;
    if (!isToken) {
      const { unitToSatoshi, unitDecimals } = this.availableUnits[
        this.unitIndex
      ].isFiat
        ? this.currencyProvider.getPrecision(
            this.availableUnits[this.altUnitIndex].id
          )
        : this.currencyProvider.getPrecision(this.unit.toLowerCase() as Coin);
      this.unitToSatoshi = unitToSatoshi;
      this.satToUnit = 1 / this.unitToSatoshi;
      this.unitDecimals = unitDecimals;
    }
    this.processAmount();
    this.logger.debug(
      'Update unit coin @amount unit:' +
        this.unit +
        ' alternativeUnit:' +
        this.alternativeUnit
    );
  }

  private setAvailableUnits(isToken?: boolean): void {
    this.availableUnits = [];

    const parentWalletCoin = !isToken
      ? this.navParamsData.wallet
        ? this.navParamsData.wallet.coin
        : this.wallet && this.wallet.coin
      : this.token.tokenInfo.coin;

    if (isToken) {
      this.availableUnits.push({
        name: this.token.tokenInfo.name,
        id: this.token.tokenId,
        shortName: this.token.tokenInfo.symbol
      });
    } else {
      for (const coin of this.currencyProvider.getAvailableCoins()) {
        if (parentWalletCoin === coin || !parentWalletCoin) {
          const { unitName, unitCode } =
            this.currencyProvider.getPrecision(coin);
          this.availableUnits.push({
            name: this.currencyProvider.getCoinName(coin),
            id: unitCode,
            shortName: unitName
          });
        }
      }
    }

    this.unitIndex = 0;

    if (this.navParamsData.coin) {
      let coins = this.navParamsData.coin.split(',');
      let newAvailableUnits = [];

      _.each(coins, (c: string) => {
        let coin = _.find(this.availableUnits, {
          id: c
        });
        if (!coin) {
          this.logger.warn(
            'Could not find desired coin:' + this.navParamsData.coin
          );
        } else {
          newAvailableUnits.push(coin);
        }
      });

      if (newAvailableUnits.length > 0) {
        this.availableUnits = newAvailableUnits;
      }
    }

    //  currency have preference
    let fiatName;
    if (this.navParamsData.currency) {
      this.fiatCode = this.navParamsData.currency;
      this.altUnitIndex = this.unitIndex;
      this.unitIndex = this.availableUnits.length;
    } else {
      this.fiatCode =
        this.alternativeCurrency ||
        this.config.wallet.settings.alternativeIsoCode ||
        'USD';
      fiatName = this.config.wallet.settings.alternativeName || this.fiatCode;
      this.altUnitIndex = this.availableUnits.length;
    }

    this.availableUnits.push({
      name: fiatName || this.fiatCode,
      // TODO
      id: this.fiatCode,
      shortName: this.fiatCode,
      isFiat: true
    });

    if (this.navParamsData.fixedUnit) {
      this.fixedUnit = true;
    }
    if (this.token) {
      if (
        !this.rateProvider.getRate(this.fiatCode, this.token.tokenInfo.symbol)
      ) {
        this.fixedUnit = true;
      }
    }
  }

  private isExpression(val: string): boolean {
    const regex = /^\.?\d+(\.?\d+)?([\/\-\+\*x]\d?\.?\d+)+$/;
    return regex.test(val);
  }

  private isOperator(val: string): boolean {
    const regex = /[\/\-\+\x\*]/;
    return regex.test(val);
  }

  private evaluate(val: string) {
    let result;
    try {
      result = eval(val);
    } catch (e) {
      return 0;
    }
    if (!_.isFinite(result)) return 0;
    return result;
  }

  private format(val: string): string {
    if (!val) return undefined;

    let result = val.toString();

    if (this.isOperator(_.last(val))) result = result.slice(0, -1);

    return result.replace('x', '*');
  }

  private processResult(val): number {
    if (this.availableUnits[this.unitIndex].isFiat)
      return +this.filterProvider.formatFiatAmount(val);
    else
      return +this.txFormatProvider.formatAmount(
        this.unit.toLowerCase(),
        val.toFixed(this.unitDecimals) * this.unitToSatoshi,
        true
      );
  }

  private fromFiat(val: number, coin?: Coin): number {
    coin = coin || this.availableUnits[this.altUnitIndex].id;
    return parseFloat(
      (
        this.rateProvider.fromFiat(val, this.fiatCode, coin) * this.satToUnit
      ).toFixed(this.unitDecimals)
    );
  }

  private fromFiatToken(val: number, tokenSymbol): number {
    return parseFloat(
      this.rateProvider
        .fromFiatToken(val, this.fiatCode, tokenSymbol)
        .toFixed(2)
    );
  }

  changeSelectedAmount(event) {
    if (this.isSelectedTotalAmout) {
      this.expression = this.amountFromSelectedInput;
      this.processAmount();
    }
  }

  private toFiat(val: number, coin?: Coin): number {
    if (
      !this.rateProvider.getRate(
        this.fiatCode,
        coin || this.availableUnits[this.unitIndex].id
      )
    )
      return undefined;

    const rateProvider = this.rateProvider.toFiat(
      val * this.unitToSatoshi,
      this.fiatCode,
      coin || this.availableUnits[this.unitIndex].id
    );
    if (_.isNil(rateProvider)) return undefined;
    return parseFloat(rateProvider.toString());
  }

  public processAmount(isSendMax?: boolean): void {
    let formatedValue = this.format(this.expression);
    let result = this.evaluate(formatedValue);
    this.allowSend = this.onlyIntegers
      ? _.isNumber(result) && +result > 0 && Number.isInteger(+result)
      : _.isNumber(result) && +result > 0;

    if (_.isNumber(result)) {
      this.globalResult = this.isExpression(this.expression)
        ? '= ' + this.processResult(result)
        : '';

      if (this.availableUnits[this.unitIndex].isFiat) {
        let a = result === 0 ? 0 : this.fromFiat(result);
        if (a) {
          this.alternativeAmount = this.txFormatProvider.formatAmount(
            this.availableUnits[this.altUnitIndex].id,
            a * this.unitToSatoshi,
            true
          );
        } else {
          this.alternativeAmount = result ? 'N/A' : '0.00';
          this.allowSend = false;
        }
        if (this.isDonation) {
          this.handleReceiveLotus(result);
        }
      } else {
        this.alternativeAmount = this.filterProvider.formatFiatAmount(
          this.toFiat(result)
        );
        if (this.isDonation) {
          this.handleReceiveLotus(this.toFiat(result));
        }
      }
    }
    let unit = this.availableUnits[this.unitIndex];
    let amount = result;
    if (this.token) {
      const decimals = _.get(this.token, 'tokenInfo.decimals', undefined);
      const unitDecimal = Math.pow(10, decimals);
      if (!unit.isFiat) {
        if (decimals && result > 0) amount = (amount * unitDecimal).toFixed(0);
        this.recipient.amount = parseInt(amount, 10);
        const alternativeAmount = this.rateProvider.toFiatToken(
          result,
          this.wallet.cachedStatus.alternativeIsoCode,
          this.token.tokenInfo.symbol
        );
        this.alternativeAmount =
          this.filterProvider.formatFiatAmount(alternativeAmount);
        this.recipient.altAmountStr = this.alternativeAmount;
      } else {
        amount = this.fromFiatToken(amount, this.token.tokenInfo.symbol);
        this.recipient.amount = parseInt((amount * unitDecimal).toFixed(0), 10);
        this.alternativeAmount = this.filterProvider
          .formatFiatAmount(amount)
          .toString();
        this.recipient.altAmountStr = this.alternativeAmount;
      }
    } else {
      amount = unit.isFiat
        ? (this.fromFiat(amount) * this.unitToSatoshi).toFixed(0)
        : (amount * this.unitToSatoshi).toFixed(0);
      this.recipient.amountToShow = result;
      this.recipient.altAmountStr = this.alternativeAmount;
      this.recipient.currency = this.unit;
      this.recipient.amount = parseInt(amount, 10);
    }
    this.validAmount = result > 0;
    this.amountResult = result;
    this.checkRecipientValid();
    if (isSendMax) {
      this.sendMaxEvent.emit(true);
    }
  }

  public async processInput() {
    let isSentXecToEtoken = false;
    if (this.recipient.name) this.validAddress = true;
    else {
      let address = this.searchValue;
      let scanEtokenSpecificValue, addressTokenScan, amountTokenScan;
          // Scan data: etoken:qp8ks7622cklc7c9pm2d3ktwzctack6njq57wn02p3?amount1=20
          if (address.includes('amount1')) {
            scanEtokenSpecificValue = address.split('?');
            addressTokenScan = scanEtokenSpecificValue[0] || null;
            amountTokenScan = scanEtokenSpecificValue[1] || null;
          }
      let tokenAddress: string = '';
      let addressSelected = addressTokenScan || address
      if (address == '') this.validAddress = false;
      // handle case send to etoken address in xec
      if (
        !this.token &&
        address.includes('etoken') &&
        this.wallet.coin == 'xec'
      ) {
        // handle etoken
        try {
          const { prefix, type, hash } =
            this.addressProvider.decodeAddress(address);
          if (prefix == 'etoken') {
            isSentXecToEtoken = true;
          } else {
            this.validAddress = false;
            this.checkRecipientValid();
            return;
          }
        } catch (e) {
          this.validAddress = false;
          this.checkRecipientValid();
          return;
        }
        // handle case send token
      } else if (this.token && this.wallet.coin == 'xec') {
        try {
          const { prefix, type, hash } =
            this.addressProvider.decodeAddress(addressSelected);
          if (prefix === 'ecash') {
            tokenAddress = address;
          } else if (prefix === 'etoken') {
            tokenAddress = addressSelected;
            address = this.addressProvider.encodeAddress(
              'ecash',
              type,
              hash,
              addressSelected
            );
          } else {
            this.validAddress = false;
            this.checkRecipientValid();
            return;
          }
        } catch (e) {
          this.validAddress = false;
          this.checkRecipientValid();
          return;
        }
      }
      const parsedData = this.incomingDataProvider.parseData(addressSelected);
      if (
        parsedData &&
        _.indexOf(this.validDataTypeMap, parsedData.type) != -1
      ) {
        let isValid = false;
        if (!isSentXecToEtoken) {
          isValid = this.checkCoinAndNetwork(address);
        }
        if (isValid || isSentXecToEtoken) {
          this.validAddress = true;
          let addressFinal =
            tokenAddress.trim().length > 0 ? tokenAddress : address;
          // query on server first => check if this address is official or not
          this.lixiLotusProvider
            .getOfficialInfo(addressFinal)
            .then(data => {
              this.recipient.isOfficialInfo = true;
              this.recipient.name = data.name;
              this.sendOfficialInfo.emit({
                ...data,
                address: addressFinal,
                index: this.index || 0
              } as PageModel);
              this.addressBookProvider
                .get(addressFinal, this.wallet.network)
                .then(contactSelected => {
                  if (contactSelected && data.name !== contactSelected.name) {
                    this.addressBookProvider
                      .remove(
                        contactSelected.address,
                        contactSelected.network,
                        contactSelected.coin
                      )
                      .then(() => {
                        this.addressBookProvider.add({
                          name: data.name,
                          coin: this.wallet.coin,
                          isOfficialInfo: true,
                          address: addressFinal
                        } as Contact);
                      });
                  } else {
                    this.addressBookProvider
                      .get(addressFinal, this.wallet.network)
                      .then(contactSelected => {
                        if (contactSelected) {
                          this.recipient.toAddress = contactSelected.address;
                          this.recipient.name = contactSelected.name;
                          this.recipient.recipientType = 'contact';
                        }
                      });
                  }
                })
                .catch(err => {
                  this.addressBookProvider.add({
                    name: data.name,
                    coin: this.wallet.coin,
                    isOfficialInfo: true,
                    address: addressFinal
                  } as Contact);
                });
            })
            .catch(e => {
              this.addressBookProvider
                .get(addressFinal, this.wallet.network)
                .then(contactSelected => {
                  if (contactSelected) {
                    this.recipient.toAddress = contactSelected.address;
                    this.recipient.name = contactSelected.name;
                    this.recipient.recipientType = 'contact';
                  }
                });
            })
            .finally(() => {
              this.recipient.isSentXecToEtoken = isSentXecToEtoken;
              this.recipient.toAddress = address;
              if (this.token && this.wallet.coin)
                this.recipient.toAddress = tokenAddress;
              this.checkRecipientValid();
              this.redir(isSentXecToEtoken);
            });
        } else {
          this.validAddress = false;
        }
      } else if (parsedData && parsedData.type == 'PrivateKey') {
        this.validAddress = true;
      } else {
        this.validAddress = false;
      }
    }
    this.checkRecipientValid();
  }

  private handleOfficialInfo(addressFinal) {
    this.lixiLotusProvider
      .getOfficialInfo(addressFinal)
      .then(data => {
        this.recipient.isOfficialInfo = true;
        this.recipient.toAddress = addressFinal;
        this.recipient.name = data.name;
        this.sendOfficialInfo.emit({
          ...data,
          address: addressFinal,
          index: this.index || 0
        } as PageModel);
        this.addressBookProvider
          .get(addressFinal, this.wallet.network)
          .then(contactSelected => {
            if (contactSelected && data.name !== contactSelected.name) {
              this.addressBookProvider
                .remove(
                  contactSelected.address,
                  contactSelected.network,
                  contactSelected.coin
                )
                .then(() => {
                  this.addressBookProvider.add({
                    name: data.name,
                    coin: this.wallet.coin,
                    isOfficialInfo: true,
                    address: addressFinal
                  } as Contact);
                });
            }
          })
          .catch(err => {
            this.addressBookProvider.add({
              name: data.name,
              coin: this.wallet.coin,
              isOfficialInfo: true,
              address: addressFinal
            } as Contact);
          });
      })
      .catch(err => {
        this.addressBookProvider
          .get(addressFinal, this.wallet.network)
          .then(contactSelected => {
            this.addressBookProvider
              .remove(
                contactSelected.address,
                contactSelected.network,
                contactSelected.coin
              )
              .then(() => {
                this.addressBookProvider.add({
                  ...contactSelected,
                  isOfficialInfo: false
                } as Contact);
              });
            if (contactSelected) {
              this.recipient.toAddress = contactSelected.address;
              this.recipient.name = contactSelected.name;
              this.recipient.recipientType = 'contact';
            }
          });
      });
  }

  private redir(isSentXecToEtoken) {
    this.incomingDataProvider.redir(this.searchValue, {
      activePage: 'SendPage',
      amount: this.navParams.data.amount,
      coin: this.navParams.data.coin, // TODO ???? what is this for ?
      recipientId: !this.isShowSendMax ? this.recipient.id : null,
      isSentXecToEtoken: isSentXecToEtoken,
      token: this.token
    });
    this.search = '';
  }

  checkRecipientValid() {
    if (!this.isDonation) {
      this.recipient.isValid = this.validAddress && (this.validAmount || this.validMessage);
    } else {
     
      if (this.isShowReceiveLotus) {
        this.recipient.isValid = this.validAddress && this.validAmount;
      } else {
        this.recipient.isValid = this.validAmount;
      }
    }
  }

  public async checkIfContact() {
    await timer(50).toPromise();
    return this.transferTo.hasContactsOrWallets;
  }

  private checkCoinAndNetwork(data, isPayPro?): boolean {
    let isValid, addrData;
    if (isPayPro) {
      isValid =
        data &&
        data.chain == this.currencyProvider.getChain(this.wallet.coin) &&
        data.network == this.wallet.network;
    } else {
      addrData = this.addressProvider.getCoinAndNetwork(
        data,
        this.wallet.network
      );
      isValid =
        this.currencyProvider.getChain(this.wallet.coin).toLowerCase() ==
          addrData.coin && addrData.network == this.wallet.network;
    }

    if (isValid) {
      this.validAddress = true;
      return true;
    } else {
      this.validAddress = true;
      let network = isPayPro ? data.network : addrData.network;

      if (this.wallet.coin === 'bch' && this.wallet.network === network) {
        const isLegacy = this.checkIfLegacy();
        isLegacy ? this.showLegacyAddrMessage() : this.showErrorMessage();
      } else {
        this.showErrorMessage();
      }
    }

    return false;
  }
  private checkIfLegacy(): boolean {
    return (
      this.incomingDataProvider.isValidBitcoinCashLegacyAddress(
        this.recipient.toAddress
      ) ||
      this.incomingDataProvider.isValidBitcoinCashUriWithLegacyAddress(
        this.recipient.toAddress
      )
    );
  }
  private showLegacyAddrMessage() {
    const appName = this.appProvider.info.nameCase;
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'legacy-address-info',
      { appName }
    );
    infoSheet.present();
    infoSheet.onDidDismiss(option => {
      if (option) {
        const legacyAddr = this.recipient.toAddress;
        const cashAddr =
          this.addressProvider.translateToCashAddress(legacyAddr);
        this.recipient.toAddress = cashAddr;
        this.processInput();
      }
    });
  }

  private showErrorMessage() {
    const msg = this.translate.instant(
      'The wallet you are using does not match the network and/or the currency of the address provided'
    );
    const title = this.translate.instant('Error');
    this.errorsProvider.showDefaultError(msg, title, () => {
      this.recipient.toAddress = '';
    });
  }

  public cleanSearch(isSpecificRecipient?: boolean) {
    this.recipient.toAddress = '';
    this.recipient.name = '';
    this.validAddress = false;
    this.recipient.recipientType = '';
    this.searchValue = '';
    if (isSpecificRecipient) {
      this.recipient.isSpecificAmount = false;
      this.expression = 0;
      this.processAmount();
    } else if (this.recipient.isOfficialInfo) {
      this.recipient.isOfficialInfo = false;
      this.sendOfficialInfo.emit(null);
    }
    this.checkRecipientValid();
  }

  public openScanner(): void {
    this.router.navigate(['/scan'], {
      state: { fromRecipientComponent: true, recipientId: this.recipient.id, isTokenScan: !!this.token}
    });
  }

  public shouldShowZeroState() {
    return (
      this.wallet &&
      this.wallet.cachedStatus &&
      !this.wallet.cachedStatus.totalBalanceSat
    );
  }

  public showOptions(coin: Coin) {
    return (
      (this.currencyProvider.isMultiSend(coin) ||
        this.currencyProvider.isUtxoCoin(coin)) &&
      !this.shouldShowZeroState()
    );
  }

  public informDelete() {
    this.deleteEvent.emit(this.recipient.id);
  }

  public sendMax(): void {
    this.sendMaxEvent.emit(!!this.token);
  }

  public goToAddressBook() {
    this.router.navigate(['/addressbook'], {
      state: { fromSend: true, recipientId: this.recipient.id }
    });
  }

  public async openTransferToModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TransferToModalPage,
      componentProps: {
        completeHistory: this.wallet.completeHistory,
        walletId: this.wallet.credentials.walletId,
        recipientId: this.recipient.id,
        fromSend: true
      }
    });
    modal.onDidDismiss().then(recipient => {
      if (recipient.data && recipient.data.id == this.recipient.id) {
        if (recipient.data.isOfficialInfo) {
          this.handleOfficialInfo(recipient.data.toAddress);
        } else {
          this.recipient.toAddress = recipient.data.toAddress;
          this.recipient.name = recipient.data.name;
          this.recipient.recipientType = recipient.data.recipientType;
        }
      }
    });

    return await modal.present();
  }

  public async pasteFromClipboard() {
    this.validDataFromClipboard = await this.clipboardProvider.getValidData(
      this.wallet.coin
    );
    this.cleanSearch();
    this.recipient.toAddress = this.validDataFromClipboard || '';
    this.validDataFromClipboard = null;
    this.clipboardProvider.clear();
    this.processInput();
  }

  private handleReceiveLotus(amountDonation) {
    this.receiveLotus = '';
    const availableUnit = this.availableUnits[this.unitIndex].isFiat
      ? this.availableUnits[this.altUnitIndex].id
      : this.availableUnits[this.unitIndex].id;
    const minMoneydonation = this.fromSatToFiat(
      this.rateProvider.fromFiat(
        this.navParamsData.minMoneydonation,
        'USD',
        availableUnit
      )
    );
    const remaining = this.navParamsData.remaining;
    const receiveLotus = this.navParamsData.receiveLotus;
    this.isShowReceiveLotus =
      amountDonation >= minMoneydonation && remaining >= receiveLotus;
    if (this.isShowReceiveLotus) {
      this.receiveLotus = `You will receive ${receiveLotus} Lotus`;
      this.messagesReceiveLotus = false;
    } else if (amountDonation <= minMoneydonation && amountDonation != 0) {
      this.receiveLotus = `You will receive 0 Lotus`;
      this.messagesReceiveLotus = false;
    } else if (amountDonation >= minMoneydonation && remaining < receiveLotus) {
      this.messagesReceiveLotus = true;
    }
  }

  private fromSatToFiat(val: number, coin?: Coin): number {
    const availableUnit = this.availableUnits[this.unitIndex].isFiat
      ? this.availableUnits[this.altUnitIndex].id
      : this.availableUnits[this.unitIndex].id;
    if (!this.rateProvider.getRate(this.fiatCode, coin || availableUnit))
      return undefined;

    const rateProvider = this.rateProvider.toFiat(
      val,
      this.fiatCode,
      coin || availableUnit
    );
    if (_.isNil(rateProvider)) return undefined;
    return parseFloat(rateProvider.toString());
  }

  public updateRecipient(recipient: RecipientModel) {
    this.searchValue = recipient.toAddress;
    this.recipient.toAddress = recipient.toAddress;
    this.expression = recipient.amount;
    this.recipient.isSpecificAmount = recipient.isSpecificAmount;
    this.processInput();
    this.processAmount();
    this.checkRecipientValid();
  }
}
