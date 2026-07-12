import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import {
  FOLDER_OPERATION_MESSAGES,
  MediaLibraryPage,
} from "../../../core/admin/ui/media/MediaLibraryPage";
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

  expect(html).toContain("Media Library");
  expect(html).toContain("Upload");
  expect(html).not.toContain("Upload New");
  // The header "Upload" button drives uploads via a headless dropzone; the
  // large dashed drop area was removed so the asset list is visible without
  // scrolling past it.
  expect(html).not.toContain("Drag and drop files");
  expect(html).toContain("Open details after upload");
  expect(html).toContain("lg:grid-cols-[200px_minmax(0,1fr)]");
  expect(html).toContain('data-media-filter-folder-id=""');
  expect(html).toContain("data-media-folder-rail");
  expect(html).toContain('aria-busy="false"');
  expect(drawer).toContain("Media Details");
});

test("folder recovery copy stays bounded and contains no transport details", () => {
  expect(FOLDER_OPERATION_MESSAGES).toEqual({
    load: "Folders could not be loaded. Retry the request.",
    create: "Folder could not be created. Retry when ready.",
    createConflict: "A folder with this slug already exists. Change the name or retry.",
    rename: "Folder could not be renamed. Retry when ready.",
    reorder: "Folder order could not be saved. Retry the same order.",
    delete: "Folder could not be deleted. Retry when ready.",
  });
  expect(JSON.stringify(FOLDER_OPERATION_MESSAGES)).not.toMatch(/sql|stack|constraint/i);
});
