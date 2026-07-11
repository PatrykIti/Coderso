// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { MediaRecord, MediaUsageSummary } from "../../../core/admin/services/mediaClient";
import { MediaDetailsDrawer } from "../../../core/admin/ui/media/MediaDetailsDrawer";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { MediaFolder, MediaItem } from "../../../core/admin/ui/media/types";
import { toMediaItem } from "../../../core/admin/ui/media/utils";

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

test("MediaDetailsDrawer renders attachment SVG as a document without image-only controls", async () => {
  const record: MediaRecord = {
    id: "svg-1",
    key: "uploads/icon.svg",
    url: "/media/uploads/icon.svg",
    originalName: "icon.svg",
    type: "file",
    mimeType: "image/svg+xml",
    size: 512,
    width: 100,
    height: 100,
    focalX: 0.2,
    focalY: 0.8,
    alt: null,
    createdAt: "2026-01-20T10:00:00Z",
  };

  mount(
    <MediaDetailsDrawer
      item={toMediaItem(record)}
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
  expect(document.body.querySelector('img[src="/media/uploads/icon.svg"]')).toBeNull();
  expect(document.body.querySelector(".lucide-file-text")).toBeTruthy();
  expect(text).not.toContain("Focal point");
  expect(text).not.toContain("Missing alt");
});

test("MediaDetailsDrawer renders Form submission usage with a stable icon and target", async () => {
  const submissionUsage: MediaUsageSummary = {
    id: "submission:submission-1",
    type: "submission",
    title: "Contact form",
    context: "Form submission attachment",
    targetId: "submission-1",
    targetSlug: null,
    adminHref: "/advanced/forms/form-1/submissions",
  };

  mount(
    <AdminRouterProvider initialPath="/admin/media">
      <MediaDetailsDrawer
        item={sampleItem}
        open
        usageState="loaded"
        usageItems={[submissionUsage]}
        onOpenChange={() => undefined}
        onSave={() => undefined}
        onDelete={() => undefined}
        onCopy={() => undefined}
        onOpen={() => undefined}
      />
    </AdminRouterProvider>
  );
  await flushEffects();

  const usageLink = document.body.querySelector(
    'a[href="/admin/advanced/forms/form-1/submissions"]'
  );
  expect(usageLink).toBeTruthy();
  expect(usageLink?.textContent).toContain("Contact form");
  expect(usageLink?.textContent).toContain("Form submission attachment");
  expect(usageLink?.querySelector(".lucide-file-text")).toBeTruthy();
  expect(usageLink?.querySelector(".lucide-image")).toBeNull();
  expect(document.body.textContent).toContain("Usage (1 locations)");
});
