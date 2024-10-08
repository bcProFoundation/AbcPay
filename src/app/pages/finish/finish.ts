import { Component, ViewEncapsulation } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'page-finish',
  templateUrl: 'finish.html',
  styleUrls: ['/finish.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FinishModalPage {
  public finishText: string;
  public finishComment: string;
  public cssClass: string; // success, warning, danger, primary

  constructor(
    private viewCtrl: ModalController,
    private navParams: NavParams,
    private translate: TranslateService
  ) {
    this.finishText =
      this.navParams.data.finishText || this.navParams.data.finishText == ''
        ? this.navParams.data.finishText
        : this.translate.instant('Payment Sent');
    this.finishComment = this.navParams.data.finishComment
      ? this.navParams.data.finishComment
      : '';
    this.cssClass = this.navParams.data.cssClass
      ? this.navParams.data.cssClass
      : 'success';

    if (this.navParams.get('autoDismiss')) {
      setTimeout(() => {
        this.viewCtrl.dismiss();
      }, 4000);
    }
  }

  public close(): void {
    this.viewCtrl.dismiss();
  }
}
