"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

// Total animation duration — loading bar fills over this span
const TOTAL = 2.6;

interface PageTransitionProps {
  /** When true, the overlay stays up indefinitely (caller controls dismiss) */
  persist?: boolean;
  onDone?: () => void;
}

export function PageTransition({ persist = false, onDone }: PageTransitionProps) {
  const [gone, setGone] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const logoRef = React.useRef<HTMLImageElement>(null);
  const barFillRef = React.useRef<HTMLDivElement>(null);
  const streak1Ref = React.useRef<HTMLDivElement>(null);
  const streak2Ref = React.useRef<HTMLDivElement>(null);
  const streak3Ref = React.useRef<HTMLDivElement>(null);
  const topLineRef = React.useRef<HTMLDivElement>(null);
  const bottomLineRef = React.useRef<HTMLDivElement>(null);
  const glowRef = React.useRef<HTMLDivElement>(null);
  const taglineRef = React.useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (!persist) setGone(true);
        onDone?.();
        return;
      }

      const tl = gsap.timeline();

      // ── 0.00s  Background glow pulses in ──────────────────────────────────
      tl.fromTo(
        glowRef.current,
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: 0.55, ease: "power3.out" },
        0
      );

      // ── 0.05s  Top & bottom accent lines expand outward from center ───────
      tl.fromTo(
        [topLineRef.current, bottomLineRef.current],
        { scaleX: 0 },
        { scaleX: 1, duration: 0.4, ease: "power3.out", transformOrigin: "50% 50%", stagger: 0.06 },
        0.05
      );

      // ── 0.10s  Logo scales in from center with blue bloom ─────────────────
      tl.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.82, filter: "blur(12px) brightness(2.5)" },
        { opacity: 1, scale: 1, filter: "blur(0px) brightness(1)", duration: 0.65, ease: "power3.out" },
        0.1
      );

      // ── 0.55s  Tagline slides up ──────────────────────────────────────────
      tl.fromTo(
        taglineRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" },
        0.55
      );

      // ── 0.40s  Speed-line streaks sweep left→right ────────────────────────
      const streaks = [streak1Ref.current, streak2Ref.current, streak3Ref.current];
      tl.fromTo(
        streaks,
        { xPercent: -110, opacity: 0 },
        {
          xPercent: 110,
          opacity: 1,
          duration: 0.55,
          ease: "power2.inOut",
          stagger: 0.08,
          onComplete: () => {
            gsap.set(streaks, { opacity: 0 });
          },
        },
        0.4
      );

      // Second streak pass — slightly later, different feel
      tl.fromTo(
        [streak1Ref.current, streak3Ref.current],
        { xPercent: -110, opacity: 0 },
        {
          xPercent: 110,
          opacity: 0.6,
          duration: 0.48,
          ease: "power2.inOut",
          stagger: 0.1,
          onComplete: () => {
            gsap.set([streak1Ref.current, streak3Ref.current], { opacity: 0 });
          },
        },
        1.1
      );

      // ── 0.00s  Loading bar fills over full duration ───────────────────────
      tl.fromTo(
        barFillRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: TOTAL, ease: "power1.inOut", transformOrigin: "0% 0%" },
        0
      );

      if (!persist) {
        // ── Fade out entire overlay ───────────────────────────────────────
        tl.to(
          rootRef.current,
          {
            opacity: 0,
            duration: 0.38,
            ease: "power2.inOut",
            onComplete: () => {
              setGone(true);
              onDone?.();
            },
          },
          TOTAL - 0.1
        );
      }
    },
    { scope: rootRef, dependencies: [persist] }
  );

  if (gone) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
        touchAction: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#030508",
        backgroundImage: [
          "linear-gradient(rgba(0,130,201,0.04) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(0,130,201,0.04) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "48px 48px",
      }}
    >
      {/* Radial ambient glow behind the logo */}
      <div
        ref={glowRef}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,130,201,0.18) 0%, rgba(0,130,201,0.06) 40%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top accent line */}
      <div
        ref={topLineRef}
        style={{
          position: "absolute",
          top: "calc(50% - 90px)",
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,130,201,0.35) 20%, rgba(0,130,201,0.7) 50%, rgba(0,130,201,0.35) 80%, transparent 100%)",
          boxShadow: "0 0 8px rgba(0,130,201,0.5)",
          pointerEvents: "none",
        }}
      />

      {/* Bottom accent line */}
      <div
        ref={bottomLineRef}
        style={{
          position: "absolute",
          top: "calc(50% + 90px)",
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,130,201,0.35) 20%, rgba(0,130,201,0.7) 50%, rgba(0,130,201,0.35) 80%, transparent 100%)",
          boxShadow: "0 0 8px rgba(0,130,201,0.5)",
          pointerEvents: "none",
        }}
      />

      {/* Speed-line streaks */}
      <div
        ref={streak1Ref}
        style={{
          position: "absolute",
          top: "calc(50% - 52px)",
          left: 0,
          right: 0,
          height: 2,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,130,201,0) 5%, rgba(0,130,201,0.9) 30%, rgba(120,200,255,1) 50%, rgba(0,130,201,0.9) 70%, rgba(0,130,201,0) 95%, transparent 100%)",
          boxShadow: "0 0 16px rgba(0,130,201,0.9), 0 0 6px #0082c9",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <div
        ref={streak2Ref}
        style={{
          position: "absolute",
          top: "calc(50% - 4px)",
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,130,201,0) 5%, rgba(0,130,201,0.5) 35%, rgba(120,200,255,0.9) 50%, rgba(0,130,201,0.5) 65%, rgba(0,130,201,0) 95%, transparent 100%)",
          boxShadow: "0 0 10px rgba(0,130,201,0.6)",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <div
        ref={streak3Ref}
        style={{
          position: "absolute",
          top: "calc(50% + 44px)",
          left: 0,
          right: 0,
          height: 2,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,130,201,0) 5%, rgba(0,130,201,0.8) 28%, rgba(120,200,255,0.95) 50%, rgba(0,130,201,0.8) 72%, rgba(0,130,201,0) 95%, transparent 100%)",
          boxShadow: "0 0 14px rgba(0,130,201,0.8), 0 0 5px #0082c9",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={logoRef}
          src="/brand/coverking-logo-white.png"
          alt="Coverking"
          style={{
            width: "min(56vw, 320px)",
            height: "auto",
            display: "block",
            opacity: 0,
            filter: "drop-shadow(0 0 22px rgba(0,130,201,0.6)) drop-shadow(0 0 8px rgba(0,130,201,0.4))",
          }}
        />

        {/* Tagline under logo */}
        <p
          ref={taglineRef}
          style={{
            marginTop: 14,
            textAlign: "center",
            fontFamily: "var(--font-sans), Roboto, sans-serif",
            fontWeight: 500,
            fontSize: "clamp(10px, 2vw, 13px)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(0,130,201,0.85)",
            opacity: 0,
          }}
        >
          Premium Vehicle Covers
        </p>
      </div>

      {/* Loading bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(0,130,201,0.12)",
          pointerEvents: "none",
        }}
      >
        <div
          ref={barFillRef}
          style={{
            height: "100%",
            transform: "scaleX(0)",
            transformOrigin: "left",
            background:
              "linear-gradient(90deg, rgba(0,60,120,0.9) 0%, #0082c9 35%, rgba(100,185,255,0.95) 50%, #0082c9 65%, rgba(0,60,120,0.9) 100%)",
            boxShadow: "0 0 12px rgba(0,130,201,0.9), 0 0 4px #0082c9",
          }}
        />
      </div>
    </div>
  );
}
