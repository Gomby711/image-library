"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

const TOTAL = 2.5;

interface PageTransitionProps {
  persist?: boolean;
  onDone?: () => void;
}

export function PageTransition({ persist = false, onDone }: PageTransitionProps) {
  const [gone, setGone] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const logoRef = React.useRef<HTMLImageElement>(null);
  const dividerRef = React.useRef<HTMLDivElement>(null);
  const taglineRef = React.useRef<HTMLParagraphElement>(null);
  const barFillRef = React.useRef<HTMLDivElement>(null);
  const streak1Ref = React.useRef<HTMLDivElement>(null);
  const streak2Ref = React.useRef<HTMLDivElement>(null);
  const vignRef = React.useRef<HTMLDivElement>(null);
  const dot1Ref = React.useRef<HTMLSpanElement>(null);
  const dot2Ref = React.useRef<HTMLSpanElement>(null);
  const dot3Ref = React.useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (!persist) setGone(true);
        onDone?.();
        return;
      }

      const tl = gsap.timeline();

      // Flash of lighter blue on power-on
      tl.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.06, yoyo: true, repeat: 1, ease: "none" },
        0
      );

      // Vignette deepens in
      tl.fromTo(
        vignRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out" },
        0
      );

      // Logo blooms in — blur clears as it scales to 1
      tl.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.88, filter: "blur(14px) brightness(3)" },
        {
          opacity: 1,
          scale: 1,
          filter: "blur(0px) brightness(1)",
          duration: 0.7,
          ease: "power3.out",
        },
        0.08
      );

      // Divider line expands from center
      tl.fromTo(
        dividerRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.38, ease: "power3.out", transformOrigin: "50% 50%" },
        0.5
      );

      // Tagline rises
      tl.fromTo(
        taglineRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" },
        0.68
      );

      // Dot separators stagger in
      tl.fromTo(
        [dot1Ref.current, dot2Ref.current, dot3Ref.current],
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.25, stagger: 0.08, ease: "back.out(2)" },
        0.76
      );

      // Streak 1 — wide fast sweep
      tl.fromTo(
        streak1Ref.current,
        { xPercent: -120, opacity: 0 },
        {
          xPercent: 120,
          opacity: 1,
          duration: 0.5,
          ease: "power2.inOut",
          onStart: () => gsap.set(streak1Ref.current, { opacity: 1 }),
          onComplete: () => gsap.set(streak1Ref.current, { opacity: 0 }),
        },
        0.42
      );

      // Streak 2 — narrower, offset timing
      tl.fromTo(
        streak2Ref.current,
        { xPercent: -120, opacity: 0 },
        {
          xPercent: 120,
          opacity: 0.7,
          duration: 0.44,
          ease: "power2.inOut",
          onStart: () => gsap.set(streak2Ref.current, { opacity: 0.7 }),
          onComplete: () => gsap.set(streak2Ref.current, { opacity: 0 }),
        },
        0.54
      );

      // Loading bar
      tl.fromTo(
        barFillRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: TOTAL,
          ease: "power1.inOut",
          transformOrigin: "0% 0%",
        },
        0
      );

      if (!persist) {
        tl.to(
          rootRef.current,
          {
            opacity: 0,
            duration: 0.4,
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
        // Coverking blue is the primary background
        background: "linear-gradient(160deg, #0093e0 0%, #0082c9 45%, #005fa3 100%)",
      }}
    >
      {/* Power-on flash overlay — slightly lighter blue */}
      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "#22aaee",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Radial vignette — darkens edges for depth */}
      <div
        ref={vignRef}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,30,70,0.55) 100%)",
          pointerEvents: "none",
          opacity: 0,
        }}
      />

      {/* Horizontal speed streaks */}
      <div
        ref={streak1Ref}
        style={{
          position: "absolute",
          top: "calc(50% - 58px)",
          left: 0,
          right: 0,
          height: 3,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 5%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.85) 65%, rgba(255,255,255,0) 95%, transparent 100%)",
          boxShadow: "0 0 18px rgba(255,255,255,0.7), 0 0 6px rgba(255,255,255,0.9)",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <div
        ref={streak2Ref}
        style={{
          position: "absolute",
          top: "calc(50% + 48px)",
          left: 0,
          right: 0,
          height: 2,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 8%, rgba(255,255,255,0.6) 38%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 62%, rgba(255,255,255,0) 92%, transparent 100%)",
          boxShadow: "0 0 12px rgba(255,255,255,0.5)",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Logo + text group */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={logoRef}
          src="/brand/coverking-logo-white.png"
          alt="Coverking"
          style={{
            width: "min(58vw, 340px)",
            height: "auto",
            display: "block",
            opacity: 0,
            filter: "drop-shadow(0 2px 24px rgba(0,0,0,0.25))",
          }}
        />

        {/* Thin white divider line */}
        <div
          ref={dividerRef}
          style={{
            width: "min(58vw, 340px)",
            height: 1,
            marginTop: 16,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.6) 20%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 80%, transparent)",
          }}
        />

        {/* Tagline */}
        <p
          ref={taglineRef}
          style={{
            marginTop: 12,
            fontFamily: "var(--font-sans), Roboto, sans-serif",
            fontWeight: 500,
            fontSize: "clamp(9px, 1.8vw, 12px)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.88)",
            opacity: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            whiteSpace: "nowrap",
          }}
        >
          Car Covers
          <span
            ref={dot1Ref}
            style={{
              display: "inline-block",
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.7)",
              opacity: 0,
              flexShrink: 0,
            }}
          />
          Seat Covers
          <span
            ref={dot2Ref}
            style={{
              display: "inline-block",
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.7)",
              opacity: 0,
              flexShrink: 0,
            }}
          />
          Floor Mats
          <span
            ref={dot3Ref}
            style={{
              display: "inline-block",
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.7)",
              opacity: 0,
              flexShrink: 0,
            }}
          />
          &amp; More
        </p>
      </div>

      {/* Loading bar — white on blue */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255,255,255,0.15)",
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
              "linear-gradient(90deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,1) 40%, rgba(200,235,255,1) 50%, rgba(255,255,255,1) 60%, rgba(255,255,255,0.7) 100%)",
            boxShadow: "0 0 10px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.9)",
          }}
        />
      </div>
    </div>
  );
}
