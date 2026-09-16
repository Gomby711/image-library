"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PaginationProps {
  page: number;
  pageSize: number | "all";
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const [jumpValue, setJumpValue] = React.useState("");

  if (pageSize === "all") return null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  // Always show first/last plus a window of 2 around the current page —
  // wide enough that on a big library (dozens of pages) jumping isn't stuck
  // hopping one page at a time, without ever rendering the whole page list.
  const WINDOW = 2;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= WINDOW
  );

  function commitJump(e: React.FormEvent) {
    e.preventDefault();
    const n = Math.round(Number(jumpValue));
    if (Number.isFinite(n) && n >= 1 && n <= pageCount) onPageChange(n);
    setJumpValue("");
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Button>
        {pages.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
            <Button
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-9"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          </React.Fragment>
        ))}
        <Button variant="outline" size="icon" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <form onSubmit={commitJump} className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>Go to</span>
        <Input
          type="number"
          min={1}
          max={pageCount}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          placeholder={String(page)}
          className="h-8 w-16 px-2 text-center"
          aria-label={`Jump to page (1–${pageCount})`}
        />
        <span>of {pageCount}</span>
      </form>
    </div>
  );
}
