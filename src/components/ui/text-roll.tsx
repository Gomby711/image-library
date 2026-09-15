"use client";

// Per-letter hover roll: current text slides up and out while a second
// copy slides in from below, staggered per character. Ported from the
// shift-sync reference app's animated-menu.tsx — pure CSS (group-hover +
// per-letter transition-delay), driven off the parent row's `group` class
// so a fast pointer crossing the small label never skips the hover.
import * as React from "react";
import { cn } from "@/lib/utils";

const STAGGER = 0.02;

export const TextRoll: React.FC<{
  children: string;
  className?: string;
  center?: boolean;
}> = ({ children, className, center = false }) => {
  const letters = React.useMemo(() => children.split(""), [children]);

  function delayFor(i: number) {
    return center ? STAGGER * Math.abs(i - (letters.length - 1) / 2) : STAGGER * i;
  }

  // Generous line-height so descenders (g/y/p/j/q) have room in both
  // animated copies and the invisible sizing ghost agrees with them.
  const lineHeight = 1.4;

  return (
    <span
      className={cn("relative inline-block overflow-hidden align-bottom", className)}
      // The two absolutely-positioned per-letter copies below can sum to a
      // hair wider than the invisible ghost that sizes this box (per-letter
      // inline-block spans round slightly differently than one continuous
      // text run) — a couple px of right padding stops that drift from
      // clipping the last character against this box's own overflow-hidden.
      style={{ lineHeight, paddingRight: 3 }}
    >
      <span className="invisible" aria-hidden="true">
        {children}
      </span>

      <span className="absolute inset-0" aria-hidden="true" style={{ lineHeight }}>
        {letters.map((l, i) => (
          <span
            key={`out-${i}`}
            className="text-roll-out inline-block"
            style={{ "--roll-delay": `${delayFor(i)}s`, whiteSpace: "pre" } as React.CSSProperties}
          >
            {l}
          </span>
        ))}
      </span>

      <span className="absolute inset-0" aria-hidden="true" style={{ lineHeight }}>
        {letters.map((l, i) => (
          <span
            key={`in-${i}`}
            className="text-roll-in inline-block"
            style={{ "--roll-delay": `${delayFor(i)}s`, whiteSpace: "pre" } as React.CSSProperties}
          >
            {l}
          </span>
        ))}
      </span>
    </span>
  );
};
