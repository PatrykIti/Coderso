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

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const userSettingsResponse = {
  "pages.openAfterCreate": false,
  "media.openAfterUpload": false,
  "widgets.favorites": [],
  "widgets.hero.presets": [],
  "posts.editor.preferences": {},
  "assistant.mode": null,
  "assistant.ui.enabled": true,
  "assistant.ui.avatarEnabled": false,
  "assistant.ui.avatarAsset": null,
};

const mediaRecord = (overrides: Partial<MediaRecord> = {}): MediaRecord => ({
  id: overrides.id ?? "media-1",
  key: overrides.key ?? "key-1",
  url: overrides.url ?? "https://example.com/a.jpg",
  type: overrides.type ?? "image",
  mimeType: overrides.mimeType ?? "image/jpeg",
  size: overrides.size ?? 1234,
  width: overrides.width ?? 100,
  height: overrides.height ?? 100,
  alt: overrides.alt ?? null,
  title: overrides.title ?? "Cached asset",
  caption: overrides.caption ?? null,
  originalName: overrides.originalName ?? "a.jpg",
  createdAt: overrides.createdAt ?? "2026-02-15T00:00:00.000Z",
  createdBy: overrides.createdBy ?? null,
});

const writeMediaCache = (rows: MediaRecord[]) => {
  window.localStorage.setItem(
    cacheKeys.mediaList,
    JSON.stringify({ value: rows, savedAt: Date.now() })
  );
};

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const click = async (element: Element | null) => {
  if (!element) {
    throw new Error("Expected element to exist before clicking");
  }
  await React.act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
};

const getButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (entry) => entry.textContent?.trim() === label
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected button "${label}" to exist`);
  }
  return button;
};

const mountMediaLibrary = (options?: { strict?: boolean }) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const page = (
    <AdminRouterProvider initialPath="/admin/media">
      <MediaLibraryPage />
    </AdminRouterProvider>
  );
  React.act(() => {
    root.render(options?.strict ? <React.StrictMode>{page}</React.StrictMode> : page);
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

afterEach(() => {
  clearMediaCache();
  clearMediaFoldersCache();
  invalidateUserSettingsCache();
  resetCsrfToken();
  window.localStorage.clear();
});

// TASK-512-06 helpers ------------------------------------------------------

const folder = (overrides: Partial<MediaFolder> = {}): MediaFolder => ({
  id: overrides.id ?? "folder-1",
  name: overrides.name ?? "Marketing",
  slug: overrides.slug ?? "marketing",
  parentId: overrides.parentId ?? null,
  orderIndex: overrides.orderIndex ?? 0,
  createdAt: overrides.createdAt ?? "2026-02-15T00:00:00.000Z",
});

const setInputValue = async (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
  await React.act(async () => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();
  });
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const getAriaButton = (container: ParentNode, label: string) => {
  const button = container.querySelector(`button[aria-label="${label}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected aria button "${label}" to exist`);
  }
  return button;
};

const folderRowIds = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-media-folder-id]")).map((row) =>
    row.getAttribute("data-media-folder-id")
  );

const apiErrorResponse = (code: string, message: string, status = 500) =>
  jsonResponse({ error: { code, message, details: `<b>SQL stack for ${message}</b>` } }, status);

const getFiltersButton = (container: HTMLElement) => {
  const button = Array.from(container.querySelectorAll("button")).find((entry) =>
    entry.textContent?.trim().startsWith("Filters")
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Expected Filters button to exist");
  }
  return button;
};

const gridSelectLabels = () =>
  Array.from(document.querySelectorAll('button[aria-label^="Select "]'))
    .map((el) => el.getAttribute("aria-label"))
    .filter((label): label is string => label !== null && label !== "Select visible");

const hasGridItem = (name: string) =>
  document.querySelector(`button[aria-label="Select ${name}"]`) !== null;

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

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

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

// TASK-512-06 page integration ------------------------------------------------

const GB = 1024 ** 3;

const flushRaf = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
};

const getPanelButton = (text: string) => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (entry) => entry.textContent?.trim() === text
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected panel button "${text}" to exist`);
  }
  return button;
};

const setSelectValue = async (select: HTMLSelectElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(select), "value")?.set;
  await React.act(async () => {
    setter?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
};

test("StorageQuotaCard shows a progress bar when a quota is configured", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([{ ...mediaRecord({ id: "a", title: "Alpha" }), size: 2 * GB }]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage"))
      return jsonResponse({
        delivery: { accessMode: "public" },
        quota: { totalBytes: 10 * GB, planLabel: "Pro plan" },
      });
    if (url.endsWith("/media")) return jsonResponse([mediaRecord({ id: "a", title: "Alpha" })]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(view.container.textContent).toContain("Pro plan");
    expect(view.container.textContent).toContain("% used");
    expect(view.container.textContent).not.toContain("No storage quota configured");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("StorageQuotaCard degrades to count-only when no quota is configured", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "a", title: "Alpha" })]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage"))
      return jsonResponse({
        delivery: { accessMode: "public" },
        quota: { totalBytes: null, planLabel: null },
      });
    if (url.endsWith("/media")) return jsonResponse([mediaRecord({ id: "a", title: "Alpha" })]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(view.container.textContent).toContain("No storage quota configured");
    expect(view.container.textContent).not.toContain("% used");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("folder rail selects a folder to filter the grid and creates a folder via POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
  writeMediaCache([
    { ...mediaRecord({ id: "a", title: "Alpha" }), folderId: "folder-1" },
    { ...mediaRecord({ id: "b", title: "Beta" }), folderId: null },
  ]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method, body: init?.body });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders") && init?.method === "POST")
      return jsonResponse(folder({ id: "folder-2", name: "Launch", slug: "launch" }));
    if (url.endsWith("/media/folders")) return jsonResponse([folder()]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();

    expect(hasGridItem("Alpha")).toBe(true);
    expect(hasGridItem("Beta")).toBe(true);

    await click(getButton(view.container, "Marketing"));

    expect(hasGridItem("Alpha")).toBe(true);
    expect(hasGridItem("Beta")).toBe(false);
    expect(gridSelectLabels()).toEqual(["Select Alpha"]);

    await click(getButton(view.container, "New"));
    const nameInput = view.container.querySelector('input[aria-label="New folder name"]');
    if (!(nameInput instanceof HTMLInputElement)) {
      throw new Error("Expected new-folder input to exist");
    }
    await setInputValue(nameInput, "Launch");
    await click(view.container.querySelector('button[aria-label="Create folder"]'));

    const post = calls.find(
      (call) => call.url.endsWith("/media/folders") && call.method === "POST"
    );
    expect(post).toBeTruthy();
    expect(String(post?.body)).toContain("Launch");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("Filters panel narrows the grid by tag (AND-match) and lights the toolbar badge", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([
    { ...mediaRecord({ id: "a", title: "Alpha" }), tags: ["x"] },
    { ...mediaRecord({ id: "b", title: "Beta" }), tags: ["y"] },
    { ...mediaRecord({ id: "c", title: "Gamma" }), tags: ["x", "y"] },
  ]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();

    // Badge hidden with no active facets.
    expect(getFiltersButton(view.container).textContent?.trim()).toBe("Filters");

    await click(getFiltersButton(view.container));
    await click(getPanelButton("x"));

    expect(hasGridItem("Alpha")).toBe(true);
    expect(hasGridItem("Gamma")).toBe(true);
    expect(hasGridItem("Beta")).toBe(false);
    // Facet count lights the badge (tags = one facet regardless of count).
    expect(getFiltersButton(view.container).textContent).toContain("1");

    await click(getPanelButton("y"));

    // AND-match: only the asset carrying BOTH tags survives.
    expect(gridSelectLabels()).toEqual(["Select Gamma"]);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("Filters alt facet excludes non-images under Has alt and shows only missing-alt images under Missing alt", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([
    { ...mediaRecord({ id: "a", title: "HasImg", mimeType: "image/jpeg", alt: "hero" }) },
    { ...mediaRecord({ id: "b", title: "MissImg", mimeType: "image/jpeg", alt: null }) },
    { ...mediaRecord({ id: "c", title: "DocFile", mimeType: "application/pdf", alt: null }) },
  ]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();

    await click(getFiltersButton(view.container));

    await click(getPanelButton("Has alt"));
    // Non-image (DocFile) must NOT appear under "has"; only the image WITH alt does.
    expect(gridSelectLabels()).toEqual(["Select HasImg"]);
    expect(hasGridItem("DocFile")).toBe(false);

    await click(getPanelButton("Missing alt"));
    // Only the image lacking alt; non-images excluded under "missing" too.
    expect(gridSelectLabels()).toEqual(["Select MissImg"]);
    expect(hasGridItem("DocFile")).toBe(false);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("Filters date facet is inclusive on the selected end day", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([
    {
      ...mediaRecord({ id: "a", title: "Alpha" }),
      createdAt: "2026-07-05T14:00:00.000Z",
    },
  ]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();

    await click(getFiltersButton(view.container));

    const toInput = document.querySelector('input[aria-label="To date"]');
    if (!(toInput instanceof HTMLInputElement)) throw new Error("Expected To date input");

    // The day BEFORE excludes the asset (proves the filter is active)...
    await setInputValue(toInput, "2026-07-04");
    expect(hasGridItem("Alpha")).toBe(false);

    // ...but the asset's OWN day (with a 14:00 timestamp) must remain (inclusive upper bound).
    await setInputValue(toInput, "2026-07-05");
    expect(hasGridItem("Alpha")).toBe(true);

    const fromInput = document.querySelector('input[aria-label="From date"]');
    if (!(fromInput instanceof HTMLInputElement)) throw new Error("Expected From date input");
    await setInputValue(fromInput, "2026-07-05");
    expect(hasGridItem("Alpha")).toBe(true);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("details drawer save forwards the new metadata fields to updateMedia", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
  const record = {
    ...mediaRecord({ id: "alpha", title: "Alpha", mimeType: "image/jpeg" }),
    tags: ["x"],
    folderId: "folder-1",
  };
  writeMediaCache([record]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method, body: init?.body });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([folder()]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.includes("/usage")) return jsonResponse([]);
    if (url.endsWith("/media/alpha") && init?.method === "PATCH")
      return jsonResponse({ ...record, folderId: null });
    if (url.endsWith("/media")) return jsonResponse([record]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();

    const openButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => !button.getAttribute("aria-label") && (button.textContent ?? "").includes("Alpha")
    );
    await click(openButton ?? null);
    await flushRaf();

    const folderSelect = document.querySelector("#media-folder-alpha");
    if (!(folderSelect instanceof HTMLSelectElement)) {
      throw new Error("Expected drawer folder select to exist");
    }
    // Changing the folder select persists the FULL present-only payload.
    await setSelectValue(folderSelect, "");
    await flushEffects();

    const patch = calls.find(
      (call) => call.url.endsWith("/media/alpha") && call.method === "PATCH"
    );
    expect(patch).toBeTruthy();
    const payload = JSON.parse(String(patch?.body)) as Record<string, unknown>;
    expect(payload.folderId).toBeNull();
    expect(payload.tags).toEqual(["x"]);
    expect(payload).toHaveProperty("focalX");
    expect(payload).toHaveProperty("description");
    expect(payload).toHaveProperty("credit");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("upload into an active folder uses upload-first-then-PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method, body: init?.body });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([folder()]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.includes("/usage")) return jsonResponse([]);
    if (url.endsWith("/media") && init?.method === "POST")
      return jsonResponse(mediaRecord({ id: "new-1", title: "Uploaded" }));
    if (url.endsWith("/media/new-1") && init?.method === "PATCH")
      return jsonResponse({
        ...mediaRecord({ id: "new-1", title: "Uploaded" }),
        folderId: "folder-1",
      });
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();

    await click(getButton(view.container, "Marketing"));

    const fileInput = view.container.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error("Expected UploadDropzone file input");
    }
    const file = new File(["payload"], "up.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
    await React.act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();

    const post = calls.find((call) => call.url.endsWith("/media") && call.method === "POST");
    expect(post).toBeTruthy();
    expect(post?.body instanceof FormData).toBe(true);
    // Upload meta must NOT carry folderId (route boundary is additionalProperties:false).
    expect((post?.body as FormData).get("folderId")).toBeNull();

    const patch = calls.find(
      (call) => call.url.endsWith("/media/new-1") && call.method === "PATCH"
    );
    expect(patch).toBeTruthy();
    expect(JSON.parse(String(patch?.body)).folderId).toBe("folder-1");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
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
