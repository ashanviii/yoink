import "server-only";

/**
 * Reads a video's length from its container header. Some extractors (Instagram)
 * don't report a duration, which would hide trim and frame extraction. Only a
 * few KB of the file are fetched; nothing is decoded.
 */

const TIMEOUT_MS = 10_000;
const CHUNK = 64 * 1024;
const MAX_MOOV_BYTES = 8 * 1024 * 1024;
const MAX_FETCHES = 4;

async function fetchRange(url: string, headers: Record<string, string>, start: number, length: number): Promise<Uint8Array | null> {
  const response = await fetch(url, {
    headers: { ...headers, Range: `bytes=${start}-${start + length - 1}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    await response.body?.cancel();
    return null;
  }
  // A server that ignores Range sends the whole file; read only what we asked for.
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < length) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => undefined);
  const out = new Uint8Array(Math.min(size, length));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk.subarray(0, out.length - offset), offset);
    offset += chunk.length;
    if (offset >= out.length) break;
  }
  return response.status === 206 || start === 0 ? out : null;
}

interface Box {
  type: string;
  /** Offset of the payload within the buffer. */
  start: number;
  /** Total box size including the header (Infinity = to end of file). */
  size: number;
  header: number;
}

function readBox(view: DataView, offset: number): Box | null {
  if (offset + 8 > view.byteLength) return null;
  let size = view.getUint32(offset);
  const type = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset + 4, 4));
  let header = 8;
  if (size === 1) {
    if (offset + 16 > view.byteLength) return null;
    size = Number(view.getBigUint64(offset + 8));
    header = 16;
  } else if (size === 0) {
    size = Infinity;
  }
  if (size < header) return null;
  return { type, start: offset + header, size, header };
}

function children(view: DataView, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  for (let offset = start; offset < end; ) {
    const box = readBox(view, offset);
    if (!box) break;
    boxes.push(box);
    if (!Number.isFinite(box.size)) break;
    offset += box.size;
  }
  return boxes;
}

const u64 = (view: DataView, offset: number) => Number(view.getBigUint64(offset));

/** Duration from a complete moov box: mvhd, or mvex/mehd for fragmented files. */
function moovDuration(view: DataView, moov: Box): number | null {
  const end = Math.min(view.byteLength, moov.start - moov.header + moov.size);
  const boxes = children(view, moov.start, end);
  const mvhd = boxes.find((b) => b.type === "mvhd");
  if (!mvhd || mvhd.start + 32 > view.byteLength) return null;
  const v1 = view.getUint8(mvhd.start) === 1;
  const timescale = view.getUint32(mvhd.start + (v1 ? 20 : 12));
  const duration = v1 ? u64(view, mvhd.start + 24) : view.getUint32(mvhd.start + 16);
  if (!timescale) return null;
  if (duration > 0 && duration !== 0xffffffff) return duration / timescale;

  const mvex = boxes.find((b) => b.type === "mvex");
  const mehd = mvex && children(view, mvex.start, Math.min(end, mvex.start - mvex.header + mvex.size)).find((b) => b.type === "mehd");
  if (!mehd || mehd.start + 12 > view.byteLength) return null;
  const fragment = view.getUint8(mehd.start) === 1 ? u64(view, mehd.start + 4) : view.getUint32(mehd.start + 4);
  return fragment > 0 ? fragment / timescale : null;
}

/** Duration from a segment index (DASH-style fragmented MP4). */
function sidxDuration(view: DataView, sidx: Box): number | null {
  let p = sidx.start;
  if (p + 12 > view.byteLength) return null;
  const v1 = view.getUint8(p) === 1;
  const timescale = view.getUint32(p + 8);
  p += 12 + (v1 ? 16 : 8) + 2;
  if (!timescale || p + 2 > view.byteLength) return null;
  const count = view.getUint16(p);
  p += 2;
  let total = 0;
  for (let i = 0; i < count && p + 12 <= view.byteLength; i++, p += 12) total += view.getUint32(p + 4);
  return total > 0 ? total / timescale : null;
}

async function mp4Duration(url: string, headers: Record<string, string>): Promise<number | null> {
  let base = 0;
  let buffer = await fetchRange(url, headers, 0, CHUNK);
  let fallback: number | null = null;
  for (let fetches = 1; buffer && buffer.length >= 8; ) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const boxes = children(view, 0, view.byteLength);
    const end = (box: Box) => box.start - box.header + box.size;
    // A fragmented file's segment index usually follows its (duration-less) moov.
    for (const box of boxes) if (box.type === "sidx") fallback ??= sidxDuration(view, box);

    const moov = boxes.find((box) => box.type === "moov");
    if (moov) {
      if (end(moov) <= view.byteLength) return moovDuration(view, moov) ?? fallback;
      // moov runs past what we have: fetch exactly it.
      if (moov.size > MAX_MOOV_BYTES || fetches >= MAX_FETCHES) return fallback;
      const whole = await fetchRange(url, headers, base + moov.start - moov.header, moov.size);
      if (!whole || whole.length < moov.size) return fallback;
      const wholeView = new DataView(whole.buffer, whole.byteOffset, whole.byteLength);
      const box = readBox(wholeView, 0);
      return (box && moovDuration(wholeView, box)) ?? fallback;
    }

    // No moov yet (e.g. mdat comes first): jump past the last box we can see.
    const last = boxes.at(-1);
    if (!last || !Number.isFinite(last.size) || fetches >= MAX_FETCHES) return fallback;
    if (end(last) <= view.byteLength && buffer.length < CHUNK) return fallback; // end of file
    base += end(last);
    buffer = await fetchRange(url, headers, base, CHUNK);
    fetches += 1;
  }
  return fallback;
}

async function playlistDuration(url: string, headers: Record<string, string>, depth = 0): Promise<number | null> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) return null;
  const text = (await response.text()).slice(0, 2 * 1024 * 1024);
  const variant = /#EXT-X-STREAM-INF[^\n]*\n\s*([^#\s][^\n]*)/.exec(text)?.[1]?.trim();
  if (variant) return depth < 1 ? playlistDuration(new URL(variant, response.url || url).toString(), headers, depth + 1) : null;
  let total = 0;
  for (const match of text.matchAll(/#EXTINF:\s*([\d.]+)/g)) total += Number(match[1]) || 0;
  return total > 0 ? total : null;
}

/** False only when the CDN answered with an error; network failures and timeouts count as reachable. */
export async function probeReachable(url: string, headers: Record<string, string>): Promise<boolean> {
  try {
    const response = await fetch(url, { headers: { ...headers, Range: "bytes=0-0" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    await response.body?.cancel();
    return response.ok;
  } catch {
    return true;
  }
}

export async function probeDuration(url: string, headers: Record<string, string>, hls: boolean): Promise<number | null> {
  if (!/^https:\/\//i.test(url)) return null;
  try {
    const sec = hls ? await playlistDuration(url, headers) : await mp4Duration(url, headers);
    return sec && Number.isFinite(sec) && sec > 0 ? sec : null;
  } catch {
    return null;
  }
}
