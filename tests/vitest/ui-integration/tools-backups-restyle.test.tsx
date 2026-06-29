// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// TASK-479-26-L07: structural lock for the Backups restyle (L04). Asserts the
// "Automatic backups" schedule card, the status card derived from REAL fields
// (count + driver + worker), and the preserved Delete → ConfirmActionDialog flow —
// with the unbacked storage-usage quota + next-run line asserted ABSENT.

const schedule = {
  id: "schedule-1",
  enabled: true,
  frequency: "daily" as const,
  retentionDays: 30,
  storageDriver: "local" as const,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const backupList = {
  items: [
    {
      id: "backup-complete",
      kind: "scheduled" as const,
      status: "complete" as const,
      storageDriver: "local" as const,
      artifactPath: "/var/backups/backup-complete.zip",
      sizeBytes: 2048,
      error: null,
      createdAt: "2026-06-01T03:00:00.000Z",
      finishedAt: "2026-06-01T03:01:00.000Z",
    },
    {
      id: "backup-failed",
      kind: "manual" as const,
      status: "failed" as const,
      storageDriver: "local" as const,
      artifactPath: null,
      sizeBytes: null,
      error: "Snapshot failed",
      createdAt: "2026-06-02T03:00:00.000Z",
      finishedAt: null,
    },
  ],
  page: 1,
  limit: 10,
  total: 2,
  hasNext: false,
  hasPrevious: false,
  worker: {
    mode: "internal" as const,
    healthy: true,
    queuedCount: 0,
    oldestQueuedAt: null,
    message: "CMS backup worker is ready.",
  },
};

const backupsState = vi.hoisted(() => ({
  list: vi.fn(),
  getSchedule: vi.fn(),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" && error !== null && "kind" in error,
}));

vi.mock("@/services/backupsClient", () => ({
  getCachedBackups: () => backupList,
  getCachedBackupSchedule: () => schedule,
  listBackupsCached: backupsState.list,
  getBackupScheduleCached: backupsState.getSchedule,
  createBackup: vi.fn(async () => backupList.items[0]),
  deleteBackup: vi.fn(async () => ({ ok: true })),
  downloadBackup: vi.fn(async () => ({ url: null, path: null })),
  restoreBackup: vi.fn(async () => ({ ok: true })),
  updateBackupSchedule: vi.fn(async () => schedule),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { BackupsPage } from "../../../core/admin/ui/backups/BackupsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  backupsState.list.mockReset();
  backupsState.getSchedule.mockReset();
  document.body.innerHTML = "";
});

test("renders the schedule + status cards from real data with no quota or next-run line", async () => {
  backupsState.list.mockResolvedValue(backupList);
  backupsState.getSchedule.mockResolvedValue(schedule);

  const view = mount(<BackupsPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Automatic backups");
    // Status card derived from REAL fields only.
    expect(view.container.textContent).toContain("backups stored");
    expect(view.container.textContent).toContain("Healthy");
    // Backup rows show the real BackupStatus enum (complete -> Completed, failed).
    expect(view.container.textContent).toContain("Completed");
    expect(view.container.textContent).toContain("Failed");
    // Dropped, unbacked surfaces are absent.
    expect(view.container.textContent).not.toMatch(/GB of/i);
    expect(view.container.textContent).not.toMatch(/next backup scheduled/i);
  } finally {
    view.cleanup();
  }
});

test("the Delete backup action opens the ConfirmActionDialog", async () => {
  backupsState.list.mockResolvedValue(backupList);
  backupsState.getSchedule.mockResolvedValue(schedule);

  const view = mount(<BackupsPage />);
  try {
    await flush();
    const deleteButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Delete backup"
    );
    expect(deleteButton).toBeTruthy();
    React.act(() => {
      deleteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.body.textContent).toContain("Delete backup?");
  } finally {
    view.cleanup();
  }
});

test("a seeded backups load error surfaces the destructive Alert", async () => {
  backupsState.list.mockRejectedValue({ kind: "api", message: "Backups offline" });
  backupsState.getSchedule.mockRejectedValue({ kind: "api", message: "Backups offline" });

  const view = mount(<BackupsPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Backups unavailable");
  } finally {
    view.cleanup();
  }
});
