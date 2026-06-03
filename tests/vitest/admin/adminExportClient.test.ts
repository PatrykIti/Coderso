import { afterEach, expect, test } from "vitest";

import {
  downloadAdminExport,
  resolveAdminExportApiUrl,
  resolveExportDownload,
} from "../../../core/admin/services/adminExportClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  resetCsrfToken();
});

test("resolveAdminExportApiUrl uses the current admin API base path", () => {
  expect(resolveAdminExportApiUrl("/audit/export")).toBe("/admin/api/audit/export");
  expect(resolveAdminExportApiUrl("/access-logs/export")).toBe("/admin/api/access-logs/export");
});

test("resolveExportDownload returns queued job metadata without fake blob handling", () => {
  expect(resolveExportDownload({ type: "job", jobId: "job-1" }, "audit-logs")).toEqual({
    status: "queued",
    jobId: "job-1",
  });
});

test("downloadAdminExport posts JSON with CSRF and resolves file metadata", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      type: "file",
      filename: "audit-logs.csv",
      mimeType: "text/csv",
      content: "event,timestamp",
    });
  };

  try {
    await expect(
      downloadAdminExport(
        "/audit/export",
        { format: "csv", fields: ["event"] },
        { filenamePrefix: "audit-logs", withCsrf: true }
      )
    ).resolves.toEqual({
      status: "downloaded",
      filename: "audit-logs.csv",
      mimeType: "text/csv",
    });

    expect(calls.map((call) => String(call.input))).toEqual([
      "/admin/api/auth/csrf",
      "/admin/api/audit/export",
    ]);
    expect(new Headers(calls[1]?.init?.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(calls[1]?.init?.body).toBe(JSON.stringify({ format: "csv", fields: ["event"] }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
