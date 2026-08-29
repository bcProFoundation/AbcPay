/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BWS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
