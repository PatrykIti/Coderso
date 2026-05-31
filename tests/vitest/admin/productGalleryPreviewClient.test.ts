import { expect, test } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { previewProductGallery } from "../../../core/admin/services/productGalleryPreviewClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("previewProductGallery posts widget payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      items: [],
      total: 0,
      resolvedAt: "2026-05-19T10:00:00.000Z",
    });
  };

  try {
    resetCsrfToken();
    await previewProductGallery({
      source: {
        limit: 6,
      },
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/widgets/product-gallery/preview");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      data: {
        source: {
          limit: 6,
        },
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
    resetCsrfToken();
  }
});
