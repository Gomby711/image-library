"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

const TOTAL = 2.5;
const TAGLINE = "Family Owned · Anaheim, CA Since 1986";
const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·,.";

interface PageTransitionProps {
  persist?: boolean;
  onDone?: () => void;
}

export function PageTransition({ persist = false, onDone }: PageTransitionProps) {
  const [gone, setGone] = React.useState(false);
  const [scrambling, setScrambling] = React.useState(false);
  const [displayText, setDisplayText] = React.useState(TAGLINE);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const logoWrapRef = React.useRef<HTMLDivElement>(null);
  const logoRef = React.useRef<HTMLImageElement>(null);
  const sheenRef = React.useRef<HTMLDivElement>(null);
  const dividerRef = React.useRef<HTMLDivElement>(null);
  const taglineRef = React.useRef<HTMLParagraphElement>(null);
  const barFillRef = React.useRef<HTMLDivElement>(null);
  const streak1Ref = React.useRef<HTMLDivElement>(null);
  const streak2Ref = React.useRef<HTMLDivElement>(null);
  const vignRef = React.useRef<HTMLDivElement>(null);
  const scanRef = React.useRef<HTMLDivElement>(null);
  const dot1Ref = React.useRef<HTMLSpanElement>(null);
  // Corner bracket refs: [TL-H, TL-V, TR-H, TR-V, BL-H, BL-V, BR-H, BR-V]
  const bracketRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  // Character scramble — fires when tagline should appear
  React.useEffect(() => {
    if (!scrambling) return;
    const chars = TAGLINE.split("");
    let frame = 0;
    const FRAMES = 22;
    const id = setInterval(() => {
      frame++;
      const resolved = Math.floor((frame / FRAMES) * chars.length);
      setDisplayText(
        chars.map((c, i) => {
          if (c === " " || i < resolved) return c;
          return SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
        }).join("")
      );
      if (frame >= FRAMES) {
        setDisplayText(TAGLINE);
        clearInterval(id);
      }
    }, 16);
    return () => clearInterval(id);
  }, [scrambling]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (!persist) setGone(true);
        onDone?.();
        return;
      }

      const tl = gsap.timeline();

      // Power-on flash
      tl.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.06, yoyo: true, repeat: 1, ease: "none" },
        0
      );

      // Vignette fades in
      tl.fromTo(
        vignRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out" },
        0
      );

      // Vignette breathe — subtle pulse once after settling (item 7)
      tl.to(
        vignRef.current,
        { opacity: 0.6, duration: 0.55, ease: "sine.inOut", yoyo: true, repeat: 1 },
        0.6
      );

      // Corner brackets draw in — subtle L-shapes at all 4 corners (item 1)
      const hBrackets = [bracketRefs.current[0], bracketRefs.current[2], bracketRefs.current[4], bracketRefs.current[6]];
      const vBrackets = [bracketRefs.current[1], bracketRefs.current[3], bracketRefs.current[5], bracketRefs.current[7]];
      tl.fromTo(
        hBrackets,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.28, ease: "power3.out", stagger: 0.04 },
        0.1
      );
      tl.fromTo(
        vBrackets,
        { scaleY: 0 },
        { scaleY: 1, duration: 0.28, ease: "power3.out", stagger: 0.04 },
        0.16
      );

      // Scanline sweeps top → bottom very subtly (item 4)
      tl.fromTo(
        scanRef.current,
        { y: "-2px", opacity: 0.07 },
        { y: "100vh", opacity: 0, duration: 2.0, ease: "linear" },
        0.12
      );

      // Logo blooms in — drop-shadow respects alpha so the glow hugs the logo
      // shape instead of filling the rectangular bounding box like blur() does
      tl.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.88, filter: "drop-shadow(0 0 22px rgba(255,255,255,0.95)) brightness(2.5)" },
        { opacity: 1, scale: 1, filter: "drop-shadow(0 2px 24px rgba(0,0,0,0.25)) brightness(1)", duration: 0.7, ease: "power3.out" },
        0.08
      );

      // Streaks sweep
      tl.fromTo(
        streak1Ref.current,
        { xPercent: -120, opacity: 0 },
        { xPercent: 120, opacity: 1, duration: 0.5, ease: "power2.inOut",
          onStart: () => gsap.set(streak1Ref.current, { opacity: 1 }),
          onComplete: () => gsap.set(streak1Ref.current, { opacity: 0 }) },
        0.42
      );
      tl.fromTo(
        streak2Ref.current,
        { xPercent: -120, opacity: 0 },
        { xPercent: 120, opacity: 0.7, duration: 0.44, ease: "power2.inOut",
          onStart: () => gsap.set(streak2Ref.current, { opacity: 0.7 }),
          onComplete: () => gsap.set(streak2Ref.current, { opacity: 0 }) },
        0.54
      );

      // Logo sheen sweeps across logo after it reveals (item 2)
      tl.fromTo(
        sheenRef.current,
        { xPercent: -150 },
        { xPercent: 150, duration: 0.48, ease: "power2.inOut" },
        0.82
      );

      // Divider line expands
      tl.fromTo(
        dividerRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.38, ease: "power3.out", transformOrigin: "50% 50%" },
        0.5
      );

      // Tagline rises + character scramble fires (items 6)
      tl.add(() => setScrambling(true), 0.62);
      tl.fromTo(
        taglineRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" },
        0.68
      );
      tl.fromTo(
        dot1Ref.current,
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" },
        0.76
      );

      // Loading bar
      tl.fromTo(
        barFillRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: TOTAL, ease: "power1.inOut", transformOrigin: "0% 0%" },
        0
      );

      if (!persist) {
        tl.to(
          rootRef.current,
          { opacity: 0, duration: 0.4, ease: "power2.inOut",
            onComplete: () => { setGone(true); onDone?.(); } },
          TOTAL - 0.1
        );
      }
    },
    { scope: rootRef, dependencies: [persist] }
  );

  if (gone) return null;

  // Corner bracket geometry helpers
  const bracketSize = 44;
  const bracketThickness = 1.5;
  const bracketOpacity = 0.38;

  const corners = [
    // TL: h-line goes right, v-line goes down
    { top: 16, left: 16, hOrigin: "0% 50%", vOrigin: "50% 0%" },
    // TR: h-line goes left, v-line goes down
    { top: 16, right: 16, hOrigin: "100% 50%", vOrigin: "50% 0%" },
    // BL: h-line goes right, v-line goes up
    { bottom: 16, left: 16, hOrigin: "0% 50%", vOrigin: "50% 100%" },
    // BR: h-line goes left, v-line goes up
    { bottom: 16, right: 16, hOrigin: "100% 50%", vOrigin: "50% 100%" },
  ];

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        overflow: "hidden", touchAction: "none",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #0093e0 0%, #0082c9 45%, #005fa3 100%)",
      }}
    >
      {/* Power-on flash */}
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, background: "#22aaee", opacity: 0, pointerEvents: "none" }} />

      {/* Radial vignette */}
      <div ref={vignRef} style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,30,70,0.55) 100%)" }} />

      {/* Scanline — very subtle top-to-bottom pass */}
      <div ref={scanRef} style={{ position: "absolute", top: 0, left: 0, right: 0,
        height: 2, background: "rgba(255,255,255,0.18)", pointerEvents: "none", opacity: 0 }} />

      {/* Corner brackets */}
      {corners.map((c, ci) => (
        <div key={ci} style={{ position: "absolute", ...c, pointerEvents: "none" }}>
          {/* Horizontal arm */}
          <div
            ref={el => { bracketRefs.current[ci * 2] = el; }}
            style={{
              position: "absolute",
              top: ci < 2 ? 0 : undefined,
              bottom: ci >= 2 ? 0 : undefined,
              left: ci % 2 === 0 ? 0 : undefined,
              right: ci % 2 === 1 ? 0 : undefined,
              width: bracketSize, height: bracketThickness,
              background: `rgba(255,255,255,${bracketOpacity})`,
              transformOrigin: c.hOrigin,
            }}
          />
          {/* Vertical arm */}
          <div
            ref={el => { bracketRefs.current[ci * 2 + 1] = el; }}
            style={{
              position: "absolute",
              top: ci < 2 ? 0 : undefined,
              bottom: ci >= 2 ? 0 : undefined,
              left: ci % 2 === 0 ? 0 : undefined,
              right: ci % 2 === 1 ? 0 : undefined,
              width: bracketThickness, height: bracketSize,
              background: `rgba(255,255,255,${bracketOpacity})`,
              transformOrigin: c.vOrigin,
            }}
          />
        </div>
      ))}

      {/* Speed streaks */}
      <div ref={streak1Ref} style={{ position: "absolute", top: "calc(50% - 58px)", left: 0, right: 0, height: 3, opacity: 0, pointerEvents: "none",
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 5%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.85) 65%, rgba(255,255,255,0) 95%, transparent 100%)",
        boxShadow: "0 0 18px rgba(255,255,255,0.7), 0 0 6px rgba(255,255,255,0.9)" }} />
      <div ref={streak2Ref} style={{ position: "absolute", top: "calc(50% + 48px)", left: 0, right: 0, height: 2, opacity: 0, pointerEvents: "none",
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 8%, rgba(255,255,255,0.6) 38%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 62%, rgba(255,255,255,0) 92%, transparent 100%)",
        boxShadow: "0 0 12px rgba(255,255,255,0.5)" }} />

      {/* Logo + text group */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Logo — no overflow:hidden here so the blur glow doesn't get clipped
            into a visible rectangle during the bloom-in animation */}
        <div ref={logoWrapRef} style={{ position: "relative", display: "block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={logoRef}
            src="/brand/coverking-logo-white.png"
            alt="Coverking"
            style={{ width: "min(58vw, 340px)", height: "auto", display: "block", opacity: 0,
              filter: "drop-shadow(0 2px 24px rgba(0,0,0,0.25))" }}
          />
          {/* Sheen clipped in its own overflow wrapper so it stays inside the
              logo bounds without clipping the logo's blur glow */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <div
              ref={sheenRef}
              style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(108deg, transparent 20%, rgba(255,255,255,0.06) 38%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.06) 62%, transparent 80%)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div ref={dividerRef} style={{ width: "min(58vw, 340px)", height: 1, marginTop: 16,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6) 20%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 80%, transparent)" }} />

        {/* Tagline — scrambles in */}
        <p
          ref={taglineRef}
          style={{
            marginTop: 12, opacity: 0,
            fontFamily: "var(--font-sans), Roboto, sans-serif",
            fontWeight: 500, fontSize: "clamp(9px, 1.8vw, 12px)",
            letterSpacing: "0.28em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.88)",
            display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap",
          }}
        >
          {displayText}
          <span ref={dot1Ref} style={{ display: "inline-block", width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.7)", opacity: 0, flexShrink: 0 }} />
        </p>
      </div>

      {/* Loading bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.15)", pointerEvents: "none" }}>
        <div ref={barFillRef} style={{ height: "100%", transform: "scaleX(0)", transformOrigin: "left",
          background: "linear-gradient(90deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,1) 40%, rgba(200,235,255,1) 50%, rgba(255,255,255,1) 60%, rgba(255,255,255,0.7) 100%)",
          boxShadow: "0 0 10px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.9)" }} />
      </div>
    </div>
  );
}
