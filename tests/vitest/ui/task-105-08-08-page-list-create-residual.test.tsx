// @vitest-environment happy-dom

// TASK-105-08-08-L01 — pages reachable coverage: list + create residual.
//
// Drives the public PageListPage / PageCreateDrawer controls and asserts visible
// DOM state plus the externally observable pagesClient payloads. Admin clients
// are mocked at their module seams by `./pagePostListFixtures` (read-only).

import React from "react";
import { expect, test, vi } from "vitest";

import {
  flushMicrotasks,
  mount,
  pagePostState,
  setInputValue,
  setSelectValue,
} from "./pagePostListFixtures";

const buttonsIn = (container: ParentNode) => Array.from(container.querySelectorAll("button"));

const clickButtonWithText = (container: ParentNode, text: string) => {
  const button = buttonsIn(container).find((entry) => entry.textContent === text);
  expect(button, `expected a "${text}" button`).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const sheetOpenState = (container: ParentNode) =>
  container.querySelector("[data-has-open-change='true']")?.getAttribute("data-sheet-open");

test("pages list hydrates from cold cache, refreshes on matching cache events, and ignores foreign keys", async () => {
  pagePostState.cachedPagesOverride = null;

  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    // Cold cache: the mount refresh is forced and blocks the loading shell.
    expect(view.container.textContent).toContain("Loading pages...");

    await React.act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Landing");
    expect(pagePostState.pageRefreshCalls).toEqual([{ force: true, background: true }]);

    // Foreign cache keys never trigger a pages refresh.
    await React.act(async () => {
      pagePostState.pageSubscribers.forEach((handler) => handler({ key: "postsList" }));
      await flushMicrotasks();
    });
    expect(pagePostState.pageRefreshCalls).toEqual([{ force: true, background: true }]);

    // A matching pagesList cache event forces a background refresh.
    await React.act(async () => {
      pagePostState.pageSubscribers.forEach((handler) => handler({ key: "pagesList" }));
      await flushMicrotasks();
    });
    expect(pagePostState.pageRefreshCalls).toEqual([
      { force: true, background: true },
      { force: true, background: true },
    ]);
    expect(view.container.textContent).toContain("Showing 1-1 of 1 pages");
  } finally {
    view.cleanup();
  }
});

test("create drawer edits the slug independently of the title, navigates after create, and closes on cancel", async () => {
  Object.defineProperty(window, "open", { configurable: true, writable: true, value: vi.fn() });

  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    const slugInput = () =>
      view.container.querySelector('input[placeholder="/about"]') as HTMLInputElement | null;
    const titleInput = () =>
      view.container.querySelector('input[placeholder="e.g. About us"]') as HTMLInputElement | null;

    expect(slugInput()).toBeTruthy();

    // Opening the drawer routes through handleDrawerOpenChange -> setCreateOpen(true).
    clickButtonWithText(view.container, "New");
    expect(sheetOpenState(view.container)).toBe("true");

    // A generated slug follows the title until the slug field is edited.
    React.act(() => {
      setInputValue(titleInput() ?? undefined, "Docs Home");
    });
    expect(slugInput()?.value).toBe("/docs-home");

    // Editing the slug marks it touched, so later title edits no longer win.
    React.act(() => {
      setInputValue(slugInput() ?? undefined, "new-page");
      setInputValue(titleInput() ?? undefined, "Docs Home Renamed");
    });
    expect(slugInput()?.value).toBe("new-page");

    // Preference default opens the created page: the drawer stays open after navigate.
    await React.act(async () => {
      clickButtonWithText(view.container, "Create Page");
      await flushMicrotasks();
    });

    expect(pagePostState.createPageCalls).toEqual([
      expect.objectContaining({ title: "Docs Home Renamed", slug: "/new-page" }),
    ]);
    expect(pagePostState.navigateCalls).toContain("/pages/created-page");
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith('Page "Docs Home Renamed" created.');
    expect(sheetOpenState(view.container)).toBe("true");

    // Cancel closes the drawer through onOpenChange(false).
    clickButtonWithText(view.container, "Cancel");
    expect(sheetOpenState(view.container)).toBe("false");
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "open");
  }
});

test("bulk apply gates empty selections, confirms bulk delete, then resets selection with a toast", async () => {
  pagePostState.pages = [
    ...pagePostState.pages,
    { ...pagePostState.pages[0]!, id: "page-2", title: "Docs hub", slug: "/docs" },
  ];

  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    const bulkSelect = () =>
      Array.from(view.container.querySelectorAll("select")).find((select) =>
        Array.from(select.querySelectorAll("option")).some((option) => option.value === "unpublish")
      );

    // No selection yet: the bulk bar is absent.
    expect(view.container.querySelector("[data-page-bulk-actions]")).toBeNull();

    React.act(() => {
      clickButtonWithText(view.container, "toggle-page-first");
    });
    expect(view.container.textContent).toContain("page-selected:1");
    expect(view.container.querySelector("[data-page-bulk-actions='inline']")).toBeTruthy();

    // Apply without an action is a no-op.
    clickButtonWithText(view.container, "Apply");
    expect(pagePostState.publishPageCalls).toEqual([]);
    expect(pagePostState.deletePageCalls).toEqual([]);

    // Choosing delete routes the bulk action through the confirm dialog.
    React.act(() => {
      setSelectValue(bulkSelect() ?? undefined, "delete");
      clickButtonWithText(view.container, "Apply");
    });

    expect(view.container.textContent).toContain("Delete selected pages?");
    expect(view.container.textContent).toContain("Delete 1 page? This cannot be undone.");
    expect(pagePostState.deletePageCalls).toEqual([]);

    await React.act(async () => {
      clickButtonWithText(view.container, "Delete selected");
      await flushMicrotasks();
    });

    expect(pagePostState.deletePageCalls).toEqual(["page-1"]);
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("1 page deleted.");
    // runBulkAction clears the selection once the bulk work settles.
    expect(view.container.textContent).toContain("page-selected:0");
    expect(view.container.querySelector("[data-page-bulk-actions]")).toBeNull();

    // A publish bulk run reports per-page results and reuses the same reset path.
    React.act(() => {
      clickButtonWithText(view.container, "toggle-page-first");
    });
    React.act(() => {
      setSelectValue(bulkSelect() ?? undefined, "publish");
      clickButtonWithText(view.container, "Apply");
    });

    expect(view.container.textContent).toContain("Applying...");
    await React.act(async () => {
      await flushMicrotasks();
    });

    expect(pagePostState.publishPageCalls).toEqual(["page-1"]);
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("1 page published.");
    expect(view.container.textContent).toContain("page-selected:0");
  } finally {
    view.cleanup();
  }
});
