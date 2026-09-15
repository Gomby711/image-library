// Hand-maintained instead of `wrangler types`'s generated worker-configuration.d.ts —
// that file also pulls in @cloudflare/workers-types' full runtime globals, which
// redeclare the ambient `Request`/`Response` types and silently break every route
// handler's `req.json()` (DOM's Promise<any> becomes workers-types' Promise<unknown>).
// Importing just the specific binding types avoids that global collision entirely.
import type { KVNamespace, R2Bucket } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB_KV: KVNamespace;
    IMAGES_BUCKET: R2Bucket;
  }
}

export {};
