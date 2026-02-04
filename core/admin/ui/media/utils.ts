import type { MediaRecord } from "@/services/mediaClient";

import type { MediaItem, MediaKind } from "./types";

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "0 B";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function resolveKindFromMime(mimeType: string): MediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export function resolveMediaName(record: MediaRecord) {
  const fromKey = record.key?.split("/").pop();
  if (fromKey) return fromKey;
  const fromUrl = record.url?.split("/").pop();
  if (fromUrl) return fromUrl;
  if (record.originalName) return record.originalName;
  return "asset";
}

export function toMediaItem(record: MediaRecord): MediaItem {
  return {
    id: record.id,
    name: resolveMediaName(record),
    originalName: record.originalName ?? undefined,
    type: resolveKindFromMime(record.mimeType),
    sizeBytes: record.size,
    url: record.url,
    mimeType: record.mimeType,
    createdAt: record.createdAt,
    width: record.width ?? undefined,
    height: record.height ?? undefined,
    title: record.title ?? undefined,
    alt: record.alt ?? undefined,
    caption: record.caption ?? undefined,
  };
}
