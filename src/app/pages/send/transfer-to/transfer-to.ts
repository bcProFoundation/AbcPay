import { AfterContentInit, Component, Input, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, NavParams } from '@ionic/angular';

import * as _ from 'lodash';
import { AppProvider } from 'src/app/providers';
import { EventManagerService } from 'src/app/providers/event-manager.service';
import { OnGoingProcessProvider } from 'src/app/providers/on-going-process/on-going-process';

// Providers
import { AddressBookProvider } from '../../../providers/address-book/address-book';
import {
  Coin,
  CoinsMap,
  CurrencyProvider
} from '../../../providers/currency/currency';
import { Logger } from '../../../providers/logger/logger';
import { PlatformProvider } from '../../../providers/platform/platform';
import { PopupProvider } from '../../../providers/popup/popup';
import { ProfileProvider } from '../../../providers/profile/profile';
import { WalletProvider } from '../../../providers/wallet/wallet';



export interface FlatWallet {
  walletId: string;
  color: string;
  name: string;
  lastKnownBalance: string;
  cachedStatus: any;
  recipientType: 'wallet';
  coin: Coin;
  network: 'testnet' | 'livenet';
  m: number;
  n: number;
  needsBackup: boolean;
  keyId: string;
  walletGroupName: string;
  isComplete: () => boolean;
  getAddress: () => Promise<string>;
}
interface UpdateWalletOptsI {
  walletId: string;
  force?: boolean;
  alsoUpdateHistory?: boolean;
}
@Component({
  selector: 'page-transfer-to',
  templateUrl: 'transfer-to.html',
  styleUrls: ['transfer-to.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TransferToPage {
  public search: string = '';
  public wallets = {} as CoinsMap<any>;
  public hasWallets = {} as CoinsMap<boolean>;
  public walletList = {} as CoinsMap<FlatWallet[]>;
  public availableCoins: Coin[];
  public contactsList = [];
  public contactsGroup = [];
  public filteredContactsList = [];
  public filteredWallets = [];
  public walletsByKeys = [];
  public filteredWalletsByKeys = [];
  public hasContacts: boolean;
  public contactsShowMore: boolean;
  public amount: string;
  public fiatAmount: number;
  public fiatCode: string;
  public _wallet: any = {};
  public _useAsModal: boolean;
  public _fromWalletDetails: boolean;
  public hasContactsOrWallets: boolean;
  public updatingContactsList: boolean = false;
  public itemTapped: boolean = false;

  private _delayTimeOut: number = 700;
  private _fromSend: boolean;
  private _fromMultiSend: boolean;

  private CONTACTS_SHOW_LIMIT: number = 10;
  private currentContactsPage: number = 0;
  navParamsData;

  public history = [];

  public listRecentTransaction = [];

  public showContactTab: boolean = false;
  public currentTheme: string;
  constructor(
    private currencyProvider: CurrencyProvider,
    private router: Router,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private addressBookProvider: AddressBookProvider,
    private logger: Logger,
    private platformProvider: PlatformProvider,
    private popupProvider: PopupProvider,
    private viewCtrl: ModalController,
    private events: EventManagerService,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private navParams: NavParams,
    private appProvider: AppProvider
  ) {
    if (this.router.getCurrentNavigation()) {
      this.navParamsData = this.router.getCurrentNavigation().extras.state;
    } else {
      this.navParamsData = history ? history.state : undefined;
    }
    if (this.navParams && !_.isEmpty(this.navParams.data)) this.navParamsData = this.navParams.data;

    this.availableCoins = this.currencyProvider.getAvailableCoins();
    for (const coin of this.availableCoins) {
      this.wallets[coin] = this.profileProvider.getWallets({ coin });
      this.hasWallets[coin] = !_.isEmpty(this.wallets[coin]);
    }
    this._delayTimeOut =
      this.platformProvider.isIOS || this.platformProvider.isAndroid
        ? 700
        : 100;
    this.currentTheme = this.appProvider.themeProvider.currentAppTheme;
  }

  public getListRecentTransaction() {
    let historyTmp = [
      ...new Map(this.navParamsData.completeHistory.filter(item => item.action === 'sent').map((item) => [item["addressTo"], item])).values(),
    ] as Array<any>;
    let contacts = [];
    for (let historyEle of historyTmp) {
      if (historyEle.customData && historyEle.customData.toWalletName) {
        contacts.push({
          name: historyEle.customData.toWalletName,
          recipientType: 'wallet',
          isAccount: true,
          getAddress: () => Promise.resolve(historyEle.addressTo),
        });
      } else if (this.filteredContactsList.find(s => s.address === historyEle.addressTo)) {
        contacts.push(this.contactsList.find(s => s.address === historyEle.addressTo));
      }
      if (contacts.length >= 6) break;
    }
    this.listRecentTransaction = contacts;
  }

  private fetchTxHistory(opts: UpdateWalletOptsI) {
    if (!opts.walletId) {
      this.logger.error('Error no walletId in update History');
      return;
    }

    const progressFn = ((_, newTxs) => {
      let args = {
        walletId: opts.walletId,
        finished: false,
        progress: newTxs
      };
      this.events.publish('Local/WalletHistoryUpdate', args);
    }).bind(this);

    // Fire a startup event, to allow UI to show the spinner
    this.events.publish('Local/WalletHistoryUpdate', {
      walletId: opts.walletId,
      finished: false
    });
    this.walletProvider
      .fetchTxHistory(this.wallet, progressFn, opts)
      .then(txHistory => {
        this.wallet.completeHistory = txHistory;
        this.events.publish('Local/WalletHistoryUpdate', {
          walletId: opts.walletId,
          finished: true
        });
      })
      .catch(err => {
        if (err != 'HISTORY_IN_PROGRESS') {
          this.logger.warn('WalletHistoryUpdate ERROR', err);
          this.events.publish('Local/WalletHistoryUpdate', {
            walletId: opts.walletId,
            finished: false,
            error: err
          });
        }
      });
  }

  @Input()
  set wallet(wallet) {
    this._wallet = this.navParamsData.wallet
      ? this.navParamsData.wallet
      : wallet;

    for (const coin of this.availableCoins) {
      this.walletList[coin] = _.compact(this.getWalletsList(coin));
    }
    if (this._wallet.donationCoin) {
      this.walletsByKeys = _.values(
        _.groupBy(this.walletList[this._wallet.donationCoin], 'keyId')
      );
    } else {
      this.walletsByKeys = _.values(
        _.groupBy(this.walletList[this._wallet.coin], 'keyId')
      );
    }

    this.delayUpdateContactsList(this._delayTimeOut);
  }

  get wallet() {
    return this._wallet;
  }

  @Input()
  set searchInput(search) {
    this.search = search;
    this.processInput();
  }

  get searchInput() {
    return this.search;
  }

  @Input()
  set useAsModal(useAsModal: boolean) {
    this._useAsModal = useAsModal;
  }

  get useAsModal() {
    return this._useAsModal;
  }

  @Input() dataDonation?: any;


  @Input()
  set fromWalletDetails(fromWalletDetails: boolean) {
    this._fromWalletDetails = fromWalletDetails;
  }

  get fromWalletDetails() {
    return this._fromWalletDetails;
  }

  @Input()
  set fromSend(fromSend: boolean) {
    this._fromSend = fromSend;
  }

  get fromSend() {
    return this._fromSend;
  }

  @Input()
  set fromMultiSend(fromMultiSend: boolean) {
    this._fromMultiSend = fromMultiSend;
  }

  get fromMultiSend() {
    return this._fromMultiSend;
  }

  public getCoinName(coin: Coin) {
    return this.currencyProvider.getCoinName(coin);
  }

  private getWalletsList(coin: string): FlatWallet[] {
    return this.hasWallets[coin]
      ? this.getRelevantWallets(this.wallets[coin])
      : [];
  }

  private getRelevantWallets(rawWallets): FlatWallet[] {
    return rawWallets
      .map(wallet => this.flattenWallet(wallet))
      .filter(wallet => this.filterIrrelevantRecipients(wallet));
  }

  delayUpdateContactsList(delayTime: number = 700) {
    if (this.updatingContactsList) return;
    this.updatingContactsList = true;
    setTimeout(() => {
      this.updateContactsList();
      this.updatingContactsList = false;
      this.getListRecentTransaction();
    }, delayTime || 700);
  }

  private updateContactsList(): void {
    this.addressBookProvider
      .list(this._wallet ? this._wallet.network : null)
      .then(ab => {
        this.hasContacts = _.isEmpty(ab) ? false : true;
        if (!this.hasContacts) return;

        let contactsList = [];
        _.each(ab, c => {
          contactsList.push({
            name: c.name,
            address: c.address,
            network: c.network,
            email: c.email,
            recipientType: 'contact',
            coin: c.coin,
            getAddress: () => Promise.resolve(c.address),
            destinationTag: c.tag,
            isOfficialInfo: c.isOfficialInfo || false
          });
        });
        contactsList = _.orderBy(contactsList, 'name');
        this.contactsList = contactsList.filter(c =>
          this.filterIrrelevantRecipients(c)
        );
        let shortContactsList = _.clone(
          this.contactsList.slice(
            0,
            (this.currentContactsPage + 1) * this.CONTACTS_SHOW_LIMIT
          )
        );
        this.filteredContactsList = _.clone(contactsList);
        this.contactsShowMore =
          this.contactsList.length > shortContactsList.length;

        this.contactsGroup = _.values(_.groupBy(_.map(this.filteredContactsList, contact => {
          return {
            firstLetter: contact.name[0],
            ...contact
          }
        }), 'firstLetter'));
        this.getListRecentTransaction();
      });
  }

  private flattenWallet(wallet): FlatWallet {
    return {
      walletId: wallet.credentials.walletId,
      color: wallet.color,
      name: wallet.name,
      lastKnownBalance: wallet.lastKnownBalance,
      cachedStatus: wallet.cachedStatus,
      recipientType: 'wallet',
      coin: wallet.coin,
      network: wallet.network,
      m: wallet.credentials.m,
      n: wallet.credentials.n,
      keyId: wallet.keyId,
      walletGroupName: wallet.walletGroupName,
      isComplete: () => wallet.isComplete(),
      needsBackup: wallet.needsBackup,
      getAddress: () => this.walletProvider.getAddress(wallet, false)
    };
  }

  private filterIrrelevantRecipients(recipient: {
    coin: string;
    network: string;
    walletId: string;
  }): boolean {
    if (this._wallet.donationCoin) {
      return this._wallet
        ? this._wallet.donationCoin === recipient.coin &&
        this._wallet.id !== recipient.walletId
        : true;
    }
    return this._wallet
      ? this._wallet.coin === recipient.coin &&
      this._wallet.network === recipient.network &&
      this._wallet.id !== recipient.walletId
      : true;
  }

  public showMore(): void {
    this.currentContactsPage++;
    this.updateContactsList();
  }

  public segmentChanged(index) {
    this.showContactTab = index === 1;
  }
  public processInput(): void {
    if (this.search && this.search.trim() != '') {
      this.searchWallets();
      this.searchContacts();

      this.hasContactsOrWallets =
        this.filteredContactsList.length === 0 &&
          this.filteredWallets.length === 0
          ? false
          : true;
    } else {
      this.delayUpdateContactsList(this._delayTimeOut);
      this.filteredWallets = [];
      this.filteredWalletsByKeys = [];
    }
  }

  public searchWallets(): void {
    for (const coin of this.availableCoins) {
      if (this.hasWallets[coin] && this._wallet.coin === coin) {
        this.filteredWallets = this.walletList[coin].filter(wallet => {
          return _.includes(
            wallet.name.toLowerCase(),
            this.search.toLowerCase()
          );
        });
        this.filteredWalletsByKeys = _.values(
          _.groupBy(this.filteredWallets, 'keyId')
        );
      }
    }
  }

  public searchContacts(): void {
    this.filteredContactsList = _.filter(this.contactsList, item => {
      let val = item.name;
      return _.includes(val.toLowerCase(), this.search.toLowerCase());
    });
  }

  public close(item): void {
    this.onGoingProcessProvider.set('Please wait...')
    this.itemTapped = true;
    item
      .getAddress()
      .then((addr: string) => {
        if (!addr) {
          // Error is already formated
          this.popupProvider.ionicAlert('Error - no address');
          return;
        }
        this.logger.debug('Got address:' + addr + ' | ' + item.name);
        if (this.navParamsData.fromSend) {
          this.viewCtrl.dismiss({
            recipientType: item.recipientType,
            toAddress: addr,
            name: item.name,
            email: item.email,
            isOfficialInfo: item.isOfficialInfo,
            id: this.navParamsData.recipientId
          });
        }
        else {
          this.router.navigate(['/amount'], {
            state: {
              walletId: this._wallet.id,
              recipientType: item.recipientType,
              amount: parseInt(this._wallet.amount, 10),
              toAddress: addr,
              name: item.name,
              email: item.email,
              color: item.color,
              coin: item.coin,
              network: item.network,
              useAsModal: this._useAsModal,
              fromWalletDetails: this._fromWalletDetails,
              fromMultiSend: this._fromMultiSend,
              destinationTag: item.destinationTag
            }
          });
        }
        this.onGoingProcessProvider.clear();
      })
      .catch(err => {
        this.logger.error('Send: could not getAddress', err);
        this.onGoingProcessProvider.clear();
      });
    this.itemTapped = false;
  }
}
