export interface AppConfig {
  port: number;
  basePath: string;
  databaseUrl: string;
  chronik: {
    xecUrls: string[];
    dogeUrls: string[];
  };
}

export const config: AppConfig = {
  port: Number(process.env.PORT ?? 3232),
  basePath: '/bws/api',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://abcpay:abcpay@localhost:5432/abcpay',
  chronik: {
    xecUrls: (process.env.CHRONIK_XEC_URLS ?? 'https://chronik.e.cash').split(','),
    dogeUrls: (process.env.CHRONIK_DOGE_URLS ?? 'https://chronik.dogecoin.com').split(',')
  }
};
