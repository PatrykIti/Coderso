// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";
import {
  flushMicrotasks,
  mount,
  pagePostState,
  setInputValue,
  setSelectValue,
} from "./pagePostListFixtures";

test("PageFilters forwards query and filter changes", async () => {
  const { PageFilters } = await import("../../../core/admin/ui/pages/PageFilters");

  const onSearchChange = vi.fn();
  const onStatusChange = vi.fn();
  const onAuthorChange = vi.fn();

  const view = mount(
    <PageFilters
      search="home"
      status="draft"
      author="any"
      authorOptions={[{ value: "author-1", label: "Admin" }]}
      searchPlaceholder="Search posts by title..."
      searchAriaLabel="Search posts by title"
      onSearchChange={onSearchChange}
      onStatusChange={onStatusChange}
      onAuthorChange={onAuthorChange}
    />
  );

  try {
    const input = view.container.querySelector("input");
    const selects = Array.from(view.container.querySelectorAll("select"));

    React.act(() => {
      setInputValue(input ?? undefined, "pricing");
      setSelectValue(selects[0], "published");
      setSelectValue(selects[1], "author-1");
    });

    expect(input?.getAttribute("placeholder")).toBe("Search posts by title...");
    expect(input?.getAttribute("aria-label")).toBe("Search posts by title");
    expect(onSearchChange).toHaveBeenCalledWith("pricing");
    expect(onStatusChange).toHaveBeenCalledWith("published");
    expect(onAuthorChange).toHaveBeenCalledWith("author-1");
  } finally {
    view.cleanup();
  }
});

test("PageListPage loads without cache, refreshes on matching cache events, and surfaces load failures", async () => {
  pagePostState.cachedPagesOverride = null;
  pagePostState.pageError = pagePostState.apiError("Pages unavailable.");
  pagePostState.getUserSettings.mockRejectedValueOnce(new Error("prefs unavailable"));

  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");

  const view = mount(<PageListPage />);

  try {
    expect(view.container.textContent).toContain("Loading pages");

    await React.act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Pages unavailable.");
    expect(pagePostState.getUserSettings).toHaveBeenCalled();

    pagePostState.pageError = new Error("generic page load failure");
    await React.act(async () => {
      pagePostState.pageSubscribers.forEach((handler) => handler({ key: "pagesList" }));
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Failed to load pages.");

    pagePostState.pageError = null;
    await React.act(async () => {
      pagePostState.pageSubscribers.forEach((handler) => handler({ key: "pagesList" }));
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Landing");
    expect(pagePostState.pageRefreshCalls).toEqual([
      { force: true, background: true },
      { force: true, background: true },
      { force: true, background: true },
    ]);
  } finally {
    view.cleanup();
  }
});

test("PageListPage opens drawer via sheet controls, creates with navigation, and reports action failures", async () => {
  Object.defineProperty(window, "open", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });

  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");

  const view = mount(<PageListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    const titleInput = () => view.container.querySelector('input[placeholder="e.g. About us"]');

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "sheet-trigger-open")
        ?.click();
    });
    expect(
      view.container.querySelector("[data-has-open-change='true']")?.getAttribute("data-sheet-open")
    ).toBe("true");

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "sheet-trigger-close")
        ?.click();
    });
    expect(
      view.container.querySelector("[data-has-open-change='true']")?.getAttribute("data-sheet-open")
    ).toBe("false");

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "New")
        ?.click();
      setInputValue(titleInput() ?? undefined, "Docs Home");
    });
    await React.act(async () => {
      await flushMicrotasks();
    });

    pagePostState.createPageError = new Error("create page generic failure");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "Create Page")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to create page.");
    expect(pagePostState.toastError).toHaveBeenCalledWith("Failed to create page.");

    pagePostState.createPageError = null;
    await React.act(async () => {
      setInputValue(titleInput() ?? undefined, "Docs Home");
      await flushMicrotasks();
      buttons()
        .find((button) => button.textContent === "Create Page")
        ?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.navigateCalls).toContain("/pages/created-page");
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith('Page "Docs Home" created.');

    pagePostState.previewPageError = pagePostState.apiError("Preview page denied.");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "preview-page-row")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Preview page denied.");

    pagePostState.publishPageError = new Error("publish page generic failure");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "publish-page-row")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to publish page.");
    expect(pagePostState.toastError).toHaveBeenCalledWith("Failed to publish page.");

    pagePostState.unpublishPageError = pagePostState.apiError("Unpublish page denied.");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "unpublish-page-row")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Unpublish page denied.");

    pagePostState.duplicatePageError = new Error("duplicate page generic failure");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "duplicate-page-row")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to duplicate page.");

    pagePostState.deletePageError = pagePostState.apiError("Delete page denied.");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "delete-page-row")
        ?.click();
      await flushMicrotasks();
      buttons()
        .find((button) => button.textContent === "Delete page")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Delete page denied.");
    expect(pagePostState.toastError).toHaveBeenCalledWith("Delete page denied.");
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "open");
  }
});

test("PageListPage applies filters, refreshes on cache events, and creates without editor navigation when preference is off", async () => {
  pagePostState.pages = [
    pagePostState.pages[0],
    {
      ...pagePostState.pages[0],
      id: "page-2",
      title: "Docs hub",
      slug: "/docs",
      status: "published",
      author: {
        id: "author-2",
        name: "Editor",
        email: "editor@example.com",
      },
    },
  ];

  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");

  const view = mount(<PageListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Showing 1-2 of 2 pages");
    expect(pagePostState.pageRefreshCalls).toEqual([{ force: false, background: undefined }]);

    const searchInput = view.container.querySelector(
      'input[placeholder="Search pages by title..."]'
    );
    const selects = Array.from(view.container.querySelectorAll("select"));
    const statusSelect = selects.find((select) =>
      select.querySelector('option[value="scheduled"]')
    );
    const authorSelect = selects.find((select) => select.querySelector('option[value="author-2"]'));

    React.act(() => {
      setInputValue(searchInput ?? undefined, "missing");
    });

    expect(view.container.textContent).toContain("No pages match your current filters.");
    expect(view.container.textContent).toContain("Showing 0 of 0 pages");

    React.act(() => {
      setInputValue(searchInput ?? undefined, "docs");
      setSelectValue(statusSelect, "published");
      setSelectValue(authorSelect, "author-2");
    });

    expect(view.container.textContent).toContain("Docs hub");
    expect(view.container.textContent).toContain("Showing 1-1 of 1 pages");
    expect(
      Array.from(view.container.querySelectorAll("button")).filter(
        (button) => button.textContent === "edit-page-row"
      )
    ).toHaveLength(1);

    await React.act(async () => {
      pagePostState.pageSubscribers.forEach((handler) => handler({ key: "postsList" }));
      await flushMicrotasks();
    });

    expect(pagePostState.pageRefreshCalls).toHaveLength(1);

    await React.act(async () => {
      pagePostState.pageSubscribers.forEach((handler) => handler({ key: "pagesList" }));
      await flushMicrotasks();
    });

    expect(pagePostState.pageRefreshCalls).toEqual([
      { force: false, background: undefined },
      { force: true, background: true },
    ]);

    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "New")
        ?.click();
    });

    expect(
      view.container.querySelector("[data-has-open-change='true']")?.getAttribute("data-sheet-open")
    ).toBe("true");

    const openAfterCreateToggle = view.container.querySelector("#page-open-after-create");
    const titleInput = view.container.querySelector('input[placeholder="e.g. About us"]');

    await React.act(async () => {
      if (openAfterCreateToggle instanceof HTMLInputElement) {
        openAfterCreateToggle.click();
      }
      setInputValue(titleInput ?? undefined, "Support");
      buttons()
        .find((button) => button.textContent === "Create Page")
        ?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.setUserSettingCalls).toContainEqual({
      key: "pages.openAfterCreate",
      value: false,
    });
    // New pages scaffold an empty Page v2 document (sections model), not the
    // legacy blocks array.
    expect(pagePostState.createPageCalls).toEqual([
      {
        title: "Support",
        slug: "/support",
        template: "landing",
        data: {
          schemaVersion: 2,
          sections: [],
          settings: { template: "landing", showInNav: true },
        },
      },
    ]);
    expect(pagePostState.pageRefreshCalls).toEqual([
      { force: false, background: undefined },
      { force: true, background: true },
      { force: true, background: true },
    ]);
    expect(pagePostState.navigateCalls).not.toContain("/pages/created-page");
    expect(
      view.container.querySelector("[data-has-open-change='true']")?.getAttribute("data-sheet-open")
    ).toBe("false");
  } finally {
    view.cleanup();
  }
});

test("PageListPage shows bulk actions for visible selection, trims hidden selection, and applies publish", async () => {
  pagePostState.pages = [
    pagePostState.pages[0],
    {
      ...pagePostState.pages[0],
      id: "page-2",
      title: "Docs hub",
      slug: "/docs",
      status: "draft",
      author: {
        id: "author-2",
        name: "Editor",
        email: "editor@example.com",
      },
    },
  ];

  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");

  const view = mount(<PageListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    const searchInput = view.container.querySelector(
      'input[placeholder="Search pages by title..."]'
    );

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "toggle-page-all")
        ?.click();
    });

    expect(view.container.textContent).toContain("Selected 2");
    expect(view.container.textContent).toContain("page-selected:2");
    expect(view.container.querySelector('[data-page-bulk-actions="inline"]')).not.toBeNull();
    expect(view.container.querySelector('[data-page-bulk-actions="card"]')).toBeNull();
    expect((view.container.textContent ?? "").indexOf("Selected 2")).toBeLessThan(
      (view.container.textContent ?? "").indexOf("New")
    );

    React.act(() => {
      setInputValue(searchInput ?? undefined, "docs");
    });

    expect(view.container.textContent).toContain("Selected 1");
    expect(view.container.textContent).toContain("page-selected:1");
    expect(view.container.textContent).toContain("Docs hub");
    expect(
      Array.from(view.container.querySelectorAll("button")).filter(
        (button) => button.textContent === "edit-page-row"
      )
    ).toHaveLength(1);

    const bulkSelect = Array.from(view.container.querySelectorAll("select")).find((select) =>
      select.querySelector('option[value="publish"]')
    );

    React.act(() => {
      setSelectValue(bulkSelect, "publish");
    });

    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "Apply")
        ?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.publishPageCalls).toEqual(["page-2"]);
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("1 page published.");
    expect(view.container.textContent).not.toContain("Selected 1");
    expect(pagePostState.pageRefreshCalls).toEqual([
      { force: false, background: undefined },
      { force: true, background: true },
    ]);
  } finally {
    view.cleanup();
  }
});

test("PageCreateDrawer normalizes create payloads and toggles", async () => {
  const { PageCreateDrawer } = await import("../../../core/admin/ui/pages/PageCreateDrawer");

  const onCreatePage = vi.fn();
  const onOpenAfterCreateChange = vi.fn();
  const onOpenChange = vi.fn();

  const view = mount(
    <PageCreateDrawer
      open
      onOpenChange={onOpenChange}
      onCreate={onCreatePage}
      openAfterCreate
      onOpenAfterCreateChange={onOpenAfterCreateChange}
      error="Page error"
    />
  );

  try {
    expect(view.container.textContent).toContain("Unable to create page");

    const inputs = Array.from(view.container.querySelectorAll("input"));
    const selects = Array.from(view.container.querySelectorAll("select"));
    const buttons = Array.from(view.container.querySelectorAll("button")) as HTMLButtonElement[];
    const toggles = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];

    React.act(() => {
      setInputValue(
        view.container.querySelector('input[placeholder="e.g. About us"]') ?? undefined,
        "About us"
      );
      setSelectValue(selects[0], "contact");
      buttons.find((button) => button.textContent === "Create Page")?.click();
    });

    React.act(() => {
      toggles[0]?.click();
      buttons
        .find((button) => button.getAttribute("aria-label") === "Close create page drawer")
        ?.click();
    });

    expect(onCreatePage).toHaveBeenCalledWith({
      title: "About us",
      slug: "/about-us",
      template: "contact",
      openAfterCreate: true,
    });
    expect(onOpenAfterCreateChange).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PageListPage scopes selection to the paginated visible rows", async () => {
  pagePostState.pages = Array.from({ length: 12 }, (_, index) => ({
    ...pagePostState.pages[0],
    id: `page-${index + 1}`,
    title: `Page ${String(index + 1).padStart(2, "0")}`,
    slug: `/page-${index + 1}`,
  }));

  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");

  const view = mount(<PageListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "toggle-page-all")
        ?.click();
    });

    expect(view.container.textContent).toContain("Selected 10");
    expect(view.container.textContent).toContain("page-selected:10");

    await React.act(async () => {
      buttons()
        .filter((button) => button.textContent === "Next")[0]
        ?.click();
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Page 11");
    expect(view.container.textContent).toContain("page-selected:0");
    expect(view.container.textContent).not.toContain("Selected 10");
  } finally {
    view.cleanup();
  }
});

test("PageListPage drives create, preview, publish, duplicate, delete, and preferences", async () => {
  Object.defineProperty(window, "open", {
    configurable: true,
    writable: true,
    value: (url: string) => pagePostState.previewUrlCalls.push(url),
  });
  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");

  const view = mount(<PageListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Pages");

    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "New")
        ?.click();
      buttons()
        .find((button) => button.textContent === "edit-page-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "preview-page-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "publish-page-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "unpublish-page-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "duplicate-page-row")
        ?.click();
      await flushMicrotasks();
    });

    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "delete-page-row")
        ?.click();
      await flushMicrotasks();
      buttons()
        .find((button) => button.textContent === "Delete page")
        ?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.previewPageCalls).toContain("page-1");
    expect(pagePostState.publishPageCalls).toContain("page-1");
    expect(pagePostState.unpublishPageCalls).toContain("page-1");
    expect(pagePostState.duplicatePageCalls).toContain("page-1");
    expect(pagePostState.deletePageCalls).toContain("page-1");
    expect(pagePostState.previewUrlCalls).toContain("https://preview.test/page");
    expect(pagePostState.navigateCalls).toContain("/pages/page-1");
    expect(pagePostState.navigateCalls).toContain("/pages/duplicated-page");
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("Page published.");
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("Page unpublished.");
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("Page deleted.");
    expect(pagePostState.getUserSettings).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
