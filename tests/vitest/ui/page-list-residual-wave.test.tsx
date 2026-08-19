// @vitest-environment happy-dom
//
// TASK-105-05 page editor wave, LEAF B2 — PageListPage residual branch
// closure. Extends the shared pageListPageWaveFixtures harness with the
// failure branches and bulk/selection paths the page-post-list wave leaves
// uncovered: preview/publish/unpublish/duplicate/delete error surfaces,
// toggle-all selection, bulk delete confirmation, bulk failure inline
// messages, the empty filter message, and the silent open-after-create
// preference failure.

import React from "react";
import { expect, test, vi } from "vitest";

import {
  flushMicrotasks,
  mount,
  pagePostState,
  setInputValue,
  setSelectValue,
} from "./pageListPageWaveFixtures";

const apiError = (message: string) => ({
  name: "ApiClientError",
  message,
  code: "request_failed",
  status: 400,
});

const buttons = (container: Element) => Array.from(container.querySelectorAll("button"));

const clickButtonByText = (container: Element, label: string) => {
  const button = buttons(container).find((candidate) => candidate.textContent === label);
  expect(button, `button with text ${label}`).toBeTruthy();
  React.act(() => {
    button?.click();
  });
};

const flush = async () => {
  await React.act(async () => {
    await flushMicrotasks();
  });
};

const twoPages = () => [
  {
    id: "page-1",
    title: "Landing",
    slug: "/landing",
    status: "draft" as "draft" | "published" | "scheduled" | "archived",
    updatedAt: "2026-03-06T12:00:00.000Z",
    author: { id: "author-1", name: "Admin", email: "admin@example.com" },
  },
  {
    id: "page-2",
    title: "About",
    slug: "/about",
    status: "published" as "draft" | "published" | "scheduled" | "archived",
    updatedAt: "2026-03-06T13:00:00.000Z",
    author: { id: "author-1", name: "Admin", email: "admin@example.com" },
  },
];

test("PageListPage preview failure surfaces the api message then the generic fallback", async () => {
  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    await flush();

    pagePostState.previewPageError = apiError("Preview unavailable");
    clickButtonByText(view.container, "preview-page-row");
    await flush();

    expect(view.container.textContent).toContain("Pages API error");
    expect(view.container.textContent).toContain("Preview unavailable");

    pagePostState.previewPageError = new Error("boom");
    clickButtonByText(view.container, "preview-page-row");
    await flush();

    expect(view.container.textContent).toContain("Failed to generate preview.");
  } finally {
    view.cleanup();
  }
});

test("PageListPage publish and unpublish failures show alerts without success toasts", async () => {
  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    await flush();

    pagePostState.publishPageError = apiError("Publish blocked");
    clickButtonByText(view.container, "publish-page-row");
    await flush();

    expect(view.container.textContent).toContain("Publish blocked");
    expect(pagePostState.toastSuccess).not.toHaveBeenCalledWith("Page published.");

    pagePostState.publishPageError = null;
    pagePostState.unpublishPageError = new Error("boom");
    clickButtonByText(view.container, "unpublish-page-row");
    await flush();

    expect(view.container.textContent).toContain("Failed to unpublish page.");
    expect(pagePostState.toastSuccess).not.toHaveBeenCalledWith("Page unpublished.");
  } finally {
    view.cleanup();
  }
});

test("PageListPage duplicate failures stay on the list and show the api or fallback message", async () => {
  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    await flush();

    pagePostState.duplicatePageError = apiError("Duplicate denied");
    clickButtonByText(view.container, "duplicate-page-row");
    await flush();

    expect(view.container.textContent).toContain("Duplicate denied");
    expect(pagePostState.navigateCalls).not.toContain("/pages/duplicated-page");

    pagePostState.duplicatePageError = new Error("boom");
    clickButtonByText(view.container, "duplicate-page-row");
    await flush();

    expect(view.container.textContent).toContain("Failed to duplicate page.");
    expect(pagePostState.navigateCalls).not.toContain("/pages/duplicated-page");
  } finally {
    view.cleanup();
  }
});

test("PageListPage delete failure resets the confirming state and surfaces the fallback", async () => {
  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    await flush();

    pagePostState.deletePageError = new Error("boom");
    clickButtonByText(view.container, "delete-page-row");
    await flush();

    expect(view.container.textContent).toContain("Delete page?");
    clickButtonByText(view.container, "Delete page");
    await flush();

    expect(pagePostState.deletePageCalls).toEqual(["page-1"]);
    expect(view.container.textContent).toContain("Failed to delete page.");
    expect(view.container.textContent).not.toContain("Delete page?");
  } finally {
    view.cleanup();
  }
});

test("PageListPage toggle-all selects visible rows and the bulk bar applies a confirmed delete", async () => {
  pagePostState.pages = twoPages();
  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    await flush();

    clickButtonByText(view.container, "toggle-page-all");
    await flush();

    expect(view.container.textContent).toContain("page-selected:2");
    expect(view.container.textContent).toContain("Selected 2");

    const select = view.container.querySelector("select");
    React.act(() => {
      setSelectValue(select, "delete");
    });
    await flush();

    clickButtonByText(view.container, "Apply");
    await flush();

    expect(view.container.textContent).toContain("Delete 2 pages?");
    clickButtonByText(view.container, "Delete selected");
    await flush();

    expect(pagePostState.deletePageCalls).toEqual(["page-1", "page-2"]);
    expect(view.container.textContent).toContain("page-selected:0");
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("2 pages deleted.");
  } finally {
    view.cleanup();
  }
});

test("PageListPage bulk publish failure shows the inline summary message", async () => {
  pagePostState.pages = twoPages();
  pagePostState.publishPageError = apiError("Publish blocked");
  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    await flush();

    clickButtonByText(view.container, "toggle-page-all");
    await flush();

    const select = view.container.querySelector("select");
    React.act(() => {
      setSelectValue(select, "publish");
    });
    await flush();

    clickButtonByText(view.container, "Apply");
    await flush();

    expect(pagePostState.publishPageCalls).toEqual(["page-1", "page-2"]);
    expect(view.container.textContent).toContain("Failed to publish 2 pages.");
    expect(view.container.textContent).toContain("page-selected:0");
  } finally {
    view.cleanup();
  }
});

test("PageListPage bulk apply is inert without a chosen action", async () => {
  pagePostState.pages = twoPages();
  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    await flush();

    clickButtonByText(view.container, "toggle-page-all");
    await flush();

    const apply = buttons(view.container).find((button) => button.textContent === "Apply");
    expect((apply as HTMLButtonElement | undefined)?.disabled).toBe(true);
    expect(pagePostState.publishPageCalls).toEqual([]);
    expect(pagePostState.deletePageCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("PageListPage empty filter message renders when search matches nothing", async () => {
  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    await flush();

    const search = view.container.querySelector('input[aria-label="Search pages by title"]');
    React.act(() => {
      setInputValue(search, "no-such-page");
    });
    await flush();

    expect(view.container.textContent).toContain("No pages match your current filters.");
  } finally {
    view.cleanup();
  }
});

test("PageListPage open-after-create preference failure stays silent and keeps the drawer usable", async () => {
  const { setUserSetting } = await import("@/services/userSettingsClient");
  vi.mocked(setUserSetting).mockRejectedValueOnce(new Error("prefs down"));

  const { PageListPage } = await import("../../../core/admin/ui/pages/PageListPage");
  const view = mount(<PageListPage />);

  try {
    await flush();

    clickButtonByText(view.container, "New");
    await flush();

    const toggle = view.container.querySelector('input[id="page-open-after-create"]');
    expect(toggle).toBeTruthy();
    React.act(() => {
      (toggle as HTMLInputElement).click();
    });
    await flush();

    expect(setUserSetting).toHaveBeenCalledWith("pages.openAfterCreate", false);
    expect(view.container.textContent).not.toContain("Pages API error");
  } finally {
    view.cleanup();
  }
});
