import { expect, test } from "vitest";

import {
  listWidgetTemplateRevisions,
  restoreWidgetTemplateRevision,
} from "../../../core/admin/services/widgetTemplateRevisionsClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listWidgetTemplateRevisions hits revisions endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listWidgetTemplateRevisions("t1");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/widget-templates/t1/revisions");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("restoreWidgetTemplateRevision posts restore endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    await restoreWidgetTemplateRevision("t1", "r1");
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe(
      "/admin/api/widget-templates/t1/revisions/r1/restore"
    );
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
