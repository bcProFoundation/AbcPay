import { Injectable } from '@angular/core';
import { BwcProvider } from '../bwc/bwc';
import { Logger } from '../logger/logger';

// Providers


export interface CoinNetwork {
  coin: string;
  network: string;
}
@Injectable({
  providedIn: 'root'
})
export class AddressProvider {
  private bitcore;
  private bitcoreCash;
  private bitcoreDoge;
  private bitcoreXec;
  private bitcoreXpi;
  private bitcoreLtc;
  private core;

  constructor(private bwcProvider: BwcProvider, private logger: Logger) {
    this.bitcore = this.bwcProvider.getBitcore();
    this.bitcoreCash = this.bwcProvider.getBitcoreCash();
    this.bitcoreDoge = this.bwcProvider.getBitcoreDoge();
    this.bitcoreXec = this.bwcProvider.getBitcoreXec();
    this.bitcoreXpi = this.bwcProvider.getBitcoreXpi();
    this.bitcoreLtc = this.bwcProvider.getBitcoreLtc();

    this.core = this.bwcProvider.getCore();
  }

  public translateToCashAddress(addressToTranslate: string): string {
    var addressObj = this.bitcore.Address(addressToTranslate).toObject();
    const cashAdrr = this.bitcoreCash.Address.fromObject(
      addressObj
    ).toCashAddress();
    this.logger.info(`converted: ${addressToTranslate} -> ${cashAdrr}`);
    return cashAdrr;
  }

  public extractAddress(str: string): string {
    const extractedAddress = str.replace(/^[a-z]+:/i, '').replace(/\?.*/, '');
    return extractedAddress;
  }

  public getCoinAndNetwork(
    str: string,
    network: string = 'livenet'
  ): CoinNetwork {
    const address = this.extractAddress(str);
    try {
      network = this.bitcore.Address(address).network.name;
      return { coin: 'btc', network };
    } catch (e) {
      try {
        network = this.bitcoreCash.Address(address).network.name;
        return { coin: 'bch', network };
      } catch (e) {
        try {
          const isValidEthAddress = this.core.Validation.validateAddress(
            'ETH',
            network,
            address
          );
          if (isValidEthAddress) {
            return { coin: 'eth', network };
          } else {
            throw isValidEthAddress;
          }
        } catch (e) {
          try {
            const isValidXrpAddress = this.core.Validation.validateAddress(
              'XRP',
              network,
              address
            );
            if (isValidXrpAddress) {
              return { coin: 'xrp', network };
            } else {
              throw isValidXrpAddress;
            }
          } catch (e) {
            try {
              network = this.bitcoreDoge.Address(address).network.name;
              return { coin: 'doge', network };
            } catch (e) {
              try {
                network = this.bitcoreXec.Address(address).network.name;
                return { coin: 'xec', network };
              } catch (e) {
                try {
                  network = this.bitcoreLtc.Address(address).network.name;
                  return { coin: 'ltc', network };
                } catch (error) {
                  try {
                    network = this.bitcoreXpi.Address(address).network.name;
                    return { coin: 'xpi', network };
                  } catch (error) {
                    return null;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  public isValid(str: string): boolean {
    if (!str) return false;
    // Check if the input is a valid uri or address
    const URI = this.bitcore.URI;
    const Address = this.bitcore.Address;
    const AddressCash = this.bitcoreCash.Address;
    const AddressXec = this.bitcoreXec.Address;
    const AddressXpi = this.bitcoreXpi.Address;
    const URICash = this.bitcoreCash.URI;
    const URIXec = this.bitcoreXec.URI;
    const AddressDoge = this.bitcoreDoge.Address;
    const URIDoge = this.bitcoreDoge.URI;
    const AddressLtc = this.bitcoreLtc.Address;
    const URILtc = this.bitcoreLtc.URI;

    const { Validation } = this.core;

    // Bip21 uri
    if (URI.isValid(str)) return true;
    if (URICash.isValid(str)) return true;
    if (URIXec.isValid(str)) return true;
    if (URIDoge.isValid(str)) return true;
    if (URILtc.isValid(str)) return true;
    if (Validation.validateUri('ETH', str)) return true;
    if (Validation.validateUri('XRP', str)) return true;

    // Regular Address: try Bitcoin and Bitcoin Cash
    if (Address.isValid(str, 'livenet')) return true;
    if (Address.isValid(str, 'testnet')) return true;
    if (AddressCash.isValid(str, 'livenet')) return true;
    if (AddressCash.isValid(str, 'testnet')) return true;
    if (AddressXec.isValid(str, 'livenet')) return true;
    if (AddressXec.isValid(str, 'testnet')) return true;
    if (AddressXpi.isValid(str, 'livenet')) return true;
    if (AddressXpi.isValid(str, 'testnet')) return true;
    if (AddressDoge.isValid(str, 'livenet')) return true;
    if (AddressDoge.isValid(str, 'testnet')) return true;
    if (AddressLtc.isValid(str, 'livenet')) return true;
    if (AddressLtc.isValid(str, 'testnet')) return true;
    if (Validation.validateAddress('XRP', 'livenet', str)) return true;
    if (Validation.validateAddress('ETH', 'livenet', str)) return true;

    return false;
  }

  public getLegacyBchAddressFormat(addr: string): string {
    const a = this.bitcoreCash.Address(addr).toObject();
    return this.bitcore.Address.fromObject(a).toString();
  }

  public decodeAddress(address: string) {
    const addressBitCore = this.bwcProvider.getBitcoreXec().Address(address);
    const { prefix, type, hash } = addressBitCore.decode(address);
    return {
      prefix,
      type,
      hash
    }
  }

  public encodeAddress(prefix, type, hash, address) {
    const addressBitCore = this.bwcProvider.getBitcoreXec().Address(address);
    return addressBitCore.encode(prefix, type, hash);
  }
}
