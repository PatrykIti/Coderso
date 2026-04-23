import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { media } from "../../db/schema";
import { readImageDimensions } from "./imageDimensions";
import { getMediaStorageAdapter } from "./storage";
import { getStorageSettingsInternal } from "../settings/storageSettings";
import type { StoredMedia, UploadFile } from "./storage/adapter";

export type MediaType = "image" | "file";

export type MediaMeta = {
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
};

export type UploadResult = {
  id: string;
  url: string;
  key: string;
};

type MediaConfig = {
  maxSizeBytes: number;
  allowedMime: string[];
};

const dimensionReadLimitBytes = 512 * 1024;

async function getConfig(): Promise<MediaConfig> {
  const settings = await getStorageSettingsInternal();
  const maxSizeBytes = settings.maxSizeBytes ?? 10 * 1024 * 1024;
  const allowedMime = settings.allowedMime.length
    ? settings.allowedMime
    : ["image/*", "application/pdf"];

  return { maxSizeBytes, allowedMime };
}

function isMimeAllowed(mimeType: string, allowed: string[]) {
  if (allowed.length === 0) return true;
  return allowed.some((rule) => {
    if (rule.endsWith("/*")) {
      return mimeType.startsWith(rule.replace("/*", "/"));
    }
    return rule === mimeType;
  });
}

function resolveMediaType(mimeType: string): MediaType {
  return mimeType.startsWith("image/") ? "image" : "file";
}

const toBuffer = async (file: UploadFile) => Buffer.from(await file.arrayBuffer());

const createBufferedUploadFile = (file: UploadFile, buffer: Buffer): UploadFile => ({
  ...file,
  size: buffer.byteLength,
  arrayBuffer: async () =>
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer,
});

const resolveUploadTitle = (fileName: string, title?: string | null) => {
  if (typeof title === "string" && title.trim().length > 0) return title;
  const fallback = fileName.trim();
  return fallback.length > 0 ? fallback : null;
};

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
  if (!mimeType.toLowerCase().startsWith("image/")) return null;
  return readImageDimensions(buffer);
};

export async function uploadMedia(
  file: UploadFile,
  meta: MediaMeta,
  userId?: string
): Promise<UploadResult> {
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

  return { id: row.id, url: row.url, key: row.key };
}

export async function listMedia() {
  return db.select().from(media).orderBy(desc(media.createdAt));
}

export async function getMediaById(id: string) {
  const [row] = await db.select().from(media).where(eq(media.id, id));
  return row ?? null;
}

export async function updateMedia(id: string, meta: MediaMeta) {
  const patch = buildMediaPatch(meta);
  if (Object.keys(patch).length === 0) {
    return getMediaById(id);
  }

  const [row] = await db
    .update(media)
    .set(patch)
    .where(eq(media.id, id))
    .returning();

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
