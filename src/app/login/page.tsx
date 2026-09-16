"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Eye, EyeOff, Lock } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function LoginPage() {
  const router = useRouter();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const shakeRef = React.useRef<HTMLFormElement>(null);

  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [lockedMs, setLockedMs] = React.useState(0);

  useGSAP(
    () => {
      gsap.from(".login-panel", { opacity: 0, y: 24, duration: 0.7, ease: "power3.out" });
      gsap.from(".login-visual", { opacity: 0, scale: 1.04, duration: 0.9, ease: "power3.out" });
      gsap.from(".login-field", {
        opacity: 0,
        y: 12,
        duration: 0.5,
        stagger: 0.08,
        delay: 0.15,
        ease: "power2.out",
      });
    },
    { scope: containerRef }
  );

  React.useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setLockedMs(d.remainingMs ?? 0))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (lockedMs <= 0) return;
    const id = setInterval(() => setLockedMs((ms) => Math.max(0, ms - 1000)), 1000);
    return () => clearInterval(id);
  }, [lockedMs]);

  const locked = lockedMs > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 423) {
        setLockedMs(data.remainingMs ?? 0);
        setError("Too many attempts. Locked for now.");
      } else {
        setError("Incorrect password. Try again.");
        if (data.remainingMs) setLockedMs(data.remainingMs);
      }
      if (shakeRef.current) {
        gsap.fromTo(
          shakeRef.current,
          { x: -8 },
          { x: 0, duration: 0.4, ease: "elastic.out(1, 0.4)" }
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} className="grid min-h-screen w-full md:grid-cols-[1.1fr_1fr]">
      <div className="login-visual relative hidden overflow-hidden bg-surface md:block">
        <img
          src="/brand/login-hero.jpg"
          alt="A Coverking vehicle cover over a Ferrari"
          // The car and the Coverking logo printed on the cover sit in the
          // right two-thirds of the source photo — object-position keeps
          // that subject centered in frame instead of the default center
          // crop, which on a narrow/tall viewport would show mostly the
          // empty garage on the left and cut the subject off entirely.
          style={{ objectPosition: "78% 55%" }}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      {/* Right panel is solid Coverking blue — the same blue the logo art
          is already flattened onto — so the logo reads as part of the
          background instead of a boxed-in asset. */}
      <div
        className="flex items-center justify-center px-6 py-16"
        style={{ background: "var(--accent)" }}
      >
        <div className="login-panel w-full max-w-sm">
          <div className="mb-8 flex items-center">
            <Image
              src="/brand/coverking-logo-white.png"
              alt="Coverking"
              width={1915}
              height={525}
              className="h-16 w-auto object-contain"
              priority
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-white/75">Enter the site password to open the library.</p>

          <form ref={shakeRef} onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="login-field grid gap-2">
              <label htmlFor="password" className="text-sm font-medium text-white/90">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/60" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  className="h-10 w-full rounded-[var(--radius-md)] border border-white/30 bg-white/10 pl-9 pe-10 text-sm text-white placeholder:text-white/50 outline-none transition-colors focus-visible:border-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                  value={password}
                  disabled={locked}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center text-white/60 transition-colors hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && <p className={cn("login-field text-sm text-red-100")}>{error}</p>}

            {locked && (
              <p className="login-field rounded-[var(--radius-md)] border border-white/30 bg-white/10 px-3 py-2 text-sm text-white">
                Locked out — try again in {formatRemaining(lockedMs)}
              </p>
            )}

            <Button
              type="submit"
              className="login-field mt-2 bg-white text-[var(--accent)] hover:bg-white/85 active:bg-white/85"
              disabled={locked || loading || !password}
            >
              {loading ? "Checking…" : locked ? "Locked" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
