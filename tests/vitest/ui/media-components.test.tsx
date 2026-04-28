// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

import { MediaGrid } from "../../../core/admin/ui/media/MediaGrid";
import type { MediaItem } from "../../../core/admin/ui/media/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mediaItem: MediaItem = {
  id: "media-1",
  name: "storage-key.png",
  originalName: "original.png",
  title: "Hero image",
  type: "image",
  sizeBytes: 1024,
  url: "/media/storage-key.png",
  mimeType: "image/png",
  createdAt: "2026-04-23T00:00:00.000Z",
};

test("MediaGrid renders list view and missing alt signal", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MediaGrid
        items={[mediaItem]}
        selectedIds={["media-1"]}
        view="list"
        selectionMode
      />
    );
  });

  expect(container.textContent).toContain("Hero image");
  expect(container.textContent).toContain("Missing alt");
  expect(
    container.querySelector('button[aria-label="Select Hero image"]')
  ).toBeTruthy();

  await act(async () => {
    root.unmount();
  });
});
