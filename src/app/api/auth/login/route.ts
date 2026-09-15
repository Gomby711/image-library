import { NextResponse } from "next/server";
import { SESSION_COOKIE, SITE_PASSWORD, createSessionToken } from "@/lib/auth";
import { getLockStatus, recordFailure, recordSuccess } from "@/lib/auth-state";

export async function POST(req: Request) {
  const lock = await getLockStatus();
  if (lock.locked) {
    return NextResponse.json(
      { error: "locked", remainingMs: lock.remainingMs },
      { status: 423 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (password !== SITE_PASSWORD) {
    const { lockMs } = await recordFailure();
    return NextResponse.json(
      { error: "invalid", remainingMs: lockMs },
      { status: 401 }
    );
  }

  await recordSuccess();
  const session = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: session.maxAgeSeconds,
    path: "/",
  });
  return res;
}
