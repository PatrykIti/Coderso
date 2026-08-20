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

test("create conflict retains the exact form and immutable Retry succeeds locally", async () => {
  const originalFetch = globalThis.fetch;
  let postCount = 0;
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders") && init?.method === "POST") {
      postCount += 1;
      if (postCount === 1) {
        return apiErrorResponse(
          "media_folder_slug_conflict",
          "duplicate media_folders_slug_idx SQL payload",
          409
        );
      }
      return jsonResponse(folder({ id: "folder-new", name: "Launch", slug: "launch" }));
    }
    if (url.endsWith("/media/folders"))
      return jsonResponse(
        postCount >= 2
          ? [folder(), folder({ id: "folder-new", name: "Launch", slug: "launch" })]
          : [folder()]
      );
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await click(getButton(view.container, "New"));
    const input = view.container.querySelector(
      'input[aria-label="New folder name"]'
    ) as HTMLInputElement;
    await setInputValue(input, "Launch");
    const generation = input.closest("form")?.getAttribute("data-folder-form-generation");
    await click(getAriaButton(view.container, "Create folder"));
    await flushEffects();

    const alert = view.container.querySelector('[data-folder-error-kind="create"]');
    expect(alert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.createConflict);
    expect(alert?.textContent).not.toContain("media_folders_slug_idx");
    expect(input.value).toBe("Launch");
    expect(input.closest("form")?.getAttribute("data-folder-form-generation")).toBe(generation);
    const retry = alert?.querySelector('[data-folder-retry-kind="create"]');
    expect(retry?.getAttribute("data-folder-retry-name")).toBe("Launch");
    expect(retry?.getAttribute("data-folder-retry-form-generation")).toBe(generation);

    await click(retry ?? null);
    await flushEffects();
    expect(postCount).toBe(2);
    expect(view.container.querySelector('input[aria-label="New folder name"]')).toBeNull();
    expect(view.container.querySelector('[data-media-folder-id="folder-new"]')).not.toBeNull();
    expect(view.container.querySelector('[data-folder-error-kind="create"]')).toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("rename failure retains its form, edited resubmit consumes the old token, and Retry closes only the matching target", async () => {
  const originalFetch = globalThis.fetch;
  let patchCount = 0;
  let folderGets = 0;
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders/folder-1") && init?.method === "PATCH") {
      patchCount += 1;
      if (patchCount <= 2) {
        return apiErrorResponse("rename_failed", "<b>SQL rename stack</b>", 500);
      }
      const body = JSON.parse(String(init.body)) as { name: string };
      return jsonResponse(folder({ name: body.name, slug: "docs-next" }));
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      if (folderGets === 2) return Promise.reject(new Error("rename reconcile raw"));
      return jsonResponse(patchCount >= 3 ? [folder({ name: "Docs Next" })] : [folder()]);
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await click(getAriaButton(view.container, "Rename Marketing"));
    const input = view.container.querySelector(
      'input[aria-label="Rename folder Marketing"]'
    ) as HTMLInputElement;
    await setInputValue(input, "Docs");
    await click(getAriaButton(view.container, "Save folder name"));
    await flushEffects();
    const firstToken = view.container
      .querySelector('[data-folder-error-kind="rename"]')
      ?.getAttribute("data-folder-error-token");
    expect(input.value).toBe("Docs");

    await setInputValue(input, "Docs Next");
    await click(getAriaButton(view.container, "Save folder name"));
    await flushEffects();
    const secondAlert = view.container.querySelector('[data-folder-error-kind="rename"]');
    expect(secondAlert?.getAttribute("data-folder-error-token")).not.toBe(firstToken);
    expect(secondAlert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.rename);
    expect(secondAlert?.textContent).not.toContain("SQL rename stack");
    expect(
      secondAlert?.querySelector("[data-folder-retry-name]")?.getAttribute("data-folder-retry-name")
    ).toBe("Docs Next");

    await click(secondAlert?.querySelector("button") ?? null);
    await flushEffects();
    expect(patchCount).toBe(3);
    expect(view.container.querySelector('input[aria-label^="Rename folder"]')).toBeNull();
    expect(view.container.querySelector('[data-media-folder-name="Docs Next"]')).not.toBeNull();
    const reconcileAlert = view.container.querySelector('[data-folder-error-kind="load"]');
    expect(reconcileAlert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.load);
    expect(reconcileAlert?.textContent).not.toContain("rename reconcile raw");
    await click(reconcileAlert?.querySelector("button") ?? null);
    await flushEffects();
    expect(patchCount).toBe(3);
    expect(folderGets).toBe(3);
    expect(view.container.querySelector('[data-media-folder-name="Docs Next"]')).not.toBeNull();
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("reorder failure preserves derived order and Retry applies only the captured immutable order", async () => {
  const originalFetch = globalThis.fetch;
  let reorderPosts = 0;
  let folderGets = 0;
  const reorderBodies: unknown[] = [];
  const initialFolders = [
    folder({ id: "f1", name: "First", slug: "first", orderIndex: 0 }),
    folder({ id: "f2", name: "Second", slug: "second", orderIndex: 1 }),
  ];
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders/reorder") && init?.method === "POST") {
      reorderPosts += 1;
      reorderBodies.push(JSON.parse(String(init.body)));
      if (reorderPosts === 1) {
        return apiErrorResponse("reorder_failed", "SQL reorder stack", 500);
      }
      return jsonResponse({ ok: true });
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      if (folderGets === 2) return Promise.reject(new Error("reorder reconcile raw"));
      return jsonResponse(
        reorderPosts >= 2
          ? [
              { ...initialFolders[0]!, orderIndex: 1 },
              { ...initialFolders[1]!, orderIndex: 0 },
            ]
          : initialFolders
      );
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    expect(folderRowIds(view.container)).toEqual(["f1", "f2"]);
    await click(getAriaButton(view.container, "Move First down"));
    await flushEffects();
    expect(folderRowIds(view.container)).toEqual(["f1", "f2"]);
    const alert = view.container.querySelector('[data-folder-error-kind="reorder"]');
    expect(alert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.reorder);
    expect(alert?.textContent).not.toContain("SQL reorder stack");
    expect(alert?.querySelector("button")?.textContent).toBe("Retry saving folder order");

    await click(alert?.querySelector("button") ?? null);
    await flushEffects();
    expect(reorderPosts).toBe(2);
    expect(folderRowIds(view.container)).toEqual(["f2", "f1"]);
    expect(reorderBodies).toEqual([
      {
        orders: [
          { id: "f2", orderIndex: 0, parentId: null },
          { id: "f1", orderIndex: 1, parentId: null },
        ],
      },
      {
        orders: [
          { id: "f2", orderIndex: 0, parentId: null },
          { id: "f1", orderIndex: 1, parentId: null },
        ],
      },
    ]);
    const reconcileAlert = view.container.querySelector('[data-folder-error-kind="load"]');
    expect(reconcileAlert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.load);
    await click(reconcileAlert?.querySelector("button") ?? null);
    await flushEffects();
    expect(reorderPosts).toBe(2);
    expect(folderGets).toBe(3);
    expect(folderRowIds(view.container)).toEqual(["f2", "f1"]);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("delete failure preserves both folder filters; Retry confirms once, removes the target, and unparents direct children", async () => {
  const originalFetch = globalThis.fetch;
  const originalConfirm = window.confirm;
  const confirm = vi.fn(() => true);
  window.confirm = confirm as typeof window.confirm;
  let deletes = 0;
  let folderGets = 0;
  const initialFolders = [
    folder({ id: "parent", name: "Parent", slug: "parent", orderIndex: 0 }),
    folder({ id: "child", name: "Child", slug: "child", parentId: "parent", orderIndex: 0 }),
  ];
  writeMediaCache([
    { ...mediaRecord({ id: "in-parent", title: "In Parent" }), folderId: "parent" },
    { ...mediaRecord({ id: "unfiled", title: "Unfiled" }), folderId: null },
  ]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders/parent") && init?.method === "DELETE") {
      deletes += 1;
      if (deletes === 1) return apiErrorResponse("delete_failed", "SQL delete stack", 500);
      return jsonResponse({ ok: true });
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      if (folderGets === 2) return Promise.reject(new Error("delete reconcile raw"));
      return jsonResponse(
        deletes >= 2 ? [{ ...initialFolders[1]!, parentId: null }] : initialFolders
      );
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await click(getButton(view.container, "Parent"));
    expect(
      view.container
        .querySelector("[data-media-filter-folder-id]")
        ?.getAttribute("data-media-filter-folder-id")
    ).toBe("parent");
    expect(hasGridItem("In Parent")).toBe(true);
    expect(hasGridItem("Unfiled")).toBe(false);
    expect(
      view.container
        .querySelector("[data-media-folder-rail]")
        ?.getAttribute("data-active-folder-id")
    ).toBe("parent");
    expect(getFiltersButton(view.container).textContent).toContain("1");
    await click(getFiltersButton(view.container));
    expect((document.querySelector("#media-filter-folder") as HTMLSelectElement).value).toBe(
      "parent"
    );

    await click(getAriaButton(view.container, "Delete Parent"));
    await flushEffects();
    expect(view.container.querySelector('[data-media-folder-id="parent"]')).not.toBeNull();
    expect(
      view.container
        .querySelector("[data-media-filter-folder-id]")
        ?.getAttribute("data-media-filter-folder-id")
    ).toBe("parent");
    expect(
      view.container
        .querySelector("[data-media-folder-rail]")
        ?.getAttribute("data-active-folder-id")
    ).toBe("parent");
    expect((document.querySelector("#media-filter-folder") as HTMLSelectElement).value).toBe(
      "parent"
    );
    expect(getFiltersButton(view.container).textContent).toContain("1");
    expect(hasGridItem("In Parent")).toBe(true);
    expect(hasGridItem("Unfiled")).toBe(false);
    const alert = view.container.querySelector('[data-folder-error-kind="delete"]');
    expect(alert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.delete);
    expect(alert?.textContent).not.toContain("SQL delete stack");

    await click(alert?.querySelector("button") ?? null);
    await flushEffects();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(deletes).toBe(2);
    expect(view.container.querySelector('[data-media-folder-id="parent"]')).toBeNull();
    const child = view.container.querySelector('[data-media-folder-id="child"]');
    expect(child).not.toBeNull();
    expect(child?.hasAttribute("data-media-folder-parent-id")).toBe(false);
    expect(
      view.container
        .querySelector("[data-media-filter-folder-id]")
        ?.getAttribute("data-media-filter-folder-id")
    ).toBe("");
    expect(
      view.container
        .querySelector("[data-media-folder-rail]")
        ?.getAttribute("data-active-folder-id")
    ).toBe("");
    expect((document.querySelector("#media-filter-folder") as HTMLSelectElement).value).toBe("");
    expect(getFiltersButton(view.container).textContent?.trim()).toBe("Filters");
    expect(hasGridItem("In Parent")).toBe(true);
    expect(hasGridItem("Unfiled")).toBe(true);
    const reconcileAlert = view.container.querySelector('[data-folder-error-kind="load"]');
    expect(reconcileAlert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.load);
    expect(reconcileAlert?.textContent).not.toContain("delete reconcile raw");
    await click(reconcileAlert?.querySelector("button") ?? null);
    await flushEffects();
    expect(deletes).toBe(2);
    expect(folderGets).toBe(3);
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
    window.confirm = originalConfirm;
  }
});

test("delete success conditionally preserves a newer rail and Filters-panel folder selection", async () => {
  const originalFetch = globalThis.fetch;
  const originalConfirm = window.confirm;
  window.confirm = vi.fn(() => true) as typeof window.confirm;
  const deleteResponse = deferred<Response>();
  const initialFolders = [
    folder({ id: "old", name: "Old", slug: "old", orderIndex: 0 }),
    folder({ id: "new", name: "Newer", slug: "newer", orderIndex: 1 }),
  ];
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders/old") && init?.method === "DELETE") {
      return deleteResponse.promise;
    }
    if (url.endsWith("/media/folders")) return jsonResponse(initialFolders);
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await click(getButton(view.container, "Old"));
    await click(getAriaButton(view.container, "Delete Old"));
    await flushEffects();
    expect(
      view.container.querySelector("[data-media-folder-rail]")?.getAttribute("aria-busy")
    ).toBe("true");
    await click(getButton(view.container, "Newer"));
    await React.act(async () => {
      deleteResponse.resolve(jsonResponse({ ok: true }));
      await Promise.resolve();
    });
    await flushEffects();

    expect(
      view.container
        .querySelector("[data-media-filter-folder-id]")
        ?.getAttribute("data-media-filter-folder-id")
    ).toBe("new");
    expect(
      view.container
        .querySelector("[data-media-folder-rail]")
        ?.getAttribute("data-active-folder-id")
    ).toBe("new");
    await click(getFiltersButton(view.container));
    expect((document.querySelector("#media-filter-folder") as HTMLSelectElement).value).toBe("new");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
    window.confirm = originalConfirm;
  }
});

test("mutation broadcast precedes return: local create lands before a separate failed reconcile and load Retry never replays POST", async () => {
  const originalFetch = globalThis.fetch;
  let folderGets = 0;
  let posts = 0;
  const created = folder({ id: "created", name: "Created", slug: "created", orderIndex: 1 });
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders") && init?.method === "POST") {
      posts += 1;
      return jsonResponse(created);
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      if (folderGets === 2) return Promise.reject(new Error("raw reconcile SQL stack"));
      return jsonResponse(folderGets >= 3 ? [folder(), created] : [folder()]);
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await click(getButton(view.container, "New"));
    const input = view.container.querySelector(
      'input[aria-label="New folder name"]'
    ) as HTMLInputElement;
    await setInputValue(input, "Created");
    await click(getAriaButton(view.container, "Create folder"));
    await flushEffects();
    await flushEffects();

    expect(view.container.querySelector('[data-media-folder-id="created"]')).not.toBeNull();
    expect(view.container.querySelector('input[aria-label="New folder name"]')).toBeNull();
    const reconcileAlert = view.container.querySelector('[data-folder-error-kind="load"]');
    expect(reconcileAlert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.load);
    expect(reconcileAlert?.textContent).not.toContain("raw reconcile");
    expect(posts).toBe(1);

    await click(reconcileAlert?.querySelector("button") ?? null);
    await flushEffects();
    expect(posts).toBe(1);
    expect(folderGets).toBe(3);
    expect(view.container.querySelector('[data-media-folder-id="created"]')).not.toBeNull();
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a cache failure deferred during a failed mutation is discarded; duplicate activation remains serialized", async () => {
  const originalFetch = globalThis.fetch;
  const firstPost = deferred<Response>();
  let posts = 0;
  let folderGets = 0;
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders") && init?.method === "POST") {
      posts += 1;
      if (posts === 1) return firstPost.promise;
      return jsonResponse(folder({ id: "later", name: "Deferred", slug: "deferred" }));
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      if (folderGets === 2) return Promise.reject(new Error("deferred reconcile failure"));
      return jsonResponse(
        posts >= 2
          ? [folder(), folder({ id: "later", name: "Deferred", slug: "deferred" })]
          : [folder()]
      );
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await click(getButton(view.container, "New"));
    const input = view.container.querySelector(
      'input[aria-label="New folder name"]'
    ) as HTMLInputElement;
    await setInputValue(input, "Deferred");
    await click(getAriaButton(view.container, "Create folder"));
    await flushEffects();
    expect(getAriaButton(view.container, "Create folder").disabled).toBe(true);
    await click(getAriaButton(view.container, "Create folder"));
    expect(posts).toBe(1);

    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
      await Promise.resolve();
      await Promise.resolve();
    });
    await React.act(async () => {
      firstPost.reject(new Error("raw mutation stack"));
      await Promise.resolve();
    });
    await flushEffects();

    const alert = view.container.querySelector('[data-folder-error-kind="create"]');
    expect(alert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.create);
    expect(alert?.textContent).not.toContain("raw mutation");
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
    expect(input.value).toBe("Deferred");

    await click(alert?.querySelector("button") ?? null);
    await flushEffects();
    expect(posts).toBe(2);
    expect(view.container.querySelector('[data-media-folder-id="later"]')).not.toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a cache event overlapping a load Retry is queued and applied after the Retry settles", async () => {
  const originalFetch = globalThis.fetch;
  const retryLoad = deferred<Response>();
  let folderGets = 0;
  writeMediaCache([]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      if (folderGets === 1) return apiErrorResponse("load_failed", "initial raw", 500);
      if (folderGets === 2) return retryLoad.promise;
      return jsonResponse([folder({ id: "external", name: "External", slug: "external" })]);
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    const retry = view.container.querySelector('[data-folder-retry-kind="load"]');
    await click(retry);
    await flushEffects();
    expect(
      view.container.querySelector("[data-media-folder-rail]")?.getAttribute("aria-busy")
    ).toBe("true");

    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
      await Promise.resolve();
    });
    expect(view.container.querySelector('[data-media-folder-id="external"]')).toBeNull();

    await React.act(async () => {
      retryLoad.reject(new Error("retry raw failure"));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();
    expect(view.container.querySelector('[data-media-folder-id="external"]')).not.toBeNull();
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
    expect(folderGets).toBe(3);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("StrictMode plus a newer forced generation rejects an older load completion observably", async () => {
  const originalFetch = globalThis.fetch;
  const firstLoad = deferred<Response>();
  const forcedLoad = deferred<Response>();
  let folderGets = 0;
  writeMediaCache([]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      return folderGets === 1 ? firstLoad.promise : forcedLoad.promise;
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary({ strict: true });
  try {
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
      await Promise.resolve();
    });
    expect(folderGets).toBe(2);
    await React.act(async () => {
      firstLoad.resolve(jsonResponse([folder({ id: "stale", name: "Stale" })]));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();
    expect(view.container.querySelector('[data-media-folder-id="stale"]')).toBeNull();
    expect(
      view.container.querySelector("[data-media-folder-rail]")?.getAttribute("aria-busy")
    ).toBe("true");

    await React.act(async () => {
      forcedLoad.resolve(jsonResponse([folder({ id: "current", name: "Current" })]));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();
    expect(view.container.querySelector('[data-media-folder-id="current"]')).not.toBeNull();
    expect(view.container.querySelector('[data-media-folder-id="stale"]')).toBeNull();
    expect(
      view.container.querySelector("[data-media-folder-rail]")?.getAttribute("aria-busy")
    ).toBe("false");
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("unmount invalidates a pending create so its stale completion performs no page write", async () => {
  const originalFetch = globalThis.fetch;
  const post = deferred<Response>();
  let posts = 0;
  let folderGets = 0;
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders") && init?.method === "POST") {
      posts += 1;
      return post.promise;
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      return jsonResponse([folder()]);
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await click(getButton(view.container, "New"));
    const input = view.container.querySelector(
      'input[aria-label="New folder name"]'
    ) as HTMLInputElement;
    await setInputValue(input, "Stale");
    await click(getAriaButton(view.container, "Create folder"));
    await flushEffects();
    expect(posts).toBe(1);
    expect(folderGets).toBe(1);
    view.cleanup();
    expect(view.container.isConnected).toBe(false);
    expect(view.container.innerHTML).toBe("");

    await React.act(async () => {
      post.resolve(jsonResponse(folder({ id: "stale", name: "Stale" })));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();
    expect(folderGets).toBe(1);
    expect(view.container.innerHTML).toBe("");
  } finally {
    if (view.container.isConnected) view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("the production post-await commit seam returns false and skips its success sink after unmount invalidation", async () => {
  const request = deferred<string>();
  let mounted = true;
  let attempt = 8;
  const expectedAttempt = 8;
  const successSink = vi.fn();
  const outcome = commitCurrentFolderAttempt({
    request: request.promise,
    isCurrent: () => mounted && attempt === expectedAttempt,
    commit: successSink,
  });

  mounted = false;
  attempt += 1;
  request.resolve("stale-success");
  await expect(outcome).resolves.toBe(false);
  expect(successSink).not.toHaveBeenCalled();

  const currentSink = vi.fn();
  await expect(
    commitCurrentFolderAttempt({
      request: Promise.resolve("current-success"),
      isCurrent: () => true,
      commit: currentSink,
    })
  ).resolves.toBe(true);
  expect(currentSink).toHaveBeenCalledWith("current-success");
});

test("a later cache load failure preserves the exact visible create failure and its retained immutable Retry", async () => {
  const originalFetch = globalThis.fetch;
  const retryPost = deferred<Response>();
  let posts = 0;
  let folderGets = 0;
  const created = folder({ id: "protected", name: "Protected", slug: "protected" });
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders") && init?.method === "POST") {
      posts += 1;
      if (posts === 1) return apiErrorResponse("create_failed", "raw mutation failure", 500);
      return retryPost.promise;
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      if (folderGets === 2) return Promise.reject(new Error("later raw load failure"));
      return jsonResponse(folderGets >= 3 ? [folder(), created] : [folder()]);
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await click(getButton(view.container, "New"));
    const input = view.container.querySelector(
      'input[aria-label="New folder name"]'
    ) as HTMLInputElement;
    await setInputValue(input, "Protected");
    await click(getAriaButton(view.container, "Create folder"));
    await flushEffects();

    const firstAlert = view.container.querySelector('[data-folder-error-kind="create"]');
    const firstRetry = firstAlert?.querySelector("button");
    const failureIdentity = {
      token: firstAlert?.getAttribute("data-folder-error-token"),
      kind: firstAlert?.getAttribute("data-folder-error-kind"),
      message: firstAlert?.querySelector("[data-folder-error-message]")?.textContent,
      retryKind: firstRetry?.getAttribute("data-folder-retry-kind"),
      retryName: firstRetry?.getAttribute("data-folder-retry-name"),
      retryTargetId: firstRetry?.getAttribute("data-folder-retry-target-id"),
      retryParentId: firstRetry?.getAttribute("data-folder-retry-parent-id"),
      retryFormGeneration: firstRetry?.getAttribute("data-folder-retry-form-generation"),
    };
    expect(failureIdentity).toEqual({
      token: expect.any(String),
      kind: "create",
      message: FOLDER_OPERATION_MESSAGES.create,
      retryKind: "create",
      retryName: "Protected",
      retryTargetId: null,
      retryParentId: "",
      retryFormGeneration: input.closest("form")?.getAttribute("data-folder-form-generation"),
    });

    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();
    expect(folderGets).toBe(2);
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
    const preservedAlert = view.container.querySelector('[data-folder-error-kind="create"]');
    const preservedRetry = preservedAlert?.querySelector("button");
    expect({
      token: preservedAlert?.getAttribute("data-folder-error-token"),
      kind: preservedAlert?.getAttribute("data-folder-error-kind"),
      message: preservedAlert?.querySelector("[data-folder-error-message]")?.textContent,
      retryKind: preservedRetry?.getAttribute("data-folder-retry-kind"),
      retryName: preservedRetry?.getAttribute("data-folder-retry-name"),
      retryTargetId: preservedRetry?.getAttribute("data-folder-retry-target-id"),
      retryParentId: preservedRetry?.getAttribute("data-folder-retry-parent-id"),
      retryFormGeneration: preservedRetry?.getAttribute("data-folder-retry-form-generation"),
    }).toEqual(failureIdentity);
    expect(input.value).toBe("Protected");
    expect(view.container.textContent).not.toContain("later raw load failure");

    await click(preservedRetry ?? null);
    await flushEffects();
    expect(posts).toBe(2);
    expect(folderGets).toBe(2);
    expect(
      view.container.querySelector("[data-media-folder-rail]")?.getAttribute("aria-busy")
    ).toBe("true");
    await React.act(async () => {
      retryPost.resolve(jsonResponse(created));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();
    expect(posts).toBe(2);
    expect(folderGets).toBe(3);
    expect(view.container.querySelector('[data-media-folder-id="protected"]')).not.toBeNull();
    expect(view.container.querySelector('input[aria-label="New folder name"]')).toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a later cache load failure preserves reorder feedback and Retry replays the mutation before reconciliation", async () => {
  const originalFetch = globalThis.fetch;
  let reorderPosts = 0;
  let folderGets = 0;
  let trackRetryCalls = false;
  const retryCalls: string[] = [];
  const reorderBodies: unknown[] = [];
  const initialFolders = [
    folder({ id: "f1", name: "First", slug: "first", orderIndex: 0 }),
    folder({ id: "f2", name: "Second", slug: "second", orderIndex: 1 }),
  ];
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders/reorder") && init?.method === "POST") {
      if (trackRetryCalls) retryCalls.push("POST reorder");
      reorderPosts += 1;
      reorderBodies.push(JSON.parse(String(init.body)));
      if (reorderPosts === 1) return apiErrorResponse("reorder_failed", "raw reorder", 500);
      return jsonResponse({ ok: true });
    }
    if (url.endsWith("/media/folders")) {
      if (trackRetryCalls) retryCalls.push("GET folders");
      folderGets += 1;
      if (folderGets === 2) return Promise.reject(new Error("later reorder load failure"));
      return jsonResponse(
        folderGets >= 3
          ? [
              { ...initialFolders[0]!, orderIndex: 1 },
              { ...initialFolders[1]!, orderIndex: 0 },
            ]
          : initialFolders
      );
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await click(getAriaButton(view.container, "Move First down"));
    await flushEffects();
    const firstAlert = view.container.querySelector('[data-folder-error-kind="reorder"]');
    const failureToken = firstAlert?.getAttribute("data-folder-error-token");
    expect(folderRowIds(view.container)).toEqual(["f1", "f2"]);

    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();
    const preservedAlert = view.container.querySelector('[data-folder-error-kind="reorder"]');
    expect(preservedAlert?.getAttribute("data-folder-error-token")).toBe(failureToken);
    expect(preservedAlert?.querySelector("button")?.textContent).toBe("Retry saving folder order");
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
    expect(folderRowIds(view.container)).toEqual(["f1", "f2"]);

    trackRetryCalls = true;
    await click(preservedAlert?.querySelector("button") ?? null);
    await flushEffects();
    expect(retryCalls).toEqual(["POST reorder", "GET folders"]);
    expect(reorderPosts).toBe(2);
    expect(reorderBodies[1]).toEqual(reorderBodies[0]);
    expect(folderRowIds(view.container)).toEqual(["f2", "f1"]);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});
