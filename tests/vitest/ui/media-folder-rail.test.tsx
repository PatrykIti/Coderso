// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { MediaFolderRail } from "../../../core/admin/ui/media/MediaFolderRail";
import type { MediaFolder } from "../../../core/admin/ui/media/types";
import { buildFolderTree } from "../../../core/admin/ui/media/utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanupFns: Array<() => void> = [];

afterEach(() => {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
});

const folders: MediaFolder[] = [
  { id: "f1", name: "Marketing", slug: "marketing", parentId: null, orderIndex: 0, createdAt: "" },
  { id: "f2", name: "Docs", slug: "docs", parentId: null, orderIndex: 1, createdAt: "" },
  { id: "f3", name: "Q1", slug: "q1", parentId: "f1", orderIndex: 0, createdAt: "" },
];

const baseProps = () => ({
  folders,
  folderTree: buildFolderTree(folders),
  typeCounts: { all: 10, image: 5, video: 2, document: 2, audio: 1 } as Record<
    "all" | "image" | "video" | "document" | "audio",
    number
  >,
  folderCounts: { f1: 4, f2: 2, f3: 1 } as Record<string, number>,
  activeFolderId: null as string | null,
  activeType: "all" as const,
  onSelectType: vi.fn(),
  onSelectFolder: vi.fn(),
  onCreateFolder: vi.fn(),
  onRenameFolder: vi.fn(),
  onDeleteFolder: vi.fn(),
  onReorder: vi.fn(),
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

const click = (el: Element | null | undefined) => {
  React.act(() => {
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const typeInto = (input: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const findByAria = (c: ParentNode, label: string) =>
  Array.from(c.querySelectorAll("button")).find((b) => b.getAttribute("aria-label") === label);

test("MediaFolderRail renders type filters and the nested folder tree with counts", () => {
  const container = mount(<MediaFolderRail {...baseProps()} />);
  const text = container.textContent ?? "";
  expect(text).toContain("All files");
  expect(text).toContain("Images");
  expect(text).toContain("Marketing");
  expect(text).toContain("Docs");
  expect(text).toContain("Q1");
  // recursive count supplied by the page
  expect(text).toContain("4");
});

test("MediaFolderRail marks the active folder with the prototype soft-violet tokens", () => {
  const container = mount(<MediaFolderRail {...baseProps()} activeFolderId="f1" />);
  const marketingButton = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Marketing")
  );
  const row = marketingButton?.closest("div");
  expect(row?.className).toContain("bg-primary-soft");
  expect(row?.className).toContain("text-primary-soft-foreground");
});

test("MediaFolderRail fires onSelectFolder when a folder row is clicked", () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  const docsButton = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "Docs"
  );
  click(docsButton);
  expect(props.onSelectFolder).toHaveBeenCalledWith("f2");
});

test("MediaFolderRail creates a top-level folder", () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "New folder"));
  const input = container.querySelector('input[aria-label="New folder name"]') as HTMLInputElement;
  typeInto(input, "Campaigns");
  click(findByAria(container, "Create folder"));
  expect(props.onCreateFolder).toHaveBeenCalledWith("Campaigns", null);
});

test("MediaFolderRail renames a folder inline", () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Rename Docs"));
  const input = container.querySelector(
    'input[aria-label="Rename folder Docs"]'
  ) as HTMLInputElement;
  typeInto(input, "Documents");
  click(findByAria(container, "Save folder name"));
  expect(props.onRenameFolder).toHaveBeenCalledWith("f2", "Documents");
});

test("MediaFolderRail deletes a folder after confirmation", () => {
  const props = baseProps();
  const original = window.confirm;
  window.confirm = vi.fn(() => true) as unknown as typeof window.confirm;
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Delete Docs"));
  expect(props.onDeleteFolder).toHaveBeenCalledWith("f2");
  window.confirm = original;
});

test("MediaFolderRail reorders siblings, emitting new orderIndex values", () => {
  const props = baseProps();
  const container = mount(<MediaFolderRail {...props} />);
  click(findByAria(container, "Move Marketing down"));
  expect(props.onReorder).toHaveBeenCalledWith([
    { id: "f2", orderIndex: 0, parentId: null },
    { id: "f1", orderIndex: 1, parentId: null },
  ]);
});
