// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { MediaLibraryPage } from "../../../core/admin/ui/media/MediaLibraryPage";
import { MediaDetailsDrawer } from "../../../core/admin/ui/media/MediaDetailsDrawer";
import { clearMediaCache, type MediaRecord } from "../../../core/admin/services/mediaClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { invalidateUserSettingsCache } from "../../../core/admin/services/userSettingsClient";
import { formatBytes } from "../../../core/admin/ui/media/utils";
import type { MediaItem } from "../../../core/admin/ui/media/types";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// --- Harness copied verbatim from tests/vitest/ui/media-library.test.tsx ---
const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const userSettingsResponse = {
  "pages.openAfterCreate": false,
  "media.openAfterUpload": false,
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

const mountNode = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
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

const mountMediaLibrary = () =>
  mountNode(
    <AdminRouterProvider initialPath="/admin/media">
      <MediaLibraryPage />
    </AdminRouterProvider>
  );

// Mount-time fetch stub: page only fetches /user-settings on mount; with a seeded
// cache listMediaCached() reads cache (no /media call), but keep a fallback.
// getStorageSettings() is NOT called on mount (only when the settings drawer
// opens), so the storage card needs no storage-settings stub.
const mediaFetch = () => async (input: RequestInfo | URL) => {
  if (String(input).endsWith("/user-settings")) return jsonResponse(userSettingsResponse);
  if (String(input).endsWith("/media")) return jsonResponse([]);
  return jsonResponse({});
};

afterEach(() => {
  clearMediaCache();
  invalidateUserSettingsCache();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

test("grid renders one card per cached asset with display-name precedence", async () => {
  globalThis.fetch = mediaFetch();
  writeMediaCache([
    mediaRecord({
      id: "m1",
      type: "image",
      title: "Hero banner",
      originalName: "hero.png",
      alt: null,
    }),
    // document tile: kind comes from mimeType, NOT a bogus type: "document"
    mediaRecord({
      id: "m2",
      type: "file",
      mimeType: "application/pdf",
      title: null,
      originalName: "brief.pdf",
    }),
  ]);
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    expect(view.container.textContent).toContain("Hero banner"); // title wins over originalName
    expect(view.container.textContent).toContain("brief.pdf"); // falls back to originalName
  } finally {
    view.cleanup();
  }
});

test("image without alt shows the missing-alt accessibility badge", async () => {
  globalThis.fetch = mediaFetch();
  writeMediaCache([mediaRecord({ id: "m1", type: "image", alt: null, title: "No alt" })]);
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    expect(view.container.textContent).toContain("Missing alt"); // MEDIA_SPEC accessibility rule preserved
  } finally {
    view.cleanup();
  }
});

test("folder rail click re-filters the grid via existing filter state", async () => {
  globalThis.fetch = mediaFetch();
  writeMediaCache([
    mediaRecord({ id: "m1", type: "image", title: "Pic" }),
    mediaRecord({ id: "m2", type: "file", mimeType: "application/pdf", title: "Spec doc" }),
  ]);
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    // folder buttons carry label + count; match by text prefix.
    const docFolder =
      Array.from(view.container.querySelectorAll("button")).find((b) =>
        b.textContent?.trim().startsWith("Documents")
      ) ?? null;
    await click(docFolder);
    expect(view.container.textContent).toContain("Spec doc"); // document remains
    expect(view.container.textContent).not.toContain("Pic"); // image filtered out
  } finally {
    view.cleanup();
  }
});

test("storage card shows a real derived asset summary (no fabricated quota)", async () => {
  globalThis.fetch = mediaFetch();
  writeMediaCache([mediaRecord({ id: "m1", size: 1024 }), mediaRecord({ id: "m2", size: 2048 })]);
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    expect(view.container.textContent).toContain("2 assets"); // items.length
    expect(view.container.textContent).toContain(formatBytes(3072)); // derived total ("3.0 KB")
    expect(view.container.textContent).not.toMatch(/\bGB of\b/); // no fabricated "X GB of Y" quota
  } finally {
    view.cleanup();
  }
});

test("the dashed empty-state panel renders when the cache and list are empty", async () => {
  globalThis.fetch = mediaFetch();
  writeMediaCache([]);
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    expect(view.container.textContent).toContain("No media assets found.");
    expect(view.container.textContent).toContain("0 assets");
  } finally {
    view.cleanup();
  }
});

test("the details drawer exposes its autosave/copy/replace affordances when open", async () => {
  // MediaDetailsDrawer is a Radix Sheet that portals to document.body when a real
  // DOM exists (this suite runs under happy-dom, so SheetPortal uses the live
  // portal rather than inline SSR). Client-mount it `open` and read the portalled
  // body text — the affordances must survive the restyle.
  const item: MediaItem = {
    id: "m1",
    name: "hero.png",
    type: "image",
    sizeBytes: 1024,
    url: "/media/hero.png",
    mimeType: "image/png",
    createdAt: "2026-01-28T10:00:00Z",
  };
  const view = mountNode(
    <MediaDetailsDrawer
      item={item}
      open
      onOpenChange={() => undefined}
      onSave={() => undefined}
      onDelete={() => undefined}
      onCopy={() => undefined}
      onOpen={() => undefined}
      onReplace={() => undefined}
    />
  );
  try {
    await flushEffects();
    expect(document.body.textContent).toContain("Metadata"); // metadata editor preserved
    expect(document.body.textContent).toContain("Copy URL");
    expect(document.body.textContent).toContain("Replace");
  } finally {
    view.cleanup();
  }
});

test("clicking a grid card opens the portalled Media Details drawer", async () => {
  globalThis.fetch = mediaFetch();
  writeMediaCache([mediaRecord({ id: "m1", type: "image", title: "Open me" })]);
  const view = mountMediaLibrary();
  try {
    await flushEffects();
    const card = Array.from(view.container.querySelectorAll("button")).find(
      (b) =>
        b.getAttribute("aria-label") !== "Select Open me" &&
        b.textContent?.includes("Open me") === true
    );
    await click(card ?? null);
    await flushEffects();
    expect(document.body.textContent).toContain("Media Details");
  } finally {
    view.cleanup();
  }
});
