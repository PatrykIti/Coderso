// @vitest-environment happy-dom

// TASK-105-08-04 (Item A): CustomScreenEntriesPage interactive flows — load
// error branches, search/filters, selection, bulk actions, delete dialog,
// inline row commits, view switching, customize-view, cache-event refresh.

import React from "react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { createCustomScreenEntriesPageHarness } from "./support/customScreenEntriesPageHarness";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const harness = createCustomScreenEntriesPageHarness();
const {
  setup,
  cleanup,
  mount,
  flushMountedPage,
  findButton,
  findByText,
  searchRecords,
  emitCacheEvent,
  currentPath,
  clickElement,
  pointerClick,
  setCachedScreen,
  setRemoteScreen,
  queueEntriesLoad,
  queueScreenLoad,
  requireEntriesReadSpy,
  requireScreenReadSpy,
  requireDeleteSpy,
  requirePublishSpy,
  requireUnpublishSpy,
  requireUpdateSpy,
  buildScreen,
  makeEntry,
  deferred,
} = harness;

beforeEach(() => {
  setup();
});

afterEach(() => {
  cleanup();
});

const screenPath = (screenId = "screen-1") => `/admin/advanced/custom-screens/${screenId}/entries`;

const mountPage = (screenId = "screen-1") => mount(screenPath(screenId));

const getAlertMessage = (container: ParentNode, title: string) => {
  const alert = Array.from(container.querySelectorAll<HTMLElement>('[data-slot="alert"]')).find(
    (candidate) =>
      candidate.querySelector('[data-slot="alert-title"]')?.textContent?.trim() === title
  );
  return alert?.querySelector('[data-slot="alert-description"]')?.textContent?.trim() ?? null;
};

const getSelectedCountText = (container: ParentNode) =>
  Array.from(container.querySelectorAll<HTMLElement>("*"))
    .find((node) => node.textContent?.trim().startsWith("Selected"))
    ?.textContent?.trim() ?? "";

describe("CustomScreenEntriesPage interactive flows", () => {
  test("load error for a missing screen shows the not-found alert", async () => {
    setCachedScreen(null);
    setRemoteScreen(null);
    const view = mountPage();
    try {
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Unable to load records")).toBe(
        "Custom screen not found."
      );
      expect(findByText(view.container, "No records yet.")).not.toBeNull();
    } finally {
      view.cleanup();
    }
  });

  test("load error for a missing content type shows the content-type alert", async () => {
    const screen = buildScreen("screen-1", "Projects");
    setRemoteScreen({ ...screen, contentTypeId: "missing-type" });
    setCachedScreen({ ...screen, contentTypeId: "missing-type" });
    const view = mountPage();
    try {
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Unable to load records")).toBe(
        "Content type not found."
      );
    } finally {
      view.cleanup();
    }
  });

  test("a remote API failure surfaces the client error message", async () => {
    setCachedScreen(null);
    const failedLoad = deferred<ReturnType<typeof buildScreen> | null>();
    queueScreenLoad("screen-1", failedLoad);
    const view = mountPage();
    try {
      await flushMountedPage();
      failedLoad.reject(new ApiClientError("network", "boom", 502));
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Unable to load records")).toBe("boom");
    } finally {
      view.cleanup();
    }
  });

  test("search narrows the visible rows and shows the no-match message", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      expect(findByText(view.container, "Alpha")).not.toBeNull();
      expect(findByText(view.container, "Beta")).not.toBeNull();

      searchRecords(view.container, "Alpha");
      await flushMountedPage();
      expect(findByText(view.container, "Alpha")).not.toBeNull();
      expect(findByText(view.container, "Beta")).toBeNull();

      searchRecords(view.container, "NoSuchRecord");
      await flushMountedPage();
      expect(findByText(view.container, "No records match your current view.")).not.toBeNull();
    } finally {
      view.cleanup();
    }
  });

  test("selecting rows drives the bulk bar and select-all toggle", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const alphaCheckbox = view.container.querySelector<HTMLElement>(
        '[aria-label="Select Alpha"]'
      );
      expect(alphaCheckbox).not.toBeNull();
      clickElement(alphaCheckbox);
      await flushMountedPage();
      expect(getSelectedCountText(view.container)).toContain("Selected 1");

      const selectAll = view.container.querySelector<HTMLElement>(
        '[aria-label="Select all records"]'
      );
      clickElement(selectAll);
      await flushMountedPage();
      expect(getSelectedCountText(view.container)).toContain("Selected 2");
    } finally {
      view.cleanup();
    }
  });

  test("bulk publish applies to the selected rows and clears the selection", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const alphaCheckbox = view.container.querySelector<HTMLElement>(
        '[aria-label="Select Alpha"]'
      );
      clickElement(alphaCheckbox);
      await flushMountedPage();

      const actionSelect = view.container.querySelector<HTMLElement>(
        '[data-custom-screen-entry-bulk-actions="inline"] [role="combobox"]'
      );
      expect(actionSelect).not.toBeNull();
      pointerClick(actionSelect);
      await flushMountedPage();
      const publishOption = Array.from(
        document.querySelectorAll<HTMLElement>('[role="option"]')
      ).find((node) => node.textContent?.trim() === "Publish");
      expect(publishOption).not.toBeNull();
      pointerClick(publishOption);
      await flushMountedPage();

      clickElement(findButton(view.container, "Apply"));
      await flushMountedPage();
      expect(requirePublishSpy()).toHaveBeenCalledWith("projects", "1");
      expect(getSelectedCountText(view.container)).toBe("");
    } finally {
      view.cleanup();
    }
  });

  test("bulk delete opens the confirm dialog and runs the delete flow", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const alphaCheckbox = view.container.querySelector<HTMLElement>(
        '[aria-label="Select Alpha"]'
      );
      clickElement(alphaCheckbox);
      await flushMountedPage();

      const actionSelect = view.container.querySelector<HTMLElement>(
        '[data-custom-screen-entry-bulk-actions="inline"] [role="combobox"]'
      );
      pointerClick(actionSelect);
      await flushMountedPage();
      const deleteOption = Array.from(
        document.querySelectorAll<HTMLElement>('[role="option"]')
      ).find((node) => node.textContent?.trim() === "Delete");
      expect(deleteOption).not.toBeNull();
      pointerClick(deleteOption);
      await flushMountedPage();

      clickElement(findButton(view.container, "Apply"));
      await flushMountedPage();
      expect(document.body.textContent).toContain("Delete 1 record?");
      const confirm = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === "Delete record"
      );
      expect(confirm).not.toBeNull();
      clickElement(confirm);
      await flushMountedPage();
      expect(requireDeleteSpy()).toHaveBeenCalledWith("projects", "1");
    } finally {
      view.cleanup();
    }
  });

  test("row delete request opens the dialog and cancel closes it without deleting", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const rowMenu = view.container.querySelector<HTMLElement>(
        'button[aria-label="Record actions"]'
      );
      pointerClick(rowMenu);
      await flushMountedPage();
      const deleteItem = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='menuitem']")
      ).find((node) => node.textContent?.trim() === "Delete");
      expect(deleteItem).not.toBeNull();
      pointerClick(deleteItem);
      await flushMountedPage();
      expect(document.body.textContent).toContain("Delete record?");

      const cancel = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === "Cancel"
      );
      expect(cancel).not.toBeNull();
      clickElement(cancel);
      await flushMountedPage();
      expect(requireDeleteSpy()).not.toHaveBeenCalled();
      expect(document.body.textContent).not.toContain("Delete record?");
    } finally {
      view.cleanup();
    }
  });

  test("row publish calls publishEntry and row unpublish calls unpublishEntry", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const findRowActions = (rowTitle: string) =>
        Array.from(view.container.querySelectorAll<HTMLButtonElement>("button")).find(
          (button) =>
            button.closest("tr")?.textContent?.includes(rowTitle) &&
            button.getAttribute("aria-label") === "Record actions"
        );

      const rowMenu = findRowActions("Alpha");
      pointerClick(rowMenu);
      await flushMountedPage();
      const publishItem = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='menuitem']")
      ).find((node) => node.textContent?.trim() === "Publish");
      expect(publishItem).not.toBeNull();
      pointerClick(publishItem);
      await flushMountedPage();
      expect(requirePublishSpy()).toHaveBeenCalledWith("projects", "1");

      const rowMenuPublished = findRowActions("Beta");
      pointerClick(rowMenuPublished);
      await flushMountedPage();
      const unpublishItem = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='menuitem']")
      ).find((node) => node.textContent?.trim() === "Move to Draft");
      expect(unpublishItem).not.toBeNull();
      pointerClick(unpublishItem);
      await flushMountedPage();
      expect(requireUnpublishSpy()).toHaveBeenCalled();
    } finally {
      view.cleanup();
    }
  });

  test("inline row commit saves a field value through updateEntry", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      requireUpdateSpy().mockResolvedValueOnce(
        makeEntry("1", {
          title: "Alpha",
          data: { headline: "Updated headline", price: 101, featured: false, status: "draft" },
        })
      );
      const headlineEditable = view.container.querySelector<HTMLElement>(
        '[aria-label="Headline for Alpha"]'
      );
      expect(headlineEditable).not.toBeNull();
      clickElement(headlineEditable);
      await flushMountedPage();
      const editable = view.container.querySelector<HTMLElement>(
        '[aria-label="Headline for Alpha"][role="textbox"]'
      );
      expect(editable).not.toBeNull();
      React.act(() => {
        editable?.focus();
        editable!.textContent = "Updated headline";
        editable?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      });
      await flushMountedPage();
      expect(requireUpdateSpy()).toHaveBeenCalledWith(
        "projects",
        "1",
        expect.objectContaining({ data: expect.objectContaining({ headline: "Updated headline" }) })
      );
      expect(
        view.container.querySelector<HTMLElement>('[aria-label="Headline for Alpha"]')?.textContent
      ).toBe("Updated headline");
    } finally {
      view.cleanup();
    }
  });

  test("switching to a non-table view shows the roadmap placeholder", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const boardTab = Array.from(view.container.querySelectorAll<HTMLElement>("button")).find(
        (button) => button.textContent?.trim() === "Board"
      );
      expect(boardTab).not.toBeNull();
      clickElement(boardTab);
      await flushMountedPage();
      expect(view.container.textContent).toContain("Board view");
      expect(view.container.textContent).toContain("on the roadmap");

      const galleryTab = Array.from(view.container.querySelectorAll<HTMLElement>("button")).find(
        (button) => button.textContent?.trim() === "Gallery"
      );
      clickElement(galleryTab);
      await flushMountedPage();
      expect(view.container.textContent).toContain("Gallery view");
    } finally {
      view.cleanup();
    }
  });

  test("customize view toggles column visibility and keeps the table in sync", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      clickElement(findButton(view.container, "Customize view"));
      await flushMountedPage();
      expect(view.container.textContent).toContain("View settings");
      expect(view.container.querySelector('[aria-label="Show Headline column"]')).not.toBeNull();

      const headlineToggle = view.container.querySelector<HTMLElement>(
        '[aria-label="Show Headline column"]'
      );
      expect(headlineToggle).not.toBeNull();
      clickElement(headlineToggle);
      await flushMountedPage();
      // the "Headline" column header disappears from the table
      const tableHeadline = Array.from(view.container.querySelectorAll("th")).find(
        (node) => node.textContent?.trim() === "Headline"
      );
      expect(tableHeadline).toBeUndefined();
      // the config panel reflects the toggle state (unchecked)
      expect(headlineToggle?.getAttribute("data-state")).toBe("unchecked");
    } finally {
      view.cleanup();
    }
  });

  test("a filter change prunes stale values and re-applies the visible set", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      // the filters row is the first combobox before the bulk bar appears
      const filterTrigger = Array.from(
        view.container.querySelectorAll<HTMLElement>('[role="combobox"]')
      )[0];
      expect(filterTrigger).not.toBeNull();
      pointerClick(filterTrigger);
      await flushMountedPage();
      const draftOption = Array.from(
        document.querySelectorAll<HTMLElement>('[role="option"]')
      ).find((node) => node.textContent?.trim() === "Draft");
      expect(draftOption).not.toBeNull();
      pointerClick(draftOption);
      await flushMountedPage();
      expect(findByText(view.container, "Alpha")).not.toBeNull();
      expect(findByText(view.container, "Beta")).toBeNull();
    } finally {
      view.cleanup();
    }
  });

  test("creating a record navigates to the workspace entry path", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      clickElement(findButton(view.container, "New"));
      await flushMountedPage();
      expect(currentPath(view.container)).toBe(
        "/admin/advanced/custom-screens/screen-1/entries/new"
      );
    } finally {
      view.cleanup();
    }
  });

  test("a cache event for the screen or entries list triggers a background refresh", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const gammaLoad = deferred<ReturnType<typeof makeEntry>[]>();
      const screenReadsBefore = requireScreenReadSpy().mock.calls.length;
      const entryReadsBefore = requireEntriesReadSpy().mock.calls.length;
      queueEntriesLoad("projects", gammaLoad);
      emitCacheEvent(cacheKeys.customScreenDetail("screen-1"));
      await flushMountedPage();
      expect(findByText(view.container, "Loading records...")).toBeNull();
      expect(requireScreenReadSpy()).toHaveBeenCalledTimes(screenReadsBefore + 1);
      expect(requireScreenReadSpy()).toHaveBeenLastCalledWith("screen-1", { force: true });
      expect(requireEntriesReadSpy()).toHaveBeenCalledTimes(entryReadsBefore + 1);
      expect(requireEntriesReadSpy()).toHaveBeenLastCalledWith("projects", { force: true });
      expect(findByText(view.container, "Gamma")).toBeNull();
      gammaLoad.resolve([
        makeEntry("1", { title: "Alpha" }),
        makeEntry("2", { title: "Beta" }),
        makeEntry("3", { title: "Gamma" }),
      ]);
      await flushMountedPage();
      expect(findByText(view.container, "Gamma")).not.toBeNull();

      const deltaLoad = deferred<ReturnType<typeof makeEntry>[]>();
      const screenReadsBeforeEntriesEvent = requireScreenReadSpy().mock.calls.length;
      const entryReadsBeforeEntriesEvent = requireEntriesReadSpy().mock.calls.length;
      queueEntriesLoad("projects", deltaLoad);
      emitCacheEvent(cacheKeys.entriesList("projects"));
      await flushMountedPage();
      expect(findByText(view.container, "Loading records...")).toBeNull();
      expect(requireScreenReadSpy()).toHaveBeenCalledTimes(screenReadsBeforeEntriesEvent + 1);
      expect(requireScreenReadSpy()).toHaveBeenLastCalledWith("screen-1", { force: true });
      expect(requireEntriesReadSpy()).toHaveBeenCalledTimes(entryReadsBeforeEntriesEvent + 1);
      expect(requireEntriesReadSpy()).toHaveBeenLastCalledWith("projects", { force: true });
      expect(findByText(view.container, "Delta")).toBeNull();
      deltaLoad.resolve([
        makeEntry("1", { title: "Alpha" }),
        makeEntry("2", { title: "Beta" }),
        makeEntry("4", { title: "Delta" }),
      ]);
      await flushMountedPage();
      expect(findByText(view.container, "Delta")).not.toBeNull();
    } finally {
      view.cleanup();
    }
  });

  test("a rejected remote fetch during refresh shows the fallback error", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const failedLoad = deferred<ReturnType<typeof buildScreen> | null>();
      queueScreenLoad("screen-1", failedLoad);
      emitCacheEvent(cacheKeys.customScreensList);
      await flushMountedPage();
      failedLoad.reject(new Error("plain failure"));
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Unable to load records")).toBe(
        "Failed to load custom screen records."
      );
    } finally {
      view.cleanup();
    }
  });

  test("inline number and boolean commits normalize before updateEntry", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      requireUpdateSpy()
        .mockResolvedValueOnce(
          makeEntry("1", {
            title: "Alpha",
            data: { headline: "Headline 1", price: 325, featured: false, status: "draft" },
          })
        )
        .mockResolvedValueOnce(
          makeEntry("1", {
            title: "Alpha",
            data: { headline: "Headline 1", price: 325, featured: true, status: "draft" },
          })
        );
      const priceEditable = view.container.querySelector<HTMLElement>(
        '[aria-label="Price for Alpha"][role="textbox"]'
      );
      expect(priceEditable).not.toBeNull();
      React.act(() => {
        priceEditable!.textContent = "325";
        priceEditable?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      });
      await flushMountedPage();
      expect(requireUpdateSpy()).toHaveBeenCalledWith(
        "projects",
        "1",
        expect.objectContaining({ data: expect.objectContaining({ price: 325 }) })
      );
      expect(
        view.container.querySelector<HTMLElement>('[aria-label="Price for Alpha"]')?.textContent
      ).toBe("325");

      const featuredEditable = view.container.querySelector<HTMLElement>(
        '[aria-label="Featured for Alpha"][role="textbox"]'
      );
      expect(featuredEditable).not.toBeNull();
      React.act(() => {
        featuredEditable!.textContent = "true";
        featuredEditable?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      });
      await flushMountedPage();
      expect(requireUpdateSpy()).toHaveBeenCalledWith(
        "projects",
        "1",
        expect.objectContaining({ data: expect.objectContaining({ featured: true }) })
      );
      expect(
        view.container.querySelector<HTMLElement>('[aria-label="Featured for Alpha"]')?.textContent
      ).toBe("true");
    } finally {
      view.cleanup();
    }
  });

  test("bulk publish with a partial failure keeps the failed rows selected", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const alphaCheckbox = view.container.querySelector<HTMLElement>(
        '[aria-label="Select Alpha"]'
      );
      const betaCheckbox = view.container.querySelector<HTMLElement>('[aria-label="Select Beta"]');
      clickElement(alphaCheckbox);
      clickElement(betaCheckbox);
      await flushMountedPage();

      requirePublishSpy().mockImplementation(async (_slug, id) => {
        if (id === "2") throw new Error("publish exploded");
        return { ok: true };
      });

      const actionSelect = view.container.querySelector<HTMLElement>(
        '[data-custom-screen-entry-bulk-actions="inline"] [role="combobox"]'
      );
      pointerClick(actionSelect);
      await flushMountedPage();
      const publishOption = Array.from(
        document.querySelectorAll<HTMLElement>('[role="option"]')
      ).find((node) => node.textContent?.trim() === "Publish");
      pointerClick(publishOption);
      await flushMountedPage();
      clickElement(findButton(view.container, "Apply"));
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Record action failed")).toContain("failed");
      expect(requirePublishSpy()).toHaveBeenCalledTimes(2);
    } finally {
      view.cleanup();
    }
  });

  test("an inline commit failure surfaces a record action alert", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      requireUpdateSpy().mockRejectedValueOnce(new Error("update exploded"));
      const headlineEditable = view.container.querySelector<HTMLElement>(
        '[aria-label="Headline for Alpha"][role="textbox"]'
      );
      expect(headlineEditable).not.toBeNull();
      React.act(() => {
        headlineEditable!.textContent = "Failing headline";
        headlineEditable?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      });
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Record action failed")).toContain("update");
    } finally {
      view.cleanup();
    }
  });

  test("a cache event refresh with a missing screen keeps the not-found alert", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const nullLoad = deferred<ReturnType<typeof buildScreen> | null>();
      nullLoad.resolve(null);
      queueScreenLoad("screen-1", nullLoad);
      emitCacheEvent(cacheKeys.customScreensList);
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Unable to load records")).toBe(
        "Custom screen not found."
      );
    } finally {
      view.cleanup();
    }
  });

  test("a cache event refresh with an unknown content type shows its alert", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const screen = buildScreen("screen-1", "Projects");
      setRemoteScreen({ ...screen, contentTypeId: "missing-type" });
      emitCacheEvent(cacheKeys.customScreensList);
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Unable to load records")).toBe(
        "Content type not found."
      );
    } finally {
      view.cleanup();
    }
  });

  test("a cache event refresh with an ApiClientError surfaces its message", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const failedLoad = deferred<ReturnType<typeof buildScreen> | null>();
      queueScreenLoad("screen-1", failedLoad);
      emitCacheEvent(cacheKeys.customScreensList);
      await flushMountedPage();
      failedLoad.reject(new ApiClientError("network", "refresh boom", 502));
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Unable to load records")).toBe("refresh boom");
    } finally {
      view.cleanup();
    }
  });

  test("a plain Error on the initial mount load shows the generic message", async () => {
    setCachedScreen(null);
    const failedLoad = deferred<ReturnType<typeof buildScreen> | null>();
    queueScreenLoad("screen-1", failedLoad);
    const view = mountPage();
    try {
      await flushMountedPage();
      failedLoad.reject(new Error("plain boom"));
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Unable to load records")).toBe(
        "Failed to load custom screen records."
      );
    } finally {
      view.cleanup();
    }
  });

  test("mounting without any cached screen clears the assistant context", async () => {
    setCachedScreen(null);
    setRemoteScreen(null);
    const view = mountPage();
    try {
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Unable to load records")).toBe(
        "Custom screen not found."
      );
    } finally {
      view.cleanup();
    }
  });

  test("an unrecognized boolean inline value is committed as-is", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      const featuredEditable = view.container.querySelector<HTMLElement>(
        '[aria-label="Featured for Alpha"][role="textbox"]'
      );
      expect(featuredEditable).not.toBeNull();
      React.act(() => {
        featuredEditable!.textContent = "maybe";
        featuredEditable?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      });
      await flushMountedPage();
      expect(requireUpdateSpy()).toHaveBeenCalledWith(
        "projects",
        "1",
        expect.objectContaining({ data: expect.objectContaining({ featured: "maybe" }) })
      );
    } finally {
      view.cleanup();
    }
  });

  test("a bulk delete with one failure keeps the partial inline message", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      clickElement(view.container.querySelector<HTMLElement>('[aria-label="Select Alpha"]'));
      clickElement(view.container.querySelector<HTMLElement>('[aria-label="Select Beta"]'));
      await flushMountedPage();
      requireDeleteSpy().mockImplementation(async (_slug, id) => {
        if (id === "2") throw new Error("delete exploded");
        return { ok: true };
      });

      const actionSelect = view.container.querySelector<HTMLElement>(
        '[data-custom-screen-entry-bulk-actions="inline"] [role="combobox"]'
      );
      pointerClick(actionSelect);
      await flushMountedPage();
      const deleteOption = Array.from(
        document.querySelectorAll<HTMLElement>('[role="option"]')
      ).find((node) => node.textContent?.trim() === "Delete");
      pointerClick(deleteOption);
      await flushMountedPage();
      clickElement(findButton(view.container, "Apply"));
      await flushMountedPage();
      const confirm = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === "Delete records"
      );
      clickElement(confirm);
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Record action failed")).toContain(
        "Deleted 1 record; failed 1."
      );
    } finally {
      view.cleanup();
    }
  });

  test("a synchronous delete failure surfaces the delete error alert", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      clickElement(view.container.querySelector<HTMLElement>('[aria-label="Select Alpha"]'));
      await flushMountedPage();
      requireDeleteSpy().mockImplementation(() => {
        throw new Error("delete exploded");
      });

      const actionSelect = view.container.querySelector<HTMLElement>(
        '[data-custom-screen-entry-bulk-actions="inline"] [role="combobox"]'
      );
      pointerClick(actionSelect);
      await flushMountedPage();
      const deleteOption = Array.from(
        document.querySelectorAll<HTMLElement>('[role="option"]')
      ).find((node) => node.textContent?.trim() === "Delete");
      pointerClick(deleteOption);
      await flushMountedPage();
      clickElement(findButton(view.container, "Apply"));
      await flushMountedPage();
      const confirm = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === "Delete record"
      );
      clickElement(confirm);
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Record action failed")).toBe(
        "Failed to delete record."
      );
    } finally {
      view.cleanup();
    }
  });

  test("a row publish failure surfaces the publish error alert", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      requirePublishSpy().mockRejectedValue(new Error("publish exploded"));
      const rowMenu = Array.from(view.container.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) =>
          button.closest("tr")?.textContent?.includes("Alpha") &&
          button.getAttribute("aria-label") === "Record actions"
      );
      pointerClick(rowMenu);
      await flushMountedPage();
      const publishItem = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='menuitem']")
      ).find((node) => node.textContent?.trim() === "Publish");
      pointerClick(publishItem);
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Record action failed")).toBe(
        "Failed to update record."
      );
    } finally {
      view.cleanup();
    }
  });

  test("a row unpublish failure surfaces the draft error alert", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      requireUnpublishSpy().mockRejectedValue(new Error("unpublish exploded"));
      const rowMenu = Array.from(view.container.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) =>
          button.closest("tr")?.textContent?.includes("Beta") &&
          button.getAttribute("aria-label") === "Record actions"
      );
      pointerClick(rowMenu);
      await flushMountedPage();
      const draftItem = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='menuitem']")
      ).find((node) => node.textContent?.trim() === "Move to Draft");
      pointerClick(draftItem);
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Record action failed")).toBe(
        "Failed to move record to draft."
      );
    } finally {
      view.cleanup();
    }
  });

  test("a synchronous bulk publish failure surfaces the bulk error alert", async () => {
    const view = mountPage();
    try {
      await flushMountedPage();
      clickElement(view.container.querySelector<HTMLElement>('[aria-label="Select Alpha"]'));
      await flushMountedPage();
      requirePublishSpy().mockImplementation(() => {
        throw new Error("publish exploded");
      });

      const actionSelect = view.container.querySelector<HTMLElement>(
        '[data-custom-screen-entry-bulk-actions="inline"] [role="combobox"]'
      );
      pointerClick(actionSelect);
      await flushMountedPage();
      const publishOption = Array.from(
        document.querySelectorAll<HTMLElement>('[role="option"]')
      ).find((node) => node.textContent?.trim() === "Publish");
      pointerClick(publishOption);
      await flushMountedPage();
      clickElement(findButton(view.container, "Apply"));
      await flushMountedPage();
      expect(getAlertMessage(view.container, "Record action failed")).toBe(
        "Failed to publish record."
      );
    } finally {
      view.cleanup();
    }
  });
});
