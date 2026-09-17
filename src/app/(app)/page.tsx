"use client";

import * as React from "react";
import { LibraryClient } from "@/components/library/library-client";

export default function LibraryPage() {
  const heroRef = React.useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--spot-x", `${x}%`);
    el.style.setProperty("--spot-y", `${y}%`);
  }

  return (
    <>
      {/* Cinematic hero — same automotive photography as the login screen,
          dropped in dark with a Coverking-blue accent line so the page
          opens with some presence instead of a plain text header. */}
      <div
        ref={heroRef}
        className="relative mb-8 overflow-hidden rounded-[var(--radius-lg)] border border-border"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => heroRef.current?.classList.add("hero-spotlight-active")}
        onMouseLeave={() => heroRef.current?.classList.remove("hero-spotlight-active")}
      >
        <div className="relative h-[200px] w-full sm:h-[260px] lg:h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/login-hero.jpg"
            alt=""
            style={{ objectPosition: "72% 48%" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          {/* Cursor spotlight overlay — reads --spot-x / --spot-y from the outer ref */}
          <div className="hero-spotlight-glow absolute inset-0 z-[5]" />
          <div className="relative z-10 flex h-full flex-col justify-end gap-3 p-6 sm:p-8">
            <span className="hero-line h-1 w-14 rounded-full" style={{ background: "var(--accent)" }} />
            <h1 className="hero-title text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Asset &amp; Reference Library
            </h1>
            <p className="hero-sub max-w-xl text-sm text-white/75 sm:text-base">
              Every image in one place — tag, sort, search, and rearrange from here.
            </p>
          </div>
        </div>
      </div>
      <LibraryClient />
    </>
  );
}
