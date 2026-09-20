"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export function CovekingIntro() {
  const [gone, setGone] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const logoRef = React.useRef<HTMLDivElement>(null);
  const sheenRef = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setGone(true);
        return;
      }

      const tl = gsap.timeline();

      // Camera pull-back: logo starts zoomed in and slowly settles — mirrors
      // the 3D camera move in the Coverking YouTube intro.
      tl.fromTo(
        logoRef.current,
        { scale: 1.18 },
        { scale: 1.0, duration: 2.3, ease: "power2.out" },
        0
      );

      // Chrome sheen sweeps diagonally across the logo
      tl.fromTo(
        sheenRef.current,
        { xPercent: -150 },
        { xPercent: 150, duration: 0.85, ease: "power1.inOut" },
        0.35
      );

      // Progress bar fills left-to-right over the full animation
      tl.fromTo(
        barRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 2.1, ease: "power1.inOut", transformOrigin: "0% 0%" },
        0
      );

      // Fade the overlay out, then remove it from the DOM
      tl.to(
        rootRef.current,
        {
          opacity: 0,
          duration: 0.4,
          ease: "power2.inOut",
          onComplete: () => setGone(true),
        },
        2.25
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        userSelect: "none",
        // Coverking blue radial gradient: bright vivid centre → deep navy edges,
        // matching the studio-lit background in the YouTube intro.
        background:
          "radial-gradient(ellipse 90% 80% at 50% 45%," +
          " #4bbaf5 0%," +
          " #229ae5 20%," +
          " #1480d0 48%," +
          " #0b5ba5 72%," +
          " #063878 90%," +
          " #021e48 100%)",
      }}
    >
      {/* Studio top-centre light source */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 55% 38% at 50% -2%," +
            " rgba(255,255,255,0.22) 0%," +
            " transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Glossy floor glow below the logo */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "38%",
          background:
            "radial-gradient(ellipse 65% 55% at 50% 100%," +
            " rgba(90,180,255,0.18) 0%," +
            " transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo + floor reflection group — this element carries the pull-back scale */}
      <div
        ref={logoRef}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          willChange: "transform",
        }}
      >
        {/* Logo with chrome sheen sweep */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/coverking-logo-white.png"
            alt="Coverking"
            draggable={false}
            style={{
              width: "clamp(260px, 42vw, 540px)",
              height: "auto",
              objectFit: "contain",
              display: "block",
              // Depth shadows + subtle brightness lift to sell the chrome look
              filter:
                "drop-shadow(0 10px 36px rgba(0,0,0,0.55))" +
                " drop-shadow(0 2px 8px rgba(0,0,0,0.4))" +
                " brightness(1.06)",
            }}
          />

          {/* Diagonal chrome sheen that sweeps across once */}
          <div
            ref={sheenRef}
            style={{
              position: "absolute",
              inset: "-30% -70%",
              background:
                "linear-gradient(105deg," +
                " transparent 28%," +
                " rgba(255,255,255,0.52) 48%," +
                " rgba(255,255,255,0.62) 52%," +
                " transparent 72%)",
              pointerEvents: "none",
              willChange: "transform",
            }}
          />
        </div>

        {/* Floor reflection — logo flipped, faded, blurred */}
        <div
          aria-hidden="true"
          style={{
            display: "block",
            height: 64,
            overflow: "hidden",
            transform: "scaleY(-1)",
            opacity: 0.2,
            filter: "blur(2px) brightness(0.7)",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
            pointerEvents: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/coverking-logo-white.png"
            alt=""
            draggable={false}
            style={{
              width: "clamp(260px, 42vw, 540px)",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>

      {/* Loading progress bar — pinned to the bottom edge */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255,255,255,0.16)",
        }}
      >
        <div
          ref={barRef}
          style={{
            height: "100%",
            // Chrome-tinted gradient with a bright centre highlight
            background:
              "linear-gradient(90deg," +
              " rgba(170,215,255,0.9) 0%," +
              " #ffffff 50%," +
              " rgba(170,215,255,0.9) 100%)",
            transform: "scaleX(0)",
            transformOrigin: "left",
            boxShadow: "0 0 10px rgba(255,255,255,0.75), 0 0 4px rgba(255,255,255,0.9)",
          }}
        />
      </div>
    </div>
  );
}
