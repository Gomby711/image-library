import { createHmac, timingSafeEqual } from "crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const SESSION_COOKIE = "luminary_session";
export const SITE_PASSWORD = process.env.LUMINARY_SITE_PASSWORD ?? "Coverking1";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

const SECRET_KEY = "session-secret";
let cachedSecret: string | null = null;

async function getSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  const { env } = await getCloudflareContext({ async: true });
  const existing = await env.DB_KV.get(SECRET_KEY);
  if (existing) {
    cachedSecret = existing;
    return existing;
  }
  const generated = createHmac("sha256", `${Date.now()}-${Math.random()}`)
    .update("luminary")
    .digest("hex");
  await env.DB_KV.put(SECRET_KEY, generated);
  cachedSecret = generated;
  return generated;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function createSessionToken(): Promise<{ value: string; maxAgeSeconds: number }> {
  const secret = await getSecret();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  const signature = sign(payload, secret);
  return { value: `${payload}.${signature}`, maxAgeSeconds: SESSION_TTL_MS / 1000 };
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const secret = await getSecret();
  const expected = sign(payload, secret);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  if (!timingSafeEqual(expectedBuf, actualBuf)) return false;
  return Number(payload) > Date.now();
}
