// @vitest-environment happy-dom

// TASK-105-08-06: `MediaLibraryPage` race/invalidation suite. Covers stale
// load failure, deferred reconcile failure after mutation success, replace
// in place on create, and unmount invalidation of pending rename/reorder/
// delete commits through the real mediaClient + fetch mock.

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import { clearMediaCache } from "../../../core/admin/services/mediaClient";
import { clearMediaFoldersCache } from "../../../core/admin/services/mediaFoldersClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
import { FOLDER_OPERATION_MESSAGES } from "../../../core/admin/ui/media/MediaLibraryPage";

import {
  click,
  deferred,
  flushEffects,
  folder,
  folderRowIds,
  getAriaButton,
  getButton,
  jsonResponse,
  mountMediaLibrary,
  setInputValue,
  userSettingsResponse,
  writeMediaCache,
} from "./mediaLibraryTestUtils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const originalFetch = globalThis.fetch;

afterEach(() => {
  clearMediaCache();
  clearMediaFoldersCache();
  globalThis.fetch = originalFetch;
});

test("stale generation: an older load REJECTING after a newer load started is a stale failure, not an alert", async () => {
  writeMediaCache([]);
  let folderGets = 0;
  const olderReject = deferred<Response>();
  const newerResolve = deferred<Response>();
  globalThis.fetch = async (input, _init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      if (folderGets === 1) return olderReject.promise;
      if (folderGets === 2) return newerResolve.promise;
      return jsonResponse([]);
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    expect(folderGets).toBe(1);
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
      await Promise.resolve();
    });
    expect(folderGets).toBe(2);
    // The older (generation 1) load rejects after generation 2 started.
    olderReject.reject(new Error("older network raw"));
    await flushEffects();
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
    newerResolve.resolve(jsonResponse([]));
    await flushEffects();
    expect(folderRowIds(view.container)).toEqual([]);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("deferred reconcile failure set during a pending create is published once the create succeeds", async () => {
  writeMediaCache([]);
  let folderGets = 0;
  let createPosts = 0;
  const createPending = deferred<Response>();
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders") && init?.method === "POST") {
      createPosts += 1;
      return createPending.promise;
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      // The reconcile broadcasts (one manual while the create is pending and
      // the client's own after the POST resolves) both fail while the create
      // is still pending, so the deferred failure survives to the flush.
      if (folderGets === 2) return Promise.reject(new Error("reconcile raw"));
      if (folderGets === 3) return Promise.reject(new Error("reconcile raw 2"));
      return jsonResponse(
        folderGets >= 4
          ? [folder({ id: "created", name: "Created", slug: "created", orderIndex: 1 })]
          : []
      );
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await click(getButton(view.container, "New"));
    const nameInput = view.container.querySelector('input[aria-label="New folder name"]');
    if (!(nameInput instanceof HTMLInputElement)) {
      throw new Error("Expected new-folder input");
    }
    await setInputValue(nameInput, "Created");
    await click(getAriaButton(view.container, "Create folder"));
    await flushEffects();
    expect(createPosts).toBe(1);
    expect(folderGets).toBe(1);
    // A cache broadcast reconciles while the create is still pending and
    // stores the deferred load failure (folderGets 2).
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
      await Promise.resolve();
    });
    await flushEffects();
    expect(folderGets).toBe(2);
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
    // The POST resolves; the client's own broadcast (folderGets 3) fails
    // again, keeping the deferred failure current for the flush.
    createPending.resolve(
      jsonResponse(folder({ id: "created", name: "Created", slug: "created", orderIndex: 1 }))
    );
    await flushEffects();
    await flushEffects();
    expect(folderRowIds(view.container)).toEqual(["created"]);
    const alert = view.container.querySelector('[data-folder-error-kind="load"]');
    expect(alert?.textContent).toContain(FOLDER_OPERATION_MESSAGES.load);
    await click(alert?.querySelector("button") ?? null);
    await flushEffects();
    expect(folderGets).toBe(4);
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("create replaces an existing folder id already present in the list (cache event delivered it first)", async () => {
  writeMediaCache([]);
  let folderGets = 0;
  let createPosts = 0;
  const createPending = deferred<Response>();
  const f1 = folder({ id: "f1", name: "First", slug: "first", orderIndex: 0 });
  const created = folder({ id: "created", name: "Created", slug: "created", orderIndex: 1 });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders") && init?.method === "POST") {
      createPosts += 1;
      return createPending.promise;
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      // First load: only f1. Any later reconcile returns f1 + created so the
      // committed replace-in-place result stays visible.
      if (folderGets === 1) return jsonResponse([f1]);
      return jsonResponse([f1, created]);
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    expect(folderRowIds(view.container)).toEqual(["f1"]);
    await click(getButton(view.container, "New"));
    const nameInput = view.container.querySelector('input[aria-label="New folder name"]');
    if (!(nameInput instanceof HTMLInputElement)) {
      throw new Error("Expected new-folder input");
    }
    await setInputValue(nameInput, "Created");
    await click(getAriaButton(view.container, "Create folder"));
    await flushEffects();
    expect(createPosts).toBe(1);
    expect(folderGets).toBe(1);
    // A cache broadcast delivers the created folder before the POST resolves.
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update" });
      await Promise.resolve();
    });
    await flushEffects();
    expect(folderGets).toBe(2);
    expect(folderRowIds(view.container)).toEqual(["f1", "created"]);
    createPending.resolve(jsonResponse(created));
    await flushEffects();
    expect(folderRowIds(view.container)).toEqual(["f1", "created"]);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("pending rename is invalidated by unmount: no post-commit state update", async () => {
  writeMediaCache([]);
  let folderGets = 0;
  const renamePending = deferred<Response>();
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders/f1") && init?.method === "PATCH") {
      return renamePending.promise;
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      return jsonResponse([folder({ id: "f1", name: "First", slug: "first", orderIndex: 0 })]);
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await click(getAriaButton(view.container, "Rename First"));
    const input = view.container.querySelector('input[aria-label="Rename folder First"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Expected rename input");
    }
    await setInputValue(input, "Renamed");
    await click(getAriaButton(view.container, "Save folder name"));
    await flushEffects();
    view.cleanup();
    renamePending.resolve(jsonResponse({ ok: true }));
    await flushEffects();
    expect(folderGets).toBe(1);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("pending reorder is invalidated by unmount: no post-commit state update", async () => {
  writeMediaCache([]);
  let folderGets = 0;
  const reorderPending = deferred<Response>();
  const initialFolders = [
    folder({ id: "f1", name: "First", slug: "first", orderIndex: 0 }),
    folder({ id: "f2", name: "Second", slug: "second", orderIndex: 1 }),
  ];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders/reorder") && init?.method === "POST") {
      return reorderPending.promise;
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      return jsonResponse(initialFolders);
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
    view.cleanup();
    reorderPending.resolve(jsonResponse({ ok: true }));
    await flushEffects();
    expect(folderGets).toBe(1);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("pending delete is invalidated by unmount: no post-commit state update", async () => {
  writeMediaCache([]);
  let folderGets = 0;
  const deletePending = deferred<Response>();
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders/f1") && init?.method === "DELETE") {
      return deletePending.promise;
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      return jsonResponse([folder({ id: "f1", name: "First", slug: "first", orderIndex: 0 })]);
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    const original = window.confirm;
    window.confirm = vi.fn(() => true) as unknown as typeof window.confirm;
    await click(getAriaButton(view.container, "Delete First"));
    window.confirm = original;
    await flushEffects();
    view.cleanup();
    deletePending.resolve(jsonResponse({ ok: true }));
    await flushEffects();
    expect(folderGets).toBe(1);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("reorder commit skips folders absent from the orders payload", async () => {
  writeMediaCache([]);
  const initialFolders = [
    folder({ id: "f1", name: "First", slug: "first", orderIndex: 0 }),
    folder({ id: "f2", name: "Second", slug: "second", orderIndex: 1 }),
    folder({ id: "child", name: "Child", slug: "child", parentId: "f1", orderIndex: 0 }),
  ];
  const reorderedRoots = [
    { ...initialFolders[1]!, orderIndex: 0 },
    { ...initialFolders[0]!, orderIndex: 1 },
  ];
  let folderGets = 0;
  let reorderPosts = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders/reorder") && init?.method === "POST") {
      reorderPosts += 1;
      return jsonResponse({ ok: true });
    }
    if (url.endsWith("/media/folders")) {
      folderGets += 1;
      if (folderGets === 1) return jsonResponse(initialFolders);
      return jsonResponse(
        reorderPosts >= 1 ? [...reorderedRoots, initialFolders[2]!] : initialFolders
      );
    }
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    // The child is rendered nested under f1.
    expect(folderRowIds(view.container)).toEqual(["f1", "child", "f2"]);
    await click(getAriaButton(view.container, "Move First down"));
    await flushEffects();
    await flushEffects();
    // f1/f2 swap, while the nested child (not part of the sibling orders
    // payload) is preserved in place.
    expect(reorderPosts).toBe(1);
    expect(folderRowIds(view.container)).toEqual(["f2", "f1", "child"]);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});
