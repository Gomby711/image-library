/**
 * Converts CR2 (Canon RAW) and HEIC/HEIF files to JPEG for web storage.
 *
 * CR2: extracts the largest embedded JPEG preview from the TIFF/CR2 binary.
 *      Canon bodies always write a full-resolution preview JPEG; extracting
 *      it avoids any native RAW-decoding dependency.
 * HEIC: decodes via libheif-js (WASM) then re-encodes as JPEG.
 *
 * Both paths compress to ≤ 2 MB by trying decreasing quality values.
 */

const TARGET_BYTES = 2 * 1024 * 1024;

const RAW_EMBEDDED_JPEG_EXTS = new Set(["cr2", "dng", "nef", "arw", "orf", "rw2"]);

export async function convertToJpeg(buffer: Buffer, ext: string): Promise<Buffer> {
  const lower = ext.toLowerCase();
  if (RAW_EMBEDDED_JPEG_EXTS.has(lower)) return convertCr2(buffer);
  if (lower === "heic" || lower === "heif") return convertHeic(buffer);
  throw new Error(`convertToJpeg: unsupported format "${ext}"`);
}

// ---------------------------------------------------------------------------
// CR2 — extract the largest embedded JPEG from the Canon TIFF wrapper
// ---------------------------------------------------------------------------

function convertCr2(buffer: Buffer): Buffer {
  const jpeg = extractLargestJpeg(buffer);
  if (jpeg.length <= TARGET_BYTES) return jpeg;
  // Embedded preview > 2 MB is unusual but possible on high-res bodies.
  // Return it as-is rather than failing — better an oversized JPEG than an error.
  return jpeg;
}

/** Scans `buf` for all JPEG streams (SOI...EOI) and returns the largest one. */
function extractLargestJpeg(buf: Buffer): Buffer {
  const candidates: Buffer[] = [];
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf[i] !== 0xff || buf[i + 1] !== 0xd8 || buf[i + 2] !== 0xff) continue;
    const end = findJpegEnd(buf, i);
    if (end > i + 100) candidates.push(buf.slice(i, end));
  }
  if (candidates.length === 0) throw new Error("No embedded JPEG found in CR2 file");
  return candidates.reduce((best, c) => (c.length > best.length ? c : best));
}

/** Walk JPEG segments forward from `start` to find the EOI (0xFF 0xD9). */
function findJpegEnd(buf: Buffer, start: number): number {
  let i = start + 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd9) return i + 2;
    if (marker === 0x00 || marker === 0xd8) { i += 2; continue; }
    if (marker >= 0xd0 && marker <= 0xd7) { i += 2; continue; }
    if (i + 3 >= buf.length) break;
    const segLen = buf.readUInt16BE(i + 2);
    if (segLen < 2) break;
    i += 2 + segLen;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// HEIC — decode via libheif-js (WASM), encode as JPEG via @jsquash/jpeg
// ---------------------------------------------------------------------------

async function convertHeic(buffer: Buffer): Promise<Buffer> {
  const decode = await import("heic-decode");
  const { encode } = await import("@jsquash/jpeg");

  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const { data, width, height } = await decode.default(ab);

  const imageData = { data: new Uint8ClampedArray(data), width, height };

  for (const quality of [80, 72, 62, 50]) {
    const result = await encode(imageData as ImageData, { quality });
    if (result.byteLength <= TARGET_BYTES || quality === 50) {
      return Buffer.from(result);
    }
  }
  return Buffer.from(await encode(imageData as ImageData, { quality: 50 }));
}
