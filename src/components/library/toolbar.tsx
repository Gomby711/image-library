"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckSquare,
  Download,
  Grid3x3,
  LayoutList,
  ListChecks,
  Move,
  Rows3,
  Search,
  Sparkles,
} from "lucide-react";
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
  reorderMode: boolean;
  onToggleReorder: () => void;
  selectMode: boolean;
  onToggleSelect: () => void;
  /** Count of currently-visible (loaded) items eligible for select-all. */
  visibleCount?: number;
  allVisibleSelected?: boolean;
  onSelectAll?: () => void;
  selectedCount?: number;
  onBulkDownload?: () => void;
  showActivityLog?: boolean;
  onToggleActivityLog?: () => void;
  accentColor?: string;
  onAccentColorChange?: (color: string) => void;
}

const PRESET_ACCENTS = [
  "#117fd1",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#b45309",
];

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
  reorderMode,
  onToggleReorder,
  selectMode,
  onToggleSelect,
  visibleCount = 0,
  allVisibleSelected = false,
  onSelectAll,
  selectedCount = 0,
  onBulkDownload,
  showActivityLog = false,
  onToggleActivityLog,
  accentColor,
  onAccentColorChange,
}: ToolbarProps) {
  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[var(--radius-lg)] border border-border/50 bg-surface/80 px-4 py-3 backdrop-blur-md shadow-[var(--shadow-sm)]"
    >
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

        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)} disabled={reorderMode || selectMode}>
          <SelectTrigger className="w-[160px] shrink-0 whitespace-nowrap">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest first</SelectItem>
            <SelectItem value="date-asc">Oldest first</SelectItem>
            <SelectItem value="type-asc">File type A–Z</SelectItem>
            <SelectItem value="type-desc">File type Z–A</SelectItem>
            <SelectItem value="custom">Custom order</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange((v === "all" ? "all" : Number(v)) as PageSize)}
          disabled={reorderMode || selectMode}
        >
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
          <ViewButton active={view === "grid"} label="Grid view" onClick={() => onViewChange("grid")} disabled={reorderMode || selectMode}>
            <Grid3x3 className="size-4" />
          </ViewButton>
          <ViewButton active={view === "masonry"} label="Masonry view" onClick={() => onViewChange("masonry")} disabled={reorderMode || selectMode}>
            <Rows3 className="size-4" />
          </ViewButton>
          <ViewButton active={view === "list"} label="List view" onClick={() => onViewChange("list")} disabled={reorderMode || selectMode}>
            <LayoutList className="size-4" />
          </ViewButton>
          <ViewButton active={view === "carousel"} label="Carousel view" onClick={() => onViewChange("carousel")} disabled={reorderMode || selectMode}>
            <Sparkles className="size-4" />
          </ViewButton>
        </div>

        {view !== "carousel" && !selectMode && (
          <Button
            variant={reorderMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleReorder}
            title="Drag images to set a custom order"
          >
            <Move className="size-4" />
            {reorderMode ? "Done" : "Rearrange"}
          </Button>
        )}

        {view !== "carousel" && !reorderMode && (
          <Button
            variant={selectMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleSelect}
            title="Select multiple images to tag them all at once"
          >
            <CheckSquare className="size-4" />
            {selectMode ? "Done" : "Select"}
          </Button>
        )}

        {view !== "carousel" && selectMode && visibleCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            title={allVisibleSelected ? "Clear selection" : `Select all ${visibleCount} shown`}
          >
            <ListChecks className="size-4" />
            {allVisibleSelected ? "Deselect all" : "Select all"}
          </Button>
        )}

        {selectMode && selectedCount > 0 && onBulkDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDownload}
            title={`Download ${selectedCount} selected image${selectedCount === 1 ? "" : "s"} as ZIP`}
          >
            <Download className="size-4" />
            ZIP ({selectedCount})
          </Button>
        )}

        {onToggleActivityLog && (
          <Button
            variant={showActivityLog ? "default" : "outline"}
            size="icon"
            className="size-8 shrink-0"
            onClick={onToggleActivityLog}
            title="Activity log"
          >
            <Activity className="size-4" />
          </Button>
        )}

        {accentColor !== undefined && onAccentColorChange && (
          <AccentPicker value={accentColor} onChange={onAccentColorChange} />
        )}
      </div>
    </div>
  );
}

function AccentPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="size-6 rounded-full border-2 border-border ring-offset-background transition-all hover:scale-110 hover:ring-2 hover:ring-offset-2"
        style={{ backgroundColor: value }}
        title="Accent color"
        aria-label="Accent color"
      />
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface p-2 shadow-[var(--shadow-md)]">
          {PRESET_ACCENTS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                onChange(color);
                setOpen(false);
              }}
              className={cn(
                "size-6 rounded-full border-2 transition-all hover:scale-110",
                value === color ? "border-foreground scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ViewButton({
  active,
  label,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {active && (
        <motion.div
          layoutId="view-mode-indicator"
          className="absolute inset-0 rounded-[6px] bg-accent"
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
        />
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-pressed={active}
        title={label}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative z-10 h-8 w-8",
          active ? "text-accent-foreground hover:text-accent-foreground" : ""
        )}
      >
        {children}
      </Button>
    </div>
  );
}
