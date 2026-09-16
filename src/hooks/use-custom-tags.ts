"use client";

import * as React from "react";

/** Every custom tag ever applied to an image, newest first. Tags are
 *  remembered automatically server-side the moment they're applied to an
 *  image (see rememberTags in lib/db.ts) — this hook just reads that list so
 *  tag pickers can offer them as one-click chips instead of the user
 *  retyping the same tag every time. */
export function useCustomTags() {
  const [tags, setTags] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      setTags(data.tags ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Optimistically add a tag to the local list the moment it's used, so it
  // shows up as a saved chip on the very next dialog without waiting on a
  // refetch.
  const noteTagUsed = React.useCallback((tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev : [tag, ...prev]));
  }, []);

  return { tags, loading, refresh, noteTagUsed };
}
