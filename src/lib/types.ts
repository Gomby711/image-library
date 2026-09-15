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
}

export interface DbShape {
  images: ImageRecord[];
  folders: FolderRecord[];
  libraryPages: LibraryPageRecord[];
}

export type SortKey = "date-desc" | "date-asc" | "type-asc" | "type-desc";
export type ViewMode = "grid" | "list" | "carousel";
export type PageSize = 12 | 24 | 48 | "all";
