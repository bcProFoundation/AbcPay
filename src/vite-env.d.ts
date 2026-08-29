/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BWS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@bcpros/bitcore-lib-xec';
declare module '@bcpros/bitcore-lib-doge';
declare module 'bip39';

interface ImportMetaEnv {
  readonly VITE_BWS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
