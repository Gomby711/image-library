import { promises as fs } from "fs";
import path from "path";
import type { DbShape } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
export const IMAGE_DIR = path.join(process.cwd(), "inventory");

const EMPTY_DB: DbShape = { images: [], folders: [], libraryPages: [] };

async function ensureFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(IMAGE_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(EMPTY_DB, null, 2));
  }
}

// Writes can race under concurrent requests (upload + tag edit landing together).
// A single in-process queue serializes them so one write never clobbers another.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => undefined);
  return result;
}

export async function readDb(): Promise<DbShape> {
  await ensureFiles();
  const raw = await fs.readFile(DB_PATH, "utf-8");
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
  await ensureFiles();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export function mutateDb<T>(fn: (db: DbShape) => T | Promise<T>): Promise<T> {
  return enqueue(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
}
