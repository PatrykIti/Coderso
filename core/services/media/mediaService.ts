import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { media, mediaFolders } from "../../db/schema";
import { readImageDimensions } from "./imageDimensions";
import { getMediaStorageAdapter } from "./storage";
import { getStorageSettingsInternal } from "../settings/storageSettings";
import { mimeMatchesAccept } from "../forms/mimeMatchesAccept";
import {
  CANONICAL_MEDIA_PROFILES,
  canonicalizeMediaBytes,
  isPassiveCanonicalMediaMime,
  type CanonicalMediaExtension,
  type CanonicalMediaIdentity,
  type CanonicalMediaMime,
} from "./mediaFileTrust";
import { resolveMediaKeyProjection, tryBuildAddressableMediaPath } from "./mediaUrlProjection";
import type { CanonicalStoredUpload, MediaStorageAdapter, UploadFile } from "./storage/adapter";

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
  maxSizeBytes: number | null | undefined;
  allowedMime: string[];
};

type MediaRecord = typeof media.$inferSelect;
type MediaInsert = typeof media.$inferInsert;
type MediaReplacePatch = Pick<
  MediaInsert,
  "key" | "url" | "originalName" | "type" | "mimeType" | "size" | "width" | "height" | "title"
>;

export type MediaServiceTestDeps = {
  loadConfig: () => Promise<MediaConfig>;
  resolveAdapter: () => Promise<MediaStorageAdapter>;
  insertMedia: (values: MediaInsert) => Promise<MediaRecord | null>;
  replaceMedia: (id: string, patch: MediaReplacePatch) => Promise<MediaRecord | null>;
};

const dimensionReadLimitBytes = 512 * 1024;
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_ALLOWED_MIME = ["image/*", "application/pdf"];
const MAX_MEDIA_DISPLAY_NAME_BYTES = 255;

const normalizeMimeType = (mimeType: unknown) => {
  if (typeof mimeType !== "string") return "";
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
};

async function loadMediaConfig(): Promise<MediaConfig> {
  const settings = await getStorageSettingsInternal();
  const allowedMime = settings.allowedMime.length ? settings.allowedMime : DEFAULT_ALLOWED_MIME;

  return { maxSizeBytes: settings.maxSizeBytes, allowedMime };
}

async function insertMediaRecord(values: MediaInsert): Promise<MediaRecord | null> {
  const [row] = await db.insert(media).values(values).returning();
  return row ?? null;
}

async function replaceMediaRecord(
  id: string,
  patch: MediaReplacePatch
): Promise<MediaRecord | null> {
  const [row] = await db.update(media).set(patch).where(eq(media.id, id)).returning();
  return row ?? null;
}

const defaultMediaServiceDeps: MediaServiceTestDeps = {
  loadConfig: loadMediaConfig,
  resolveAdapter: getMediaStorageAdapter,
  insertMedia: insertMediaRecord,
  replaceMedia: replaceMediaRecord,
};

let mediaServiceTestDeps: Partial<MediaServiceTestDeps> | null = null;

const getMediaServiceDeps = (): MediaServiceTestDeps => ({
  ...defaultMediaServiceDeps,
  ...(process.env.NODE_ENV === "production" ? {} : (mediaServiceTestDeps ?? {})),
});

export function __setMediaServiceDepsForTests(
  overrides: Partial<MediaServiceTestDeps> | null
): void {
  if (process.env.NODE_ENV === "production" && overrides !== null) {
    throw new Error("media_service_test_override_forbidden_in_production");
  }
  mediaServiceTestDeps = overrides === null ? null : { ...overrides };
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

function hasExactMimeRule(allowed: string[], mimeType: CanonicalMediaMime): boolean {
  return allowed.some((rule) => normalizeMimeType(rule) === mimeType);
}

function normalizeGlobalMaxSize(value: number | null | undefined): number {
  if (value === null || value === undefined) return DEFAULT_MAX_SIZE_BYTES;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("media_storage_unavailable");
  }
  return value;
}

function normalizeFieldMaxSize(value: number | undefined): number {
  if (value === undefined) return Number.POSITIVE_INFINITY;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("media_file_invalid");
  }
  return value;
}

function isForbiddenDisplayCodePoint(codePoint: number): boolean {
  return (
    codePoint < 0x20 ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
    codePoint === 0x061c ||
    codePoint === 0x200e ||
    codePoint === 0x200f ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  );
}

function truncateUtf8ByCodePoint(value: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  let result = "";
  let size = 0;
  for (const character of value) {
    const characterSize = encoder.encode(character).byteLength;
    if (size + characterSize > maxBytes) break;
    result += character;
    size += characterSize;
  }
  return result;
}

export function normalizeDisplayFileName(
  value: unknown,
  canonicalExtension: CanonicalMediaExtension
): string {
  const rawName = typeof value === "string" ? (value.split(/[\\/]/u).at(-1) ?? "") : "";
  const withoutUnsafe = Array.from(rawName)
    .filter((character) => !isForbiddenDisplayCodePoint(character.codePointAt(0)!))
    .join("")
    .normalize("NFC")
    .trim()
    .replace(/[.\s]+$/u, "");
  const bounded = truncateUtf8ByCodePoint(withoutUnsafe, MAX_MEDIA_DISPLAY_NAME_BYTES).replace(
    /[.\s]+$/u,
    ""
  );
  return bounded || `upload${canonicalExtension}`;
}

type PreparedCanonicalUpload = {
  buffer: Buffer;
  identity: CanonicalMediaIdentity;
  storageBytes: CanonicalStoredUpload["bytes"];
};

async function prepareCanonicalUpload(
  file: UploadFile,
  constraints: UploadConstraints | undefined,
  config: MediaConfig
): Promise<PreparedCanonicalUpload> {
  const globalMax = normalizeGlobalMaxSize(config.maxSizeBytes);
  const fieldMax = normalizeFieldMaxSize(constraints?.maxSizeBytes);
  const maxBytes = Math.min(globalMax, fieldMax);

  if (!Number.isSafeInteger(file.size) || file.size < 0) {
    throw new Error("media_file_invalid");
  }
  if (file.size > maxBytes) {
    throw new Error("media_file_too_large");
  }

  let materialized: unknown;
  try {
    materialized = await file.arrayBuffer();
  } catch {
    throw new Error("media_file_invalid");
  }
  if (!(materialized instanceof ArrayBuffer)) {
    throw new Error("media_file_invalid");
  }
  if (materialized.byteLength > maxBytes) {
    throw new Error("media_file_too_large");
  }

  const buffer = Buffer.from(materialized);
  const identity = canonicalizeMediaBytes(buffer);
  if (identity === null) {
    throw new Error("media_mime_not_allowed");
  }
  if (!isMimeAllowed(identity.mimeType, config.allowedMime)) {
    throw new Error("media_mime_not_allowed");
  }
  if (!mimeMatchesAccept(identity.mimeType, constraints?.allowedMime)) {
    throw new Error("media_mime_not_allowed");
  }
  if (identity.mimeType === "image/svg+xml" || identity.mimeType === "application/octet-stream") {
    if (!hasExactMimeRule(config.allowedMime, identity.mimeType)) {
      throw new Error("media_mime_not_allowed");
    }
    if (
      constraints !== undefined &&
      !hasExactMimeRule(constraints.allowedMime ?? [], identity.mimeType)
    ) {
      throw new Error("media_mime_not_allowed");
    }
  }

  return {
    buffer,
    identity,
    storageBytes: {
      size: buffer.byteLength,
      arrayBuffer: async () =>
        buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        ) as ArrayBuffer,
    },
  };
}

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

const extractDimensionsForCanonicalFile = (mimeType: CanonicalMediaMime, buffer: Buffer) => {
  if (!isPassiveCanonicalMediaMime(mimeType)) return null;
  return readImageDimensions(buffer);
};

export type UploadConstraints = {
  allowedMime?: string[];
  maxSizeBytes?: number;
  /** @deprecated Byte canonicalization is unconditional; retained until TASK-536-04-L01. */
  sniffContent?: boolean;
};

function toMediaDomainRow<T extends { id: string; key: string; url: string }>(row: T): T {
  return {
    ...row,
    url: resolveMediaKeyProjection(row).url,
  };
}

function resolvePassiveCanonicalMime(mimeType: string): CanonicalMediaMime | null {
  if (!Object.hasOwn(CANONICAL_MEDIA_PROFILES, mimeType)) return null;
  const canonicalMime = mimeType as CanonicalMediaMime;
  return isPassiveCanonicalMediaMime(canonicalMime) ? canonicalMime : null;
}

async function resolveMediaConfig(deps: MediaServiceTestDeps): Promise<MediaConfig> {
  try {
    return await deps.loadConfig();
  } catch {
    throw new Error("media_storage_unavailable");
  }
}

async function bestEffortDelete(adapter: MediaStorageAdapter, key: string): Promise<void> {
  try {
    await adapter.delete(key);
  } catch {
    // The primary write outcome remains authoritative; maintenance can retry cleanup.
  }
}

async function storeCanonicalUpload(
  deps: MediaServiceTestDeps,
  prepared: PreparedCanonicalUpload,
  displayName: string
): Promise<{ adapter: MediaStorageAdapter; key: string; url: string }> {
  let adapter: MediaStorageAdapter;
  let stored: Awaited<ReturnType<MediaStorageAdapter["putMedia"]>>;
  try {
    adapter = await deps.resolveAdapter();
    stored = await adapter.putMedia({
      bytes: prepared.storageBytes,
      identity: prepared.identity,
      downloadName: displayName,
    });
  } catch {
    throw new Error("media_storage_unavailable");
  }

  const url = tryBuildAddressableMediaPath(stored.key);
  if (url === null) {
    throw new Error("media_storage_unavailable");
  }
  return { adapter, key: stored.key, url };
}

export type MediaDeliveryRecord = {
  key: string;
  mimeType: string;
  originalName: string | null;
  size: number;
};

export async function getMediaDeliveryRecordByKey(
  key: string
): Promise<MediaDeliveryRecord | null> {
  const [row] = await db
    .select({
      key: media.key,
      mimeType: media.mimeType,
      originalName: media.originalName,
      size: media.size,
    })
    .from(media)
    .where(eq(media.key, key))
    .limit(1);
  return row ?? null;
}

export async function uploadMedia(
  file: UploadFile,
  meta: MediaMeta,
  userId?: string,
  constraints?: UploadConstraints
) {
  const deps = getMediaServiceDeps();
  const config = await resolveMediaConfig(deps);
  const prepared = await prepareCanonicalUpload(file, constraints, config);
  const displayName = normalizeDisplayFileName(file.name, prepared.identity.extension);
  const passive = isPassiveCanonicalMediaMime(prepared.identity.mimeType);
  const dimensions = passive
    ? extractDimensionsForCanonicalFile(prepared.identity.mimeType, prepared.buffer)
    : null;
  const { adapter, key, url } = await storeCanonicalUpload(deps, prepared, displayName);

  let row: MediaRecord | null;
  try {
    row = await deps.insertMedia({
      key,
      url,
      originalName: displayName,
      type: passive ? "image" : "file",
      mimeType: prepared.identity.mimeType,
      size: prepared.buffer.byteLength,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      alt: meta.alt ?? null,
      title: resolveUploadTitle(displayName, meta.title),
      caption: meta.caption ?? null,
      createdBy: userId,
    });
  } catch {
    await bestEffortDelete(adapter, key);
    throw new Error("media_storage_unavailable");
  }
  if (!row) {
    await bestEffortDelete(adapter, key);
    throw new Error("media_storage_unavailable");
  }

  return toMediaDomainRow(row);
}

export async function listMedia() {
  const rows = await db.select().from(media).orderBy(desc(media.createdAt));
  return rows.map(toMediaDomainRow);
}

export async function getMediaById(id: string) {
  const [row] = await db.select().from(media).where(eq(media.id, id));
  return row ? toMediaDomainRow(row) : null;
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

  return row ? toMediaDomainRow(row) : null;
}

export async function recoverMediaDimensions(id: string) {
  const row = await getMediaById(id);
  if (!row) throw new Error("media_not_found");
  const passiveMime = resolvePassiveCanonicalMime(row.mimeType);
  const projection = resolveMediaKeyProjection(row);
  if (!passiveMime || !projection.addressable) return row;
  if (row.width && row.height) return row;

  const deps = getMediaServiceDeps();
  let buffer: Buffer;
  try {
    const adapter = await deps.resolveAdapter();
    const stream = await adapter.get(row.key);
    buffer = await readStreamPrefix(stream);
  } catch {
    throw new Error("media_storage_unavailable");
  }

  const dimensions = extractDimensionsForCanonicalFile(passiveMime, buffer);
  if (!dimensions) return row;

  const [updated] = await db
    .update(media)
    .set({
      width: dimensions.width,
      height: dimensions.height,
    })
    .where(eq(media.id, id))
    .returning();

  return toMediaDomainRow(updated ?? row);
}

export async function replaceMedia(id: string, file: UploadFile) {
  const existing = await getMediaById(id);
  if (!existing) throw new Error("media_not_found");

  const deps = getMediaServiceDeps();
  const config = await resolveMediaConfig(deps);
  const prepared = await prepareCanonicalUpload(file, undefined, config);
  const displayName = normalizeDisplayFileName(file.name, prepared.identity.extension);
  const passive = isPassiveCanonicalMediaMime(prepared.identity.mimeType);
  const dimensions = passive
    ? extractDimensionsForCanonicalFile(prepared.identity.mimeType, prepared.buffer)
    : null;
  const { adapter, key, url } = await storeCanonicalUpload(deps, prepared, displayName);
  const patch: MediaReplacePatch = {
    key,
    url,
    originalName: displayName,
    type: passive ? "image" : "file",
    mimeType: prepared.identity.mimeType,
    size: prepared.buffer.byteLength,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    title:
      existing.title && existing.title.trim().length > 0
        ? existing.title
        : resolveUploadTitle(displayName, null),
  };

  let updated: MediaRecord | null;
  try {
    updated = await deps.replaceMedia(id, patch);
  } catch {
    await bestEffortDelete(adapter, key);
    throw new Error("media_storage_unavailable");
  }
  if (!updated) {
    await bestEffortDelete(adapter, key);
    throw new Error("media_not_found");
  }

  const oldProjection = resolveMediaKeyProjection(existing);
  if (oldProjection.addressable && existing.key !== key) {
    await bestEffortDelete(adapter, existing.key);
  }

  return toMediaDomainRow(updated);
}

export async function deleteMedia(id: string) {
  const row = await getMediaById(id);
  if (!row) throw new Error("media_not_found");

  const projection = resolveMediaKeyProjection(row);
  if (projection.addressable) {
    try {
      const adapter = await getMediaServiceDeps().resolveAdapter();
      await adapter.delete(row.key);
    } catch {
      throw new Error("media_storage_unavailable");
    }
  }

  await db.delete(media).where(eq(media.id, id));
  return { ok: true };
}
