"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

const VIDEO_DURATION = 2.42;

export function CovekingIntro() {
  const [gone, setGone] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Force-play and set legacy inline attributes that React doesn't output —
  // needed to suppress the native play button on iOS Safari and some Android
  // browsers even when autoPlay + muted + playsInline are all set.
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // webkit-playsinline silences the iOS overlay play button on older WebKit
    v.setAttribute("webkit-playsinline", "");
    // x5-playsinline does the same for the WeChat/X5 browser on Android
    v.setAttribute("x5-playsinline", "");
    // If autoplay is blocked (rare edge-case on some browsers), skip the intro
    // immediately so the app is never stuck behind an unplaying video.
    v.play().catch(() => setGone(true));
  }, []);

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

      // Fade out and unmount just as the video ends
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
        // Fallback colour shown for the single frame before the video decodes
        background: "#021e48",
        // Block all touch/pointer events so tapping the overlay never triggers
        // browser-native video controls or the iOS play-button overlay
        touchAction: "none",
      }}
    >
      <video
        ref={videoRef}
        src="/brand/coverking-intro.mp4"
        autoPlay
        muted
        playsInline
        disablePictureInPicture
        // Suppress the browser's own remote-playback (AirPlay / Cast) UI
        {...{ disableremoteplayback: "" } as React.HTMLAttributes<HTMLVideoElement>}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // No pointer events on the video itself — prevents any browser from
          // showing the native overlay controls or play button on tap
          pointerEvents: "none",
        }}
      />

      {/* Loading progress bar — bottom edge */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255,255,255,0.16)",
          zIndex: 1,
          // Keep bar above the video but still non-interactive
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
