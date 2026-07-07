// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { clearMediaCache, type MediaRecord } from "../../../core/admin/services/mediaClient";
import { clearMediaFoldersCache } from "../../../core/admin/services/mediaFoldersClient";
import {
  MediaLibraryPage,
  folderDescendantIds,
} from "../../../core/admin/ui/media/MediaLibraryPage";
import { buildFolderTree, type FolderNode } from "../../../core/admin/ui/media/utils";
import type { MediaFolder } from "../../../core/admin/ui/media/types";
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

const mountMediaLibrary = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/media">
        <MediaLibraryPage />
      </AdminRouterProvider>
    );
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
