import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { MediaLibraryPage } from "../../../core/admin/ui/media/MediaLibraryPage";
import { MediaDetailsDrawer } from "../../../core/admin/ui/media/MediaDetailsDrawer";
import type { MediaItem } from "../../../core/admin/ui/media/types";

test("MediaLibraryPage renders metadata editor actions", () => {
  const item: MediaItem = {
    id: "media-1",
    name: "hero.jpg",
    type: "image",
    sizeBytes: 1024,
    url: "/media/hero.jpg",
    mimeType: "image/jpeg",
    createdAt: "2026-01-28T10:00:00Z",
  };
  const html = renderAdminUi(<MediaLibraryPage />);
  const drawer = renderAdminUi(
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

  expect(drawer).toContain("Metadata");
  expect(drawer).toContain("Copy URL");
  expect(drawer).toContain("Replace");
});
