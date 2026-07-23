import type { MediaFolder } from "@/services/mediaFoldersClient";
import type { MediaRecord } from "@/services/mediaClient";
import {
  CANONICAL_MEDIA_PROFILES,
  type CanonicalMediaMime,
} from "../../../services/media/mediaFileTrust";

import type { MediaItem, MediaKind } from "./types";

export type { MediaFolder };

/** A `MediaFolder` with its nested children — the element type of `buildFolderTree`. */
export type FolderNode = MediaFolder & { children: FolderNode[] };

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "0 B";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
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

const getCanonicalMediaProfile = (mimeType: string) => {
  if (!Object.prototype.hasOwnProperty.call(CANONICAL_MEDIA_PROFILES, mimeType)) return null;
  return CANONICAL_MEDIA_PROFILES[mimeType as CanonicalMediaMime];
};

export function resolveAdminMediaKind(record: Pick<MediaRecord, "type" | "mimeType">): MediaKind {
  const profile = getCanonicalMediaProfile(record.mimeType);
  if (profile?.delivery === "inline" && record.type === "image") return "image";

  const normalizedMime = record.mimeType.toLowerCase();
  if (normalizedMime.startsWith("audio/")) return "audio";
  if (normalizedMime.startsWith("video/")) return "video";
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

export function resolveMediaDisplayName(item: Pick<MediaItem, "name" | "originalName" | "title">) {
  const title = item.title?.trim();
  if (title) return title;
  const originalName = item.originalName?.trim();
  if (originalName) return originalName;
  const name = item.name?.trim();
  return name || "asset";
}

export function hasMissingImageAlt(item: Pick<MediaItem, "type" | "alt">) {
  return item.type === "image" && !item.alt?.trim();
}

export function formatDimensions(item: Pick<MediaItem, "type" | "width" | "height">) {
  if (item.type !== "image") return "Not applicable";
  if (item.width && item.height) return `${item.width} × ${item.height} px`;
  return "Unknown";
}

export function toMediaItem(record: MediaRecord): MediaItem {
  return {
    id: record.id,
    name: resolveMediaName(record),
    originalName: record.originalName ?? undefined,
    type: resolveAdminMediaKind(record),
    sizeBytes: record.size,
    url: record.url,
    mimeType: record.mimeType,
    createdAt: record.createdAt,
    width: record.width ?? undefined,
    height: record.height ?? undefined,
    title: record.title ?? undefined,
    alt: record.alt ?? undefined,
    caption: record.caption ?? undefined,
    folderId: record.folderId ?? null,
    tags: Array.isArray(record.tags) ? record.tags : [],
    focalX: record.focalX ?? null,
    focalY: record.focalY ?? null,
    description: record.description ?? null,
    credit: record.credit ?? null,
  };
}

/** Normalized focal point in `0..1` coords; defaults to center (`0.5, 0.5`) when unset. */
export function resolveFocalPosition(item: Pick<MediaItem, "focalX" | "focalY">): {
  x: number;
  y: number;
} {
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const x =
    typeof item.focalX === "number" && Number.isFinite(item.focalX) ? clamp(item.focalX) : 0.5;
  const y =
    typeof item.focalY === "number" && Number.isFinite(item.focalY) ? clamp(item.focalY) : 0.5;
  return { x, y };
}

/**
 * Nest a flat folder list into a tree by `parentId`, sorted by `orderIndex` (then name)
 * at every level. Folders whose `parentId` is missing/unknown surface as roots.
 */
export function buildFolderTree(folders: MediaFolder[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>();
  for (const folder of folders) {
    nodes.set(folder.id, { ...folder, children: [] });
  }
  const roots: FolderNode[] = [];
  for (const folder of folders) {
    const node = nodes.get(folder.id);
    if (!node) continue;
    const parent = folder.parentId ? nodes.get(folder.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortLevel = (list: FolderNode[]) => {
    list.sort((a, b) => a.orderIndex - b.orderIndex || a.name.localeCompare(b.name));
    for (const node of list) sortLevel(node.children);
  };
  sortLevel(roots);
  return roots;
}

/**
 * Count media in a folder. When `folders` is provided, descendants are included
 * (recursive). `folderId === null` counts unfiled media (no `folderId`).
 */
export function countMediaByFolder(
  items: Pick<MediaItem, "folderId">[],
  folderId: string | null,
  folders?: MediaFolder[]
): number {
  if (folderId === null) {
    return items.filter((item) => item.folderId == null).length;
  }
  const ids = new Set<string>([folderId]);
  if (folders && folders.length > 0) {
    const childrenByParent = new Map<string, string[]>();
    for (const folder of folders) {
      const parentId = folder.parentId ?? "";
      const list = childrenByParent.get(parentId) ?? [];
      list.push(folder.id);
      childrenByParent.set(parentId, list);
    }
    const stack = [folderId];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      for (const child of childrenByParent.get(current) ?? []) {
        if (!ids.has(child)) {
          ids.add(child);
          stack.push(child);
        }
      }
    }
  }
  return items.filter((item) => item.folderId != null && ids.has(item.folderId)).length;
}

/** Items whose `tags` include the given tag (exact match). */
export function filterByTag<T extends Pick<MediaItem, "tags">>(items: T[], tag: string): T[] {
  return items.filter((item) => (item.tags ?? []).includes(tag));
}
