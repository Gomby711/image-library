"use client";

import { LibraryClient } from "@/components/library/library-client";

export default function LibraryPage() {
  return (
    <>
      {/* Cinematic hero — same automotive photography as the login screen,
          dropped in dark with a Coverking-blue accent line so the page
          opens with some presence instead of a plain text header. */}
      <div className="relative mb-8 overflow-hidden rounded-[var(--radius-lg)] border border-border">
        <div className="relative h-[200px] w-full sm:h-[260px] lg:h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/login-hero.jpg"
            alt=""
            style={{ objectPosition: "72% 48%" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
          <div className="relative flex h-full flex-col justify-end gap-3 p-6 sm:p-8">
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
