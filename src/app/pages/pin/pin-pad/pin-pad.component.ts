import { Component, Input, Output } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { ThemeProvider } from 'src/app/providers';

export interface PinButton {
  value: string;
  letters: string;
  class?: string;
}
@Component({
  selector: 'pin-pad',
  template: `
    <ion-row *ngFor="let row of buttonRows">
      <ion-col
        *ngFor="let button of row"
        (click)="onKeystroke(button.value)"
        [ngClass]="{ disabled: isValueDisabled(button.value), 
                    'no-background': button.class, 
                    'prevent-dot-pin': type === 'pin' && button.value === '.'}"
        tappable
      >
        <div class="buttons-container" [ngSwitch]="button.value">
          <span *ngSwitchCase="'delete'">
            <img *ngIf="type === 'pin'" [src]="selectedTheme == 'dark' ? 'assets/img/delete-btn-dark.svg' : 'assets/img/delete-btn-light.svg'" />
            <img
              class="amount-delete"
              *ngIf="type === 'amount'"
              src="assets/img/icon-delete.svg"
            />
          </span>
          <span *ngSwitchCase="'.'">
            <span *ngIf="type === 'amount'">.</span>
          </span>
          <span *ngSwitchDefault>{{ button.value }}</span>
        </div>
        <div class="letters" *ngIf="type === 'pin' && button.letters">{{ button.letters }}</div>
      </ion-col>
    </ion-row>
  `,
  styleUrls: ['pin-pad.scss']
})
export class PinPad {
  @Input()
  integersOnly: boolean = false;

  @Input()
  type: 'pin' | 'amount';

  keystrokeSubject: Subject<string> = new Subject<string>();

  @Output()
  keystroke: Observable<string> = this.keystrokeSubject.asObservable();
  selectedTheme;
  public buttonRows: PinButton[][] = [
    [
      {
        value: '1',
        letters: ''
      },
      {
        value: '2',
        letters: 'ABC'
      },
      {
        value: '3',
        letters: 'DEF'
      }
    ],
    [
      {
        value: '4',
        letters: 'GHI'
      },
      {
        value: '5',
        letters: 'JKL'
      },
      {
        value: '6',
        letters: 'MNO'
      }
    ],
    [
      {
        value: '7',
        letters: 'PQRS'
      },
      {
        value: '8',
        letters: 'TUV'
      },
      {
        value: '9',
        letters: 'WXYZ'
      }
    ],
    [
      {
        value: '.',
        letters: '',
        class: 'no-background'
      },
      {
        value: '0',
        letters: ''
      },
      {
        value: 'delete',
        letters: '',
        class: 'no-background'
      }
    ]
  ];

  constructor(
    private themeProvider: ThemeProvider
  ){
    this.selectedTheme = this.themeProvider.currentAppTheme;
  }

  public onKeystroke(value: string): void {
    if (this.isValueDisabled(value)) {
      return;
    }
    this.keystrokeSubject.next(value);
  }

  public isValueDisabled(value: string) {
    return value === '.' && this.integersOnly;
  }
}
