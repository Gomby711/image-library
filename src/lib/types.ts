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
 *  picking one replaces the generic page/folder glyph. Deliberately not
 *  vehicle-only, so it suits any kind of collection. */
export const EMOJI_ICON_OPTIONS = [
  "📁", "🗂️", "📸", "🖼️", "🎬", "🏷️", "⭐", "🔥",
  "💎", "🎯", "📌", "🧩", "🎨", "✨", "📦", "🔖",
  "🗃️", "🧾", "📋", "💼", "🛠️", "⚙️", "🔩", "🧰",
] as const;

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

/** A user-defined sidebar tab that shows only images carrying one tag —
 *  e.g. "Car Images Library" -> tag "C8 Corvette". */
export interface LibraryPageRecord {
  id: string;
  name: string;
  tag: string;
  createdAt: string;
  /** Groups this page under a sidebar Workspace folder, or null if ungrouped. */
  workspaceId: string | null;
  /** Optional emoji shown instead of the generic page icon — one of
   *  EMOJI_ICON_OPTIONS, or null for the default icon. */
  emoji: string | null;
  /** Sidebar position among siblings sharing the same workspaceId — pages
   *  and workspaces share one ordering space per parent, so either kind can
   *  be dragged above/below the other, not just within its own kind. */
  order: number;
  /** Id of the image (if any) used as this page's hero banner. */
  heroImageId: string | null;
}

/** A renamable sidebar folder that groups Library Pages together — collapsing
 *  it hides its member pages without touching them or their tags. Workspaces
 *  can nest inside one another (folders within folders) via parentId. */
export interface WorkspaceRecord {
  id: string;
  name: string;
  createdAt: string;
  parentId: string | null;
  /** Optional emoji shown instead of the generic folder icon — one of
   *  EMOJI_ICON_OPTIONS, or null for the default icon. */
  emoji: string | null;
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
