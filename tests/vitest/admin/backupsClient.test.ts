import { expect, test } from "vitest";

import {
  createBackup,
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

test("listBackups hits GET /backups", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listBackups();
    expect(calls[0]?.input).toBe("/admin/api/backups");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createBackup uses CSRF and POST", async () => {
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
    await createBackup({ kind: "manual" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/backups");
    expect(calls[1]?.init?.method).toBe("POST");
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
