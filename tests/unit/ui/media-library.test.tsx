import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { MediaLibraryPage } from "../../../core/admin/ui/media/MediaLibraryPage";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

test("MediaLibraryPage renders toolbar and grid", () => {
  const html = renderAdminUi(<MediaLibraryPage />);

  expect(html).toContain("Media Library");
  expect(html).toContain("Upload New");
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
