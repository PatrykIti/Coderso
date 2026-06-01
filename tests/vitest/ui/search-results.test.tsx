// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import {
  SearchResults,
  groupResults,
  type SearchItem,
} from "../../../core/admin/ui/search/SearchResults";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

test("SearchResults highlights active item", () => {
  const items: SearchItem[] = [
    { id: "page-1", type: "page", title: "Homepage" },
    { id: "entry-1", type: "entry", title: "Launch announcement" },
  ];
  const groups = groupResults(items);
  const html = renderAdminUi(<SearchResults query="home" groups={groups} activeIndex={1} />);

  expect(html).toContain("Pages");
  expect(html).toContain("Content");
  expect(html).toContain('data-active="true"');
});

test("SearchResults renders supplied page empty-state copy", () => {
  const html = renderAdminUi(
    <SearchResults
      query="launch"
      groups={[]}
      variant="page"
      emptyState={{
        title: "No results match the active category filters.",
        description: "Active categories: Pages.",
      }}
    />
  );

  expect(html).toContain("No results match the active category filters.");
  expect(html).toContain("Active categories: Pages.");
});

test("SearchResults calls prefetch and select for result rows", () => {
  const items: SearchItem[] = [{ id: "page-1", type: "page", title: "Homepage" }];
  const prefetched: SearchItem[] = [];
  const selected: SearchItem[] = [];
  const { container, cleanup } = mount(
    <SearchResults
      query="home"
      groups={groupResults(items)}
      onPrefetch={(item) => prefetched.push(item)}
      onSelect={(item) => selected.push(item)}
    />
  );

  try {
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    React.act(() => {
      button?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(prefetched).toEqual([items[0]]);
    expect(selected).toEqual([items[0]]);
  } finally {
    cleanup();
  }
});
