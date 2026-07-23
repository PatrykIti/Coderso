import { randomUUID } from "node:crypto";

import {
  CANONICAL_MEDIA_PROFILES,
  buildMediaDeliveryPath,
  type CanonicalMediaIdentity,
  type CanonicalMediaMime,
} from "../mediaFileTrust";

export type UploadFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type StoredMedia = {
  key: string;
  url: string;
};

export type CanonicalStoredUpload = Readonly<{
  bytes: Pick<UploadFile, "size" | "arrayBuffer">;
  identity: CanonicalMediaIdentity;
  downloadName: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertCanonicalMediaIdentity(
  identity: CanonicalMediaIdentity
): asserts identity is CanonicalMediaIdentity {
  if (
    !isRecord(identity) ||
    !Object.hasOwn(identity, "mimeType") ||
    !Object.hasOwn(identity, "extension") ||
    !Object.hasOwn(identity, "delivery")
  ) {
    throw new Error("media_identity_invalid");
  }

  const mimeType = identity.mimeType;
  if (typeof mimeType !== "string" || !Object.hasOwn(CANONICAL_MEDIA_PROFILES, mimeType)) {
    throw new Error("media_identity_invalid");
  }

  const profile = CANONICAL_MEDIA_PROFILES[mimeType as CanonicalMediaMime];
  if (identity.extension !== profile.extension || identity.delivery !== profile.delivery) {
    throw new Error("media_identity_invalid");
  }
}

export function assertCanonicalStoredUpload(
  upload: CanonicalStoredUpload
): asserts upload is CanonicalStoredUpload {
  if (!isRecord(upload) || !isRecord(upload.identity) || !isRecord(upload.bytes)) {
    throw new Error("media_identity_invalid");
  }

  assertCanonicalMediaIdentity(upload.identity);
  if (
    typeof upload.bytes.arrayBuffer !== "function" ||
    typeof upload.bytes.size !== "number" ||
    !Number.isSafeInteger(upload.bytes.size) ||
    upload.bytes.size < 0 ||
    typeof upload.downloadName !== "string"
  ) {
    throw new Error("media_identity_invalid");
  }
}

export function assertCanonicalStorageKey(key: string): void {
  try {
    buildMediaDeliveryPath(key);
  } catch {
    throw new Error("media_identity_invalid");
  }
}

export function buildCanonicalStorageKey(identity: CanonicalMediaIdentity): string {
  assertCanonicalMediaIdentity(identity);
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const key = `${yyyy}/${mm}/${randomUUID()}${identity.extension}`;
  assertCanonicalStorageKey(key);
  return key;
}

export interface MediaStorageAdapter {
  put(file: UploadFile): Promise<StoredMedia>;
  putMedia(upload: CanonicalStoredUpload): Promise<StoredMedia>;
  get(key: string): Promise<NodeJS.ReadableStream>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
