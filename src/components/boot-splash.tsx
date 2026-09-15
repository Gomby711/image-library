"use client";

import * as React from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Full-screen branded splash shown once per browser tab load — the icon
 * breathes in with a slight overshoot, the wordmark reveals letter-by-letter
 * right after, then the whole thing fades out and unmounts. Purely
 * decorative: it never blocks interaction (pointer-events are off from the
 * start) and gets skipped entirely under prefers-reduced-motion.
 */
export function BootSplash() {
  const [mounted, setMounted] = React.useState(true);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const iconRef = React.useRef<HTMLSpanElement>(null);
  const lettersRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    // Only the first tab load gets the splash — client-side navigations and
    // reloads within the same tab session shouldn't replay it.
    try {
      if (sessionStorage.getItem("al-splash-shown")) {
        setMounted(false);
        return;
      }
      sessionStorage.setItem("al-splash-shown", "1");
    } catch {
      // ignore — worst case it plays every load
    }
  }, []);

  useGSAP(
    () => {
      if (!mounted) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const root = rootRef.current;
      if (!root) return;

      if (reduced) {
        gsap.to(root, { opacity: 0, duration: 0.3, delay: 0.2, onComplete: () => setMounted(false) });
        return;
      }

      const letters = lettersRef.current?.querySelectorAll("span") ?? [];
      gsap
        .timeline({ onComplete: () => setMounted(false) })
        .from(iconRef.current, { opacity: 0, scale: 0.7, rotate: -8, duration: 0.55, ease: "back.out(1.8)" })
        .from(letters, { opacity: 0, y: 10, duration: 0.4, stagger: 0.03, ease: "power2.out" }, "-=0.15")
        .to(root, { opacity: 0, duration: 0.4, ease: "power2.in", delay: 0.35 });
    },
    { scope: rootRef, dependencies: [mounted] }
  );

  if (!mounted) return null;

  const word = "Asset Library";

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-background"
    >
      <span ref={iconRef} className="flex size-16 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-glow)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/gallery-icon.png" alt="" className="size-full object-cover" />
      </span>
      <span ref={lettersRef} className="font-[var(--font-display)] text-xl font-semibold tracking-tight">
        {word.split("").map((ch, i) => (
          <span key={i} className="inline-block">
            {ch === " " ? " " : ch}
          </span>
        ))}
      </span>
    </div>
  );
}
