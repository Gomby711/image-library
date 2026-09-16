export type AspectBucket =
  | "1:1"
  | "4:3"
  | "3:2"
  | "16:9"
  | "21:9"
  | "3:4"
  | "2:3"
  | "9:16"
  | "custom";

export const PRESET_TAGS = [
  "Hero Card",
  "Card Image",
  "Reference Image",
  "Asset Image",
  "Hero Banner",
] as const;

export type PresetTag = (typeof PRESET_TAGS)[number];

/** General-purpose icon set offered for library pages and workspaces —
 *  picking one replaces the generic page/folder glyph. These are names of
 *  lucide-react icon components (mapped to the actual components in
 *  sidebar.tsx, which already depends on lucide-react) rather than emoji —
 *  crisp, consistent SVGs read as more polished than emoji glyphs, which
 *  render inconsistently across platforms and look out of place next to
 *  the rest of the UI's icon language. */
export const PAGE_ICON_OPTIONS = [
  "Camera", "Image", "Images", "Film", "Palette", "Star",
  "Bookmark", "Tag", "Tags", "Layers", "Package", "Archive",
  "Briefcase", "Sparkles", "Flag", "Gem", "Aperture", "PenTool",
  "Video", "FolderOpen", "Grid3x3", "LayoutGrid", "Box", "Zap",
] as const;

export type PageIconName = (typeof PAGE_ICON_OPTIONS)[number];

export const ACCEPTED_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "tiff",
  "avif",
  "webp",
  "svg",
] as const;

export const ACCEPTED_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  tiff: "image/tiff",
  avif: "image/avif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export interface ImageRecord {
  id: string;
  filename: string;
  originalName: string;
  ext: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  aspect: AspectBucket;
  tags: string[];
  folderId: string | null;
  uploadedAt: string;
}

export interface FolderRecord {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

/** A hero banner image dropped in from outside the library (desktop/file
 *  explorer) — stored in R2 like any image, but deliberately never added to
 *  db.images, so it never shows up as a library asset in the grid. Reusing
 *  an *existing* library image as a hero (dragged from the page's own grid)
 *  doesn't need this — it just points LibraryPageRecord.heroImageId at that
 *  image instead. */
export interface HeroUploadRecord {
  filename: string;
  ext: string;
  mimeType: string;
}

/** A user-defined sidebar tab, optionally filtered to only the images
 *  carrying one tag — e.g. "Car Images Library" -> tag "C8 Corvette". A
 *  null tag means no filter: the page shows every image, same as the main
 *  Library. The tag is chosen independently of the page's name (picked from
 *  an existing tag, typed fresh, or left unset) and isn't affected by
 *  renaming the page. */
export interface LibraryPageRecord {
  id: string;
  name: string;
  tag: string | null;
  createdAt: string;
  /** Groups this page under a sidebar Workspace folder, or null if ungrouped. */
  workspaceId: string | null;
  /** Optional icon shown instead of the generic page icon — a name from
   *  PAGE_ICON_OPTIONS, or null for the default icon. */
  icon: PageIconName | null;
  /** Sidebar position among siblings sharing the same workspaceId — pages
   *  and workspaces share one ordering space per parent, so either kind can
   *  be dragged above/below the other, not just within its own kind. */
  order: number;
  /** Id of an existing library image (if any) reused as this page's hero
   *  banner — set by dragging a photo from the page's own grid. Mutually
   *  exclusive with heroUpload; setting one clears the other. */
  heroImageId: string | null;
  /** A standalone hero image dropped in from outside the library — never
   *  added to db.images, so it never appears as a library asset. */
  heroUpload: HeroUploadRecord | null;
}

/** A renamable sidebar folder that groups Library Pages together — collapsing
 *  it hides its member pages without touching them or their tags. Workspaces
 *  can nest inside one another (folders within folders) via parentId. */
export interface WorkspaceRecord {
  id: string;
  name: string;
  createdAt: string;
  parentId: string | null;
  /** Optional icon shown instead of the generic folder icon — a name from
   *  PAGE_ICON_OPTIONS, or null for the default icon. */
  icon: PageIconName | null;
  /** Sidebar position among siblings sharing the same parentId — see
   *  LibraryPageRecord.order. */
  order: number;
}

/** A custom tag the user has typed at least once, remembered so it can be
 *  picked from a list instead of retyped every time. */
export interface CustomTagRecord {
  name: string;
  createdAt: string;
}

export interface DbShape {
  images: ImageRecord[];
  folders: FolderRecord[];
  libraryPages: LibraryPageRecord[];
  workspaces: WorkspaceRecord[];
  customTags: CustomTagRecord[];
}

export type SortKey = "date-desc" | "date-asc" | "type-asc" | "type-desc" | "custom";
export type ViewMode = "grid" | "list" | "carousel";
export type PageSize = 12 | 24 | 48 | "all";
