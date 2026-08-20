// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { clearMediaCache, type MediaRecord } from "../../../core/admin/services/mediaClient";
import { clearMediaFoldersCache } from "../../../core/admin/services/mediaFoldersClient";
import { ApiClientError, resetCsrfToken } from "../../../core/admin/services/apiClient";
import {
  FOLDER_OPERATION_MESSAGES,
  MediaLibraryPage,
  boundedFolderDisplayName,
  cloneFolderOperation,
  commitCurrentFolderAttempt,
  folderDescendantIds,
  formatFolderOperationError,
  isCurrentFolderRetry,
} from "../../../core/admin/ui/media/MediaLibraryPage";
import { buildFolderTree, type FolderNode } from "../../../core/admin/ui/media/utils";
import type { MediaFolder } from "../../../core/admin/ui/media/types";
import type { FolderOperationFeedback } from "../../../core/admin/ui/media/MediaFolderRail";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
import { invalidateUserSettingsCache } from "../../../core/admin/services/userSettingsClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import {
  GB,
  apiErrorResponse,
  click,
  createLocalStorage,
  deferred,
  flushEffects,
  flushRaf,
  folder,
  folderRowIds,
  getAriaButton,
  getButton,
  getFiltersButton,
  getPanelButton,
  gridSelectLabels,
  hasGridItem,
  jsonResponse,
  mediaRecord,
  mountMediaLibrary,
  setInputValue,
  setSelectValue,
  userSettingsResponse,
  writeMediaCache,
} from "./mediaLibraryTestUtils";

afterEach(() => {
  clearMediaCache();
  clearMediaFoldersCache();
  invalidateUserSettingsCache();
  resetCsrfToken();
  window.localStorage.clear();
});

test("folderDescendantIds collects the folder + all nested descendants", () => {
  const tree: FolderNode[] = buildFolderTree([
    folder({ id: "root", name: "Root", parentId: null }),
    folder({ id: "child", name: "Child", parentId: "root", slug: "child" }),
    folder({ id: "grand", name: "Grand", parentId: "child", slug: "grand" }),
    folder({ id: "sibling", name: "Sibling", parentId: null, slug: "sibling" }),
  ]);

  expect([...folderDescendantIds(tree, "root")].sort()).toEqual(["child", "grand", "root"]);
  expect([...folderDescendantIds(tree, "child")].sort()).toEqual(["child", "grand"]);
  expect([...folderDescendantIds(tree, "sibling")]).toEqual(["sibling"]);
});

test("folderDescendantIds returns an empty set for an unknown id and handles leaves", () => {
  const tree: FolderNode[] = buildFolderTree([
    folder({ id: "only", name: "Only", parentId: null }),
  ]);
  expect(folderDescendantIds(tree, "missing").size).toBe(0);
  expect([...folderDescendantIds(tree, "only")]).toEqual(["only"]);
  // Empty tree is safe too.
  expect(folderDescendantIds([], "only").size).toBe(0);
});

test("folder operation payloads are normalized, deeply immutable, and delete labels are Unicode-bounded", () => {
  const orders = [{ id: " one ", orderIndex: 2, parentId: " parent " }];
  const cloned = cloneFolderOperation({ kind: "reorder", orders });
  expect(cloned.kind).toBe("reorder");
  if (cloned.kind !== "reorder") throw new Error("Expected reorder operation");
  expect(cloned.orders).toEqual([{ id: "one", orderIndex: 2, parentId: "parent" }]);
  expect(Object.isFrozen(cloned)).toBe(true);
  expect(Object.isFrozen(cloned.orders)).toBe(true);
  expect(Object.isFrozen(cloned.orders[0])).toBe(true);
  orders[0]!.id = "mutated";
  expect(cloned.orders[0]?.id).toBe("one");

  const fullName = `  Campaign\u0000\n${"😀".repeat(60)}  `;
  const retry = cloneFolderOperation({ kind: "delete", id: " folder-1 ", name: fullName });
  expect(retry.kind).toBe("delete");
  if (retry.kind !== "delete") throw new Error("Expected delete operation");
  expect(retry.id).toBe("folder-1");
  expect(retry.name).toBe(fullName.trim());
  expect(Object.isFrozen(retry)).toBe(true);
  const display = boundedFolderDisplayName(retry.name);
  expect(Array.from(display)).toHaveLength(48);
  expect(display.endsWith("…")).toBe(true);
  expect(display).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/u);
});

test("folder errors expose only fixed operation copy and the create conflict specialization", () => {
  const hostile = new ApiClientError(
    "database_failed",
    '<script>alert("x")</script> SQL media_folders_slug_idx stack',
    500,
    { query: "DROP TABLE media" }
  );
  expect(formatFolderOperationError("load", hostile)).toBe(FOLDER_OPERATION_MESSAGES.load);
  expect(formatFolderOperationError("rename", hostile)).toBe(FOLDER_OPERATION_MESSAGES.rename);
  expect(formatFolderOperationError("reorder", hostile)).toBe(FOLDER_OPERATION_MESSAGES.reorder);
  expect(formatFolderOperationError("delete", hostile)).toBe(FOLDER_OPERATION_MESSAGES.delete);
  expect(formatFolderOperationError("create", hostile)).toBe(FOLDER_OPERATION_MESSAGES.create);
  expect(
    formatFolderOperationError(
      "create",
      new ApiClientError("media_folder_slug_conflict", "raw constraint", 409)
    )
  ).toBe(FOLDER_OPERATION_MESSAGES.createConflict);
  expect(Object.values(FOLDER_OPERATION_MESSAGES).every((message) => message.length <= 96)).toBe(
    true
  );
});

test("stale Retry tokens and mismatched immutable targets are rejected before execution", () => {
  const retry = cloneFolderOperation({
    kind: "create",
    name: "Campaign",
    parentId: null,
    formGeneration: 7,
  });
  const feedback: FolderOperationFeedback = Object.freeze({
    token: 22,
    kind: "create",
    target: Object.freeze({
      kind: "create",
      name: "Campaign",
      parentId: null,
      formGeneration: 7,
    }),
    message: FOLDER_OPERATION_MESSAGES.create,
    retry,
  });
  expect(isCurrentFolderRetry(feedback, 21, retry)).toBe(false);
  expect(
    isCurrentFolderRetry(feedback, 22, {
      kind: "create",
      name: "Changed",
      parentId: null,
      formGeneration: 7,
    })
  ).toBe(false);
  expect(isCurrentFolderRetry(feedback, 22, retry)).toBe(true);
});

test("MediaLibraryPage renders toolbar and grid", () => {
  const html = renderAdminUi(<MediaLibraryPage />);

  expect(html).toContain("Media Library");
  expect(html).toContain("Media settings");
  expect(html).toContain("Upload");
  expect(html).not.toContain("Upload New");
});

test("MediaLibraryPage renders cached media without loading", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.mediaList,
      JSON.stringify({
        value: [
          {
            id: "media-1",
            url: "https://example.com/a.jpg",
            type: "image",
            name: "Example",
            originalName: "a.jpg",
            mimeType: "image/jpeg",
            size: 1234,
            createdAt: "2026-02-15T00:00:00.000Z",
            updatedAt: "2026-02-15T00:00:00.000Z",
            meta: {},
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<MediaLibraryPage />);
    expect(html).toContain("Media Library");
    expect(html).not.toContain("Loading assets");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("MediaLibraryPage route entry reuses fresh media cache without fetching media", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  writeMediaCache([mediaRecord({ title: "Cached hero" })]);
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/user-settings")) {
      return jsonResponse(userSettingsResponse);
    }
    if (String(input).endsWith("/media")) {
      return jsonResponse([mediaRecord({ title: "Network hero" })]);
    }
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();

    expect(view.container.textContent).toContain("Cached hero");
    expect(calls.filter((call) => String(call.input) === "/admin/api/media")).toHaveLength(0);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("MediaLibraryPage applies media update events from storage without fetching media", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  writeMediaCache([mediaRecord({ title: "Before update" })]);
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/user-settings")) {
      return jsonResponse(userSettingsResponse);
    }
    if (String(input).endsWith("/media")) {
      return jsonResponse([mediaRecord({ title: "Network update" })]);
    }
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    writeMediaCache([mediaRecord({ title: "Storage update" })]);

    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
    });

    expect(view.container.textContent).toContain("Storage update");
    expect(calls.filter((call) => String(call.input) === "/admin/api/media")).toHaveLength(0);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("MediaLibraryPage header Upload opens the existing dropzone file input", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/user-settings")) {
      return jsonResponse(userSettingsResponse);
    }
    if (String(input).endsWith("/media")) {
      return jsonResponse([]);
    }
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();

    const fileInput = view.container.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error("Expected UploadDropzone file input to exist");
    }
    const openSpy = vi.spyOn(fileInput, "click");

    await click(getButton(view.container, "Upload"));

    expect(openSpy).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("MediaLibraryPage keeps selection active without a Select toggle", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/user-settings")) {
      return jsonResponse(userSettingsResponse);
    }
    if (String(input).endsWith("/media")) {
      return jsonResponse([mediaRecord({ title: "Network hero" })]);
    }
    return jsonResponse({});
  };

  writeMediaCache([mediaRecord({ title: "Cached hero" })]);

  const view = mountMediaLibrary();
  try {
    await flushEffects();

    const exactSelectButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Select"
    );
    expect(exactSelectButton).toBeUndefined();
    expect(view.container.textContent).toContain("Upload");
    expect(view.container.textContent).not.toContain("Upload New");
    expect(view.container.textContent).toContain("0 selected");
    expect(view.container.textContent).toContain("Select visible");
    expect(view.container.querySelector('button[aria-label="Select Cached hero"]')).toBeTruthy();

    const downloadButton = getButton(view.container, "Download");
    const deleteButton = getButton(view.container, "Delete");
    expect(downloadButton.disabled).toBe(true);
    expect(deleteButton.disabled).toBe(true);

    await click(view.container.querySelector('button[aria-label="Select Cached hero"]'));

    expect(view.container.textContent).toContain("1 selected");
    expect(downloadButton.disabled).toBe(false);
    expect(deleteButton.disabled).toBe(false);

    await click(getButton(view.container, "Clear"));

    expect(view.container.textContent).toContain("0 selected");
    expect(downloadButton.disabled).toBe(true);
    expect(deleteButton.disabled).toBe(true);

    await click(getButton(view.container, "Select visible"));

    expect(view.container.textContent).toContain("1 selected");
    expect(downloadButton.disabled).toBe(false);
    expect(deleteButton.disabled).toBe(false);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});
