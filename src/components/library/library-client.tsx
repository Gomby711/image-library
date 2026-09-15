"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useImages } from "@/hooks/use-images";
import { useFolders } from "@/hooks/use-folders";
import { UploadDropzone } from "@/components/library/upload-dropzone";
import { Toolbar } from "@/components/library/toolbar";
import { Pagination } from "@/components/library/pagination";
import { ImageCard, fileUrl } from "@/components/library/image-card";
import { Lightbox } from "@/components/library/lightbox";
import { TagEditorDialog } from "@/components/library/tag-editor-dialog";
import { RenameImageDialog } from "@/components/library/rename-image-dialog";
import { CoverflowCarousel, type CoverflowSlide } from "@/components/ui/coverflow-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import type { ImageRecord, PageSize, SortKey, ViewMode } from "@/lib/types";

interface LibraryClientProps {
  folderId?: string | null;
  hideUpload?: boolean;
  /** Locks this view to images carrying exactly this tag — used by custom Library Pages.
   *  New uploads made from this view are auto-tagged with it. */
  lockedTag?: string | null;
}

export function LibraryClient({ folderId = null, hideUpload = false, lockedTag = null }: LibraryClientProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("date-desc");
  const [pageSize, setPageSize] = React.useState<PageSize>(24);
  const [page, setPage] = React.useState(1);
  const [view, setView] = React.useState<ViewMode>("grid");
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [tagEditorImage, setTagEditorImage] = React.useState<ImageRecord | null>(null);
  const [renameImage, setRenameImage] = React.useState<ImageRecord | null>(null);

  const effectivePageSize: PageSize = view === "carousel" ? "all" : pageSize;

  const { items, total, loading, uploads, upload, updateImage, deleteImage } = useImages({
    search,
    sort,
    folderId,
    tag: lockedTag,
    page,
    pageSize: effectivePageSize,
  });
  const { folders } = useFolders();
  const folderMap = React.useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  React.useEffect(() => {
    setPage(1);
  }, [search, sort, pageSize, folderId, lockedTag]);

  function goToFolder(id: string) {
    router.push(`/inventory?folder=${id}`);
  }

  const slides: CoverflowSlide[] = items.map((img) => ({
    id: img.id,
    src: fileUrl(img.id),
    alt: img.originalName,
    title: img.originalName,
    subtitle: img.tags.join(" · ") || img.aspect,
    meta: [
      { label: "Uploaded", value: new Date(img.uploadedAt).toLocaleDateString() },
      { label: "Type", value: img.ext.toUpperCase() },
      { label: "Aspect", value: img.aspect },
    ],
  }));

  return (
    <div className="flex flex-col gap-6">
      {!hideUpload && (
        <UploadDropzone
          onFiles={(files) => upload(files, { folderId, tags: lockedTag ? [lockedTag] : undefined })}
          uploads={uploads}
        />
      )}

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        view={view}
        onViewChange={setView}
        total={total}
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border py-16 text-center text-muted-foreground">
          <Loader2 className="size-5 opacity-0" />
          <p className="text-sm">No images match yet. Upload something, or clear your search.</p>
        </div>
      ) : view === "carousel" ? (
        <CoverflowCarousel slides={slides} onSelect={(_, idx) => setLightboxIndex(idx)} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((img, idx) => (
            <ImageCard
              key={img.id}
              image={img}
              layout="grid"
              folder={img.folderId ? folderMap.get(img.folderId) : null}
              onExpand={() => setLightboxIndex(idx)}
              onEditTags={() => setTagEditorImage(img)}
              onRename={() => setRenameImage(img)}
              onDelete={() => deleteImage(img.id)}
              onFolderClick={goToFolder}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((img, idx) => (
            <ImageCard
              key={img.id}
              image={img}
              layout="list"
              folder={img.folderId ? folderMap.get(img.folderId) : null}
              onExpand={() => setLightboxIndex(idx)}
              onEditTags={() => setTagEditorImage(img)}
              onRename={() => setRenameImage(img)}
              onDelete={() => deleteImage(img.id)}
              onFolderClick={goToFolder}
            />
          ))}
        </div>
      )}

      {view !== "carousel" && (
        <Pagination page={page} pageSize={effectivePageSize} total={total} onPageChange={setPage} />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onEditTags={(img) => setTagEditorImage(img)}
        />
      )}

      <TagEditorDialog
        image={tagEditorImage}
        onClose={() => setTagEditorImage(null)}
        onSave={(id, tags) => updateImage(id, { tags })}
      />

      <RenameImageDialog
        image={renameImage}
        onClose={() => setRenameImage(null)}
        onSave={(id, originalName) => updateImage(id, { originalName })}
      />
    </div>
  );
}
