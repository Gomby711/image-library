import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { IMAGE_DIR, mutateDb, readDb } from "@/lib/db";
import {
  classifyAspect,
  computeReferenceName,
  extensionFromFilename,
  isAcceptedExtension,
  mimeForExtension,
} from "@/lib/images";
import { readDimensions } from "@/lib/image-dimensions";
import type { ImageRecord, SortKey } from "@/lib/types";

export async function GET(req: Request) {
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
}

export async function POST(req: Request) {
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
    const ext = extensionFromFilename(file.name);
    if (!isAcceptedExtension(ext)) {
      rejected.push({ name: file.name, reason: `Unsupported file type ".${ext}"` });
      continue;
    }

    const id = randomUUID();
    const filename = `${id}.${ext}`;
    const destPath = path.join(IMAGE_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.mkdir(IMAGE_DIR, { recursive: true });
    await fs.writeFile(destPath, buffer);

    const { width, height } = readDimensions(buffer, ext);

    const record: ImageRecord = {
      id,
      filename,
      originalName: file.name,
      ext,
      mimeType: mimeForExtension(ext),
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
    });
  }

  return NextResponse.json({ created, rejected });
}
