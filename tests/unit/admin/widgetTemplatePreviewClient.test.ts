import { expect, test } from "bun:test";

import { previewWidgetTemplate } from "../../../core/admin/services/widgetTemplatePreviewClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("previewWidgetTemplate posts payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      token: "preview-token",
      previewUrl: "/preview?type=widget-template&token=preview-token",
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
      blocksCount: 1,
    });
  };

  try {
    resetCsrfToken();
    await previewWidgetTemplate("t1", { device: "desktop" });
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/widget-templates/t1/preview");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
