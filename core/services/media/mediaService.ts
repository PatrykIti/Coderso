import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { media, mediaFolders } from "../../db/schema";
import { readImageDimensions } from "./imageDimensions";
import { getMediaStorageAdapter } from "./storage";
import { getStorageSettingsInternal } from "../settings/storageSettings";
import { mimeMatchesAccept } from "../forms/mimeMatchesAccept";
import type { StoredMedia, UploadFile } from "./storage/adapter";

export type MediaType = "image" | "file";

export type MediaMeta = {
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  credit?: string | null;
  folderId?: string | null;
  tags?: string[]; // NOT nullable — column is NOT NULL DEFAULT '[]' (512-01)
  focalX?: number | null;
  focalY?: number | null;
};

const MAX_TAGS = 30;
const MAX_TAG_LEN = 40;
const MAX_DESC = 2000;
const MAX_CREDIT = 300;

type MediaConfig = {
  maxSizeBytes: number;
  allowedMime: string[];
};

const dimensionReadLimitBytes = 512 * 1024;

const normalizeMimeType = (mimeType: unknown) => {
  if (typeof mimeType !== "string") return "";
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
};

async function getConfig(): Promise<MediaConfig> {
  const settings = await getStorageSettingsInternal();
  const maxSizeBytes = settings.maxSizeBytes ?? 10 * 1024 * 1024;
  const allowedMime = settings.allowedMime.length
    ? settings.allowedMime
    : ["image/*", "application/pdf"];

  return { maxSizeBytes, allowedMime };
}

function isMimeAllowed(mimeType: string, allowed: string[]) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  if (!normalizedMimeType) return false;
  if (allowed.length === 0) return true;
  return allowed.some((rule) => {
    const normalizedRule = normalizeMimeType(rule);
    if (!normalizedRule) return false;
    if (normalizedRule.endsWith("/*")) {
      return normalizedMimeType.startsWith(normalizedRule.replace("/*", "/"));
    }
    return normalizedRule === normalizedMimeType;
  });
}

function resolveMediaType(mimeType: string): MediaType {
  return normalizeMimeType(mimeType).startsWith("image/") ? "image" : "file";
}

const toBuffer = async (file: UploadFile) => Buffer.from(await file.arrayBuffer());

const createBufferedUploadFile = (file: UploadFile, buffer: Buffer): UploadFile => ({
  name: file.name,
  type: normalizeMimeType(file.type),
  size: buffer.byteLength,
  arrayBuffer: async () =>
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
});

const resolveUploadTitle = (fileName: string, title?: string | null) => {
  if (typeof title === "string" && title.trim().length > 0) return title;
  const fallback = fileName.trim();
  return fallback.length > 0 ? fallback : null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const capText = (value: unknown, max: number): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("media_text_invalid");
  return value.slice(0, max);
};

const normalizeFocal = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("media_focal_invalid");
  }
  return Math.min(1, Math.max(0, value));
};

const normalizeTags = (value: unknown): string[] => {
  // Column is NOT NULL DEFAULT '[]' — always resolve to an array, never null.
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("media_tags_invalid");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim().slice(0, MAX_TAG_LEN);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
};

/**
 * Logically PURE — no DB call. Clamps/sanitizes ONLY the keys present on `meta`
 * (subset invariant: never injects a default for an absent key, so present-only /
 * byte-identity gating in `buildMediaPatch` stays correct). The folder-existence
 * check is deferred to `updateMedia` (DB); here folderId is only format-validated.
 */
export function normalizeMediaMeta(meta: MediaMeta): MediaMeta {
  const out: MediaMeta = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(meta, key);

  if (has("alt")) out.alt = meta.alt ?? null;
  if (has("title")) out.title = meta.title ?? null;
  if (has("caption")) out.caption = meta.caption ?? null;
  if (has("description")) out.description = capText(meta.description, MAX_DESC);
  if (has("credit")) out.credit = capText(meta.credit, MAX_CREDIT);
  if (has("folderId")) {
    const folderId = meta.folderId ?? null;
    if (folderId !== null && (typeof folderId !== "string" || !UUID_RE.test(folderId))) {
      throw new Error("media_folder_not_found");
    }
    out.folderId = folderId;
  }
  if (has("tags")) out.tags = normalizeTags(meta.tags);
  if (has("focalX")) out.focalX = normalizeFocal(meta.focalX);
  if (has("focalY")) out.focalY = normalizeFocal(meta.focalY);

  return out;
}

const buildMediaPatch = (meta: MediaMeta) => {
  const patch: MediaMeta = {};
  if (Object.prototype.hasOwnProperty.call(meta, "alt")) {
    patch.alt = meta.alt ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(meta, "title")) {
    patch.title = meta.title ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(meta, "caption")) {
    patch.caption = meta.caption ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(meta, "description")) {
    patch.description = meta.description ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(meta, "credit")) {
    patch.credit = meta.credit ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(meta, "folderId")) {
    patch.folderId = meta.folderId ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(meta, "tags")) {
    // NOT-NULL column — assign the normalized array directly, NEVER `?? null`.
    patch.tags = meta.tags ?? [];
  }
  if (Object.prototype.hasOwnProperty.call(meta, "focalX")) {
    patch.focalX = meta.focalX ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(meta, "focalY")) {
    patch.focalY = meta.focalY ?? null;
  }
  return patch;
};

const readStreamPrefix = async (
  stream: NodeJS.ReadableStream,
  limitBytes = dimensionReadLimitBytes
) => {
  const chunks: Buffer[] = [];
  let total = 0;

  try {
    for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array | string>) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const remaining = limitBytes - total;
      if (remaining <= 0) break;
      chunks.push(buffer.byteLength > remaining ? buffer.subarray(0, remaining) : buffer);
      total += Math.min(buffer.byteLength, remaining);
      if (total >= limitBytes) break;
    }
  } finally {
    const destroy = (stream as { destroy?: () => void }).destroy;
    destroy?.call(stream);
  }

  return Buffer.concat(chunks, total);
};

const extractDimensionsForFile = (mimeType: string, buffer: Buffer) => {
  if (!normalizeMimeType(mimeType).startsWith("image/")) return null;
  return readImageDimensions(buffer);
};

// Bounded scan for markup/script openers that turn an INLINE-served file into a
// stored-XSS vector (SVG/HTML/XML). Skips a leading BOM + whitespace.
const looksLikeMarkup = (buffer: Buffer): boolean => {
  const head = buffer
    .subarray(0, 1024)
    .toString("utf8")
    .replace(/^[\uFEFF\s]+/, "")
    .toLowerCase();
  return (
    head.startsWith("<?xml") ||
    head.startsWith("<svg") ||
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.startsWith("<!--") ||
    head.includes("<script")
  );
};

type SniffedKind = "png" | "jpeg" | "gif" | "webp" | "bmp" | "pdf" | "unknown";

// Magic-byte sniff of the ACTUAL uploaded bytes (never the declared Content-Type).
const sniffBinaryKind = (buffer: Buffer): SniffedKind => {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }
  if (buffer.length >= 6) {
    const sig = buffer.subarray(0, 6).toString("latin1");
    if (sig === "GIF87a" || sig === "GIF89a") return "gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "webp";
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) return "bmp";
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  return "unknown";
};

const kindMatchesMime = (kind: SniffedKind, mime: string): boolean => {
  switch (kind) {
    case "png":
      return mime === "image/png";
    case "jpeg":
      return mime === "image/jpeg" || mime === "image/jpg" || mime === "image/pjpeg";
    case "gif":
      return mime === "image/gif";
    case "webp":
      return mime === "image/webp";
    case "bmp":
      return mime === "image/bmp" || mime === "image/x-ms-bmp";
    case "pdf":
      return mime === "application/pdf";
    default:
      return false;
  }
};

/**
 * Content sniffing for the UNTRUSTED public path (anonymous form uploads). The
 * declared Content-Type is caller-supplied and MUST NOT be trusted: a spoofed
 * `image/svg+xml`/`image/png` header on an SVG/HTML-with-script payload would pass
 * the declared-type allowlist and then be served inline (stored XSS). This:
 *   (1) rejects markup/script-bearing content outright,
 *   (2) rejects script-capable DECLARED types (svg/html/xml/text/*, `*+xml`),
 *   (3) requires a declared image/pdf to MATCH its magic bytes.
 * Non-sniffable declared types (e.g. zip-based office docs) are allowed only when
 * the content is not markup — the declared-type allowlist still bounds those.
 */
const assertSafePublicContent = (buffer: Buffer, declaredMime: string) => {
  if (looksLikeMarkup(buffer)) throw new Error("media_mime_not_allowed");
  const mime = normalizeMimeType(declaredMime);
  if (
    mime === "image/svg+xml" ||
    mime === "text/html" ||
    mime === "text/xml" ||
    mime === "application/xml" ||
    mime === "application/xhtml+xml" ||
    mime.startsWith("text/") ||
    mime.endsWith("+xml")
  ) {
    throw new Error("media_mime_not_allowed");
  }
  const kind = sniffBinaryKind(buffer);
  if (mime.startsWith("image/")) {
    if (kind === "unknown" || !kindMatchesMime(kind, mime)) {
      throw new Error("media_mime_not_allowed");
    }
  } else if (mime === "application/pdf") {
    if (kind !== "pdf") throw new Error("media_mime_not_allowed");
  }
};

export type UploadConstraints = {
  allowedMime?: string[];
  maxSizeBytes?: number;
  // Set on the anonymous public form-upload path: sniff the ACTUAL bytes and reject
  // markup/spoofed content (see assertSafePublicContent). Admin uploads leave this
  // unset (they are already `media:write`-gated and may legitimately store SVGs).
  sniffContent?: boolean;
};

export async function uploadMedia(
  file: UploadFile,
  meta: MediaMeta,
  userId?: string,
  constraints?: UploadConstraints
) {
  const config = await getConfig();

  const buffer = await toBuffer(file);
  const bufferedFile = createBufferedUploadFile(file, buffer);

  // Effective size cap = tighter of global and field (min); undefined field ⇒ global.
  const maxSizeBytes = Math.min(config.maxSizeBytes, constraints?.maxSizeBytes ?? Infinity);
  if (bufferedFile.size > maxSizeBytes) {
    throw new Error("media_file_too_large");
  }

  // AND the two checks on the ACTUAL uploaded mime — never intersect the two allowlists
  // (a wildcard-vs-concrete intersection collapses to allow-all/reject-all; see 516-07).
  if (!isMimeAllowed(bufferedFile.type, config.allowedMime)) {
    throw new Error("media_mime_not_allowed");
  }
  if (!mimeMatchesAccept(bufferedFile.type, constraints?.allowedMime)) {
    throw new Error("media_mime_not_allowed");
  }

  // Untrusted anonymous path: the declared Content-Type is not trustworthy — sniff
  // the actual bytes and reject spoofed/markup (SVG/HTML) payloads before storing.
  if (constraints?.sniffContent) {
    assertSafePublicContent(buffer, bufferedFile.type);
  }

  const dimensions = extractDimensionsForFile(bufferedFile.type, buffer);
  const adapter = await getMediaStorageAdapter();
  let stored: StoredMedia;
  try {
    stored = await adapter.put(bufferedFile);
  } catch {
    throw new Error("media_storage_unavailable");
  }

  const [row] = await db
    .insert(media)
    .values({
      key: stored.key,
      url: stored.url,
      originalName: bufferedFile.name,
      type: resolveMediaType(bufferedFile.type),
      mimeType: bufferedFile.type,
      size: bufferedFile.size,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      alt: meta.alt ?? null,
      title: resolveUploadTitle(bufferedFile.name, meta.title),
      caption: meta.caption ?? null,
      createdBy: userId,
    })
    .returning();

  return row;
}

export async function listMedia() {
  return db.select().from(media).orderBy(desc(media.createdAt));
}

export async function getMediaById(id: string) {
  const [row] = await db.select().from(media).where(eq(media.id, id));
  return row ?? null;
}

export async function updateMedia(id: string, meta: MediaMeta) {
  const normalized = normalizeMediaMeta(meta);

  const folderId = normalized.folderId;
  if (
    Object.prototype.hasOwnProperty.call(normalized, "folderId") &&
    typeof folderId === "string"
  ) {
    const [folder] = await db
      .select({ id: mediaFolders.id })
      .from(mediaFolders)
      .where(eq(mediaFolders.id, folderId));
    if (!folder) throw new Error("media_folder_not_found");
  }

  const patch = buildMediaPatch(normalized);
  if (Object.keys(patch).length === 0) {
    return getMediaById(id);
  }

  const [row] = await db.update(media).set(patch).where(eq(media.id, id)).returning();

  return row ?? null;
}

export async function recoverMediaDimensions(id: string) {
  const row = await getMediaById(id);
  if (!row) throw new Error("media_not_found");
  if (row.type !== "image" && !row.mimeType.toLowerCase().startsWith("image/")) {
    return row;
  }
  if (row.width && row.height) return row;

  const adapter = await getMediaStorageAdapter();
  let buffer: Buffer;
  try {
    const stream = await adapter.get(row.key);
    buffer = await readStreamPrefix(stream);
  } catch {
    throw new Error("media_storage_unavailable");
  }

  const dimensions = extractDimensionsForFile(row.mimeType, buffer);
  if (!dimensions) return row;

  const [updated] = await db
    .update(media)
    .set({
      width: dimensions.width,
      height: dimensions.height,
    })
    .where(eq(media.id, id))
    .returning();

  return updated ?? row;
}

export async function replaceMedia(id: string, file: UploadFile) {
  const existing = await getMediaById(id);
  if (!existing) throw new Error("media_not_found");

  const config = await getConfig();
  const buffer = await toBuffer(file);
  const bufferedFile = createBufferedUploadFile(file, buffer);

  if (bufferedFile.size > config.maxSizeBytes) {
    throw new Error("media_file_too_large");
  }

  if (!isMimeAllowed(bufferedFile.type, config.allowedMime)) {
    throw new Error("media_mime_not_allowed");
  }

  const dimensions = extractDimensionsForFile(bufferedFile.type, buffer);
  const adapter = await getMediaStorageAdapter();
  let stored: StoredMedia;
  try {
    stored = await adapter.put(bufferedFile);
  } catch {
    throw new Error("media_storage_unavailable");
  }

  const [updated] = await db
    .update(media)
    .set({
      key: stored.key,
      url: stored.url,
      originalName: bufferedFile.name,
      type: resolveMediaType(bufferedFile.type),
      mimeType: bufferedFile.type,
      size: bufferedFile.size,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      title:
        existing.title && existing.title.trim().length > 0
          ? existing.title
          : resolveUploadTitle(bufferedFile.name, null),
    })
    .where(eq(media.id, id))
    .returning();

  if (!updated) throw new Error("media_not_found");

  try {
    await adapter.delete(existing.key);
  } catch {
    // Replacement already succeeded; stale object cleanup can be retried by storage maintenance.
  }

  return updated;
}

export async function deleteMedia(id: string) {
  const row = await getMediaById(id);
  if (!row) throw new Error("media_not_found");

  const adapter = await getMediaStorageAdapter();
  try {
    await adapter.delete(row.key);
  } catch {
    throw new Error("media_storage_unavailable");
  }

  await db.delete(media).where(eq(media.id, id));
  return { ok: true };
}
