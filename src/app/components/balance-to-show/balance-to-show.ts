import { Component, Input, ViewEncapsulation } from '@angular/core';
import { DecimalFormatBalance } from 'src/app/providers/decimal-format.ts/decimal-format';

@Component({
  selector: 'balance-to-show',
  templateUrl: 'balance-to-show.html',
  styleUrls: ['balance-to-show.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BalanceToShowComponent {
  @Input()
  set balance(value: string) {
    this._balance = value;
    this.processBalance(this._balance);
  }

  get balance(): string {
    return this._balance;
  }
  private _balance: string;
  public amount: string;
  public unit: string;
  public resize: boolean;

  constructor() {
    this.resize = false;
  }

  public formatTxAmount(amount: any) {
    return DecimalFormatBalance(amount);
  }

  private processBalance(balance: string) {
    if (!balance || balance === '') return;

    this.resize = Boolean(balance.length >= 18);
    if (balance.indexOf(' ') >= 0) {
      const spacePosition = balance.indexOf(' ');
      this.amount = balance.substr(0, spacePosition);
      this.unit = balance.substr(spacePosition, balance.length);
    }
  }
}
