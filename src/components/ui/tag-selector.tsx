"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface TagSelectorProps {
  /** Pool of tags shown as clickable pills (presets + saved custom). */
  options: string[];
  /** Currently selected tags (controlled). */
  value: string[];
  /** Called whenever the selection changes. */
  onChange: (tags: string[]) => void;
  /** Called with the raw string whenever the user commits a brand-new custom
   *  tag from the text input — lets the caller persist it to custom-tag memory. */
  onAddCustomTag?: (tag: string) => void;
  placeholder?: string;
  className?: string;
}

export function TagSelector({
  options,
  value,
  onChange,
  onAddCustomTag,
  placeholder = "Type a tag name…",
  className,
}: TagSelectorProps) {
  const [customInput, setCustomInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();

  const available = options.filter((t) => !value.includes(t));

  function select(tag: string) {
    if (!value.includes(tag)) onChange([...value, tag]);
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function commitCustom() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    select(trimmed);
    onAddCustomTag?.(trimmed);
    setCustomInput("");
  }

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth, behavior: "smooth" });
  }, [value]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Selected tags — horizontal scrollable strip */}
      <motion.div
        layout
        ref={scrollRef}
        className="flex h-11 items-center gap-1.5 overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface px-2 no-scrollbar"
      >
        {value.length === 0 ? (
          <span className="px-1 text-xs text-muted-foreground">No tags selected — pick below or type one</span>
        ) : (
          value.map((tag) => (
            <motion.div
              key={tag}
              layoutId={`${id}-${tag}`}
              className="flex h-7 shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-surface-2 pl-2.5 pr-1 text-xs font-medium"
            >
              <motion.span layoutId={`${id}-${tag}-lbl`} className="text-foreground">
                {tag}
              </motion.span>
              <button
                type="button"
                onClick={() => remove(tag)}
                className="rounded-full p-0.5 hover:bg-muted/40"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3 text-muted-foreground" />
              </button>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Available pills */}
      {available.length > 0 && (
        <motion.div
          layout
          className="rounded-[var(--radius-md)] border border-border bg-surface-2 p-2"
        >
          <div className="flex flex-wrap gap-1.5">
            {available.map((tag) => (
              <motion.button
                key={tag}
                layoutId={`${id}-${tag}`}
                type="button"
                onClick={() => select(tag)}
                className="shrink-0 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <motion.span layoutId={`${id}-${tag}-lbl`}>{tag}</motion.span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Custom tag input */}
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitCustom();
            }
          }}
        />
        <button
          type="button"
          onClick={commitCustom}
          className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface transition-colors hover:bg-surface-2"
          aria-label="Add custom tag"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
