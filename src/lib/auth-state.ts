import { getCloudflareContext } from "@opennextjs/cloudflare";

const STATE_KEY = "auth-state";

interface AuthState {
  failedAttempts: number;
  lockedUntil: number | null;
}

const EMPTY_STATE: AuthState = { failedAttempts: 0, lockedUntil: null };

let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => undefined);
  return result;
}

async function readState(): Promise<AuthState> {
  const { env } = await getCloudflareContext({ async: true });
  try {
    const raw = await env.DB_KV.get(STATE_KEY);
    return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : { ...EMPTY_STATE };
  } catch {
    return { ...EMPTY_STATE };
  }
}

async function writeState(state: AuthState): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });
  await env.DB_KV.put(STATE_KEY, JSON.stringify(state));
}

/** Free attempts before any lockout kicks in ("a couple failed attempts"). */
const FREE_ATTEMPTS = 3;
/** Base lockout once the free attempts run out. */
const BASE_LOCKOUT_MS = 2 * 60 * 1000;

/**
 * ★ Exponential backoff: attempts 1-3 are free. Attempt 4 locks for 2 minutes,
 * attempt 5 for 4, attempt 6 for 8, and so on — doubling every additional
 * failure. This is what makes brute-forcing the single site password
 * economically pointless without punishing a user who just fat-fingered it
 * a couple of times.
 */
export function computeLockoutMs(failedAttempts: number): number {
  const overage = failedAttempts - FREE_ATTEMPTS;
  if (overage <= 0) return 0;
  return BASE_LOCKOUT_MS * Math.pow(2, overage - 1);
}

export async function getLockStatus(): Promise<{ locked: boolean; remainingMs: number }> {
  const state = await readState();
  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    return { locked: true, remainingMs: state.lockedUntil - Date.now() };
  }
  return { locked: false, remainingMs: 0 };
}

export const recordFailure = () =>
  enqueue(async () => {
    const state = await readState();
    state.failedAttempts += 1;
    const lockMs = computeLockoutMs(state.failedAttempts);
    state.lockedUntil = lockMs > 0 ? Date.now() + lockMs : null;
    await writeState(state);
    return { failedAttempts: state.failedAttempts, lockMs };
  });

export const recordSuccess = () =>
  enqueue(async () => {
    await writeState({ ...EMPTY_STATE });
  });
