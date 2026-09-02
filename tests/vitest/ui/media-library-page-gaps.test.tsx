// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { clearMediaCache, type MediaRecord } from "../../../core/admin/services/mediaClient";
import { clearMediaFoldersCache } from "../../../core/admin/services/mediaFoldersClient";
import { invalidateUserSettingsCache } from "../../../core/admin/services/userSettingsClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import {
  click,
  flushEffects,
  folder,
  getButton,
  getFiltersButton,
  getPanelButton,
  hasGridItem,
  jsonResponse,
  mediaRecord,
  mountMediaLibrary,
  userSettingsResponse,
  writeMediaCache,
} from "./mediaLibraryTestUtils";

afterEach(() => {
  clearMediaCache();
  clearMediaFoldersCache();
  invalidateUserSettingsCache();
  resetCsrfToken();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/admin/media");
});

function getSheetButton(label: string): HTMLElement | null {
  const content = document.querySelector('[data-slot="sheet-content"]');
  if (!content) return null;
  return (
    Array.from(content.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === label
    ) ?? null
  );
}

const documentRecord = (overrides: Partial<MediaRecord> = {}) =>
  mediaRecord({
    ...overrides,
    key: overrides.key ?? "document.pdf",
    url: overrides.url ?? "/media/document.pdf",
    type: "file",
    mimeType: "application/pdf",
  });

const videoRecord = (overrides: Partial<MediaRecord> = {}) =>
  mediaRecord({
    ...overrides,
    key: overrides.key ?? "movie.mp4",
    url: overrides.url ?? "/media/movie.mp4",
    type: "file",
    mimeType: "video/mp4",
  });

const mockConfirmResult = (result: boolean) => {
  const original = Object.getOwnPropertyDescriptor(window, "confirm");
  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: () => result,
  });
  return () => {
    if (original) {
      Object.defineProperty(window, "confirm", original);
    } else {
      Reflect.deleteProperty(window, "confirm");
    }
  };
};

test("a failing open-after-upload preference patch is swallowed without surfacing an error", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([]);
  globalThis.fetch = async (input, _init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf" });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({ error: "boom" }, 500);
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    const label = Array.from(view.container.querySelectorAll("label")).find((entry) =>
      entry.textContent?.includes("Open details after upload")
    );
    const checkbox = label?.querySelector('[data-slot="checkbox"]') as HTMLElement | null;
    expect(checkbox).toBeTruthy();
    await click(checkbox);
    await flushEffects();
    await flushEffects();
    expect(view.container.querySelector('[data-folder-error-kind="load"]')).toBeNull();
    expect(view.container.querySelector('[role="alert"]')).toBeNull();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("deleting the selected asset from the drawer removes it and closes the drawer", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([
    mediaRecord({ id: "ok-1", title: "Success Asset" }),
    mediaRecord({ id: "keep-1", title: "Keep Asset" }),
  ]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/usage")) return jsonResponse([]);
    if (url.endsWith("/media/ok-1") && init?.method === "DELETE") return jsonResponse({ ok: true });
    if (url.endsWith("/media"))
      return jsonResponse([
        mediaRecord({ id: "ok-1", title: "Success Asset" }),
        mediaRecord({ id: "keep-1", title: "Keep Asset" }),
      ]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=ok-1");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(document.body.textContent).toContain("Media Details");
    // Select the drawer asset in the grid so the deletion filters the selection too.
    await click(view.container.querySelector('button[aria-label="Select Success Asset"]'));
    await click(getSheetButton("Delete"));
    await flushEffects();
    expect(hasGridItem("Success Asset")).toBe(false);
    expect(hasGridItem("Keep Asset")).toBe(true);
    expect(document.body.textContent).not.toContain("Media Details");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("delete failure for a non-API error shows the generic message", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "g-1", title: "Generic Fail" })]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/g-1") && init?.method === "DELETE")
      throw new TypeError("network down");
    if (url.endsWith("/media"))
      return jsonResponse([mediaRecord({ id: "g-1", title: "Generic Fail" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=g-1");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getSheetButton("Delete"));
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to delete media asset.");
    expect(hasGridItem("Generic Fail")).toBe(true);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("bulk delete closes the drawer when the open asset is deleted", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string }> = [];
  writeMediaCache([mediaRecord({ id: "a", title: "Alpha" })]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/usage")) return jsonResponse([]);
    if (url.endsWith("/media/a") && init?.method === "DELETE") return jsonResponse({ ok: true });
    if (url.endsWith("/media")) return jsonResponse([mediaRecord({ id: "a", title: "Alpha" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=a");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(document.body.textContent).toContain("Media Details");
    await click(view.container.querySelector('button[aria-label="Select Alpha"]'));
    const restoreConfirm = mockConfirmResult(true);
    try {
      await click(getButton(view.container, "Delete"));
      await flushEffects();
    } finally {
      restoreConfirm();
    }
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
    expect(document.body.textContent).not.toContain("Media Details");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("bulk download creates and clicks one anchor per selected asset", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([
    mediaRecord({ id: "a", title: "Alpha" }),
    mediaRecord({ id: "b", title: "Beta" }),
  ]);
  globalThis.fetch = async (input, _init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(view.container.querySelector('button[aria-label="Select Alpha"]'));
    await click(view.container.querySelector('button[aria-label="Select Beta"]'));
    await click(getButton(view.container, "Download"));
    expect(clickSpy).toHaveBeenCalledTimes(2);
    const anchors = Array.from(document.body.querySelectorAll("a[download]"));
    expect(anchors).toHaveLength(0);
  } finally {
    clickSpy.mockRestore();
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("replacing the open asset updates the grid and shows the replaced status", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "r-2", title: "Old Title" })]);
  globalThis.fetch = async (input, _init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/usage")) return jsonResponse([]);
    if (url.endsWith("/media/r-2/replace"))
      return jsonResponse(mediaRecord({ id: "r-2", title: "New Title" }));
    if (url.endsWith("/media"))
      return jsonResponse([mediaRecord({ id: "r-2", title: "Old Title" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=r-2");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getButton(document.body, "Replace"));
    const fileInput = document.querySelector(
      '[data-slot="sheet-content"] input[type="file"]'
    ) as HTMLInputElement | null;
    if (!fileInput) throw new Error("Expected replace file input");
    Object.defineProperty(fileInput, "files", {
      value: [new File(["p"], "x.png", { type: "image/png" })],
      configurable: true,
    });
    await React.act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();
    expect(document.body.textContent).toContain("New Title");
    expect(hasGridItem("New Title")).toBe(true);
    expect(hasGridItem("Old Title")).toBe(false);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("replace failure for a non-API error shows the generic message", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "r-3", title: "Replace Generic" })]);
  globalThis.fetch = async (input, _init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/r-3/replace")) throw new TypeError("network down");
    if (url.endsWith("/media"))
      return jsonResponse([mediaRecord({ id: "r-3", title: "Replace Generic" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=r-3");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getButton(document.body, "Replace"));
    const fileInput = document.querySelector(
      '[data-slot="sheet-content"] input[type="file"]'
    ) as HTMLInputElement | null;
    if (!fileInput) throw new Error("Expected replace file input");
    Object.defineProperty(fileInput, "files", {
      value: [new File(["p"], "x.png", { type: "image/png" })],
      configurable: true,
    });
    await React.act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to replace media asset.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("selecting a non-image asset skips dimension recovery", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string }> = [];
  writeMediaCache([documentRecord({ id: "doc-1", title: "A Document" })]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push({ url });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/usage")) return jsonResponse([]);
    if (url.endsWith("/media"))
      return jsonResponse([documentRecord({ id: "doc-1", title: "A Document" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=doc-1");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(document.body.textContent).toContain("A Document");
    expect(calls.some((call) => call.url.endsWith("/dimensions/recover"))).toBe(false);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("dimension recovery failure shows the API message in the drawer", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([
    { ...mediaRecord({ id: "dim-2", title: "Recovery Fail" }), width: null, height: null },
  ]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/usage")) return jsonResponse([]);
    if (url.endsWith("/dimensions/recover") && init?.method === "POST")
      return jsonResponse(
        { error: { code: "recover_failed", message: "Recovery exploded", details: "<b>x</b>" } },
        500
      );
    if (url.endsWith("/media"))
      return jsonResponse([
        { ...mediaRecord({ id: "dim-2", title: "Recovery Fail" }), width: null, height: null },
      ]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=dim-2");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(document.body.textContent).toContain("Recovery exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("settings load failure for a non-API error shows the generic message", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) throw new TypeError("network down");
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getButton(view.container, "Media settings"));
    await flushEffects();
    expect(document.body.textContent).toContain("Failed to load media settings.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("settings save failure shows the API message in the drawer", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage") && init?.method === "PATCH")
      return jsonResponse(
        { error: { code: "settings_save_failed", message: "Save exploded", details: "<b>x</b>" } },
        500
      );
    if (url.endsWith("/settings/storage"))
      return jsonResponse({
        delivery: { accessMode: "public" },
        quota: { totalBytes: null, planLabel: null },
      });
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getButton(view.container, "Media settings"));
    await flushEffects();
    await click(getPanelButton("Save changes"));
    await flushEffects();
    expect(document.body.textContent).toContain("Save exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("settings save failure for a non-API error shows the generic message", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage") && init?.method === "PATCH")
      throw new TypeError("network down");
    if (url.endsWith("/settings/storage"))
      return jsonResponse({
        delivery: { accessMode: "public" },
        quota: { totalBytes: null, planLabel: null },
      });
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getButton(view.container, "Media settings"));
    await flushEffects();
    await click(getPanelButton("Save changes"));
    await flushEffects();
    expect(document.body.textContent).toContain("Failed to update media settings.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("type facet in the Filters panel narrows the grid by media kind", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([
    mediaRecord({ id: "img-1", title: "Picture" }),
    videoRecord({ id: "vid-1", title: "Movie" }),
  ]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media"))
      return jsonResponse([
        mediaRecord({ id: "img-1", title: "Picture" }),
        videoRecord({ id: "vid-1", title: "Movie" }),
      ]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getFiltersButton(view.container));
    await click(getPanelButton("Images"));
    await flushEffects();
    expect(hasGridItem("Picture")).toBe(true);
    expect(hasGridItem("Movie")).toBe(false);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("uploading an empty file list is a no-op", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string }> = [];
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method });
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
    const fileInput = view.container.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error("Expected UploadDropzone file input");
    }
    Object.defineProperty(fileInput, "files", { value: [], configurable: true });
    await React.act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("upload failure for a non-API error shows the generic message", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media") && init?.method === "POST") throw new TypeError("network down");
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    const fileInput = view.container.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error("Expected UploadDropzone file input");
    }
    Object.defineProperty(fileInput, "files", {
      value: [new File(["p"], "x.png", { type: "image/png" })],
      configurable: true,
    });
    await React.act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to upload files.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("metadata save failure for a non-API error shows the generic message", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "m-2", title: "Meta Generic" })]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/m-2") && init?.method === "PATCH") throw new TypeError("network down");
    if (url.endsWith("/media"))
      return jsonResponse([mediaRecord({ id: "m-2", title: "Meta Generic" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=m-2");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    const titleInput = document.body.querySelector(
      'input[id="media-title-m-2"]'
    ) as HTMLInputElement | null;
    expect(titleInput).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await React.act(async () => {
      setter?.call(titleInput, "Renamed");
      titleInput?.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });
    await React.act(async () => {
      titleInput?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to update media metadata.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("selecting a rail type clears the folder facet and filters the grid", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([
    { ...mediaRecord({ id: "img-1", title: "Picture" }), folderId: "folder-1" },
    videoRecord({ id: "vid-1", title: "Movie" }),
  ]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([folder()]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media"))
      return jsonResponse([
        mediaRecord({ id: "img-1", title: "Picture" }),
        videoRecord({ id: "vid-1", title: "Movie" }),
      ]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    // Start on the Marketing folder (filters to Picture only).
    await click(getButton(view.container, "Marketing"));
    await flushEffects();
    expect(hasGridItem("Picture")).toBe(true);
    expect(hasGridItem("Movie")).toBe(false);
    // Clicking the rail Videos type clears the folder and filters by type.
    const videosButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim().startsWith("Videos") === true
    );
    if (!(videosButton instanceof HTMLButtonElement)) {
      throw new Error("Expected Videos type button");
    }
    await click(videosButton);
    await flushEffects();
    expect(hasGridItem("Picture")).toBe(false);
    expect(hasGridItem("Movie")).toBe(true);
    expect(
      view.container
        .querySelector("[data-media-filter-folder-id]")
        ?.getAttribute("data-media-filter-folder-id")
    ).toBe("");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});
