/**
 * Pure-JS image dimension reader — reads just enough of each format's header
 * to get width/height, no native binary (avoids the sharp/Turbopack-on-Windows
 * junction-point crash entirely). Formats without a cheap parser (TIFF) fall
 * back to 0x0, which classifyAspect() turns into "custom" — the image still
 * uploads and displays fine, it just skips aspect-ratio bucketing.
 */
export function readDimensions(buffer: Buffer, ext: string): { width: number; height: number } {
  try {
    switch (ext.toLowerCase()) {
      case "png":
        return readPng(buffer);
      case "jpg":
      case "jpeg":
        return readJpeg(buffer);
      case "gif":
        return readGif(buffer);
      case "webp":
        return readWebp(buffer);
      case "avif":
        return readAvif(buffer);
      case "svg":
        return readSvg(buffer.toString("utf-8"));
      default:
        return { width: 0, height: 0 };
    }
  } catch {
    return { width: 0, height: 0 };
  }
}

function readPng(buf: Buffer) {
  if (buf.length < 24) return { width: 0, height: 0 };
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readGif(buf: Buffer) {
  if (buf.length < 10) return { width: 0, height: 0 };
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function readJpeg(buf: Buffer) {
  let offset = 2; // skip SOI marker 0xFFD8
  while (offset < buf.length - 1) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15 carry dimensions; C4/C8/CC are not SOF markers
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const segmentLength = buf.readUInt16BE(offset + 2);
    offset += 2 + segmentLength;
  }
  return { width: 0, height: 0 };
}

function readWebp(buf: Buffer) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") {
    return { width: 0, height: 0 };
  }
  const fourCc = buf.toString("ascii", 12, 16);
  if (fourCc === "VP8X") {
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }
  if (fourCc === "VP8L") {
    // 1-byte signature (0x2F) then 4 bytes packing 14-bit width-1 / 14-bit height-1
    const b0 = buf[21];
    const b1 = buf[22];
    const b2 = buf[23];
    const b3 = buf[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  }
  if (fourCc === "VP8 ") {
    // Search for the 3-byte start code 0x9d 0x01 0x2a, dims follow as two LE uint16 (14 bits + 2-bit scale)
    for (let i = 20; i < Math.min(buf.length - 6, 60); i++) {
      if (buf[i] === 0x9d && buf[i + 1] === 0x01 && buf[i + 2] === 0x2a) {
        const width = buf.readUInt16LE(i + 3) & 0x3fff;
        const height = buf.readUInt16LE(i + 5) & 0x3fff;
        return { width, height };
      }
    }
  }
  return { width: 0, height: 0 };
}

/** Minimal ISOBMFF box walker — finds meta/iprp/ipco/ispe for AVIF dimensions. */
function readAvif(buf: Buffer) {
  function findBox(start: number, end: number, name: string): { start: number; end: number } | null {
    let offset = start;
    while (offset + 8 <= end) {
      const size = buf.readUInt32BE(offset);
      const type = buf.toString("ascii", offset + 4, offset + 8);
      const boxEnd = size === 0 ? end : offset + size;
      if (type === name) return { start: offset + 8, end: boxEnd };
      if (size <= 0) break;
      offset = boxEnd;
    }
    return null;
  }
  const meta = findBox(0, buf.length, "meta");
  if (!meta) return { width: 0, height: 0 };
  const iprp = findBox(meta.start + 4, meta.end, "iprp"); // +4 skips meta's version/flags
  if (!iprp) return { width: 0, height: 0 };
  const ipco = findBox(iprp.start, iprp.end, "ipco");
  if (!ipco) return { width: 0, height: 0 };
  const ispe = findBox(ipco.start, ipco.end, "ispe");
  if (!ispe) return { width: 0, height: 0 };
  return { width: buf.readUInt32BE(ispe.start + 4), height: buf.readUInt32BE(ispe.start + 8) };
}

function readSvg(text: string) {
  const widthAttr = text.match(/width=["']([\d.]+)/i);
  const heightAttr = text.match(/height=["']([\d.]+)/i);
  if (widthAttr && heightAttr) {
    return { width: Math.round(Number(widthAttr[1])), height: Math.round(Number(heightAttr[1])) };
  }
  const viewBox = text.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/i);
  if (viewBox) return { width: Math.round(Number(viewBox[1])), height: Math.round(Number(viewBox[2])) };
  return { width: 0, height: 0 };
}
