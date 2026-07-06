// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { MediaDetailsDrawer } from "../../../core/admin/ui/media/MediaDetailsDrawer";
import type { MediaFolder, MediaItem } from "../../../core/admin/ui/media/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  tags: ["desk"],
  description: "Long-form description.",
  credit: "Jane Photographer",
  folderId: null,
};

const folders: MediaFolder[] = [
  { id: "f1", name: "Marketing", slug: "marketing", parentId: null, orderIndex: 0, createdAt: "" },
];

let cleanupFns: Array<() => void> = [];
afterEach(() => {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
});

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

// MediaDetailsDrawer is a Radix Sheet that portals to document.body under
// happy-dom, so we client-mount and read the portalled body.
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

test("MediaDetailsDrawer renders preview and metadata sections", async () => {
  mount(
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
  await flushEffects();
  const text = document.body.textContent ?? "";
  expect(text).toContain("Media Details");
  expect(text).toContain("Alt Text");
  expect(text).toContain("File Information");
  expect(text).toContain("Usage");
});

test("MediaDetailsDrawer renders the new organization fields", async () => {
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      folders={folders}
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();
  const text = document.body.textContent ?? "";
  expect(text).toContain("Organization");
  expect(text).toContain("Folder");
  expect(text).toContain("— No folder —");
  expect(text).toContain("Marketing");
  expect(text).toContain("Tags");
  expect(text).toContain("Description");
  expect(text).toContain("Credit");
  expect(text).toContain("Focal point");
});

test("MediaDetailsDrawer onSave carries the extended present-only payload when the folder changes", async () => {
  const onSave = vi.fn().mockReturnValue(undefined);
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      folders={folders}
      onOpenChange={() => undefined}
      onSave={onSave}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();

  const select = document.querySelector(`#media-folder-${sampleItem.id}`) as HTMLSelectElement;
  expect(select).toBeTruthy();
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  await React.act(async () => {
    descriptor?.set?.call(select, "f1");
    select.dispatchEvent(new Event("change", { bubbles: true }));
    // let the async persist() settle its "saved" state update inside act
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(onSave).toHaveBeenCalledTimes(1);
  const [id, meta] = onSave.mock.calls[0];
  expect(id).toBe("media-42");
  expect(meta).toMatchObject({
    title: "Workspace Shot",
    alt: "Developer desk with laptop",
    caption: "A minimalist workspace for coding sessions.",
    folderId: "f1",
    tags: ["desk"],
    description: "Long-form description.",
    credit: "Jane Photographer",
  });
});
