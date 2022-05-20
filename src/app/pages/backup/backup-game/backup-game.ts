import { Component, ViewEncapsulation } from '@angular/core';
import * as _ from 'lodash';
import { Location } from '@angular/common';

// providers
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { BwcProvider } from '../../../providers/bwc/bwc';
import { KeyProvider } from '../../../providers/key/key';
import { Logger } from '../../../providers/logger/logger';
import { PersistenceProvider } from '../../../providers/persistence/persistence';
import { ProfileProvider } from '../../../providers/profile/profile';
import { EventManagerService } from 'src/app/providers/event-manager.service';
import { Router } from '@angular/router';
import { SwiperOptions } from 'swiper';

import { BackupWordModel } from '../backup-component/backup-word/backup-word.model';
import { ModalController } from '@ionic/angular';
import { CopayersPage } from '../../add/copayers/copayers';
import { EventsService } from 'src/app/providers/events.service';
@Component({
  selector: 'page-backup-game',
  templateUrl: 'backup-game.html',
  styleUrls: ['./backup-game.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BackupGamePage {
  wideHeader;
  config: SwiperOptions = {
    slidesPerView: 2,
    spaceBetween: 20,
    centeredSlides: true,
    speed: 400
  }
  public mnemonicWords: string[];
  public mnemonicWordsConverted: BackupWordModel[];

  public shuffledMnemonicWords;
  public password: string;
  public customWords;
  public selectComplete: boolean;
  public mnemonicHasPassphrase;
  public useIdeograms;
  public keys;
  public keyId: string;
  public libWord: string[];
  public countWord = 0;
  public randomListFinal: string[];
  navParamsData;
  constructor(
    private logger: Logger,
    private profileProvider: ProfileProvider,
    private bwcProvider: BwcProvider,
    private actionSheetProvider: ActionSheetProvider,
    private keyProvider: KeyProvider,
    private events2: EventsService,
    private router: Router,
    private modalCtrl: ModalController,
    private location: Location) {
    if (this.router.getCurrentNavigation()) {
      this.navParamsData = this.router.getCurrentNavigation().extras.state ? this.router.getCurrentNavigation().extras.state : {};
    } else {
      this.navParamsData = history ? history.state : {};
    }
    this.mnemonicWords = (this.navParamsData.words as BackupWordModel[]).map(s => s.word);
    this.mnemonicWordsConverted = (this.navParamsData.words as BackupWordModel[]).map(s => new BackupWordModel({
      word: s.word,
      isBlur: true,
      isCorrect: true,
    }));
    this.keys = this.navParamsData.keys;
    this.keyId = this.navParamsData.keyId;
    this.setFlow();
    this.readFile();
  }

  readFile() {
    fetch('assets/backup-word.txt')
      .then(response => response.text())
      .then(data => {
        this.libWord = data.split(/\r\n|\n/);
        this.createRandom();
      })
  }

  createRandom() {
    const randomList = [this.mnemonicWordsConverted[this.countWord].word];
    for (let i = 0; i < 2; i++) {
      let isDone = true;
      while (isDone) {
        const randomNumber = Math.floor(Math.random() * (this.libWord.length));
        const wordRandom = this.libWord[randomNumber];
        if (wordRandom !== this.mnemonicWordsConverted[this.countWord].word) {
          randomList.push(wordRandom);
          isDone = false;
        }
      }
    }
    this.shuffleArray(randomList);
    this.randomListFinal = [...randomList];
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  checkWord(word) {
    if (word === this.mnemonicWordsConverted[this.countWord].word) {
      this.mnemonicWordsConverted[this.countWord].isCorrect = true;
      this.mnemonicWordsConverted[this.countWord].isBlur = false;
      this.countWord++;
      if (this.countWord === 12) {
        this.finalStep();
      } else {
        this.createRandom();
      }
    }
    else {
      this.mnemonicWordsConverted[this.countWord].isCorrect = false;
    }
  }

  back() {
    this.location.back();
  }


  private setFlow() {
    if (!this.mnemonicWords) return;

    this.mnemonicHasPassphrase = this.keyProvider.mnemonicHasPassphrase(
      this.keyId
    );
    this.useIdeograms = this.mnemonicWords.indexOf('\u3000') >= 0;
    this.password = '';
    this.customWords = [];
    this.selectComplete = false;
  }

  public finalStep(): void {
    if (this.mnemonicHasPassphrase) {
      const keyClient = this.bwcProvider.getKey();
      const separator = this.useIdeograms ? '\u3000' : ' ';
      const customSentence = this.mnemonicWords.join(separator);
      const password = this.password || '';
      let key;

      try {
        key = new keyClient({
          seedType: 'mnemonic',
          seedData: customSentence,
          useLegacyCoinType: false,
          useLegacyPurpose: false,
          passphrase: password
        });
      } catch (err) {
        this.showErrorInfoSheet(err);
        return;
      }

      if (key.get().xPrivKey != this.keys.xPrivKey) {
        this.showErrorInfoSheet('Private key mismatch');
        return;
      }
    }
    this.profileProvider.setBackupGroupFlag(this.keyId);
    const opts = {
      keyId: this.keyId,
      showHidden: true
    };
    const wallets = this.profileProvider.getWalletsFromGroup(opts);
    wallets.forEach(w => {
      this.profileProvider.setWalletBackup(w.credentials.walletId);
    });
    this.showSuccessInfoSheet();
  }

  private showSuccessInfoSheet() {
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'correct-recovery-prhase'
    );
    infoSheet.present();
    infoSheet.onDidDismiss(async () => {
      if (this.navParamsData.isNewSharedWallet) {
        const copayerModal = await this.modalCtrl.create({
          component: CopayersPage,
          componentProps: {
            walletId: this.navParamsData.walletId
          },
          cssClass: 'wallet-details-modal'
        });
        await copayerModal.present();
        copayerModal.onDidDismiss().then(() => {
          this.router
            .navigate(['/tabs/wallets'], {
              replaceUrl: true
            })
            .then(() => {
              this.events2.publishRefresh({
                keyId: this.keyId
              })
            });
        }
        )
      }
      else {
        this.router
          .navigate(['/tabs/wallets'], {
            replaceUrl: true
          })
          .then(() => {
            this.events2.publishRefresh({
              keyId: this.keyId
            })
          });
      }
    });
  }

  private showErrorInfoSheet(err) {
    this.logger.warn('Failed to verify backup: ', err);
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'incorrect-recovery-prhase'
    );
    infoSheet.present();
    infoSheet.onDidDismiss(() => {
      this.setFlow();
    });
  }
}
