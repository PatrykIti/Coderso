// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  EMPTY_MEDIA_FILTER,
  MediaFilterPanel,
} from "../../../core/admin/ui/media/MediaFilterPanel";
import type { MediaFolder } from "../../../core/admin/ui/media/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanupFns: Array<() => void> = [];

afterEach(() => {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
});

const folders: MediaFolder[] = [
  { id: "f1", name: "Marketing", slug: "marketing", parentId: null, orderIndex: 0, createdAt: "" },
];

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

const buttonByText = (c: ParentNode, text: string) =>
  Array.from(c.querySelectorAll("button")).find((b) => b.textContent?.trim() === text);

test("toggling an already-selected type chip removes it from the state", () => {
  const onChange = vi.fn();
  const container = mount(
    <MediaFilterPanel
      tags={["hero"]}
      folders={folders}
      value={{ ...EMPTY_MEDIA_FILTER, types: ["image"] }}
      onChange={onChange}
      onReset={vi.fn()}
    />
  );
  click(buttonByText(container, "Images"));
  expect(onChange).toHaveBeenCalledWith({ ...EMPTY_MEDIA_FILTER, types: [] });
});

test("toggling an already-selected tag chip removes it from the state", () => {
  const onChange = vi.fn();
  const container = mount(
    <MediaFilterPanel
      tags={["hero", "banner"]}
      folders={folders}
      value={{ ...EMPTY_MEDIA_FILTER, tags: ["hero"] }}
      onChange={onChange}
      onReset={vi.fn()}
    />
  );
  click(buttonByText(container, "hero"));
  expect(onChange).toHaveBeenCalledWith({ ...EMPTY_MEDIA_FILTER, tags: [] });
});

test("MediaFilterPanel renders the folder option list including null entry", () => {
  const container = mount(
    <MediaFilterPanel
      tags={[]}
      folders={folders}
      value={EMPTY_MEDIA_FILTER}
      onChange={vi.fn()}
      onReset={vi.fn()}
    />
  );
  const select = container.querySelector("#media-filter-folder") as HTMLSelectElement;
  expect(select).not.toBeNull();
  expect(select.querySelector('option[value="f1"]')?.textContent).toBe("Marketing");
});
