import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from '../../providers/logger/logger';

// providers
import { BwcErrorProvider } from '../../providers/bwc-error/bwc-error';
import { ConfigProvider } from '../../providers/config/config';
import { CurrencyProvider } from '../../providers/currency/currency';
import { ErrorsProvider } from '../../providers/errors/errors';
import { FeeProvider } from '../../providers/fee/fee';
import { OnGoingProcessProvider } from '../../providers/on-going-process/on-going-process';
import { PlatformProvider } from '../../providers/platform/platform';
import { PopupProvider } from '../../providers/popup/popup';
import { ProfileProvider } from '../../providers/profile/profile';
import { TxFormatProvider } from '../../providers/tx-format/tx-format';
import { WalletProvider } from '../../providers/wallet/wallet';
import { AppProvider } from 'src/app/providers';

// pages
import { FinishModalPage } from '../finish/finish';

import * as _ from 'lodash';
import { ModalController, NavParams } from '@ionic/angular';
import { EventManagerService } from 'src/app/providers/event-manager.service';
@Component({
  selector: 'page-txp-details',
  templateUrl: 'txp-details.html',
  styleUrls: ['./txp-details.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TxpDetailsPage {
  @ViewChild('slideButton')
  slideButton;

  public wallet;
  public tx;
  public copayers;
  public copayerId: string;
  public isShared: boolean;
  public canSign: boolean;
  public color: string;
  public buttonText: string;
  public successText: string;
  public actionList;
  public paymentExpired: boolean;
  public expires: string;
  public currentSpendUnconfirmed: boolean;
  public loading: boolean;
  public showMultiplesOutputs: boolean;
  public amount: string;
  public isCordova: boolean;

  private executionPending: boolean;
  public currentTheme;
  constructor(
    private navParams: NavParams,
    private platformProvider: PlatformProvider,
    private feeProvider: FeeProvider,
    private events: EventManagerService,
    private logger: Logger,
    private popupProvider: PopupProvider,
    private walletProvider: WalletProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private configProvider: ConfigProvider,
    private currencyProvider: CurrencyProvider,
    private profileProvider: ProfileProvider,
    private txFormatProvider: TxFormatProvider,
    private translate: TranslateService,
    private modalCtrl: ModalController,
    private bwcErrorProvider: BwcErrorProvider,
    private errorsProvider: ErrorsProvider,
    private appProvider: AppProvider,
  ) {
    this.showMultiplesOutputs = false;
    let config = this.configProvider.get().wallet;
    this.tx = this.navParams.data.tx;
    this.wallet = this.tx.wallet
      ? this.tx.wallet
      : this.profileProvider.getWallet(this.tx.walletId);
    this.tx = this.txFormatProvider.processTx(this.wallet.coin, this.tx);
    if (!this.tx.toAddress) this.tx.toAddress = this.tx.outputs[0].toAddress;
    this.currentSpendUnconfirmed = config.spendUnconfirmed;
    this.loading = false;
    this.isCordova = this.platformProvider.isCordova;
    this.copayers = this.wallet.cachedStatus.wallet.copayers;
    this.copayerId = this.wallet.credentials.copayerId;
    this.isShared = this.wallet.credentials.n > 1;
    this.canSign = this.wallet.canSign;
    this.color = this.wallet.color;

    // To test multiple outputs...

    // var txp = {
    //   message: 'test multi-output',
    //   fee: 1000,
    //   createdOn: Math.floor(Date.now() / 1000),
    //   outputs: [],
    // };
    // for (let i = 0; i < 15; i++) {

    //   txp.outputs.push({
    //     amountStr: "600 BTC",
    //     toAddress: '2N8bhEwbKtMvR2jqMRcTCQqzHP6zXGToXcK',
    //     message: 'output #' + (Number(i) + 1)
    //   });
    // };
    // this.tx = _.merge(this.tx, txp);
    // this.tx.hasMultiplesOutputs = true;
  }

  converDate(number) {
    return new Date(number);
  }

  ngOnInit() {
    this.currentTheme = this.appProvider.themeProvider.currentAppTheme;
    this.events.subscribe('bwsEvent', this.bwsEventHandler);
    this.displayFeeValues();
    this.initActionList();
    this.applyButtonText();

    this.amount = this.txFormatProvider.formatAmount(
      this.wallet.coin,
      this.tx.amount
    );
  }

  ngOnDestroy() {
    this.events.unsubscribe('bwsEvent', this.bwsEventHandler);
  }

  private bwsEventHandler: any = (walletId: string, type: string) => {
    _.each(
      [
        'TxProposalRejectedBy',
        'TxProposalAcceptedBy',
        'transactionProposalRemoved',
        'TxProposalRemoved',
        'NewOutgoingTx',
        'UpdateTx'
      ],
      (eventName: string) => {
        if (walletId == this.wallet.id && type == eventName) {
          this.updateTxInfo(eventName);
        }
      }
    );
  };

  private displayFeeValues(): void {
    const chain = this.currencyProvider
      .getChain(this.wallet.coin)
      .toLowerCase();
    this.tx.feeFiatStr = this.txFormatProvider.formatAlternativeStr(
      chain,
      this.tx.fee
    );
    if (this.currencyProvider.isUtxoCoin(this.wallet.coin)) {
      this.tx.feeRateStr =
        ((this.tx.fee / (this.tx.amount + this.tx.fee)) * 100).toFixed(2) + '%';
    }
    const feeOpts = this.feeProvider.getFeeOpts(this.wallet.coin);
    this.tx.feeLevelStr = feeOpts[this.tx.feeLevel];
  }

  private applyButtonText(): void {
    var lastSigner =
      _.filter(this.tx.actions, {
        type: 'accept'
      }).length ==
      this.tx.requiredSignatures - 1;

    if (this.isShared && this.tx.coin === 'eth') {
      this.buttonText = this.translate.instant('Continue');
    } else if (lastSigner) {
      this.buttonText = this.isCordova
        ? this.translate.instant('Slide to send')
        : this.translate.instant('Click to send');
      this.successText = this.translate.instant('Payment Sent');
    } else {
      this.buttonText = this.isCordova
        ? this.translate.instant('Slide to accept')
        : this.translate.instant('Click to accept');
      this.successText = this.translate.instant('Payment Accepted');
    }
  }

  private initActionList(): void {
    this.actionList = [];

    if (!this.isShared) return;

    var actionDescriptions = {
      created: this.translate.instant('Proposal Created'),
      failed: this.translate.instant('Execution Failed'),
      accept: this.translate.instant('Accepted'),
      reject: this.translate.instant('Rejected'),
      broadcasted: this.translate.instant('Broadcasted')
    };

    this.actionList.push({
      type: 'created',
      time: this.tx.createdOn,
      description: actionDescriptions['created'],
      by: this.tx.creatorName
    });

    _.each(this.tx.actions, action => {
      this.actionList.push({
        type: action.type,
        time: action.createdOn,
        description: actionDescriptions[action.type],
        by: action.copayerName
      });
    });

    setTimeout(() => {
      this.actionList.reverse();
    }, 10);
  }

  private showErrorInfoSheet(error: Error | string, title?: string): void {
    this.loading = false;
    if (!error) return;
    this.logger.warn('ERROR:', error);
    if (this.isCordova) this.slideButton.isConfirmed(false);
    if (
      (error as Error).message === 'FINGERPRINT_CANCELLED' ||
      (error as Error).message === 'PASSWORD_CANCELLED'
    ) {
      return;
    }

    if ((error as Error).message === 'WRONG_PASSWORD') {
      this.errorsProvider.showWrongEncryptPasswordError();
      return;
    }

    let infoSheetTitle = title ? title : this.translate.instant('Error');

    this.errorsProvider.showDefaultError(
      this.bwcErrorProvider.msg(error),
      infoSheetTitle
    );
  }

  public sign(): void {
    this.loading = true;
    this.walletProvider
      .publishAndSign(this.wallet, this.tx)
      .then(() => {
        this.onGoingProcessProvider.clear();
        this.annouceFinish();
      })
      .catch(err => {
        this.onGoingProcessProvider.clear();
        this.showErrorInfoSheet(err, 'Could not send payment');
      });
  }

  public reject(): void {
    let title = this.translate.instant('Warning!');
    let msg = this.translate.instant(
      'Are you sure you want to reject this transaction?'
    );
    this.popupProvider
      .ionicConfirm(title, msg, null, null)
      .then((res: boolean) => {
        if (!res) return;
        this.loading = true;
        this.onGoingProcessProvider.set('rejectTx');
        this.walletProvider
          .reject(this.wallet, this.tx)
          .then(() => {
            this.onGoingProcessProvider.clear();
            this.close();
          })
          .catch(err => {
            this.onGoingProcessProvider.clear();
            this.showErrorInfoSheet(
              err,
              this.translate.instant('Could not reject payment')
            );
          });
      });
  }

  public remove(): void {
    let title = this.translate.instant('Warning!');
    let msg = this.translate.instant(
      'Are you sure you want to remove this transaction?'
    );
    this.popupProvider
      .ionicConfirm(title, msg, null, null)
      .then((res: boolean) => {
        if (!res) return;
        this.onGoingProcessProvider.set('removeTx');
        this.walletProvider
          .removeTx(this.wallet, this.tx)
          .then(() => {
            this.onGoingProcessProvider.clear();
            this.close();
          })
          .catch(err => {
            this.onGoingProcessProvider.clear();
            if (err && !(err.message && err.message.match(/Unexpected/))) {
              this.showErrorInfoSheet(
                err,
                this.translate.instant('Could not delete payment proposal')
              );
            }
          });
      });
  }

  public broadcast(): void {
    this.loading = true;
    this.onGoingProcessProvider.set('broadcastingTx');
    this.walletProvider
      .broadcastTx(this.wallet, this.tx)
      .then(() => {
        this.onGoingProcessProvider.clear();
        this.annouceFinish();
      })
      .catch(err => {
        this.onGoingProcessProvider.clear();
        this.showErrorInfoSheet(err, 'Could not broadcast payment');

        this.logger.error(
          'Could not broadcast: ',
          this.tx.coin,
          this.tx.network,
          this.tx.raw
        );
      });
  }

  private updateTxInfo(eventName: string): void {
    this.walletProvider
      .getTxp(this.wallet, this.tx.id)
      .then(tx => {
        let action: any = _.find(tx.actions, {
          copayerId: this.wallet.credentials.copayerId
        });

        this.tx = this.txFormatProvider.processTx(this.wallet.coin, tx);
        if ((!action || action.type === 'failed') && tx.status == 'pending') {
          this.tx.pendingForUs = true;
          if (action.type === 'failed') {
            this.executionPending = true;
          }
        }
        this.updateCopayerList();
        this.initActionList();
      })
      .catch(err => {
        if (
          err.message &&
          err.message == 'Transaction proposal not found' &&
          (eventName == 'transactionProposalRemoved' ||
            eventName == 'TxProposalRemoved')
        ) {
          this.tx.removed = true;
          this.tx.canBeRemoved = false;
          this.tx.pendingForUs = false;
        }
      });
  }

  public updateCopayerList(): void {
    _.map(this.copayers, (cp: any) => {
      _.each(this.tx.actions, ac => {
        if (cp.id == ac.copayerId) {
          cp.action = ac.type;
        }
      });
    });
  }

  public onConfirm(): void {
    if (this.tx.multisigContractAddress) {
      this.goToConfirm();
    } else {
      this.sign();
    }
  }

  public goToConfirm(): void {
    let amount = 0;
    this.modalCtrl.dismiss({
      walletId: this.wallet.credentials.walletId,
      amount,
      coin: this.wallet.coin,
      network: this.wallet.network,
      multisigContractAddress: this.wallet.credentials.multisigEthInfo
        .multisigContractAddress, // address eth multisig contract
      toAddress: this.wallet.credentials.multisigEthInfo
        .multisigContractAddress, // address eth multisig contract
      isEthMultisigConfirm: !this.executionPending ? true : false,
      isEthMultisigExecute: this.executionPending ? true : false,
      transactionId: this.tx.multisigTxId
    });
  }

  public close(params?): void {
    this.loading = false;
    this.modalCtrl.dismiss(params);
  }

  private async annouceFinish() {
    const params = {
      finishText: this.successText
    }
   this.close(params);
  }
}
