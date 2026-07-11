import { expect, test } from "vitest";

import type { MediaItem } from "../../../core/admin/ui/media/types";
import type { MediaRecord } from "../../../core/admin/services/mediaClient";
import type { MediaFolder } from "../../../core/admin/services/mediaFoldersClient";
import { CANONICAL_MEDIA_PROFILES } from "../../../core/services/media/mediaFileTrust";
import {
  buildFolderTree,
  countMediaByFolder,
  filterByTag,
  formatDimensions,
  hasMissingImageAlt,
  resolveAdminMediaKind,
  resolveFocalPosition,
  resolveMediaDisplayName,
  toMediaItem,
} from "../../../core/admin/ui/media/utils";

const baseItem: MediaItem = {
  id: "media-1",
  name: "storage-key.png",
  originalName: "original.png",
  type: "image",
  sizeBytes: 100,
  url: "/media/storage-key.png",
  mimeType: "image/png",
  createdAt: "2026-04-23T00:00:00.000Z",
};

test("resolveMediaDisplayName prefers editable title over storage key", () => {
  expect(resolveMediaDisplayName({ ...baseItem, title: "Hero image" })).toBe("Hero image");
  expect(resolveMediaDisplayName({ ...baseItem, title: "" })).toBe("original.png");
});

test("media helpers surface missing image alt and unknown dimensions", () => {
  expect(hasMissingImageAlt(baseItem)).toBe(true);
  expect(hasMissingImageAlt({ ...baseItem, alt: "Hero alt" })).toBe(false);
  expect(formatDimensions(baseItem)).toBe("Unknown");
  expect(formatDimensions({ ...baseItem, width: 1280, height: 720 })).toBe("1280 × 720 px");
});

const baseRecord: MediaRecord = {
  id: "media-1",
  key: "uploads/hero.png",
  url: "/media/uploads/hero.png",
  originalName: "hero.png",
  type: "image",
  mimeType: "image/png",
  size: 2048,
  createdAt: "2026-04-23T00:00:00.000Z",
};

test("resolveAdminMediaKind requires canonical inline MIME and persisted image type", () => {
  for (const [mimeType, profile] of Object.entries(CANONICAL_MEDIA_PROFILES)) {
    expect(resolveAdminMediaKind({ type: "image", mimeType })).toBe(
      profile.delivery === "inline" ? "image" : "document"
    );
    expect(resolveAdminMediaKind({ type: "file", mimeType })).toBe("document");
  }

  expect(resolveAdminMediaKind({ type: "image", mimeType: "image/avif" })).toBe("document");
  expect(resolveAdminMediaKind({ type: "image", mimeType: "image/jpg" })).toBe("document");
  expect(resolveAdminMediaKind({ type: "image", mimeType: "image/png; charset=binary" })).toBe(
    "document"
  );
  expect(resolveAdminMediaKind({ type: "file", mimeType: "audio/mpeg" })).toBe("audio");
  expect(resolveAdminMediaKind({ type: "file", mimeType: "video/mp4" })).toBe("video");
});

test("toMediaItem projects kind from both persisted type and canonical MIME", () => {
  expect(toMediaItem(baseRecord).type).toBe("image");
  expect(toMediaItem({ ...baseRecord, type: "file" }).type).toBe("document");
  expect(
    toMediaItem({
      ...baseRecord,
      type: "image",
      mimeType: "image/svg+xml",
      key: "uploads/icon.svg",
      url: "/media/uploads/icon.svg",
    }).type
  ).toBe("document");
});

test("toMediaItem maps new fields and defaults tags/focal/meta", () => {
  const mapped = toMediaItem({
    ...baseRecord,
    folderId: "folder-1",
    tags: ["hero", "banner"],
    focalX: 0.25,
    focalY: 0.75,
    description: "Long form",
    credit: "Jane Doe",
  });
  expect(mapped.folderId).toBe("folder-1");
  expect(mapped.tags).toEqual(["hero", "banner"]);
  expect(mapped.focalX).toBe(0.25);
  expect(mapped.focalY).toBe(0.75);
  expect(mapped.description).toBe("Long form");
  expect(mapped.credit).toBe("Jane Doe");

  const defaulted = toMediaItem(baseRecord);
  expect(defaulted.folderId).toBeNull();
  expect(defaulted.tags).toEqual([]);
  expect(defaulted.focalX).toBeNull();
  expect(defaulted.focalY).toBeNull();
  expect(defaulted.description).toBeNull();
  expect(defaulted.credit).toBeNull();
});

const folders: MediaFolder[] = [
  {
    id: "root-b",
    name: "Brand",
    slug: "brand",
    parentId: null,
    orderIndex: 1,
    createdAt: "2026-01-02T00:00:00.000Z",
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
    id: "child-a1",
    name: "Logos",
    slug: "logos",
    parentId: "root-a",
    orderIndex: 1,
    createdAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "child-a0",
    name: "Icons",
    slug: "icons",
    parentId: "root-a",
    orderIndex: 0,
    createdAt: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "grand",
    name: "SVG",
    slug: "svg",
    parentId: "child-a0",
    orderIndex: 0,
    createdAt: "2026-01-05T00:00:00.000Z",
  },
];

test("buildFolderTree nests by parentId and sorts by orderIndex", () => {
  const tree = buildFolderTree(folders);
  expect(tree.map((n) => n.id)).toEqual(["root-a", "root-b"]);
  const rootA = tree[0];
  expect(rootA.children.map((n) => n.id)).toEqual(["child-a0", "child-a1"]);
  expect(rootA.children[0].children.map((n) => n.id)).toEqual(["grand"]);
});

test("buildFolderTree surfaces folders with unknown parents as roots", () => {
  const orphan: MediaFolder[] = [
    {
      id: "x",
      name: "X",
      slug: "x",
      parentId: "missing",
      orderIndex: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  expect(buildFolderTree(orphan).map((n) => n.id)).toEqual(["x"]);
});

test("countMediaByFolder counts direct, recursive-with-descendants, and unfiled", () => {
  const items: Pick<MediaItem, "folderId">[] = [
    { folderId: "root-a" },
    { folderId: "child-a0" },
    { folderId: "grand" },
    { folderId: "root-b" },
    { folderId: null },
    { folderId: undefined },
  ];
  // direct only (no folders arg)
  expect(countMediaByFolder(items, "root-a")).toBe(1);
  // recursive incl. descendants
  expect(countMediaByFolder(items, "root-a", folders)).toBe(3);
  // unfiled (null + undefined)
  expect(countMediaByFolder(items, null)).toBe(2);
});

test("resolveFocalPosition defaults to center and clamps to [0,1]", () => {
  expect(resolveFocalPosition({})).toEqual({ x: 0.5, y: 0.5 });
  expect(resolveFocalPosition({ focalX: null, focalY: null })).toEqual({ x: 0.5, y: 0.5 });
  expect(resolveFocalPosition({ focalX: 0.3, focalY: 0.8 })).toEqual({ x: 0.3, y: 0.8 });
  expect(resolveFocalPosition({ focalX: -1, focalY: 2 })).toEqual({ x: 0, y: 1 });
});

test("filterByTag returns items carrying the tag", () => {
  const items = [{ tags: ["a", "b"] }, { tags: ["b"] }, { tags: [] }, {}];
  expect(filterByTag(items, "a")).toHaveLength(1);
  expect(filterByTag(items, "b")).toHaveLength(2);
  expect(filterByTag(items, "missing")).toHaveLength(0);
});
