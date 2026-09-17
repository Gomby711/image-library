import { kvGet, kvPut } from "./kv";
import { PAGE_ICON_OPTIONS, type DbShape, type PageIconName } from "./types";

function sanitizeIcon(value: unknown): PageIconName | null {
  return typeof value === "string" && (PAGE_ICON_OPTIONS as readonly string[]).includes(value)
    ? (value as PageIconName)
    : null;
}

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

  const raw = await kvGet(DB_KEY);
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
          // A page's icon used to store a raw emoji character (e.g. "🚗") —
          // those no longer match any option in the new lucide-icon set, so
          // they fall back to null (the default icon) rather than rendering
          // as a stale/unrecognized value.
          icon: sanitizeIcon(p.icon),
          heroImageId: p.heroImageId ?? null,
          heroUpload: p.heroUpload ?? null,
          order: p.order,
        })),
        workspaces: (parsed.workspaces ?? []).map((w) => ({
          ...w,
          parentId: w.parentId ?? null,
          icon: sanitizeIcon(w.icon),
          order: w.order,
        })),
        customTags: parsed.customTags ?? [],
      };
      backfillOrder(db);
      pullHeroImagesOutOfLibrary(db);
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

  await kvPut(DB_KEY, JSON.stringify(db));
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

/** Library pages and workspaces used to be rendered "all workspaces, then
 *  all pages" with ordering coming purely from each array's own position —
 *  which meant a page could never be dragged above/below a workspace, only
 *  reordered against other pages. Both record types now carry an explicit
 *  `order` shared per parent container, so any sibling (page or workspace)
 *  can be positioned anywhere relative to any other. This backfills that
 *  field for records written before it existed, preserving the old visual
 *  order (workspaces first, then pages, within each parent) as the
 *  starting point. */
function backfillOrder(db: DbShape): void {
  const counters = new Map<string, number>();
  const next = (parentId: string | null) => {
    const key = parentId ?? "\0root";
    const n = counters.get(key) ?? 0;
    counters.set(key, n + 1);
    return n;
  };
  for (const w of db.workspaces) {
    if (typeof w.order !== "number") w.order = next(w.parentId);
  }
  for (const p of db.libraryPages) {
    if (typeof p.order !== "number") p.order = next(p.workspaceId);
  }
}

/** A hero banner dropped from outside the library used to get uploaded as a
 *  real library image (so it showed up in the grid, which nobody wanted —
 *  the hero is meant to be decoration, not an asset). Any page whose hero
 *  is still pointing at a db.images entry gets migrated to the standalone
 *  heroUpload storage instead — the underlying Blob file is kept (so the hero
 *  keeps working, unchanged), only the library-listing entry is removed. */
function pullHeroImagesOutOfLibrary(db: DbShape): void {
  for (const page of db.libraryPages) {
    if (!page.heroImageId) continue;
    const image = db.images.find((img) => img.id === page.heroImageId);
    if (!image) continue;
    page.heroUpload = { filename: image.filename, ext: image.ext, mimeType: image.mimeType };
    page.heroImageId = null;
    db.images = db.images.filter((img) => img.id !== image.id);
  }
}

/** Order value for a brand-new sibling — one past whatever's already there
 *  in the same container (pages and workspaces share one ordering space per
 *  parent), so it lands at the end instead of colliding with either kind. */
export function nextSiblingOrder(db: DbShape, parentId: string | null): number {
  const pageOrders = db.libraryPages.filter((p) => p.workspaceId === parentId).map((p) => p.order);
  const wsOrders = db.workspaces.filter((w) => w.parentId === parentId).map((w) => w.order);
  const all = [...pageOrders, ...wsOrders];
  return all.length > 0 ? Math.max(...all) + 1 : 0;
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
