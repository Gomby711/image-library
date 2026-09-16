import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

function getS3() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = () => process.env.R2_BUCKET_NAME!;

export async function putImageFile(filename: string, buffer: Buffer, contentType: string): Promise<void> {
  await getS3().send(
    new PutObjectCommand({ Bucket: BUCKET(), Key: filename, Body: buffer, ContentType: contentType })
  );
}

export async function getImageFile(filename: string) {
  try {
    const res = await getS3().send(new GetObjectCommand({ Bucket: BUCKET(), Key: filename }));
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    const buffer = Buffer.from(bytes);
    return { buffer, contentType: res.ContentType, size: buffer.byteLength };
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

const TRANSFORMABLE_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

export async function getResizedImageFile(filename: string, ext: string, width: number) {
  if (!TRANSFORMABLE_EXT.has(ext.toLowerCase())) return null;
  try {
    const file = await getImageFile(filename);
    if (!file) return null;
    const resized = await sharp(file.buffer)
      .resize({ width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer: resized, contentType: "image/webp" };
  } catch {
    return null;
  }
}

export async function deleteImageFile(filename: string): Promise<void> {
  await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: filename }));
}
