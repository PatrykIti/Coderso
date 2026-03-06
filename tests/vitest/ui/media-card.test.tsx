import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { MediaCard } from "../../../core/admin/ui/media/MediaCard";

test("MediaCard renders file name", () => {
  const item = {
    id: "media-1",
    name: "asset.jpg",
    type: "image" as const,
    sizeBytes: 1024 * 1024,
    url: "/media/asset.jpg",
    mimeType: "image/jpeg",
    createdAt: "2026-01-20T10:00:00Z",
  };
  const html = renderAdminUi(
    <MediaCard item={item} />
  );

  expect(html).toContain("asset.jpg");
});
