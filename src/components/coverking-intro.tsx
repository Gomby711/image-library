"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

const ANIM_DURATION = 2.42;

// Shared logo mask — applied to ONE parent container so chrome gradient
// and sheen sweep share a single mask computation. When each element had
// its own mask the sub-pixel edges never aligned exactly, producing a
// visible rectangular "sticker outline" around the logo shape.
const MASK: React.CSSProperties = {
  WebkitMaskImage: "url(/brand/coverking-logo-white.png)",
  WebkitMaskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskImage: "url(/brand/coverking-logo-white.png)",
  maskSize: "contain",
  maskRepeat: "no-repeat",
  maskPosition: "center",
};

// Classic polished-chrome look: white specular at top, silver mid, dark
// shadow band, then a bright "horizon" recovery band and floor tint.
// The alternating light-dark-light bands are what make chrome read as 3D.
const CHROME =
  "linear-gradient(175deg, " +
  "#ffffff 0%, " +    // top: pure specular highlight
  "#f4fbff 6%, " +
  "#d4ecfa 18%, " +   // upper silver-blue
  "#9cbdd8 32%, " +   // mid transition
  "#ecf8ff 45%, " +   // chrome horizon reflection (bright band)
  "#7090b0 57%, " +   // shadow band
  "#4a6280 70%, " +   // deep shadow
  "#6888a0 82%, " +   // slight recovery
  "#a0c0dc 94%, " +
  "#c4daf0 100%" +    // very bottom: floor/sky reflection tint
  ")";

// Sheen: narrow bright diagonal band, soft edges, sweeps left→right
const SHEEN =
  "linear-gradient(108deg, transparent 22%, rgba(255,255,255,0.05) 36%, rgba(255,255,255,0.88) 50%, rgba(255,255,255,0.05) 64%, transparent 78%)";

export function CovekingIntro() {
  const [gone, setGone] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const sceneRef = React.useRef<HTMLDivElement>(null);
  const logoWrapRef = React.useRef<HTMLDivElement>(null);
  const sheenRef = React.useRef<HTMLDivElement>(null);
  const reflectionRef = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setGone(true);
        return;
      }

      const tl = gsap.timeline();

      // Camera pull-back
      tl.fromTo(sceneRef.current, { scale: 1.14 }, { scale: 1, duration: ANIM_DURATION, ease: "power2.out" }, 0);

      // Logo mount
      tl.fromTo(logoWrapRef.current, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" }, 0);

      // Chrome sheen sweep — GSAP moves the sheen div (which lives inside
      // the masked parent) so the sweep is inherently clipped to logo shape
      tl.fromTo(sheenRef.current, { xPercent: -160 }, { xPercent: 160, duration: 0.76, ease: "power1.inOut" }, 0.38);

      // Floor reflection fade-in
      tl.fromTo(reflectionRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0.15);

      // Loading bar
      tl.fromTo(barRef.current, { scaleX: 0 }, { scaleX: 1, duration: ANIM_DURATION, ease: "power1.inOut", transformOrigin: "0% 0%" }, 0);

      // Fade out → unmount
      tl.to(rootRef.current, { opacity: 0, duration: 0.35, ease: "power2.inOut", onComplete: () => setGone(true) }, ANIM_DURATION - 0.05);
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
        touchAction: "none",
      }}
    >
      {/* Scene — camera pull-back target */}
      <div
        ref={sceneRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          background: [
            "radial-gradient(ellipse 55% 38% at 50% 0%, rgba(255,255,255,0.14) 0%, transparent 62%)",
            "radial-gradient(ellipse 78% 62% at 50% 38%, #2594ec 0%, #1578d0 22%, #0b56a8 50%, #063878 74%, #021e48 100%)",
          ].join(", "),
        }}
      >
        {/* Floor ambient uplight */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "65%",
            height: "32%",
            background:
              "radial-gradient(ellipse 100% 55% at 50% 100%, rgba(80,170,255,0.2) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Logo + reflection assembly */}
        <div
          style={{
            position: "relative",
            width: "min(76vw, 500px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Logo wrapper — GSAP opacity/scale target */}
          <div ref={logoWrapRef} style={{ position: "relative", width: "100%", opacity: 0 }}>

            {/*
             * Invisible <img> spacer: lets the browser set the correct intrinsic
             * height from the actual image dimensions so no magic paddingBottom %.
             */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/coverking-logo-white.png"
              alt=""
              style={{ width: "100%", display: "block", visibility: "hidden" }}
            />

            {/*
             * Filter wrapper: drop-shadow() applied here, OUTSIDE the mask.
             * Stacking four small-offset solid drop-shadows simulates the
             * 3D letter extrusion (depth / thickness on the letterforms).
             * The two blur-radius=0 shadows give the crisp hard edge of the
             * extrusion; the wide glow shadows add the blue aura.
             * This works correctly because the filter sees the child's masked
             * alpha (logo silhouette) and casts all shadows from that shape.
             */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                filter: [
                  "drop-shadow(0 0 28px rgba(60,160,255,0.7))",    // outer blue halo
                  "drop-shadow(0 0 10px rgba(180,230,255,0.5))",   // inner glow
                  "drop-shadow(1px 2px 0 #0a1628)",                // extrusion depth 1
                  "drop-shadow(2px 3px 0 #070f1c)",                // extrusion depth 2
                  "drop-shadow(3px 5px 0 #050c16)",                // extrusion depth 3
                  "drop-shadow(4px 6px 0 #030a10)",                // extrusion depth 4
                  "drop-shadow(0 14px 20px rgba(0,4,16,0.96))",    // ground shadow
                ].join(" "),
              }}
            >
              {/*
               * Chrome face container — mask is applied ONCE here.
               * Because both the chrome gradient and the sheen are children
               * of this element, they're composited together first and then
               * the mask clips the joint result. One mask = no edge mismatch.
               */}
              <div style={{ position: "absolute", inset: 0, ...MASK }}>
                {/* Chrome metallic gradient — light-dark-light chrome bands */}
                <div style={{ position: "absolute", inset: 0, background: CHROME }} />

                {/* Sheen sweep — clipped to logo by parent mask, no bleed */}
                <div
                  ref={sheenRef}
                  style={{ position: "absolute", inset: 0, background: SHEEN }}
                />
              </div>
            </div>
          </div>

          {/* Floor reflection: flipped, blurred, faded img strip */}
          <div
            ref={reflectionRef}
            style={{
              width: "100%",
              marginTop: 4,
              overflow: "hidden",
              // Show only a narrow strip at the very top of the flipped image
              // (= the bottom edge of the logo, closest to the floor line)
              height: "clamp(14px, 4vw, 32px)",
              opacity: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/coverking-logo-white.png"
              alt=""
              style={{
                width: "100%",
                display: "block",
                transform: "scaleY(-1)",
                transformOrigin: "top center",
                filter: "blur(3px)",
                opacity: 0.1,
                // Fade the reflection out toward the bottom
                WebkitMaskImage: "linear-gradient(to bottom, white 0%, transparent 80%)",
                maskImage: "linear-gradient(to bottom, white 0%, transparent 80%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Loading progress bar — bottom edge */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255,255,255,0.14)",
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
            boxShadow:
              "0 0 10px rgba(255,255,255,0.75), 0 0 4px rgba(255,255,255,0.9)",
          }}
        />
      </div>
    </div>
  );
}
