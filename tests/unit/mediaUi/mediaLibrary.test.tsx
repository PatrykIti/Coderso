import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MediaLibraryPage } from "../../../core/admin/ui/media/MediaLibraryPage";
import { MediaDetailsDrawer } from "../../../core/admin/ui/media/MediaDetailsDrawer";
import type { MediaItem } from "../../../core/admin/ui/media/types";

test("MediaLibraryPage renders upload and details drawer", () => {
  const item: MediaItem = {
    id: "media-1",
    name: "hero.jpg",
    type: "image",
    sizeBytes: 1024,
    url: "/media/hero.jpg",
    mimeType: "image/jpeg",
    createdAt: "2026-01-28T10:00:00Z",
  };
  const html = renderToString(<MediaLibraryPage />);
  const drawer = renderToString(
    <MediaDetailsDrawer
      item={item}
      open
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );

  expect(html).toContain("Media Library");
  expect(html).toContain("Drag and drop files");
  expect(drawer).toContain("Media Details");
});
