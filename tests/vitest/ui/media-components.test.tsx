// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

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

const click = async (element: Element | null) => {
  if (!element) {
    throw new Error("Expected element to exist before clicking");
  }
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
};

const mountMediaGrid = async (props: React.ComponentProps<typeof MediaGrid>) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<MediaGrid {...props} />);
  });

  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
};

test("MediaGrid renders list view and missing alt signal", async () => {
  const view = await mountMediaGrid({
    items: [mediaItem],
    selectedIds: ["media-1"],
    view: "list",
    selectionMode: true,
  });

  try {
    expect(view.container.textContent).toContain("Hero image");
    expect(view.container.textContent).toContain("Missing alt");
    expect(view.container.querySelector('button[aria-label="Select Hero image"]')).toBeTruthy();
  } finally {
    await view.cleanup();
  }
});

test.each(["grid", "list"] as const)(
  "MediaGrid keeps checkbox and details targets separate in %s view",
  async (viewMode) => {
    const onSelect = vi.fn();
    const onToggleSelect = vi.fn();
    const view = await mountMediaGrid({
      items: [mediaItem],
      selectedIds: [],
      view: viewMode,
      selectionMode: true,
      onSelect,
      onToggleSelect,
    });

    try {
      await click(view.container.querySelector('button[aria-label="Select Hero image"]'));

      expect(onToggleSelect).toHaveBeenCalledTimes(1);
      expect(onToggleSelect).toHaveBeenCalledWith("media-1");
      expect(onSelect).not.toHaveBeenCalled();

      const primaryButton = Array.from(view.container.querySelectorAll("button")).find(
        (button) =>
          button.getAttribute("aria-label") !== "Select Hero image" &&
          button.textContent?.includes("Hero image") === true
      );
      expect(primaryButton).toBeTruthy();

      await click(primaryButton ?? null);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith("media-1");
      expect(onToggleSelect).toHaveBeenCalledTimes(1);
    } finally {
      await view.cleanup();
    }
  }
);
