/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly JWT_SECRET: string;
  readonly ENVELOPES_USERNAME: string;
  readonly ENVELOPES_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    user: {
      userId: number;
      username: string;
    } | null;
  }
}
