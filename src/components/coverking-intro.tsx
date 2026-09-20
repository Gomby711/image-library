"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

const ANIM_DURATION = 2.42;

// Sports coupe side profile — 480×130 viewport, ground at y=108
// Body includes wheel arch cutouts so tires read naturally
const CAR_BODY =
  "M 42 100 L 38 88 Q 45 76 62 70 L 95 63 " +
  "Q 110 60 128 56 L 165 44 L 195 32 " +
  "Q 210 26 230 25 L 280 25 Q 305 25 322 30 " +
  "L 360 52 Q 378 62 390 70 L 418 80 " +
  "Q 430 90 434 100 L 442 108 " +
  "L 396 108 A 26 26 0 0 0 344 108 " +
  "L 134 108 A 26 26 0 0 0 82 108 L 42 100 Z";

// Form-fitting car cover — slightly larger silhouette, no wheel arches,
// gentle hem bow at the bottom suggesting natural fabric drape
const COVER_BODY =
  "M 32 114 L 28 86 Q 36 72 55 66 L 88 59 " +
  "Q 106 56 124 52 L 162 40 L 192 28 " +
  "Q 210 21 232 20 L 278 20 Q 308 20 330 26 " +
  "L 370 48 Q 390 60 404 72 L 432 84 " +
  "Q 444 96 448 110 L 452 114 " +
  "Q 242 118 32 114 Z";

// Top edge only — used for the specular highlight stroke along the cover ridge
const COVER_RIDGE =
  "M 32 114 L 28 86 Q 36 72 55 66 L 88 59 " +
  "Q 106 56 124 52 L 162 40 L 192 28 " +
  "Q 210 21 232 20 L 278 20 Q 308 20 330 26 " +
  "L 370 48 Q 390 60 404 72 L 432 84 " +
  "Q 444 96 448 110 L 452 114";

export function CovekingIntro() {
  const [gone, setGone] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const carRef = React.useRef<SVGGElement>(null);
  const coverGroupRef = React.useRef<SVGGElement>(null);
  const sheenRef = React.useRef<SVGRectElement>(null);
  const logoRef = React.useRef<HTMLImageElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setGone(true);
        return;
      }

      const tl = gsap.timeline();

      // Car silhouette rises up faintly from darkness
      tl.fromTo(
        carRef.current,
        { opacity: 0, y: 10 },
        { opacity: 0.32, y: 0, duration: 0.45, ease: "power2.out" },
        0
      );

      // Cover drops from above — power3.out gives a premium, controlled deceleration
      // (not bouncy — more like a well-made weighted cover settling into place)
      tl.fromTo(
        coverGroupRef.current,
        { y: "-60vh" },
        { y: 0, duration: 0.72, ease: "power3.out" },
        0.06
      );

      // Logo badge materializes on the cover body
      tl.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.93 },
        { opacity: 0.92, scale: 1, duration: 0.32, ease: "power2.out" },
        0.67
      );

      // Sheen sweeps across the cover (bright specular band)
      // xPercent not usable on SVG rect; animate the x attribute directly
      tl.fromTo(
        sheenRef.current,
        { attr: { x: -220 } },
        { attr: { x: 310 }, duration: 0.58, ease: "power1.inOut" },
        0.9
      );

      // Loading bar
      tl.fromTo(
        barRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: ANIM_DURATION,
          ease: "power1.inOut",
          transformOrigin: "0% 0%",
        },
        0
      );

      // Fade out → unmount
      tl.to(
        rootRef.current,
        {
          opacity: 0,
          duration: 0.35,
          ease: "power2.inOut",
          onComplete: () => setGone(true),
        },
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
        background: "#04070d",
        touchAction: "none",
        overflow: "hidden",
      }}
    >
      {/* Showroom overhead spotlight — tight bright pool above the car */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(ellipse 55% 40% at 50% 22%, rgba(17,127,209,0.18) 0%, transparent 65%)",
            "radial-gradient(ellipse 30% 20% at 50% 15%, rgba(200,235,255,0.07) 0%, transparent 55%)",
          ].join(", "),
          pointerEvents: "none",
        }}
      />

      {/* Scene */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative", width: "min(88vw, 580px)" }}>
          <svg
            viewBox="0 0 480 130"
            style={{ width: "100%", display: "block", overflow: "visible" }}
          >
            <defs>
              {/* Clip sheen to cover shape */}
              <clipPath id="ck-cover-clip">
                <path d={COVER_BODY} />
              </clipPath>

              {/* Cover fabric gradient — lighter at the roof ridge (taut), darker at sides (draped) */}
              <linearGradient id="ck-cover-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2ba3f5" />
                <stop offset="22%" stopColor="#117fd1" />
                <stop offset="65%" stopColor="#0d6dba" />
                <stop offset="100%" stopColor="#0a5898" />
              </linearGradient>

              {/* Sheen: tight bright band, soft edges */}
              <linearGradient id="ck-sheen-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="white" stopOpacity="0" />
                <stop offset="40%"  stopColor="white" stopOpacity="0.06" />
                <stop offset="50%"  stopColor="white" stopOpacity="0.82" />
                <stop offset="60%"  stopColor="white" stopOpacity="0.06" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>

              {/* Floor reflection mask — fades out downward */}
              <linearGradient id="ck-reflect-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
              <mask id="ck-reflect-mask">
                <rect x="0" y="108" width="480" height="30" fill="url(#ck-reflect-fade)" />
              </mask>
            </defs>

            {/* Ground line */}
            <line
              x1="0" y1="108" x2="480" y2="108"
              stroke="rgba(17,127,209,0.25)" strokeWidth="0.7"
            />

            {/* Floor reflection of cover — mirrored below ground, masked to fade out */}
            <g mask="url(#ck-reflect-mask)" opacity="0.22">
              <g transform="translate(0, 216) scale(1, -1)">
                <path d={COVER_BODY} fill="url(#ck-cover-grad)" />
              </g>
            </g>

            {/* Car silhouette — dark navy, barely visible, hinting at the form beneath */}
            <g ref={carRef}>
              <path d={CAR_BODY} fill="#0c1a30" />
              {/* Tires */}
              <circle cx="108" cy="108" r="26" fill="#07101e" />
              <circle cx="370" cy="108" r="26" fill="#07101e" />
              {/* Rim centers */}
              <circle cx="108" cy="108" r="12" fill="#0d1e38" />
              <circle cx="370" cy="108" r="12" fill="#0d1e38" />
              {/* Lug/hub dot */}
              <circle cx="108" cy="108" r="4" fill="#111f35" />
              <circle cx="370" cy="108" r="4" fill="#111f35" />
            </g>

            {/* Car cover — drops from above, wraps over the car */}
            <g ref={coverGroupRef}>
              {/* Cover body */}
              <path d={COVER_BODY} fill="url(#ck-cover-grad)" />

              {/* Specular ridge highlight — bright edge along the cover's roofline */}
              <path
                d={COVER_RIDGE}
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Subtle secondary crease/shadow line along the door body */}
              <path
                d="M 88 85 Q 180 78 280 80 Q 360 82 410 90"
                fill="none"
                stroke="rgba(0,20,60,0.25)"
                strokeWidth="1"
                strokeLinecap="round"
              />

              {/* Sheen sweep — clipped to cover, no edge bleed */}
              <g clipPath="url(#ck-cover-clip)">
                <rect
                  ref={sheenRef}
                  x="-220" y="0"
                  width="350" height="130"
                  fill="url(#ck-sheen-grad)"
                />
              </g>
            </g>
          </svg>

          {/* Coverking logo badge — centered on the cover body */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={logoRef}
            src="/brand/coverking-logo-white.png"
            alt=""
            style={{
              position: "absolute",
              left: "50%",
              top: "32%",
              transform: "translate(-50%, -50%)",
              width: "50%",
              opacity: 0,
              filter: "drop-shadow(0 1px 6px rgba(0,12,40,0.55))",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* Loading bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255,255,255,0.13)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <div
          ref={barRef}
          style={{
            height: "100%",
            background:
              "linear-gradient(90deg, rgba(170,215,255,0.9) 0%, #ffffff 50%, rgba(170,215,255,0.9) 100%)",
            transform: "scaleX(0)",
            transformOrigin: "left",
            boxShadow: "0 0 10px rgba(255,255,255,0.75), 0 0 4px rgba(255,255,255,0.9)",
          }}
        />
      </div>
    </div>
  );
}
