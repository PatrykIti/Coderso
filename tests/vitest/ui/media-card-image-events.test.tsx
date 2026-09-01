// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { MediaCard } from "../../../core/admin/ui/media/MediaCard";
import type { MediaItem } from "../../../core/admin/ui/media/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanupFns: Array<() => void> = [];

afterEach(() => {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
});

const item = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: "media-1",
  name: "asset.jpg",
  type: "image",
  sizeBytes: 1024,
  url: "/media/asset.jpg",
  mimeType: "image/jpeg",
  createdAt: "2026-01-20T10:00:00Z",
  alt: "a photo",
  ...overrides,
});

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  cleanupFns.push(() => {
    React.act(() => root.unmount());
    container.remove();
  });
  return container;
};

test("MediaCard image load clears the skeleton and keeps the preview", () => {
  const container = mount(<MediaCard item={item()} />);
  const img = container.querySelector("img") as HTMLImageElement | null;
  expect(img).not.toBeNull();
  // Skeleton renders while not loaded (opacity-0 on the img).
  expect(container.querySelector(".animate-pulse")).not.toBeNull();
  React.act(() => {
    img?.dispatchEvent(new Event("load"));
  });
  expect(container.querySelector(".animate-pulse")).toBeNull();
  expect(img?.className).toContain("opacity-100");
});

test("MediaCard image error swaps to the fallback icon and drops the skeleton", () => {
  const container = mount(<MediaCard item={item()} />);
  const img = container.querySelector("img") as HTMLImageElement | null;
  React.act(() => {
    img?.dispatchEvent(new Event("error"));
  });
  expect(container.querySelector(".animate-pulse")).toBeNull();
  // Fallback icon: no image element, the type icon svg still present.
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector("svg")).not.toBeNull();
});

test("MediaCard list variant renders selection checkbox and detail rows", () => {
  const toggled: string[] = [];
  const container = mount(
    <MediaCard
      item={item({ originalName: undefined })}
      variant="list"
      selectionMode
      selected
      onToggleSelect={(id) => toggled.push(id)}
      onSelect={() => undefined}
    />
  );
  const checkbox = container.querySelector(
    '[data-slot="checkbox"][aria-label="Select asset.jpg"]'
  ) as HTMLButtonElement | null;
  expect(checkbox).not.toBeNull();
  React.act(() => {
    checkbox?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(toggled).toEqual(["media-1"]);
});
