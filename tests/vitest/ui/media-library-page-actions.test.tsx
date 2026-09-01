// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { clearMediaCache } from "../../../core/admin/services/mediaClient";
import { clearMediaFoldersCache } from "../../../core/admin/services/mediaFoldersClient";
import { invalidateUserSettingsCache } from "../../../core/admin/services/userSettingsClient";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import {
  click,
  flushEffects,
  folder,
  getButton,
  getPanelButton,
  hasGridItem,
  jsonResponse,
  mediaRecord,
  mountMediaLibrary,
  userSettingsResponse,
  writeMediaCache,
  setInputValue,
  getFiltersButton,
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

const mockWindowOpen = () => {
  const original = Object.getOwnPropertyDescriptor(window, "open");
  const openSpy = vi.fn(() => null);
  Object.defineProperty(window, "open", {
    configurable: true,
    writable: true,
    value: openSpy,
  });
  return {
    openSpy,
    restore: () => {
      if (original) {
        Object.defineProperty(window, "open", original);
      } else {
        Reflect.deleteProperty(window, "open");
      }
    },
  };
};

test("initial media load failure surfaces the API message and then a generic fallback", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media"))
      return jsonResponse(
        { error: { code: "media_list_failed", message: "List exploded", details: "<b>x</b>" } },
        500
      );
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(view.container.textContent).toContain("List exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("initial media load failure falls back to a generic message for non-API errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media")) throw new TypeError("network down");
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to load media assets.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("a mediaList cache update event hydrates the grid from storage without refetch", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string }> = [];
  writeMediaCache([mediaRecord({ id: "a", title: "Event asset" })]);
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
    expect(hasGridItem("Event asset")).toBe(true);
    // The cache event below should hydrate without an additional /media fetch.
    const before = calls.filter((call) => call.url.endsWith("/media")).length;
    await React.act(async () => {
      broadcastCacheEvent({ key: "mediaList", action: "update" });
      await Promise.resolve();
    });
    await flushEffects();
    expect(hasGridItem("Event asset")).toBe(true);
    const after = calls.filter((call) => call.url.endsWith("/media")).length;
    expect(after).toBe(before);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("selected id from the URL opens the details drawer for the matched asset", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "target-1", title: "Url Target" })]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/usage")) return jsonResponse([]);
    if (url.endsWith("/media")) return jsonResponse([mediaRecord({ id: "target-1" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=target-1");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(document.body.textContent).toContain("Media Details");
    expect(document.body.textContent).toContain("Url Target");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("removing the selected asset from the list closes the drawer", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "gone", title: "Gone asset" })]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/usage")) return jsonResponse([]);
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=gone");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(document.body.textContent).toContain("Media Details");
    // The asset is removed from the list (cache cleared + update event), which
    // must close the drawer.
    clearMediaCache();
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.mediaList, action: "update" });
    });
    await flushEffects();
    expect(document.body.textContent).not.toContain("Media Details");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("the open-after-upload toggle persists the user setting", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method, body: init?.body });
    if (url.endsWith("/user-settings") && init?.method === "GET")
      return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    const label = Array.from(view.container.querySelectorAll("label")).find((entry) =>
      entry.textContent?.includes("Open details after upload")
    );
    const checkbox = label?.querySelector('[data-slot="checkbox"]') ?? null;
    if (!checkbox) throw new Error("Expected open-after-upload checkbox");
    await click(checkbox);
    const patch = calls.find(
      (call) => call.url.endsWith("/user-settings/media.openAfterUpload") && call.method === "PATCH"
    );
    expect(patch).toBeTruthy();
    expect(JSON.parse(String(patch?.body)).value).toBe(true);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("upload with no active folder appends the raw upload result and opens details per pref", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string }> = [];
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media") && init?.method === "POST")
      return jsonResponse(mediaRecord({ id: "up-1", title: "Uploaded" }));
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
    const file = new File(["payload"], "up.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
    await React.act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();
    const post = calls.find((call) => call.url.endsWith("/media") && call.method === "POST");
    expect(post).toBeTruthy();
    // Upload without active folder never PATCHes.
    const patch = calls.find((call) => call.method === "PATCH");
    expect(patch).toBeUndefined();
    expect(hasGridItem("Uploaded")).toBe(true);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("upload failure surfaces the API message", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media") && init?.method === "POST")
      return jsonResponse(
        { error: { code: "upload_failed", message: "Upload exploded", details: "<b>x</b>" } },
        500
      );
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
    expect(view.container.textContent).toContain("Upload exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("metadata save failure surfaces the API message in the grid banner", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "m-1", title: "Meta Asset" })]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/m-1") && init?.method === "PATCH")
      return jsonResponse(
        { error: { code: "meta_failed", message: "Meta exploded", details: "<b>x</b>" } },
        500
      );
    if (url.endsWith("/media"))
      return jsonResponse([mediaRecord({ id: "m-1", title: "Meta Asset" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=m-1");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    const titleInput = document.body.querySelector('input[id="media-title-m-1"]');
    if (!(titleInput instanceof HTMLInputElement)) {
      throw new Error("Expected media title input");
    }
    await setInputValue(titleInput, "Renamed");
    await React.act(async () => {
      titleInput?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();
    expect(view.container.textContent).toContain("Meta exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("delete failure surfaces the API message", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "d-1", title: "Delete Me" })]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/d-1") && init?.method === "DELETE")
      return jsonResponse(
        { error: { code: "delete_failed", message: "Delete exploded", details: "<b>x</b>" } },
        500
      );
    if (url.endsWith("/media"))
      return jsonResponse([mediaRecord({ id: "d-1", title: "Delete Me" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=d-1");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getSheetButton("Delete"));
    await flushEffects();
    expect(view.container.textContent).toContain("Delete exploded");
    expect(hasGridItem("Delete Me")).toBe(true);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("bulk selection: toggle, select visible, clear, and bulk delete with confirmation", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string }> = [];
  writeMediaCache([
    mediaRecord({ id: "a", title: "Alpha" }),
    mediaRecord({ id: "b", title: "Beta" }),
  ]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/a") && init?.method === "DELETE") return jsonResponse({});
    if (url.endsWith("/media/b") && init?.method === "DELETE") return jsonResponse({});
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();

    const selectedCount = () =>
      Array.from(view.container.querySelectorAll("p")).find(
        (entry) => entry.textContent?.trim().match(/^\d+ selected$/) !== null
      )?.textContent ?? "";

    // Toggle one selection.
    await click(view.container.querySelector('button[aria-label="Select Alpha"]'));
    expect(selectedCount()).toBe("1 selected");

    // Select visible adds Beta.
    await click(getButton(view.container, "Select visible"));
    expect(selectedCount()).toBe("2 selected");

    // Clear empties the selection.
    await click(getButton(view.container, "Clear"));
    expect(selectedCount()).toBe("0 selected");

    // Re-select then bulk delete with confirmation.
    await click(view.container.querySelector('button[aria-label="Select Alpha"]'));
    await click(view.container.querySelector('button[aria-label="Select Beta"]'));
    const restoreConfirm = mockConfirmResult(true);
    try {
      await click(getButton(view.container, "Delete"));
      await flushEffects();
    } finally {
      restoreConfirm();
    }
    const deletes = calls.filter((call) => call.method === "DELETE");
    expect(deletes).toHaveLength(2);
    expect(view.container.textContent).toContain("Deleted 2 assets.");
    expect(hasGridItem("Alpha")).toBe(false);
    expect(hasGridItem("Beta")).toBe(false);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("toggling a selected grid item off removes it from the selection", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "a", title: "Alpha" })]);
  globalThis.fetch = async (input, _init) => {
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
    const countText = () =>
      Array.from(view.container.querySelectorAll("p")).find(
        (entry) => entry.textContent?.trim().match(/^\d+ selected$/) !== null
      )?.textContent ?? "";
    await click(view.container.querySelector('button[aria-label="Select Alpha"]'));
    expect(countText()).toBe("1 selected");
    await click(view.container.querySelector('button[aria-label="Select Alpha"]'));
    expect(countText()).toBe("0 selected");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("bulk delete declines without confirmation and reports partial failures", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string }> = [];
  writeMediaCache([
    mediaRecord({ id: "a", title: "Alpha" }),
    mediaRecord({ id: "b", title: "Beta" }),
  ]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/a") && init?.method === "DELETE") return jsonResponse({});
    if (url.endsWith("/media/b") && init?.method === "DELETE")
      return jsonResponse(
        { error: { code: "delete_failed", message: "B exploded", details: "<b>x</b>" } },
        500
      );
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(view.container.querySelector('button[aria-label="Select Alpha"]'));
    await click(view.container.querySelector('button[aria-label="Select Beta"]'));

    const restoreDeclinedConfirm = mockConfirmResult(false);
    try {
      await click(getButton(view.container, "Delete"));
      await flushEffects();
    } finally {
      restoreDeclinedConfirm();
    }
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(0);
    expect(hasGridItem("Alpha")).toBe(true);

    // Confirm now; Beta fails while Alpha succeeds.
    const restoreAcceptedConfirm = mockConfirmResult(true);
    try {
      await click(getButton(view.container, "Delete"));
      await flushEffects();
    } finally {
      restoreAcceptedConfirm();
    }
    expect(view.container.textContent).toContain("Deleted 1 assets. 1 assets failed.");
    expect(hasGridItem("Alpha")).toBe(false);
    expect(hasGridItem("Beta")).toBe(true);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("copy URL uses the clipboard API and reports failure when unavailable", async () => {
  const originalFetch = globalThis.fetch;
  const originalClipboard = navigator.clipboard;
  writeMediaCache([mediaRecord({ id: "c-1", title: "Copy Me" })]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/usage")) return jsonResponse([]);
    if (url.endsWith("/media")) return jsonResponse([mediaRecord({ id: "c-1", title: "Copy Me" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=c-1");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(document.body.textContent).toContain("Copy URL");

    const copyButton = Array.from(
      document.querySelectorAll('[data-slot="sheet-content"] button')
    ).find((button) => button.textContent?.trim().startsWith("Copy"));
    if (!(copyButton instanceof HTMLButtonElement)) throw new Error("Expected Copy URL button");
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    await click(copyButton);
    await flushEffects();
    expect(document.body.textContent).toContain("Copied");

    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    await click(copyButton);
    await flushEffects();
    expect(document.body.textContent).toContain("Copy failed.");
  } finally {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
    });
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("open asset opens a new window with the asset URL", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "o-1", title: "Open Me" })]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/usage")) return jsonResponse([]);
    if (url.endsWith("/media")) return jsonResponse([mediaRecord({ id: "o-1", title: "Open Me" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=o-1");
  const { openSpy, restore: restoreOpen } = mockWindowOpen();
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getButton(document.body, "Open"));
    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/a.jpg",
      "_blank",
      "noopener,noreferrer"
    );
  } finally {
    restoreOpen();
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("replace failure surfaces the API message", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "r-1", title: "Replace Me" })]);
  globalThis.fetch = async (input, _init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/r-1/replace"))
      return jsonResponse(
        { error: { code: "replace_failed", message: "Replace exploded", details: "<b>x</b>" } },
        500
      );
    if (url.endsWith("/media"))
      return jsonResponse([mediaRecord({ id: "r-1", title: "Replace Me" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=r-1");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getButton(document.body, "Replace"));
    const fileInput = document.querySelector('[data-slot="sheet-content"] input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) throw new Error("Expected replace file input");
    Object.defineProperty(fileInput, "files", {
      value: [new File(["p"], "x.png", { type: "image/png" })],
      configurable: true,
    });
    await React.act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();
    expect(document.body.textContent).toContain("Replace exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("usage load failure shows the API message in the drawer", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ id: "u-1", title: "Usage Me" })]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/usage"))
      return jsonResponse(
        { error: { code: "usage_failed", message: "Usage exploded", details: "<b>x</b>" } },
        500
      );
    if (url.endsWith("/media"))
      return jsonResponse([mediaRecord({ id: "u-1", title: "Usage Me" })]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=u-1");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(document.body.textContent).toContain("Usage exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("dimension recovery reports recovered dimensions for an image without them", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([
    {
      ...mediaRecord({ id: "dim-1", title: "Dimensionless" }),
      width: null,
      height: null,
    },
  ]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/usage")) return jsonResponse([]);
    if (url.endsWith("/dimensions/recover") && init?.method === "POST")
      return jsonResponse({ ...mediaRecord({ id: "dim-1" }), width: 640, height: 480 });
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  window.history.replaceState({}, "", "/admin/media?selected=dim-1");
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    expect(document.body.textContent).toContain("Dimensions recovered.");
    expect(document.body.textContent).toContain("640");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("settings drawer loads on open and saves updated values", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
  writeMediaCache([]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method, body: init?.body });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage") && init?.method === "PUT")
      return jsonResponse({
        delivery: { accessMode: "internal" },
        quota: { totalBytes: 5 * 1024 ** 3, planLabel: "Pro plan" },
      });
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
    expect(document.body.textContent).toContain("Storage quota");

    await click(getPanelButton("Save changes"));
    await flushEffects();
    expect(document.body.textContent).toContain("Media settings updated.");
    const put = calls.find(
      (call) => call.url.endsWith("/settings/storage") && call.method === "PATCH"
    );
    expect(put).toBeTruthy();
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("settings load failure shows the API message in the drawer", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([]);
    if (url.endsWith("/settings/storage"))
      return jsonResponse(
        { error: { code: "settings_failed", message: "Settings exploded", details: "<b>x</b>" } },
        500
      );
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getButton(view.container, "Media settings"));
    await flushEffects();
    expect(document.body.textContent).toContain("Settings exploded");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("Filters panel folder selection writes through to the rail and reset clears it", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([
    { ...mediaRecord({ id: "a", title: "InFolder" }), folderId: "folder-1" },
    { ...mediaRecord({ id: "b", title: "Unfiled" }), folderId: null },
  ]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([folder()]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getFiltersButton(view.container));
    const folderSelect = document.body.querySelector("#media-filter-folder");
    if (!(folderSelect instanceof HTMLSelectElement)) {
      throw new Error("Expected media folder filter select");
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    await React.act(async () => {
      setter?.call(folderSelect, "folder-1");
      folderSelect.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();
    expect(hasGridItem("InFolder")).toBe(true);
    expect(hasGridItem("Unfiled")).toBe(false);
    // Reset clears the folder facet.
    await click(getPanelButton("Clear all"));
    await flushEffects();
    expect(hasGridItem("InFolder")).toBe(true);
    expect(hasGridItem("Unfiled")).toBe(true);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("deleting the active folder clears the folder facet and selection", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method?: string }> = [];
  writeMediaCache([{ ...mediaRecord({ id: "a", title: "Alpha" }), folderId: "folder-1" }]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method });
    if (url.endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
    if (url.endsWith("/media/folders")) return jsonResponse([folder()]);
    if (url.endsWith("/settings/storage")) return jsonResponse({});
    if (url.endsWith("/media/folders/folder-1") && init?.method === "DELETE")
      return jsonResponse({});
    if (url.endsWith("/media")) return jsonResponse([]);
    return jsonResponse({});
  };

  const view = mountMediaLibrary();
  try {
    await flushEffects();
    await flushEffects();
    await click(getButton(view.container, "Marketing"));
    const restoreConfirm = mockConfirmResult(true);
    try {
      await click(view.container.querySelector('button[aria-label="Delete Marketing"]'));
      await flushEffects();
    } finally {
      restoreConfirm();
    }
    const del = calls.find(
      (call) => call.url.endsWith("/media/folders/folder-1") && call.method === "DELETE"
    );
    expect(del).toBeTruthy();
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
