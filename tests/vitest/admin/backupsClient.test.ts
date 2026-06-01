import { expect, test } from "vitest";

import {
  createBackup,
  deleteBackup,
  downloadBackup,
  getBackupSchedule,
  listBackups,
  restoreBackup,
  updateBackupSchedule,
} from "../../../core/admin/services/backupsClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listBackups hits GET /backups with pagination params", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      items: [],
      page: 2,
      limit: 25,
      total: 0,
      hasNext: false,
      hasPrevious: true,
      worker: {
        mode: "external",
        healthy: true,
        queuedCount: 0,
        oldestQueuedAt: null,
        message: "No jobs.",
      },
    });
  };

  try {
    await listBackups({ page: 2, limit: 25, query: "queued" });
    expect(calls[0]?.input).toBe("/admin/api/backups?page=2&limit=25&query=queued");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createBackup sends include options with CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "backup-1" });
  };

  try {
    resetCsrfToken();
    await createBackup({ kind: "manual", include: ["database", "settings"] });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/backups");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({ kind: "manual", include: ["database", "settings"] })
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteBackup uses CSRF and DELETE", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true, id: "backup-1" });
  };

  try {
    resetCsrfToken();
    await deleteBackup("backup-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/backups/backup-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("restoreBackup uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "backup-1" });
  };

  try {
    resetCsrfToken();
    await restoreBackup("backup-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/backups/backup-1/restore");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("downloadBackup hits GET /backups/:id/download", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ url: null, path: null });
  };

  try {
    await downloadBackup("backup-2");
    expect(calls[0]?.input).toBe("/admin/api/backups/backup-2/download");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getBackupSchedule hits GET /backups/schedule", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ id: "schedule-1" });
  };

  try {
    await getBackupSchedule();
    expect(calls[0]?.input).toBe("/admin/api/backups/schedule");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateBackupSchedule uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "schedule-1" });
  };

  try {
    resetCsrfToken();
    await updateBackupSchedule({ frequency: "weekly" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/backups/schedule");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
