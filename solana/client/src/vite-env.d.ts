/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL: string;
  readonly VITE_RPC_WS_URL: string;
  readonly VITE_PROGRAM_ID: string;
  readonly VITE_NETWORK: string;
  readonly VITE_MARKETPLACE_NAME: string;
  readonly VITE_AI_PROXY_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.json' {
  const value: unknown;
  export default value;
}
