import { expect, test } from "vitest";

import {
  createClipboardImageFilename,
  clearMediaCache,
  deleteMedia,
  listMedia,
  listMediaCached,
  normalizeClipboardImageFile,
  updateMedia,
  uploadClipboardImage,
  uploadMedia,
} from "../../../core/admin/services/mediaClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
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

const resetCaches = () => {
  clearMediaCache();
};
test("listMedia hits GET /media", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listMedia();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/media");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uploadMedia uses CSRF and multipart body", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "media-1", url: "/media/1", key: "1" });
  };

  try {
    resetCsrfToken();
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    await uploadMedia(file);

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/media");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBeInstanceOf(FormData);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uploadClipboardImage rejects non-image files", async () => {
  const file = new File(["hello"], "hello.txt", { type: "text/plain" });
  await expect(uploadClipboardImage(file)).rejects.toThrow("clipboard_image_type_invalid");
});

test("uploadClipboardImage generates deterministic filename when clipboard file has no name", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "media-2", url: "/media/2", key: "2" });
  };

  try {
    resetCsrfToken();
    const file = new File(["img"], "", { type: "image/png" });
    await uploadClipboardImage(file);

    const formData = calls[1]?.init?.body as FormData;
    const uploaded = formData.get("file");
    expect(uploaded).toBeInstanceOf(File);
    expect((uploaded as File).name.startsWith("clipboard-image-")).toBe(true);
    expect((uploaded as File).name.endsWith(".png")).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("clipboard filename helpers keep stable naming rules", () => {
  const fixedDate = new Date("2026-02-22T21:15:20.100Z");
  expect(createClipboardImageFilename("image/webp", fixedDate)).toBe(
    "clipboard-image-2026-02-22T21-15-20-100Z.webp"
  );

  const unnamed = new File(["img"], "", { type: "image/jpeg" });
  const normalized = normalizeClipboardImageFile(unnamed, fixedDate);
  expect(normalized.name).toBe("clipboard-image-2026-02-22T21-15-20-100Z.jpg");
});

test("updateMedia posts JSON with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "media-1" });
  };

  try {
    resetCsrfToken();
    await updateMedia("media-1", { title: "Hero" });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/media/media-1");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.title).toBe("Hero");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteMedia sends DELETE with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    await deleteMedia("media-1");

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/media/media-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("listMediaCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    const cached = [
      {
        id: "media-1",
        key: "key-1",
        url: "https://example.com/1.png",
        type: "image" as const,
        mimeType: "image/png",
        size: 1200,
        createdAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    storage.setItem(
      cacheKeys.mediaList,
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await listMediaCached();
    expect(result).toEqual(cached);
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches();
  }
});
