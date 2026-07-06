import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { MediaCard } from "../../../core/admin/ui/media/MediaCard";
import type { MediaItem } from "../../../core/admin/ui/media/types";

const item = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: "media-1",
  name: "asset.jpg",
  type: "image",
  sizeBytes: 1024 * 1024,
  url: "/media/asset.jpg",
  mimeType: "image/jpeg",
  createdAt: "2026-01-20T10:00:00Z",
  alt: "a photo",
  ...overrides,
});

test("MediaCard renders file name", () => {
  const html = renderAdminUi(<MediaCard item={item()} />);
  expect(html).toContain("asset.jpg");
});

test("MediaCard grid card matches the prototype: aspect-square, top-left type badge, tone chip", () => {
  const html = renderAdminUi(<MediaCard item={item()} />);
  expect(html).toContain("aspect-square");
  // neutral top-left type badge (outline over a translucent card backdrop)
  expect(html).toContain("bg-card/80");
  expect(html).toContain("capitalize");
  // the ONE surviving tone source lives on the bottom-right size-5 chip
  expect(html).toContain("size-5");
  expect(html).toContain("bg-primary-soft text-primary-soft-foreground");
  // the retired footer per-type colored text Badge (data-variant="soft") is gone
  expect(html).not.toContain('data-variant="soft"');
});

test("MediaCard derives the KIND_TONE chip class per MediaKind", () => {
  expect(renderAdminUi(<MediaCard item={item({ type: "image" })} />)).toContain(
    "bg-primary-soft text-primary-soft-foreground"
  );
  expect(
    renderAdminUi(
      <MediaCard item={item({ type: "video", mimeType: "video/mp4", url: "/m/v.mp4" })} />
    )
  ).toContain("bg-info-soft text-info");
  expect(
    renderAdminUi(
      <MediaCard item={item({ type: "document", mimeType: "application/pdf", url: "/m/d.pdf" })} />
    )
  ).toContain("bg-warning-soft text-warning");
  expect(
    renderAdminUi(
      <MediaCard item={item({ type: "audio", mimeType: "audio/mpeg", url: "/m/a.mp3" })} />
    )
  ).toContain("bg-success-soft text-success");
});

test("MediaCard applies the focal point as object-position on image previews", () => {
  const html = renderAdminUi(<MediaCard item={item({ focalX: 0.25, focalY: 0.75 })} />);
  expect(html).toContain("object-position:25% 75%");
});
