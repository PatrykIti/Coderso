import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { media } from "../../db/schema";
import { getMediaStorageAdapter } from "./storage";
import { getStorageSettingsInternal } from "../settings/storageSettings";
import type { UploadFile } from "./storage/adapter";

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

export async function uploadMedia(
  file: UploadFile,
  meta: MediaMeta,
  userId?: string
): Promise<UploadResult> {
  const config = await getConfig();

  if (file.size > config.maxSizeBytes) {
    throw new Error("media_file_too_large");
  }

  if (!isMimeAllowed(file.type, config.allowedMime)) {
    throw new Error("media_mime_not_allowed");
  }

  const adapter = await getMediaStorageAdapter();
  let stored: UploadResult;
  try {
    stored = await adapter.put(file);
  } catch {
    throw new Error("media_storage_unavailable");
  }

  const [row] = await db
    .insert(media)
    .values({
      key: stored.key,
      url: stored.url,
      type: resolveMediaType(file.type),
      mimeType: file.type,
      size: file.size,
      alt: meta.alt ?? null,
      title: meta.title ?? null,
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
  const [row] = await db
    .update(media)
    .set({
      alt: meta.alt ?? null,
      title: meta.title ?? null,
      caption: meta.caption ?? null,
    })
    .where(eq(media.id, id))
    .returning();

  return row ?? null;
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
