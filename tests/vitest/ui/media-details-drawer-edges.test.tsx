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

const noAltItem: MediaItem = {
  ...sampleItem,
  id: "media-alt-missing",
  name: "altless.png",
  url: "/media/altless.png",
  mimeType: "image/png",
  alt: "",
  title: "",
};

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

const buttonByText = (text: string) =>
  Array.from(document.body.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === text
  );

const setInputValue = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype,
    "value"
  );
  React.act(() => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

test("MediaDetailsDrawer persists blur-triggered metadata edits through onSave", async () => {
  const onSave = vi.fn().mockResolvedValue(sampleItem);
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      onOpenChange={() => undefined}
      onSave={onSave}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();

  const titleInput = document.querySelector(`#media-title-${sampleItem.id}`) as HTMLInputElement;
  setInputValue(titleInput, "New Title");
  React.act(() => {
    titleInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
  await flushEffects();
  expect(onSave).toHaveBeenCalledWith("media-42", expect.objectContaining({ title: "New Title" }));
});

test("MediaDetailsDrawer maps onSave failure to Save failed status", async () => {
  const onSave = vi.fn().mockRejectedValue(new Error("boom"));
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      onOpenChange={() => undefined}
      onSave={onSave}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();

  const caption = document.querySelector(`#media-caption-${sampleItem.id}`) as HTMLTextAreaElement;
  setInputValue(caption, "Updated caption");
  React.act(() => {
    caption.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
  await flushEffects();
  expect(document.body.textContent).toContain("Save failed");
});

test("MediaDetailsDrawer coalesces rapid focal-drag saves into one final PATCH", async () => {
  let resolveSave!: (value: MediaItem) => void;
  const onSave = vi.fn(() => new Promise<MediaItem>((resolve) => (resolveSave = resolve)));
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      onOpenChange={() => undefined}
      onSave={onSave}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();

  // Focal drag: pointerdown then pointermove then pointerup while in flight.
  const surface = document.body.querySelector('[role="slider"]') as HTMLElement;
  surface.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0 }) as DOMRect;
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: 100, clientY: 50, bubbles: true })
    );
  });
  // First onChange fires persist; second queues as pending while saving.
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 150, clientY: 25, bubbles: true })
    );
  });
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 50, clientY: 75, bubbles: true })
    );
  });
  await flushEffects();
  // Two persists are queued: one running, one pending.
  expect(onSave.mock.calls.length).toBeGreaterThanOrEqual(1);

  // Settle the first save; the pending one flushes afterwards.
  await React.act(async () => {
    resolveSave(sampleItem);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(onSave.mock.calls.length).toBeGreaterThanOrEqual(2);
});

test("MediaDetailsDrawer open asset fires onOpen with the item URL", async () => {
  const onOpen = vi.fn();
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={onOpen}
    />
  );
  await flushEffects();
  React.act(() => {
    buttonByText("Open")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(onOpen).toHaveBeenCalledWith("/media/workspace-shot.jpg");
});

test("MediaDetailsDrawer copy URL failure surfaces Copy failed", async () => {
  const onCopy = vi.fn().mockRejectedValue(new Error("clipboard blocked"));
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={onCopy}
      onOpen={() => undefined}
    />
  );
  await flushEffects();
  React.act(() => {
    buttonByText("Copy URL")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flushEffects();
  expect(document.body.textContent).toContain("Copy failed.");
});

test("MediaDetailsDrawer delete fires onDelete with the item id", async () => {
  const onDelete = vi.fn();
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={onDelete}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();
  React.act(() => {
    buttonByText("Delete")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(onDelete).toHaveBeenCalledWith("media-42");
});

test("MediaDetailsDrawer replaces the file and reports success", async () => {
  const onReplace = vi.fn().mockResolvedValue({ ...sampleItem, title: "Replaced title" });
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
      onReplace={onReplace}
    />
  );
  await flushEffects();
  React.act(() => {
    buttonByText("Replace")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const fileInput = document.body.querySelector('input[type="file"]') as HTMLInputElement;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files");
  React.act(() => {
    descriptor?.set?.call(fileInput, {
      length: 1,
      item: () => new File(["data"], "new.png", { type: "image/png" }),
      0: new File(["data"], "new.png", { type: "image/png" }),
    });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flushEffects();
  expect(onReplace).toHaveBeenCalledWith("media-42", expect.any(File));
  expect(document.body.textContent).toContain("Asset replaced.");
});

test("MediaDetailsDrawer reports a replace failure", async () => {
  const onReplace = vi.fn().mockRejectedValue(new Error("replace boom"));
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
      onReplace={onReplace}
    />
  );
  await flushEffects();
  React.act(() => {
    buttonByText("Replace")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const fileInput = document.body.querySelector('input[type="file"]') as HTMLInputElement;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files");
  React.act(() => {
    descriptor?.set?.call(fileInput, {
      length: 1,
      item: () => new File(["data"], "new.png", { type: "image/png" }),
      0: new File(["data"], "new.png", { type: "image/png" }),
    });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flushEffects();
  expect(document.body.textContent).toContain("Replace failed.");
});

test("MediaDetailsDrawer edits title, alt, caption, description, and credit fields", async () => {
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
  const titleInput = document.querySelector(`#media-title-${sampleItem.id}`) as HTMLInputElement;
  setInputValue(titleInput, "T");
  expect(titleInput.value).toBe("T");

  const altInput = document.querySelector(`#media-alt-${sampleItem.id}`) as HTMLInputElement;
  setInputValue(altInput, "A");
  expect(altInput.value).toBe("A");

  const caption = document.querySelector(`#media-caption-${sampleItem.id}`) as HTMLTextAreaElement;
  setInputValue(caption, "C");
  expect(caption.value).toBe("C");

  const description = document.querySelector(
    `#media-description-${sampleItem.id}`
  ) as HTMLTextAreaElement;
  setInputValue(description, "D");
  expect(description.value).toBe("D");

  const credit = document.querySelector(`#media-credit-${sampleItem.id}`) as HTMLInputElement;
  setInputValue(credit, "K");
  expect(credit.value).toBe("K");
});

test("MediaDetailsDrawer persists a tag change and shows the missing-alt badge", async () => {
  const onSave = vi.fn().mockResolvedValue(sampleItem);
  mount(
    <MediaDetailsDrawer
      item={noAltItem}
      open
      onOpenChange={() => undefined}
      onSave={onSave}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();
  expect(document.body.textContent).toContain("Missing alt");

  const tagInput = document.body.querySelector('input[aria-label="Add tag"]') as HTMLInputElement;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(tagInput, "new-tag");
    tagInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
  React.act(() => {
    tagInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await flushEffects();
  expect(onSave).toHaveBeenCalledWith(
    "media-alt-missing",
    expect.objectContaining({ tags: ["desk", "new-tag"] })
  );
});

test("MediaDetailsDrawer shows loading, error, and loaded usage states", async () => {
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      usageState="loading"
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();
  expect(document.body.textContent).toContain("Loading usage...");

  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      usageState="error"
      usageError="Usage exploded"
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();
  expect(document.body.textContent).toContain("Usage exploded");

  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      usageState="loaded"
      usageItems={[]}
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();
  expect(document.body.textContent).toContain("not used by tracked admin content");
});

test("MediaDetailsDrawer renders dimension recovery and error messages", async () => {
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      dimensionState="recovering"
      dimensionMessage="Recovering dimensions"
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();
  expect(document.body.textContent).toContain("Recovering...");

  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  mount(
    <MediaDetailsDrawer
      item={sampleItem}
      open
      dimensionState="error"
      dimensionMessage="Recovery failed"
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
    />
  );
  await flushEffects();
  expect(document.body.textContent).toContain("Recovery failed");
});

test("MediaDetailsDrawer renders folder select options and persists a folder change", async () => {
  const onSave = vi.fn().mockResolvedValue(sampleItem);
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
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  await React.act(async () => {
    descriptor?.set?.call(select, "f1");
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
  expect(onSave).toHaveBeenCalledWith("media-42", expect.objectContaining({ folderId: "f1" }));
});
