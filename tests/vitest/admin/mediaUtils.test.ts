import { expect, test } from "vitest";

import type { MediaItem } from "../../../core/admin/ui/media/types";
import {
  formatDimensions,
  hasMissingImageAlt,
  resolveMediaDisplayName,
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
  expect(resolveMediaDisplayName({ ...baseItem, title: "Hero image" })).toBe(
    "Hero image"
  );
  expect(resolveMediaDisplayName({ ...baseItem, title: "" })).toBe("original.png");
});

test("media helpers surface missing image alt and unknown dimensions", () => {
  expect(hasMissingImageAlt(baseItem)).toBe(true);
  expect(hasMissingImageAlt({ ...baseItem, alt: "Hero alt" })).toBe(false);
  expect(formatDimensions(baseItem)).toBe("Unknown");
  expect(formatDimensions({ ...baseItem, width: 1280, height: 720 })).toBe(
    "1280 × 720 px"
  );
});
