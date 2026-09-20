"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

// Duration of the source intro video in seconds
const VIDEO_DURATION = 2.42;

export function CovekingIntro() {
  const [gone, setGone] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setGone(true);
        return;
      }

      const tl = gsap.timeline();

      // Loading bar fills across the exact video duration
      tl.fromTo(
        barRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: VIDEO_DURATION,
          ease: "power1.inOut",
          transformOrigin: "0% 0%",
        },
        0
      );

      // Fade out overlay just as the video ends, then remove from DOM
      tl.to(
        rootRef.current,
        {
          opacity: 0,
          duration: 0.35,
          ease: "power2.inOut",
          onComplete: () => setGone(true),
        },
        VIDEO_DURATION - 0.05
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
        overflow: "hidden",
        background: "#021e48",
      }}
    >
      {/* The actual Coverking intro video — fills the full overlay */}
      <video
        ref={videoRef}
        src="/brand/coverking-intro.mp4"
        autoPlay
        muted
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Loading progress bar pinned to the bottom edge */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255,255,255,0.16)",
          zIndex: 1,
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
