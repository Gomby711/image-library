"use client";

import * as React from "react";
import { Grid3x3, LayoutList, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PageSize, SortKey, ViewMode } from "@/lib/types";

interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  pageSize: PageSize;
  onPageSizeChange: (value: PageSize) => void;
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
  total: number;
}

export function Toolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  pageSize,
  onPageSizeChange,
  view,
  onViewChange,
  total,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by tag or filename…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">{total} images</span>

        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger className="w-[160px] shrink-0 whitespace-nowrap">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest first</SelectItem>
            <SelectItem value="date-asc">Oldest first</SelectItem>
            <SelectItem value="type-asc">File type A–Z</SelectItem>
            <SelectItem value="type-desc">File type Z–A</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange((v === "all" ? "all" : Number(v)) as PageSize)}>
          <SelectTrigger className="w-[140px] shrink-0 whitespace-nowrap">
            <SelectValue placeholder="Show" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12">12 per page</SelectItem>
            <SelectItem value="24">24 per page</SelectItem>
            <SelectItem value="48">48 per page</SelectItem>
            <SelectItem value="all">Show all</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center rounded-[var(--radius-md)] border border-border bg-surface p-0.5">
          <ViewButton active={view === "grid"} label="Grid view" onClick={() => onViewChange("grid")}>
            <Grid3x3 className="size-4" />
          </ViewButton>
          <ViewButton active={view === "list"} label="List view" onClick={() => onViewChange("list")}>
            <LayoutList className="size-4" />
          </ViewButton>
          <ViewButton active={view === "carousel"} label="Carousel view" onClick={() => onViewChange("carousel")}>
            <Sparkles className="size-4" />
          </ViewButton>
        </div>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn("h-8 w-8", active && "bg-accent text-accent-foreground hover:bg-accent")}
    >
      {children}
    </Button>
  );
}
