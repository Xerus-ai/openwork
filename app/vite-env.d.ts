/// <reference types="vite/client" />

/**
 * Type declarations for Vite environment.
 * Provides typing for import.meta.env and other Vite-specific features.
 */

interface ImportMetaEnv {
  readonly VITE_DEV_SERVER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
