// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { clearMediaCache, type MediaRecord } from "../../../core/admin/services/mediaClient";
import { MediaLibraryPage } from "../../../core/admin/ui/media/MediaLibraryPage";
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
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const click = async (element: Element | null) => {
  if (!element) {
    throw new Error("Expected element to exist before clicking");
  }
  await act(async () => {
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

  act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/media">
        <MediaLibraryPage />
      </AdminRouterProvider>
    );
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  clearMediaCache();
  invalidateUserSettingsCache();
  window.localStorage.clear();
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

    act(() => {
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
