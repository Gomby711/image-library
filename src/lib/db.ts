import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { DbShape } from "./types";

const DB_KEY = "db";
const EMPTY_DB: DbShape = { images: [], folders: [], libraryPages: [] };

async function getKv() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB_KV;
}

// Writes can race under concurrent requests (upload + tag edit landing together).
// A single in-process queue serializes them so one write never clobbers another —
// this only protects against races within one Worker isolate, but KV's own
// eventual-consistency window is small enough that this is fine at this scale.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => undefined);
  return result;
}

export async function readDb(): Promise<DbShape> {
  const kv = await getKv();
  const raw = await kv.get(DB_KEY);
  if (!raw) return { ...EMPTY_DB };
  try {
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    return {
      images: parsed.images ?? [],
      folders: parsed.folders ?? [],
      libraryPages: parsed.libraryPages ?? [],
    };
  } catch {
    return { ...EMPTY_DB };
  }
}

async function writeDb(db: DbShape): Promise<void> {
  const kv = await getKv();
  await kv.put(DB_KEY, JSON.stringify(db));
}

export function mutateDb<T>(fn: (db: DbShape) => T | Promise<T>): Promise<T> {
  return enqueue(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
}
