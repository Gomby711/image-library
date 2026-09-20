"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

// Total intro duration before fade-out begins
const ANIM_DURATION = 2.42;

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

      // Camera pull-back: scene starts slightly zoomed in and eases to 1x
      tl.fromTo(
        sceneRef.current,
        { scale: 1.14 },
        { scale: 1, duration: ANIM_DURATION, ease: "power2.out" },
        0
      );

      // Logo fades in from nothing over first 0.45s
      tl.fromTo(
        logoWrapRef.current,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" },
        0
      );

      // Chrome sheen sweep diagonally across logo at t=0.35s
      tl.fromTo(
        sheenRef.current,
        { xPercent: -160 },
        { xPercent: 160, duration: 0.8, ease: "power1.inOut" },
        0.35
      );

      // Reflection fades in slightly after logo
      tl.fromTo(
        reflectionRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.55, ease: "power2.out" },
        0.12
      );

      // Loading bar fills across the exact animation duration
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

      // Fade out just as animation ends, then unmount
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
        overflow: "hidden",
        background: "#021e48",
        touchAction: "none",
      }}
    >
      {/* Scene wrapper — GSAP scale animates this for the camera pull-back */}
      <div
        ref={sceneRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          // Radial gradient background: vivid blue center → deep navy edges
          background: `
            radial-gradient(ellipse 55% 45% at 50% 0%, rgba(255,255,255,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 80% 60% at 50% 40%, #2390e8 0%, #1274cc 25%, #0a52a0 55%, #063878 78%, #021e48 100%)
          `,
        }}
      >
        {/* Bottom floor ambient glow */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "70%",
            height: "35%",
            background:
              "radial-gradient(ellipse 100% 60% at 50% 100%, rgba(100,185,255,0.22) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Logo + reflection container */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "min(72vw, 460px)",
          }}
        >
          {/* Chrome logo */}
          <div
            ref={logoWrapRef}
            style={{
              position: "relative",
              width: "100%",
              overflow: "hidden",
            }}
          >
            {/*
             * Chrome/metallic look: use the white logo as a mask over a
             * silver-to-highlight gradient so it reads as polished metal.
             */}
            <div
              style={{
                width: "100%",
                paddingBottom: "35%", // intrinsic ratio placeholder
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  // Chrome gradient: bright top highlight → silver mid → blue-silver shadow
                  background:
                    "linear-gradient(160deg, #ffffff 0%, #d8eeff 18%, #b8d4ef 36%, #ffffff 50%, #9fbdd8 64%, #c8dff0 80%, #e8f4ff 100%)",
                  // Mask the gradient to the logo shape
                  WebkitMaskImage: "url(/brand/coverking-logo-white.png)",
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskImage: "url(/brand/coverking-logo-white.png)",
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  filter:
                    "drop-shadow(0 0 24px rgba(100,185,255,0.7)) drop-shadow(0 2px 12px rgba(0,50,120,0.6)) brightness(1.08)",
                }}
              />

              {/* Diagonal chrome sheen sweep — slides across the logo */}
              <div
                ref={sheenRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  // Wide diagonal band of bright light
                  background:
                    "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.75) 50%, transparent 70%)",
                  // Clip to logo mask so the sheen only shows on the logo
                  WebkitMaskImage: "url(/brand/coverking-logo-white.png)",
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskImage: "url(/brand/coverking-logo-white.png)",
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {/* Floor reflection: flipped + faded + blurred copy of logo */}
          <div
            ref={reflectionRef}
            style={{
              width: "100%",
              marginTop: 2,
              opacity: 0,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                paddingBottom: "20%", // reflection is cropped shorter
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(160deg, #ffffff 0%, #d8eeff 18%, #b8d4ef 36%, #ffffff 50%, #9fbdd8 64%, #c8dff0 80%, #e8f4ff 100%)",
                  WebkitMaskImage: `
                    linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.18) 100%),
                    url(/brand/coverking-logo-white.png)
                  `,
                  WebkitMaskSize: "100% 100%, contain",
                  WebkitMaskRepeat: "no-repeat, no-repeat",
                  WebkitMaskPosition: "center, center",
                  WebkitMaskComposite: "source-in",
                  maskImage: `
                    linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.18) 100%),
                    url(/brand/coverking-logo-white.png)
                  `,
                  maskSize: "100% 100%, contain",
                  maskRepeat: "no-repeat, no-repeat",
                  maskPosition: "center, center",
                  maskComposite: "intersect",
                  transform: "scaleY(-1)",
                  filter: "blur(1.5px) brightness(0.5)",
                }}
              />
            </div>
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
