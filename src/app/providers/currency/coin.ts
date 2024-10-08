import { CoinsMap } from './currency';

export interface CoinOpts {
  // Bitcore-node
  name: string;
  chain: string;
  coin: string;
  unitInfo: {
    // Config/Precision
    unitName: string;
    unitToSatoshi: number;
    unitDecimals: number;
    unitCode: string;
  };
  properties: {
    // Properties
    hasMultiSig: boolean;
    hasMultiSend: boolean;
    isUtxo: boolean;
    isERCToken: boolean;
    isStableCoin: boolean;
    singleAddress: boolean;
  };
  paymentInfo: {
    paymentCode: string;
    protocolPrefix: { livenet: string; testnet: string };
    // Urls
    ratesApi: string;
    blockExplorerUrls: string;
    blockExplorerUrlsTestnet: string;
  };
  feeInfo: {
    // Fee Units
    feeUnit: string;
    feeUnitAmount: number;
    blockTime: number;
    maxMerchantFee: string;
  };
  theme: {
    coinColor: string;
    backgroundColor: string;
    gradientBackgroundColor: string;
  };
}

export const availableCoins: CoinsMap<CoinOpts> = {

  xpi: {
    name: 'Lotus',
    chain: 'XPI',
    coin: 'xpi',
    unitInfo: {
      unitName: 'XPI',
      unitToSatoshi: 1000000,
      unitDecimals: 6,
      unitCode: 'xpi'
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'lotusnet', testnet: 'ltstest' },
      ratesApi: 'https://aws.abcpay.cash/bws/api/v3/fiatrates/xpi',
      blockExplorerUrls: 'explorer.givelotus.org/',
      blockExplorerUrlsTestnet: 'sochain.com/'
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'normal'
    },
    theme: {
      coinColor: '#ffffff',
      backgroundColor: '#FF1B9C',
      gradientBackgroundColor: '#FF1B9C'
    }
  },

  xec: {
    name: 'eCash',
    chain: 'XEC',
    coin: 'xec',
    unitInfo: {
      unitName: 'XEC',
      unitToSatoshi: 100,
      unitDecimals: 2,
      unitCode: 'xec'
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'ecash', testnet: 'ectest' },
      ratesApi: 'https://aws.abcpay.cash/bws/api/v3/fiatrates/xec',
      blockExplorerUrls: 'explorer.be.cash/',
      blockExplorerUrlsTestnet: 'texplorer.bitcoinabc.org/'
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'urgent'
    },
    theme: {
      coinColor: '#016cbf',
      backgroundColor: '#0080CA',
      gradientBackgroundColor: '#0080CA'
    }
  },

  btc: {
    name: 'Bitcoin',
    chain: 'BTC',
    coin: 'btc',
    unitInfo: {
      unitName: 'BTC',
      unitToSatoshi: 100000000,
      unitDecimals: 8,
      unitCode: 'btc'
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'bitcoin', testnet: 'bitcoin' },
      ratesApi: 'https://aws.abcpay.cash/bws/api/v3/fiatrates/xpi',
      blockExplorerUrls: 'blockchain.com/btc/',
      blockExplorerUrlsTestnet: 'blockchain.com/btc-testnet/'
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'urgent'
    },
    theme: {
      coinColor: '#f7931a',
      backgroundColor: '#f7921a',
      gradientBackgroundColor: '#f7921a'
    }
  },

  bch: {
    name: 'Bitcoin Cash',
    chain: 'BCH',
    coin: 'bch',
    unitInfo: {
      unitName: 'BCH',
      unitToSatoshi: 100000000,
      unitDecimals: 8,
      unitCode: 'bch'
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'bitcoincash', testnet: 'bchtest' },
      ratesApi: 'https://aws.abcpay.cash/bws/api/v3/fiatrates/bch',
      blockExplorerUrls: 'blockchain.com/bch/',
      blockExplorerUrlsTestnet: 'blockchain.com/bch-testnet/'
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'normal'
    },
    theme: {
      coinColor: '#2FCF6E',
      backgroundColor: '#2FCF6E',
      gradientBackgroundColor: '#2FCF6E'
    }
  },

  doge: {
    name: 'Dogecoin',
    chain: 'DOGE',
    coin: 'doge',
    unitInfo: {
      unitName: 'DOGE',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'doge'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'dogecoin', testnet: 'dogecoin' },
      ratesApi: 'https://aws.abcpay.cash/bws/api/v3/fiatrates/doge',
      blockExplorerUrls: 'blockchair.com/',
      blockExplorerUrlsTestnet: 'sochain.com/'
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1e8,
      blockTime: 10,
      maxMerchantFee: 'normal'
    },
    theme: {
      coinColor: '#d8c172',
      backgroundColor: '#BA9F33',
      gradientBackgroundColor: '#BA9F33'
    }
  },

  ltc: {
    name: 'Litecoin',
    chain: 'LTC',
    coin: 'ltc',
    unitInfo: {
      unitName: 'LTC',
      unitToSatoshi: 100000000,
      unitDecimals: 8,
      unitCode: 'ltc'
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'litecoin', testnet: 'litecoin' },
      ratesApi: 'https://aws.abcpay.cash/bws/api/v3/fiatrates/ltc',
      blockExplorerUrls: 'blockchair.com/',
      blockExplorerUrlsTestnet: 'blockchair.com/'
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'urgent'
    },
    theme: {
      coinColor: '#f7931a',
      backgroundColor: '#BEBEBE',
      gradientBackgroundColor: '#BEBEBE'
    }
  },
};
