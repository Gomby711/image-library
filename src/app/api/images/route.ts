import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { mutateDb, readDb, rememberTags } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";
import { putImageFile } from "@/lib/r2";
import {
  classifyAspect,
  computeReferenceName,
  extensionFromFilename,
  isAcceptedExtension,
  isConvertibleExtension,
  mimeForExtension,
} from "@/lib/images";
import { readDimensions } from "@/lib/image-dimensions";
import { convertToJpeg } from "@/lib/image-convert";
import type { ImageRecord, SortKey } from "@/lib/types";

export async function GET(req: Request) {
  return withApiErrors(async () => {
    const url = new URL(req.url);
    const sort = (url.searchParams.get("sort") as SortKey) || "date-desc";
    const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
    const folderId = url.searchParams.get("folderId");
    const tag = url.searchParams.get("tag");
    const pageParam = url.searchParams.get("page");
    const pageSizeParam = url.searchParams.get("pageSize");

    const db = await readDb();
    let items = [...db.images];

    if (folderId && folderId !== "all") {
      items = items.filter((img) => (folderId === "root" ? !img.folderId : img.folderId === folderId));
    }

    if (tag) {
      items = items.filter((img) => img.tags.includes(tag));
    }

    if (search) {
      items = items.filter(
        (img) =>
          img.originalName.toLowerCase().includes(search) ||
          img.tags.some((t) => t.toLowerCase().includes(search))
      );
    }

    // "custom" means the caller wants db.images' own stored order — the order
    // the /reorder endpoint writes to when a user drags cards around.
    if (sort !== "custom") {
      items.sort((a, b) => {
        switch (sort) {
          case "date-asc":
            return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          case "type-asc":
            return a.ext.localeCompare(b.ext) || a.aspect.localeCompare(b.aspect);
          case "type-desc":
            return b.ext.localeCompare(a.ext) || b.aspect.localeCompare(a.aspect);
          case "date-desc":
          default:
            return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        }
      });
    }

    const total = items.length;
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = pageSizeParam === "all" ? total || 1 : Number(pageSizeParam) || 24;

    const start = pageSizeParam === "all" ? 0 : (page - 1) * pageSize;
    const end = pageSizeParam === "all" ? total : start + pageSize;
    const paged = items.slice(start, end);

    return NextResponse.json({ items: paged, total, page, pageSize: pageSizeParam === "all" ? "all" : pageSize });
  });
}

export async function POST(req: Request) {
  return withApiErrors(async () => {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    const folderId = (form.get("folderId") as string) || null;
    const tagsRaw = (form.get("tags") as string) || "";
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const created: ImageRecord[] = [];
    const rejected: { name: string; reason: string }[] = [];

    for (const file of files) {
      const origExt = extensionFromFilename(file.name);
      let finalExt = origExt;
      let buffer = Buffer.from(await file.arrayBuffer()) as Buffer;

      if (isConvertibleExtension(origExt)) {
        try {
          buffer = await convertToJpeg(buffer, origExt);
          finalExt = "jpg";
        } catch {
          rejected.push({ name: file.name, reason: `Could not convert .${origExt} file` });
          continue;
        }
      } else if (!isAcceptedExtension(origExt)) {
        rejected.push({ name: file.name, reason: `Unsupported file type ".${origExt}"` });
        continue;
      }

      const id = randomUUID();
      const filename = `${id}.${finalExt}`;
      await putImageFile(filename, buffer, mimeForExtension(finalExt));

      const { width, height } = readDimensions(buffer, finalExt);

      const record: ImageRecord = {
        id,
        filename,
        originalName: file.name,
        ext: finalExt,
        mimeType: mimeForExtension(finalExt),
        size: buffer.byteLength,
        width,
        height,
        aspect: classifyAspect(width, height),
        tags,
        folderId,
        uploadedAt: new Date().toISOString(),
      };
      created.push(record);
    }

    if (created.length > 0) {
      await mutateDb((db) => {
        // Assigned one at a time (not against a snapshot) so two reference
        // images uploaded in the same batch number sequentially instead of
        // both claiming "_1".
        for (const record of created) {
          const refName = computeReferenceName(record.tags, record.ext, db.images, record.id);
          if (refName) record.originalName = refName;
          db.images.unshift(record);
        }
        rememberTags(db, tags);
      });
    }

    return NextResponse.json({ created, rejected });
  });
}
