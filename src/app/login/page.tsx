"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/page-transition";

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
  const [transitioning, setTransitioning] = React.useState(false);

  useGSAP(
    () => {
      // These entrance animations skip opacity on purpose — a delayed/staggered
      // `.from()` can freeze mid-tween if the tab is backgrounded right after
      // load (GSAP's ticker runs on rAF, which browsers throttle when
      // unfocused), which would leave the login panel — password field and
      // submit button included — stuck invisible. A stalled offset/scale just
      // looks like a small nudge instead of losing the page.
      gsap.from(".login-panel", { y: 24, duration: 0.7, ease: "power3.out" });
      gsap.from(".login-visual", { scale: 1.04, duration: 0.9, ease: "power3.out" });
      gsap.from(".login-field", {
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
        setTransitioning(true);
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
    <>
    {transitioning && <PageTransition persist />}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/coverking-logo-white.png"
              alt="Coverking"
              className="h-16 w-auto object-contain"
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
                  // text-base (16px) below sm: this field autoFocuses on
                  // load, so a sub-16px font here means iOS/Android zoom in
                  // the instant the page opens, with no tap needed.
                  className="h-10 w-full rounded-[var(--radius-md)] border border-white/30 bg-white/10 pl-9 pe-10 text-base sm:text-sm text-white placeholder:text-white/50 outline-none transition-colors focus-visible:border-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                  value={password}
                  disabled={locked}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 end-0 grid h-full w-10 place-items-center text-white/60 transition-colors hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="relative block size-4">
                    <EyeOff
                      className={cn(
                        "absolute inset-0 size-4 transition-[opacity,transform] duration-150 ease-[var(--ease-out-quart)]",
                        showPassword ? "opacity-100 scale-100" : "opacity-0 scale-90"
                      )}
                    />
                    <Eye
                      className={cn(
                        "absolute inset-0 size-4 transition-[opacity,transform] duration-150 ease-[var(--ease-out-quart)]",
                        showPassword ? "opacity-0 scale-90" : "opacity-100 scale-100"
                      )}
                    />
                  </span>
                </button>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {error && (
                <motion.p
                  key="login-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                  className="text-sm text-red-100"
                >
                  {error}
                </motion.p>
              )}
              {locked && (
                <motion.p
                  key="login-lockout"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                  className="rounded-[var(--radius-md)] border border-white/30 bg-white/10 px-3 py-2 text-sm text-white"
                >
                  Locked out — try again in {formatRemaining(lockedMs)}
                </motion.p>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              className="login-field mt-2 bg-white text-[var(--accent)] hover:bg-white/85 active:bg-white/85"
              magnetic={false}
              disabled={locked || loading}
            >
              {loading ? "Checking…" : locked ? "Locked" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
