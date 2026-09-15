"use client";

import * as React from "react";
import gsap from "gsap";

/**
 * Magnetic hover, ported from the reference app: while the cursor is inside
 * the element's bounds it nudges a few px toward the cursor, then springs
 * back to rest on mouseleave. No-ops under prefers-reduced-motion or on
 * touch/coarse-pointer devices where "hover" doesn't really exist.
 */
export function useMagneticHover<T extends HTMLElement>(strength = 0.35, maxPull = 10) {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });

    function onMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      xTo(gsap.utils.clamp(-maxPull, maxPull, relX * strength));
      yTo(gsap.utils.clamp(-maxPull, maxPull, relY * strength));
    }
    function onLeave() {
      xTo(0);
      yTo(0);
    }

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength, maxPull]);

  return ref;
}
