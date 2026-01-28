import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MediaDetailsDrawer } from "../../../core/admin/ui/media/MediaDetailsDrawer";
import type { MediaItem } from "../../../core/admin/ui/media/types";

const sampleItem: MediaItem = {
  id: "media-42",
  name: "workspace-shot.jpg",
  type: "image",
  sizeBytes: 1240000,
  url: "/media/workspace-shot.jpg",
  mimeType: "image/jpeg",
  createdAt: "2026-01-20T09:12:00Z",
  width: 2400,
  height: 1600,
  title: "Workspace Shot",
  alt: "Developer desk with laptop",
  caption: "A minimalist workspace for coding sessions.",
};

test("MediaDetailsDrawer renders preview and metadata sections", () => {
  const html = renderToString(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );

  expect(html).toContain("Media Details");
  expect(html).toContain("Alt Text");
  expect(html).toContain("File Information");
  expect(html).toContain("Usage");
});
