// @vitest-environment happy-dom

// TASK-105-08-06: `SearchResults` page-variant rendering. Covers empty-state
// copy, media/user cards, highlight escaping, View All wiring, and prefetch.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

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
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const click = (element: Element | null | undefined) => {
  if (!element) throw new Error("click target missing");
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const hover = (element: Element | null | undefined) => {
  if (!element) throw new Error("hover target missing");
  React.act(() => {
    element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
};

const focus = (element: Element | null | undefined) => {
  if (!element) throw new Error("focus target missing");
  React.act(() => {
    element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  });
};

const mousedown = (element: Element | null | undefined) => {
  if (!element) throw new Error("mousedown target missing");
  let defaultPrevented = false;
  React.act(() => {
    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    defaultPrevented = !element.dispatchEvent(event);
  });
  return defaultPrevented;
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("page variant renders media and user cards plus list rows", () => {
  const items: SearchItem[] = [
    {
      id: "m-1",
      title: "Logo",
      type: "media",
      subtitle: "logo.png",
      image: "https://example.com/logo.png",
    },
    { id: "u-1", title: "System Admin", type: "user", subtitle: "admin", initials: "SA" },
    { id: "p-1", title: "Homepage", type: "page", subtitle: "homepage" },
  ];
  const view = mount(<SearchResults query="o" groups={groupResults(items)} variant="page" />);
  try {
    expect(view.container.textContent).toContain("Logo");
    expect(view.container.textContent).toContain("System Admin");
    expect(view.container.textContent).toContain("SA");
    expect(view.container.textContent).toContain("Homepage");
    expect(view.container.textContent).toContain("View All");
    const img = view.container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/logo.png");
  } finally {
    view.cleanup();
  }
});

test("page variant empty state uses supplied copy", () => {
  const view = mount(
    <SearchResults
      query="missing"
      groups={[]}
      variant="page"
      emptyState={{
        title: 'No results for "missing".',
        description: "Try a more specific title.",
      }}
    />
  );
  try {
    expect(view.container.textContent).toContain('No results for "missing".');
    expect(view.container.textContent).toContain("Try a more specific title.");
  } finally {
    view.cleanup();
  }
});

test("highlight escapes regex metacharacters in the query", () => {
  const items: SearchItem[] = [{ id: "p-1", title: "C++ (FAQ)", type: "page" }];
  const view = mount(<SearchResults query="C+ (F" groups={groupResults(items)} variant="page" />);
  try {
    expect(view.container.textContent).toContain("C++ (FAQ)");
    const highlighted = view.container.querySelectorAll("span[class*='text-primary']");
    expect(highlighted.length).toBeGreaterThan(0);
  } finally {
    view.cleanup();
  }
});

test("View All wires the content type through onViewAll", () => {
  const onViewAll = vi.fn();
  const items: SearchItem[] = [
    { id: "p-1", title: "Homepage", type: "page" },
    { id: "e-1", title: "News", type: "entry" },
  ];
  const view = mount(
    <SearchResults query="page" groups={groupResults(items)} variant="page" onViewAll={onViewAll} />
  );
  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const pagesButton = buttons.find(
      (button) =>
        button.textContent?.includes("View All") &&
        button.parentElement?.textContent?.includes("Pages")
    );
    click(pagesButton ?? buttons[0]);
    expect(onViewAll).toHaveBeenCalledWith("page");
  } finally {
    view.cleanup();
  }
});

test("media cards prefetch on hover and select on click", () => {
  const onSelect = vi.fn();
  const onPrefetch = vi.fn();
  const items: SearchItem[] = [{ id: "m-1", title: "Logo", type: "media", subtitle: "logo.png" }];
  const view = mount(
    <SearchResults
      query="logo"
      groups={groupResults(items)}
      variant="page"
      onSelect={onSelect}
      onPrefetch={onPrefetch}
    />
  );
  try {
    const button = Array.from(view.container.querySelectorAll("button")).find((entry) =>
      entry.textContent?.includes("Logo")
    );
    hover(button);
    click(button);
    expect(onPrefetch).toHaveBeenCalledWith(items[0]);
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  } finally {
    view.cleanup();
  }
});

test("dropdown variant highlights the active item across groups", () => {
  const items: SearchItem[] = [
    { id: "p-1", title: "Homepage", type: "page" },
    { id: "e-1", title: "Launch", type: "entry" },
  ];
  const view = mount(<SearchResults query="launch" groups={groupResults(items)} activeIndex={1} />);
  try {
    const rows = Array.from(view.container.querySelectorAll("button[data-active]"));
    const active = rows.find((row) => row.getAttribute("data-active") === "true");
    expect(active?.textContent).toContain("Launch");
  } finally {
    view.cleanup();
  }
});

test("dropdown empty state falls back to the default copy", () => {
  const view = mount(<SearchResults query="nothing" groups={[]} />);
  try {
    expect(view.container.textContent).toContain('No results for "nothing".');
  } finally {
    view.cleanup();
  }
});

test("list rows render subtitles and meta badges", () => {
  const items: SearchItem[] = [
    {
      id: "e-1",
      title: "News item",
      type: "entry",
      subtitle: "news",
      meta: "Content item",
      entryTypeSlug: "news",
    },
  ];
  const view = mount(<SearchResults query="news" groups={groupResults(items)} />);
  try {
    expect(view.container.textContent).toContain("News item");
    expect(view.container.textContent).toContain("news");
    expect(view.container.textContent).toContain("entry");
  } finally {
    view.cleanup();
  }
});

test("highlight returns text unchanged for empty or whitespace queries", () => {
  const items: SearchItem[] = [{ id: "p-1", title: "Homepage", type: "page" }];
  const view = mount(<SearchResults query="  " groups={groupResults(items)} variant="page" />);
  try {
    expect(view.container.textContent).toContain("Homepage");
  } finally {
    view.cleanup();
  }
});

test("media cards prefetch on focus", () => {
  const onPrefetch = vi.fn();
  const items: SearchItem[] = [{ id: "m-1", title: "Logo", type: "media", subtitle: "logo.png" }];
  const view = mount(
    <SearchResults
      query="logo"
      groups={groupResults(items)}
      variant="page"
      onSelect={() => undefined}
      onPrefetch={onPrefetch}
    />
  );
  try {
    const button = Array.from(view.container.querySelectorAll("button")).find((entry) =>
      entry.textContent?.includes("Logo")
    );
    focus(button);
    expect(onPrefetch).toHaveBeenCalledWith(items[0]);
  } finally {
    view.cleanup();
  }
});

test("user cards prefetch on hover and select on click", () => {
  const onSelect = vi.fn();
  const onPrefetch = vi.fn();
  const items: SearchItem[] = [
    { id: "u-1", title: "System Admin", type: "user", subtitle: "admin", initials: "SA" },
  ];
  const view = mount(
    <SearchResults
      query="admin"
      groups={groupResults(items)}
      variant="page"
      onSelect={onSelect}
      onPrefetch={onPrefetch}
    />
  );
  try {
    const button = Array.from(view.container.querySelectorAll("button")).find((entry) =>
      entry.textContent?.includes("System Admin")
    );
    hover(button);
    click(button);
    expect(onPrefetch).toHaveBeenCalledWith(items[0]);
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  } finally {
    view.cleanup();
  }
});

test("list rows prefetch on focus and select on click", () => {
  const onSelect = vi.fn();
  const onPrefetch = vi.fn();
  const items: SearchItem[] = [
    { id: "e-1", title: "Launch News", type: "entry", subtitle: "launch", entryTypeSlug: "news" },
  ];
  const view = mount(
    <SearchResults
      query="launch"
      groups={groupResults(items)}
      variant="page"
      onSelect={onSelect}
      onPrefetch={onPrefetch}
    />
  );
  try {
    const button = Array.from(view.container.querySelectorAll("button")).find((entry) =>
      entry.textContent?.includes("Launch News")
    );
    focus(button);
    click(button);
    expect(onPrefetch).toHaveBeenCalledWith(items[0]);
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  } finally {
    view.cleanup();
  }
});

test("dropdown rows prefetch on hover and select on click", () => {
  const onSelect = vi.fn();
  const onPrefetch = vi.fn();
  const items: SearchItem[] = [
    { id: "p-1", title: "Homepage", type: "page", subtitle: "homepage" },
  ];
  const view = mount(
    <SearchResults
      query="home"
      groups={groupResults(items)}
      onSelect={onSelect}
      onPrefetch={onPrefetch}
    />
  );
  try {
    const row = Array.from(view.container.querySelectorAll("button")).find((entry) =>
      entry.textContent?.includes("Homepage")
    );
    hover(row);
    click(row);
    expect(onPrefetch).toHaveBeenCalledWith(items[0]);
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  } finally {
    view.cleanup();
  }
});

test("list rows prefetch on hover and user cards prefetch on focus", () => {
  const onPrefetch = vi.fn();
  const items: SearchItem[] = [
    { id: "p-1", title: "Homepage", type: "page", subtitle: "Home" },
    { id: "u-1", title: "Ada Lovelace", type: "user", initials: "AL" },
  ];
  const view = mount(
    <SearchResults query="a" groups={groupResults(items)} variant="page" onPrefetch={onPrefetch} />
  );
  try {
    const listButton = Array.from(view.container.querySelectorAll("button")).find((entry) =>
      entry.textContent?.includes("Homepage")
    );
    hover(listButton);
    expect(onPrefetch).toHaveBeenCalledWith(items[0]);

    const userButton = Array.from(view.container.querySelectorAll("button")).find((entry) =>
      entry.textContent?.includes("Ada Lovelace")
    );
    focus(userButton);
    expect(onPrefetch).toHaveBeenCalledWith(items[1]);
  } finally {
    view.cleanup();
  }
});

test("dropdown rows prevent text selection on mousedown and prefetch on focus", () => {
  const onPrefetch = vi.fn();
  const onSelect = vi.fn();
  const items: SearchItem[] = [{ id: "p-1", title: "Homepage", type: "page" }];
  const view = mount(
    <SearchResults
      query="home"
      groups={groupResults(items)}
      onPrefetch={onPrefetch}
      onSelect={onSelect}
    />
  );
  try {
    const row = view.container.querySelector("button[data-active]");
    const prevented = mousedown(row);
    expect(prevented).toBe(true);
    focus(row);
    expect(onPrefetch).toHaveBeenCalledWith(items[0]);
  } finally {
    view.cleanup();
  }
});
