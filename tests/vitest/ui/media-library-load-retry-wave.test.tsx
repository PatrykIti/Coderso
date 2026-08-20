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

test("folder load failures publish fresh fixed Retry tokens twice before a successful retry", async () => {
  const originalFetch = globalThis.fetch;
  let folderGets = 0;
  writeMediaCache([]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      if (folderGets <= 3) {
        return apiErrorResponse(
          "database_failed",
          `<script>folder load ${folderGets}</script> SQL stack`,
          500
        );
      }
      return jsonResponse([folder()]);
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    const tokens: string[] = [];
    for (let failure = 0; failure < 3; failure += 1) {
      const alert = view.container.querySelector('[data-folder-error-kind="load"]');
      expect(alert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.load);
      expect(alert?.textContent).not.toContain("SQL stack");
      const token = alert?.getAttribute("data-folder-error-token");
      expect(token).toBeTruthy();
      tokens.push(token!);
      const retry = alert?.querySelector('[data-folder-retry-kind="load"]');
      expect(retry?.textContent).toBe("Retry loading folders");
      await click(retry ?? null);
      await flushEffects();
    }
    expect(new Set(tokens).size).toBe(3);
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
    expect(view.container.querySelector('[data-media-folder-id="folder-1"]')).not.toBeNull();
    expect(folderGets).toBe(4);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("the real page serializes synchronous double activation of a captured Retry into one deferred attempt", async () => {
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
      return retryLoad.promise;
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    const capturedRetry = view.container.querySelector(
      '[data-folder-retry-kind="load"]'
    ) as HTMLButtonElement;
    expect(capturedRetry).not.toBeNull();

    React.act(() => {
      capturedRetry.click();
      capturedRetry.click();
    });
    await flushEffects();
    expect(folderGets).toBe(2);
    expect(
      view.container.querySelector("[data-media-folder-rail]")?.getAttribute("aria-busy")
    ).toBe("true");
    expect(view.container.querySelectorAll('[data-folder-retry-kind="load"]')).toHaveLength(0);

    await React.act(async () => {
      retryLoad.resolve(jsonResponse([folder({ id: "single", name: "Single" })]));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();
    expect(folderGets).toBe(2);
    expect(
      view.container.querySelector("[data-media-folder-rail]")?.getAttribute("aria-busy")
    ).toBe("false");
    expect(view.container.querySelector('[data-media-folder-id="single"]')).not.toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("cross-tab clear-before-broadcast forces revalidation while a failed load keeps the last-good tree until Retry", async () => {
  const originalFetch = globalThis.fetch;
  const crossTabLoad = deferred<Response>();
  const retryLoad = deferred<Response>();
  let folderGets = 0;
  let folderDeletes = 0;
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders/last-good") && init?.method === "DELETE") {
      folderDeletes += 1;
      return jsonResponse({ ok: true });
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      if (folderGets === 1) {
        return jsonResponse([folder({ id: "last-good", name: "Last Good", slug: "last-good" })]);
      }
      if (folderGets === 2) return crossTabLoad.promise;
      return retryLoad.promise;
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    expect(view.container.querySelector('[data-media-folder-id="last-good"]')).not.toBeNull();
    // Simulate another tab's success path: storage was cleared before its broadcast,
    // while this tab still owns an in-memory last-good entry.
    window.localStorage.removeItem(cacheKeys.mediaFolders);
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
      await Promise.resolve();
    });
    await flushEffects();

    expect(folderGets).toBe(2);
    expect(view.container.querySelector('[data-media-folder-id="last-good"]')).not.toBeNull();
    expect(view.container.querySelector('[data-media-folder-id="fresh"]')).toBeNull();
    expect(
      view.container.querySelector("[data-media-folder-rail]")?.getAttribute("aria-busy")
    ).toBe("true");
    const deleteLastGood = getAriaButton(view.container, "Delete Last Good");
    expect(deleteLastGood.disabled).toBe(true);
    deleteLastGood.click();
    expect(folderDeletes).toBe(0);

    await React.act(async () => {
      crossTabLoad.reject(new Error("cross-tab raw failure"));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();

    expect(
      view.container.querySelector("[data-media-folder-rail]")?.getAttribute("aria-busy")
    ).toBe("false");
    const alert = view.container.querySelector('[data-folder-error-kind="load"]');
    expect(alert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.load);
    expect(alert?.textContent).not.toContain("cross-tab raw failure");

    const retry = alert?.querySelector("button");
    if (!(retry instanceof HTMLButtonElement)) {
      throw new Error("Expected load Retry button to exist");
    }
    React.act(() => {
      retry.click();
      retry.click();
    });
    await flushEffects();
    expect(folderGets).toBe(3);
    expect(
      view.container.querySelector("[data-media-folder-rail]")?.getAttribute("aria-busy")
    ).toBe("true");
    expect(view.container.querySelectorAll('[data-folder-retry-kind="load"]')).toHaveLength(0);

    await React.act(async () => {
      retryLoad.resolve(jsonResponse([folder({ id: "fresh", name: "Fresh", slug: "fresh" })]));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();
    expect(folderGets).toBe(3);
    expect(
      view.container.querySelector("[data-media-folder-rail]")?.getAttribute("aria-busy")
    ).toBe("false");
    expect(view.container.querySelector('[data-media-folder-id="last-good"]')).toBeNull();
    expect(view.container.querySelector('[data-media-folder-id="fresh"]')).not.toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});
