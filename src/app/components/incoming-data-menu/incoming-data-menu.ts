import { Component, ViewEncapsulation } from '@angular/core';
import { Coin, CurrencyProvider } from 'src/app/providers/currency/currency';
import { PlatformProvider } from 'src/app/providers/platform/platform';
import { ActionSheetParent } from '../action-sheet/action-sheet-parent';

@Component({
  selector: 'incoming-data-menu',
  templateUrl: 'incoming-data-menu.html',
  styleUrls: ['./incoming-data-menu.scss'],
  encapsulation: ViewEncapsulation.None
})
export class IncomingDataMenuComponent extends ActionSheetParent {
  public data: string;
  public type: string;
  public coin: Coin;
  public coinName: string;
  public fromHomeCard: boolean;
  public isCordova: boolean;
  public isToken: boolean = false;

  constructor(
    private currencyProvider: CurrencyProvider,
    private platformProvider: PlatformProvider
  ) {
    super();
    this.isCordova = this.platformProvider.isCordova;
  }

  ngOnInit() {
    this.data = this.params.data.data;
    this.type = this.params.data.type;
    this.coin = this.params.data.coin;
    this.coinName = this.coin && this.currencyProvider.getCoinName(this.coin);
    this.fromHomeCard = this.params.data.fromHomeCard;
  }

  public close(redirTo: string, value: string) {
    this.dismiss({ redirTo, value, coin: this.coin });
  }
}
