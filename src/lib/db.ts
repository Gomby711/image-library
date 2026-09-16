import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { DbShape } from "./types";

const DB_KEY = "db";
const EMPTY_DB: DbShape = { images: [], folders: [], libraryPages: [], workspaces: [], customTags: [] };

function cloneDb(db: DbShape): DbShape {
  return {
    images: db.images.slice(),
    folders: db.folders.slice(),
    libraryPages: db.libraryPages.slice(),
    workspaces: db.workspaces.slice(),
    customTags: db.customTags.slice(),
  };
}

async function getKv() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB_KV;
}

// Writes can race under concurrent requests (upload + tag edit landing together).
// A single in-process queue serializes them so one write never clobbers another —
// this only protects against races within one Worker isolate, but KV's own
// eventual-consistency window is small enough that this is fine at this scale.
let queue: Promise<unknown> = Promise.resolve();

// Workers KV is documented as supporting roughly one write per second to any
// given key before writes start erroring/slowing down. Bulk-tagging or
// tagging many images back-to-back used to fire one KV put per action,
// which could burst well past that — the write would throw, the route
// handler had nothing catching it, and the whole request came back as an
// unhandled 500 (looking like "the site crashed" for however long the
// backlog + KV's own backoff took to drain). Spacing writes out here keeps
// every mutation safely under that ceiling no matter how fast the UI fires
// requests at it.
const MIN_WRITE_INTERVAL_MS = 1050;
let lastWriteAt = 0;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => undefined);
  return result;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Short-lived in-isolate cache: a burst of rapid edits (select 20 images,
// tag them all in a few seconds) previously meant 20 full KV reads too, each
// racing the writes ahead of it in the queue. Serving reads from the copy we
// just wrote ourselves — instead of re-fetching KV, which is only eventually
// consistent anyway — removes that read pressure entirely for the common
// case of one browser session working quickly.
let cachedDb: DbShape | null = null;
let cacheStamp = 0;
const CACHE_TTL_MS = 5000;

export async function readDb(): Promise<DbShape> {
  if (cachedDb && Date.now() - cacheStamp < CACHE_TTL_MS) return cloneDb(cachedDb);

  const kv = await getKv();
  const raw = await kv.get(DB_KEY);
  let db: DbShape;
  if (!raw) {
    db = { ...EMPTY_DB };
  } else {
    try {
      const parsed = JSON.parse(raw) as Partial<DbShape>;
      db = {
        images: parsed.images ?? [],
        folders: parsed.folders ?? [],
        libraryPages: (parsed.libraryPages ?? []).map((p) => ({
          ...p,
          workspaceId: p.workspaceId ?? null,
          emoji: p.emoji ?? null,
        })),
        workspaces: (parsed.workspaces ?? []).map((w) => ({
          ...w,
          parentId: w.parentId ?? null,
          emoji: w.emoji ?? null,
        })),
        customTags: parsed.customTags ?? [],
      };
    } catch {
      db = { ...EMPTY_DB };
    }
  }
  cachedDb = db;
  cacheStamp = Date.now();
  return cloneDb(db);
}

async function writeDb(db: DbShape): Promise<void> {
  const wait = MIN_WRITE_INTERVAL_MS - (Date.now() - lastWriteAt);
  if (wait > 0) await sleep(wait);

  const kv = await getKv();
  await kv.put(DB_KEY, JSON.stringify(db));
  lastWriteAt = Date.now();
  cachedDb = db;
  cacheStamp = Date.now();
}

/** Thrown when a mutation couldn't be persisted — route handlers catch this
 *  and return a clean 503 instead of letting it surface as an unhandled 500. */
export class DbWriteError extends Error {
  constructor(cause: unknown) {
    super("Failed to save changes — please try again in a moment.");
    this.name = "DbWriteError";
    this.cause = cause;
  }
}

export function mutateDb<T>(fn: (db: DbShape) => T | Promise<T>): Promise<T> {
  return enqueue(async () => {
    try {
      const db = await readDb();
      const result = await fn(db);
      await writeDb(db);
      return result;
    } catch (err) {
      if (err instanceof DbWriteError) throw err;
      throw new DbWriteError(err);
    }
  });
}

/** Adds any newly-seen tag names to the remembered custom-tag list (dedup,
 *  case-sensitive exact match) so they show up as quick-pick chips next time
 *  instead of needing to be retyped. Call with whatever tags a request just
 *  applied — already-known ones and preset tags are harmless no-ops here. */
export function rememberTags(db: DbShape, tags: string[]): void {
  const known = new Set(db.customTags.map((t) => t.name));
  for (const tag of tags) {
    if (!tag || known.has(tag)) continue;
    known.add(tag);
    db.customTags.push({ name: tag, createdAt: new Date().toISOString() });
  }
}
