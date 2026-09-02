import { expect, test } from "vitest";

import type { MediaFolder } from "../../../core/admin/services/mediaFoldersClient";
import type { MediaRecord } from "../../../core/admin/services/mediaClient";
import {
  buildFolderTree,
  countMediaByFolder,
  formatBytes,
  formatDate,
  resolveMediaDisplayName,
  resolveMediaName,
} from "../../../core/admin/ui/media/utils";

test("formatBytes handles non-finite and zero inputs", () => {
  expect(formatBytes(Number.NaN)).toBe("0 B");
  expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("0 B");
  expect(formatBytes(0)).toBe("0 B");
});

test("formatDate returns Unknown for invalid values", () => {
  expect(formatDate("not-a-date")).toBe("Unknown");
});

test("resolveMediaName prefers the storage key and falls back to URL segments", () => {
  const base: MediaRecord = {
    id: "media-1",
    key: "uploads/hero.png",
    url: "/media/uploads/hero.png",
    originalName: "hero.png",
    type: "image",
    mimeType: "image/png",
    size: 2048,
    createdAt: "2026-04-23T00:00:00.000Z",
  };
  expect(resolveMediaName(base)).toBe("hero.png");
  expect(resolveMediaName({ ...base, key: "" })).toBe("hero.png");
  expect(resolveMediaName({ ...base, key: "", url: "/media/uploads/team/photo.jpg" })).toBe(
    "photo.jpg"
  );
});

test("resolveMediaName falls back to originalName then the asset placeholder", () => {
  const base: MediaRecord = {
    id: "media-1",
    key: "",
    url: "",
    originalName: "original.png",
    type: "image",
    mimeType: "image/png",
    size: 2048,
    createdAt: "2026-04-23T00:00:00.000Z",
  };
  expect(resolveMediaName(base)).toBe("original.png");
  expect(resolveMediaName({ ...base, originalName: "" })).toBe("asset");
});

test("resolveMediaDisplayName falls back to name and the asset placeholder", () => {
  expect(resolveMediaDisplayName({ name: "storage-key.png", originalName: "", title: "" })).toBe(
    "storage-key.png"
  );
  expect(resolveMediaDisplayName({ name: "", originalName: "", title: "   " })).toBe("asset");
  expect(resolveMediaDisplayName({ name: "   ", originalName: "  ", title: "  " })).toBe("asset");
});

test("buildFolderTree sorts sibling roots and nested children deterministically", () => {
  const folders: MediaFolder[] = [
    {
      id: "root-b",
      name: "Brand",
      slug: "brand",
      parentId: null,
      orderIndex: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "root-a",
      name: "Assets",
      slug: "assets",
      parentId: null,
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "child-b",
      name: "Zeta",
      slug: "zeta",
      parentId: "root-b",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "child-a",
      name: "Alpha",
      slug: "alpha",
      parentId: "root-b",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  const tree = buildFolderTree(folders);
  expect(tree.map((node) => node.id)).toEqual(["root-a", "root-b"]);
  // Same orderIndex -> name tie-break (localeCompare) inside a parent.
  expect(tree[1].children.map((node) => node.id)).toEqual(["child-a", "child-b"]);
});

test("countMediaByFolder with a folderId and no folder list counts only direct rows", () => {
  const items: Array<{ folderId: string | null }> = [
    { folderId: "folder-1" },
    { folderId: "folder-2" },
    { folderId: null },
  ];
  expect(countMediaByFolder(items, "folder-1")).toBe(1);
  expect(countMediaByFolder(items, "folder-1", [])).toBe(1);
  expect(countMediaByFolder(items, null)).toBe(1);
});
