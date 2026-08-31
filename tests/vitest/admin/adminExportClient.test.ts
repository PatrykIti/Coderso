import { afterEach, expect, test, vi } from "vitest";

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

test("downloadAdminExport throws a parsed ApiClientError for structured error responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse(
      {
        error: { code: "export_invalid", message: "Bad format", details: { format: "csv" } },
      },
      400
    );
  };

  try {
    resetCsrfToken();
    await expect(
      downloadAdminExport(
        "/audit/export",
        { format: "csv" },
        { filenamePrefix: "audit-logs", withCsrf: true }
      )
    ).rejects.toMatchObject({
      code: "export_invalid",
      message: "Bad format",
      status: 400,
      details: { format: "csv" },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("downloadAdminExport throws a generic export error when the body has no structured error", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ message: "nope" }, 500);
  };

  try {
    resetCsrfToken();
    await expect(
      downloadAdminExport("/audit/export", {}, { filenamePrefix: "audit-logs", withCsrf: true })
    ).rejects.toMatchObject({ code: "export_request_failed", status: 500 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("downloadAdminExport falls back to the generic error for non-JSON error bodies", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return new Response("<html>bad gateway</html>", { status: 502, statusText: "Bad Gateway" });
  };

  try {
    resetCsrfToken();
    await expect(
      downloadAdminExport("/audit/export", {}, { filenamePrefix: "audit-logs", withCsrf: true })
    ).rejects.toMatchObject({ code: "export_request_failed", status: 502 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolveExportDownload triggers a browser download for file responses", () => {
  const originalDocument = (globalThis as { document?: unknown }).document;
  const originalUrl = (globalThis as { URL?: unknown }).URL;
  const click = vi.fn();
  const remove = vi.fn();
  const anchor = { href: "", download: "", hidden: false, click, remove };
  (globalThis as { document?: unknown }).document = {
    createElement: () => anchor,
    body: { appendChild: () => undefined },
  } as never;
  (globalThis as { URL?: unknown }).URL = {
    createObjectURL: () => "blob:fake",
    revokeObjectURL: () => undefined,
  } as never;

  try {
    const result = resolveExportDownload(
      {
        type: "file",
        content: "event,timestamp",
        filename: "audit-logs.csv",
        mimeType: "text/csv",
      },
      "audit-logs"
    );
    expect(result).toEqual({
      status: "downloaded",
      filename: "audit-logs.csv",
      mimeType: "text/csv",
    });
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(anchor.download).toBe("audit-logs.csv");
    expect(anchor.href).toBe("blob:fake");
    expect(anchor.hidden).toBe(true);
  } finally {
    if (originalDocument === undefined) {
      delete (globalThis as { document?: unknown }).document;
    } else {
      (globalThis as { document?: unknown }).document = originalDocument;
    }
    if (originalUrl === undefined) {
      delete (globalThis as { URL?: unknown }).URL;
    } else {
      (globalThis as { URL?: unknown }).URL = originalUrl;
    }
  }
});

test("resolveExportDownload falls back to prefix-based and safe filenames", () => {
  const originalDocument = (globalThis as { document?: unknown }).document;
  if (originalDocument !== undefined) {
    (globalThis as { document?: unknown }).document = undefined;
  }
  try {
    const fromPrefix = resolveExportDownload(
      { type: "file", content: "x", mimeType: "application/json" },
      "audit-logs"
    );
    expect(fromPrefix).toEqual({
      status: "downloaded",
      filename: "audit-logs.json",
      mimeType: "application/json",
    });

    const sanitizedEmpty = resolveExportDownload(
      { type: "file", content: "x", filename: "!!!" },
      "audit-logs"
    );
    expect(sanitizedEmpty).toEqual({
      status: "downloaded",
      filename: "export.json",
      mimeType: "application/json",
    });
  } finally {
    if (originalDocument !== undefined) {
      (globalThis as { document?: unknown }).document = originalDocument;
    }
  }
});

test("resolveExportDownload returns queued job metadata with an optional status URL", () => {
  expect(
    resolveExportDownload(
      { type: "job", jobId: "job-1", statusUrl: "/admin/api/jobs/job-1" },
      "audit-logs"
    )
  ).toEqual({
    status: "queued",
    jobId: "job-1",
    statusUrl: "/admin/api/jobs/job-1",
  });
});
