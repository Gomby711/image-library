"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

const ANIM_DURATION = 2.42;

// American muscle coupe silhouette — 400×100 viewBox, ground at y=80
// Long hood, low fastback roofline, prominent wheel arches
const CAR_PATH =
  "M 24 78 L 20 66 Q 26 54 46 48 L 66 44 Q 80 41 96 40 " +
  "L 120 22 Q 136 14 155 13 L 225 13 Q 252 13 272 26 " +
  "L 312 56 Q 326 64 338 70 L 350 78 " +
  "L 344 80 A 16 16 0 0 0 312 80 " +
  "L 88 80 A 16 16 0 0 0 56 80 " +
  "L 30 80 Q 24 80 24 78 Z";

// Windshield detail line — reads as the A/C-pillar glass line
const WINDSHIELD_PATH = "M 96 40 L 120 22 Q 136 14 155 13";
const REAR_GLASS_PATH = "M 225 13 Q 252 13 272 26 L 312 56";

const LETTERS = "COVERKING".split("");

export function CovekingIntro() {
  const [gone, setGone] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const bgFlashRef = React.useRef<HTMLDivElement>(null);
  const logoRef = React.useRef<HTMLDivElement>(null);
  const carSvgRef = React.useRef<SVGSVGElement>(null);
  const accentLineRef = React.useRef<HTMLDivElement>(null);
  const letterRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const sheenRef = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setGone(true);
        return;
      }

      const tl = gsap.timeline();

      // Instant power-on flash — one-frame blue wash, then gone
      tl.fromTo(
        bgFlashRef.current,
        { opacity: 0 },
        { opacity: 0.18, duration: 0.07, yoyo: true, repeat: 1, ease: "none" },
        0
      );

      // Logo group scales back slightly — subtle camera pull from close
      tl.fromTo(
        logoRef.current,
        { scale: 1.07 },
        { scale: 1, duration: ANIM_DURATION, ease: "power2.out" },
        0
      );

      // Car silhouette clips in left → right (like a reveal wipe)
      tl.fromTo(
        carSvgRef.current,
        { clipPath: "inset(0 100% 0 0 round 0px)" },
        { clipPath: "inset(0 0% 0 0 round 0px)", duration: 0.5, ease: "power2.inOut" },
        0.05
      );

      // Accent line expands outward from center
      tl.fromTo(
        accentLineRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.28, ease: "power3.out", transformOrigin: "50% 50%" },
        0.32
      );

      // Letters stagger up from below — each has an overflow:hidden parent that clips the travel
      tl.fromTo(
        letterRefs.current.filter(Boolean),
        { y: 32, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.38,
          stagger: { each: 0.04, from: "start" },
          ease: "power3.out",
        },
        0.46
      );

      // Sheen sweeps over the entire logo
      tl.fromTo(
        sheenRef.current,
        { xPercent: -100 },
        { xPercent: 100, duration: 0.52, ease: "power1.inOut" },
        0.9
      );

      // Loading bar fills in Coverking blue
      tl.fromTo(
        barRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: ANIM_DURATION, ease: "power1.inOut", transformOrigin: "0% 0%" },
        0
      );

      // Fade out → unmount
      tl.to(
        rootRef.current,
        { opacity: 0, duration: 0.35, ease: "power2.inOut", onComplete: () => setGone(true) },
        ANIM_DURATION - 0.05
      );
    },
    { scope: rootRef }
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
        touchAction: "none",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Dark background with a subtle blue grid — premium tech feel
        background: "#030508",
        backgroundImage: [
          "linear-gradient(rgba(0,130,201,0.045) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(0,130,201,0.045) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "44px 44px",
      }}
    >
      {/* Power-on flash */}
      <div
        ref={bgFlashRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "#0082c9",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Ambient glow behind logo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 65% 50% at 50% 50%, rgba(0,130,201,0.11) 0%, transparent 68%)",
          pointerEvents: "none",
        }}
      />

      {/* ── LOGO GROUP ── */}
      <div
        ref={logoRef}
        style={{
          width: "min(74vw, 460px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Car silhouette SVG */}
        <svg
          ref={carSvgRef}
          viewBox="0 0 400 100"
          style={{
            width: "100%",
            display: "block",
            overflow: "visible",
            // Blue halo + depth shadow
            filter:
              "drop-shadow(0 0 14px rgba(0,130,201,0.7)) drop-shadow(0 0 5px rgba(0,130,201,0.9)) drop-shadow(0 3px 8px rgba(0,0,0,0.8))",
          }}
        >
          {/* Main body — white fill */}
          <path d={CAR_PATH} fill="white" />
          {/* Glass lines — slightly transparent to hint at window panes */}
          <path
            d={WINDSHIELD_PATH}
            fill="none"
            stroke="rgba(0,130,201,0.45)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d={REAR_GLASS_PATH}
            fill="none"
            stroke="rgba(0,130,201,0.45)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Coverking blue accent line */}
        <div
          ref={accentLineRef}
          style={{
            width: "100%",
            height: 2,
            background: "#0082c9",
            marginTop: 8,
            marginBottom: 8,
            boxShadow:
              "0 0 12px rgba(0,130,201,0.9), 0 0 24px rgba(0,130,201,0.4)",
          }}
        />

        {/* COVERKING — Roboto 700, letters stagger in individually */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            // Needed so each letter's translateY travel is clipped on reveal
            // We clip on the row level rather than per-letter to keep spacing tight
          }}
        >
          {LETTERS.map((letter, i) => (
            // Each cell has overflow:hidden — clips the letter's upward travel
            <div
              key={i}
              style={{ overflow: "hidden", display: "inline-block", lineHeight: 1 }}
            >
              <span
                ref={el => {
                  letterRefs.current[i] = el;
                }}
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-sans), Roboto, sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(30px, 8vw, 52px)",
                  letterSpacing: "0.08em",
                  color: "#ffffff",
                  lineHeight: 1.1,
                  paddingBottom: "0.05em",
                  textShadow: "0 0 18px rgba(0,130,201,0.45)",
                }}
              >
                {letter}
              </span>
            </div>
          ))}
        </div>

        {/* Sheen sweep — absolute, covers the entire logo div, overflow:hidden clips travel */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            ref={sheenRef}
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(108deg, transparent 20%, rgba(255,255,255,0.04) 38%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.04) 62%, transparent 80%)",
            }}
          />
        </div>
      </div>

      {/* Loading bar — Coverking blue */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(0,130,201,0.15)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <div
          ref={barRef}
          style={{
            height: "100%",
            background:
              "linear-gradient(90deg, rgba(0,90,165,0.9) 0%, #0082c9 40%, rgba(120,200,255,0.95) 50%, #0082c9 60%, rgba(0,90,165,0.9) 100%)",
            transform: "scaleX(0)",
            transformOrigin: "left",
            boxShadow: "0 0 10px rgba(0,130,201,0.9), 0 0 4px #0082c9",
          }}
        />
      </div>
    </div>
  );
}
