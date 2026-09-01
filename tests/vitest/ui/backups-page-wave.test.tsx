// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import type { BackupListResult } from "../../../core/admin/services/backupsClient";
import { backupsState, clickByText, flush, mount } from "./backupsPageFixtures";
import { BackupsPage } from "../../../core/admin/ui/backups/BackupsPage";

test("BackupsPage loads data, creates manual backups, updates schedule, restores, and downloads", async () => {
  const view = mount(<BackupsPage />);

  try {
    await flush();

    expect(backupsState.listBackups).toHaveBeenCalled();
    expect(backupsState.getBackupSchedule).toHaveBeenCalled();
    expect(view.container.textContent).toContain("schedule:daily");
    expect(view.container.textContent).toContain("backup-count:1");

    clickByText(view.container, "Create");
    await flush();
    clickByText(view.container, "backup-now-confirm");
    await flush();

    expect(backupsState.createBackup).toHaveBeenCalledWith({
      kind: "manual",
      include: ["database", "media"],
      passphrase: "mock-passphrase",
    });
    expect(backupsState.listBackups).toHaveBeenCalledTimes(2);

    clickByText(view.container, "schedule-save");
    await flush();
    expect(backupsState.updateBackupSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        frequency: "weekly",
        timeOfDay: "03:00",
      })
    );
    expect(view.container.textContent).toContain("schedule:weekly");

    clickByText(view.container, "restore:backup-1");
    await flush();
    expect(backupsState.restoreBackup).toHaveBeenCalledWith("backup-1");

    // v2 import flow: open the Import dialog and confirm; the client forwards
    // file + passphrase + restoreUsers to the maintenance-mode import route.
    clickByText(view.container, "Import");
    await flush();
    clickByText(view.container, "import-confirm");
    await flush();
    expect(backupsState.importBackup).toHaveBeenCalledWith({
      file: expect.objectContaining({ name: "backup.cbk" }),
      passphrase: "import-passphrase",
      restoreUsers: true,
    });
    // initial load + create refresh + restore refresh + import refresh
    expect(backupsState.listBackups).toHaveBeenCalledTimes(4);

    clickByText(view.container, "download:backup-1");
    await flush();
    expect(backupsState.downloadBackup).toHaveBeenCalledWith("backup-1");
    expect(window.open).toHaveBeenCalledWith(
      "https://cdn.test/backup-1.zip",
      "_blank",
      "noopener,noreferrer"
    );

    clickByText(view.container, "delete:backup-1");
    await flush();
    expect(view.container.textContent).toContain("Delete backup?");
    clickByText(view.container, "confirm:Delete");
    await flush();
    expect(backupsState.deleteBackup).toHaveBeenCalledWith("backup-1");

    clickByText(view.container, "next-page");
    await flush();
    expect(backupsState.listBackups).toHaveBeenLastCalledWith({
      page: 2,
      limit: 10,
      query: "",
    });

    clickByText(view.container, "query-queued");
    await flush();
    expect(backupsState.listBackups).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      query: "queued",
    });
  } finally {
    view.cleanup();
  }
});

test("BackupsPage surfaces load and action errors, including missing download URLs", async () => {
  backupsState.nextListError = backupsState.apiError("Load failed.");

  const loadView = mount(<BackupsPage />);

  try {
    await flush();
    expect(loadView.container.textContent).toContain("Backups unavailable");
    expect(loadView.container.textContent).toContain("Load failed.");
  } finally {
    loadView.cleanup();
  }

  const view = mount(<BackupsPage />);

  try {
    await flush();

    // A query change that fails exercises the loadBackups catch branches.
    backupsState.nextListError = backupsState.apiError("Query denied");
    clickByText(view.container, "query-queued");
    await flush();
    expect(view.container.textContent).toContain("Query denied");

    backupsState.nextListError = new Error("query exploded");
    clickByText(view.container, "query-queued");
    await flush();
    expect(view.container.textContent).toContain("Failed to load backups.");

    // A cache-event-driven refresh that fails exercises the refresh catch.
    backupsState.nextListError = backupsState.apiError("Refresh denied");
    const { broadcastCacheEvent } = await import("../../../core/admin/utils/cacheBus");
    broadcastCacheEvent({ key: "backups:schedule", action: "invalidate" });
    await flush();
    expect(view.container.textContent).toContain("Refresh denied");

    backupsState.nextListError = new Error("refresh exploded");
    broadcastCacheEvent({ key: "backups:schedule", action: "invalidate" });
    await flush();
    expect(view.container.textContent).toContain("Failed to load backups.");

    backupsState.nextCreateError = new Error("create exploded");
    clickByText(view.container, "Create");
    await flush();
    clickByText(view.container, "backup-now-confirm");
    await flush();
    expect(view.container.textContent).toContain("Failed to create backup.");

    backupsState.nextImportError = new Error("import exploded");
    clickByText(view.container, "Import");
    await flush();
    clickByText(view.container, "import-confirm");
    await flush();
    expect(view.container.textContent).toContain("Failed to import backup.");

    backupsState.nextUpdateError = backupsState.apiError("Schedule denied");
    clickByText(view.container, "schedule-save");
    await flush();
    expect(view.container.textContent).toContain("Schedule denied");

    backupsState.nextRestoreError = new Error("restore exploded");
    clickByText(view.container, "restore:backup-1");
    await flush();
    expect(view.container.textContent).toContain("Failed to restore backup.");

    backupsState.nextDownloadPayload = { url: null, path: null };
    clickByText(view.container, "download:backup-1");
    await flush();
    expect(view.container.textContent).toContain("Backup is not ready for download.");

    backupsState.nextDownloadError = backupsState.apiError("Download denied");
    clickByText(view.container, "download:backup-1");
    await flush();
    expect(view.container.textContent).toContain("Download denied");

    backupsState.nextDeleteError = backupsState.apiError("Delete denied");
    clickByText(view.container, "delete:backup-1");
    await flush();
    clickByText(view.container, "confirm:Delete");
    await flush();
    expect(view.container.textContent).toContain("Delete denied");
  } finally {
    view.cleanup();
  }
});

test("BackupsPage polls while backup jobs are queued", async () => {
  vi.useFakeTimers();
  backupsState.listItems = [
    {
      id: "backup-queued",
      kind: "manual",
      status: "queued",
      storageDriver: "local",
      artifactFormat: null,
      artifactPath: null,
      sizeBytes: null,
      error: null,
      createdAt: "2026-03-15T08:00:00.000Z",
      finishedAt: null,
    },
  ];
  backupsState.listMeta = {
    ...backupsState.listMeta,
    total: 1,
    worker: {
      mode: "internal",
      healthy: true,
      queuedCount: 1,
      oldestQueuedAt: "2026-03-15T08:00:00.000Z",
      message: "CMS backup worker is processing backup jobs.",
    },
  };

  const view = mount(<BackupsPage />);

  try {
    await flush();
    expect(backupsState.listBackups).toHaveBeenCalledTimes(1);

    await React.act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    await flush();

    expect(backupsState.listBackups).toHaveBeenCalledTimes(2);
    expect(backupsState.listBackups).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      query: "",
      force: true,
    });
  } finally {
    view.cleanup();
  }
});

test("BackupsPage bulk-selects, toggles, refreshes, and clears selection", async () => {
  backupsState.listItems = [
    {
      id: "backup-1",
      kind: "manual",
      status: "complete",
      storageDriver: "local",
      artifactFormat: "v1",
      artifactPath: "/tmp/backup-1.zip",
      sizeBytes: 1024,
      error: null,
      createdAt: "2026-03-15T08:00:00.000Z",
      finishedAt: "2026-03-15T08:01:00.000Z",
    },
    {
      id: "backup-2",
      kind: "manual",
      status: "complete",
      storageDriver: "local",
      artifactFormat: "v1",
      artifactPath: "/tmp/backup-2.zip",
      sizeBytes: 2048,
      error: null,
      createdAt: "2026-03-16T08:00:00.000Z",
      finishedAt: "2026-03-16T08:01:00.000Z",
    },
  ];
  backupsState.listMeta = { ...backupsState.listMeta, total: 2 };

  const view = mount(<BackupsPage />);

  try {
    await flush();
    expect(view.container.textContent).toContain("selected:0");

    clickByText(view.container, "toggle:backup-1");
    await flush();
    expect(view.container.textContent).toContain("selected:1");
    expect(view.container.textContent).toContain("1 selected");
    expect(view.container.textContent).toContain("Delete selected");

    clickByText(view.container, "toggle:backup-1");
    await flush();
    expect(view.container.textContent).toContain("selected:0");

    clickByText(view.container, "toggle-all");
    await flush();
    expect(view.container.textContent).toContain("selected:2");
    expect(view.container.textContent).toContain("all-selected:true");

    // Toggling all again deselects every visible backup.
    clickByText(view.container, "toggle-all");
    await flush();
    expect(view.container.textContent).toContain("selected:0");
    expect(view.container.textContent).toContain("all-selected:false");

    // Select one, then Clear empties the selection and hides the toolbar.
    clickByText(view.container, "toggle:backup-1");
    await flush();
    clickByText(view.container, "Clear");
    await flush();
    expect(view.container.textContent).toContain("selected:0");
    expect(view.container.textContent).not.toContain("Delete selected");

    clickByText(view.container, "toggle-all");
    await flush();
    clickByText(view.container, "Delete selected");
    await flush();
    expect(view.container.textContent).toContain("Delete selected backups?");
    clickByText(view.container, "close:Delete selected");
    await flush();
    expect(view.container.textContent).not.toContain("Delete selected backups?");
    clickByText(view.container, "Delete selected");
    await flush();
    clickByText(view.container, "confirm:Delete selected");
    await flush();
    expect(backupsState.deleteBackup).toHaveBeenCalledWith("backup-1");
    expect(backupsState.deleteBackup).toHaveBeenCalledWith("backup-2");
    expect(view.container.textContent).toContain("selected:0");

    clickByText(view.container, "refresh-list");
    await flush();
    expect(backupsState.listBackups).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      query: "",
      force: true,
    });
  } finally {
    view.cleanup();
  }
});

test("BackupsPage bulk delete with partial and full failures surfaces a summary", async () => {
  backupsState.listItems = [
    {
      id: "backup-1",
      kind: "manual",
      status: "complete",
      storageDriver: "local",
      artifactFormat: "v1",
      artifactPath: "/tmp/backup-1.zip",
      sizeBytes: 1024,
      error: null,
      createdAt: "2026-03-15T08:00:00.000Z",
      finishedAt: "2026-03-15T08:01:00.000Z",
    },
    {
      id: "backup-2",
      kind: "manual",
      status: "complete",
      storageDriver: "local",
      artifactFormat: "v1",
      artifactPath: "/tmp/backup-2.zip",
      sizeBytes: 2048,
      error: null,
      createdAt: "2026-03-16T08:00:00.000Z",
      finishedAt: "2026-03-16T08:01:00.000Z",
    },
  ];
  backupsState.listMeta = { ...backupsState.listMeta, total: 2 };
  backupsState.deleteBackup.mockImplementation(async (id: string) => {
    if (id === "backup-2") throw new Error("second exploded");
    backupsState.listItems = backupsState.listItems.filter((item) => item.id !== id);
    return { ok: true, id };
  });

  const view = mount(<BackupsPage />);

  try {
    await flush();
    clickByText(view.container, "toggle-all");
    await flush();
    clickByText(view.container, "Delete selected");
    await flush();
    clickByText(view.container, "confirm:Delete selected");
    await flush();
    expect(view.container.textContent).toContain("Deleted 1 backup; failed 1.");
    expect(backupsState.deleteBackup).toHaveBeenCalledTimes(2);

    backupsState.listItems = [
      {
        id: "backup-1",
        kind: "manual",
        status: "complete",
        storageDriver: "local",
        artifactFormat: "v1",
        artifactPath: "/tmp/backup-1.zip",
        sizeBytes: 1024,
        error: null,
        createdAt: "2026-03-15T08:00:00.000Z",
        finishedAt: "2026-03-15T08:01:00.000Z",
      },
    ];
    backupsState.deleteBackup.mockImplementation(async () => {
      throw new Error("all exploded");
    });
    clickByText(view.container, "toggle-all");
    await flush();
    clickByText(view.container, "Delete selected");
    await flush();
    clickByText(view.container, "confirm:Delete selected");
    await flush();
    expect(view.container.textContent).toContain("Failed to delete 1 backup.");
  } finally {
    view.cleanup();
  }
});

test("BackupsPage surfaces a failed manual backup job with its error message", async () => {
  backupsState.createBackup.mockImplementation(async () => ({
    id: "backup-failed",
    kind: "manual",
    status: "failed",
    storageDriver: "local",
    artifactFormat: null,
    artifactPath: null,
    sizeBytes: null,
    error: "Disk full.",
    createdAt: "2026-03-15T08:00:00.000Z",
    finishedAt: null,
  }));

  const view = mount(<BackupsPage />);

  try {
    await flush();
    clickByText(view.container, "Create");
    await flush();
    clickByText(view.container, "backup-now-confirm");
    await flush();
    expect(view.container.textContent).toContain("Backups unavailable");
    expect(view.container.textContent).toContain("Disk full.");
    expect(backupsState.createBackup).toHaveBeenCalledWith({
      kind: "manual",
      include: ["database", "media"],
      passphrase: "mock-passphrase",
    });
  } finally {
    view.cleanup();
  }
});

test("BackupsPage uses cached lists after create and delete, and closes dialogs", async () => {
  const cached = {
    items: [
      {
        id: "backup-1",
        kind: "manual",
        status: "complete",
        storageDriver: "local",
        artifactFormat: "v1",
        artifactPath: "/tmp/backup-1.zip",
        sizeBytes: 1024,
        error: null,
        createdAt: "2026-03-15T08:00:00.000Z",
        finishedAt: "2026-03-15T08:01:00.000Z",
      },
    ],
    page: 1,
    limit: 10,
    total: 1,
    hasNext: false,
    hasPrevious: false,
    worker: backupsState.listMeta.worker,
  } as BackupListResult;
  backupsState.cachedBackups = cached;

  const view = mount(<BackupsPage />);

  try {
    await flush();

    clickByText(view.container, "Create");
    await flush();
    clickByText(view.container, "backup-now-confirm");
    await flush();
    expect(view.container.textContent).toContain("backup-count:1");
    expect(backupsState.listBackups).toHaveBeenCalledTimes(1);

    clickByText(view.container, "backup-now-close");
    await flush();

    clickByText(view.container, "delete:backup-1");
    await flush();
    expect(view.container.textContent).toContain("Delete backup?");
    clickByText(view.container, "close:Delete");
    await flush();
    expect(view.container.textContent).not.toContain("Delete backup?");
    expect(view.container.textContent).not.toContain("confirm:Delete");

    clickByText(view.container, "delete:backup-1");
    await flush();
    clickByText(view.container, "confirm:Delete");
    await flush();
    expect(backupsState.deleteBackup).toHaveBeenCalledWith("backup-1");
    expect(view.container.textContent).toContain("backup-count:0");

    // Bulk delete with a fresh cached list exercises the cached-branch path.
    backupsState.listItems = [
      {
        id: "backup-2",
        kind: "manual",
        status: "complete",
        storageDriver: "local",
        artifactFormat: "v1",
        artifactPath: "/tmp/backup-2.zip",
        sizeBytes: 2048,
        error: null,
        createdAt: "2026-03-16T08:00:00.000Z",
        finishedAt: "2026-03-16T08:01:00.000Z",
      },
    ];
    backupsState.cachedBackups = {
      items: [
        {
          id: "backup-2",
          kind: "manual",
          status: "complete",
          storageDriver: "local",
          artifactFormat: "v1",
          artifactPath: "/tmp/backup-2.zip",
          sizeBytes: 2048,
          error: null,
          createdAt: "2026-03-16T08:00:00.000Z",
          finishedAt: "2026-03-16T08:01:00.000Z",
        },
      ],
      page: 1,
      limit: 10,
      total: 1,
      hasNext: false,
      hasPrevious: false,
      worker: backupsState.listMeta.worker,
    } as BackupListResult;
    clickByText(view.container, "refresh-list");
    await flush();
    clickByText(view.container, "toggle:backup-2");
    await flush();
    clickByText(view.container, "Delete selected");
    await flush();
    clickByText(view.container, "confirm:Delete selected");
    await flush();
    expect(backupsState.deleteBackup).toHaveBeenCalledWith("backup-2");
    expect(view.container.textContent).toContain("backup-count:0");
  } finally {
    view.cleanup();
  }
});

test("BackupsPage downloads base64 artifact content and handles generic errors", async () => {
  const view = mount(<BackupsPage />);

  try {
    await flush();

    backupsState.nextDownloadPayload = {
      url: null,
      path: null,
      content: "bW9jay1jb250ZW50",
      contentType: "application/octet-stream",
      fileName: "backup-1.cbk",
      encoding: "base64",
    };
    clickByText(view.container, "download:backup-1");
    await flush();
    expect(backupsState.downloadBackup).toHaveBeenCalledWith("backup-1");

    backupsState.nextDownloadError = new Error("download exploded");
    clickByText(view.container, "download:backup-1");
    await flush();
    expect(view.container.textContent).toContain("Failed to download backup.");

    backupsState.nextCreateError = backupsState.apiError("Create denied");
    clickByText(view.container, "Create");
    await flush();
    clickByText(view.container, "backup-now-confirm");
    await flush();
    expect(view.container.textContent).toContain("Create denied");

    backupsState.nextImportError = backupsState.apiError("Import denied");
    clickByText(view.container, "Import");
    await flush();
    clickByText(view.container, "import-confirm");
    await flush();
    expect(view.container.textContent).toContain("Import denied");

    backupsState.nextUpdateError = new Error("update exploded");
    clickByText(view.container, "schedule-save");
    await flush();
    expect(view.container.textContent).toContain("Failed to update backup schedule.");

    backupsState.nextRestoreError = backupsState.apiError("Restore denied");
    clickByText(view.container, "restore:backup-1");
    await flush();
    expect(view.container.textContent).toContain("Restore denied");

    backupsState.nextDeleteError = new Error("delete exploded");
    clickByText(view.container, "delete:backup-1");
    await flush();
    clickByText(view.container, "confirm:Delete");
    await flush();
    expect(view.container.textContent).toContain("Failed to delete backup.");
  } finally {
    view.cleanup();
  }
});

test("BackupsPage reacts to cache invalidation events and initial generic load failures", async () => {
  backupsState.nextListError = new Error("initial exploded");

  const failedView = mount(<BackupsPage />);

  try {
    await flush();
    expect(failedView.container.textContent).toContain("Failed to load backups.");
  } finally {
    failedView.cleanup();
  }

  const view = mount(<BackupsPage />);

  try {
    await flush();
    const before = backupsState.listBackups.mock.calls.length;

    // Cache invalidation for the schedule key triggers a background refresh.
    const { broadcastCacheEvent } = await import("../../../core/admin/utils/cacheBus");
    broadcastCacheEvent({ key: "backups:schedule", action: "invalidate" });
    await flush();
    expect(backupsState.listBackups.mock.calls.length).toBeGreaterThan(before);
    expect(backupsState.getBackupSchedule).toHaveBeenLastCalledWith({ force: true });

    // A list cache event also triggers refresh.
    broadcastCacheEvent({ key: "backups:list:1:10:", action: "update" });
    await flush();
    expect(backupsState.listBackups.mock.calls.length).toBeGreaterThan(before + 1);
  } finally {
    view.cleanup();
  }
});

test("BackupsPage bulk delete surfaces synchronous client failures", async () => {
  backupsState.listItems = [
    {
      id: "backup-1",
      kind: "manual",
      status: "complete",
      storageDriver: "local",
      artifactFormat: "v1",
      artifactPath: "/tmp/backup-1.zip",
      sizeBytes: 1024,
      error: null,
      createdAt: "2026-03-15T08:00:00.000Z",
      finishedAt: "2026-03-15T08:01:00.000Z",
    },
    {
      id: "backup-2",
      kind: "manual",
      status: "complete",
      storageDriver: "local",
      artifactFormat: "v1",
      artifactPath: "/tmp/backup-2.zip",
      sizeBytes: 2048,
      error: null,
      createdAt: "2026-03-16T08:00:00.000Z",
      finishedAt: "2026-03-16T08:01:00.000Z",
    },
  ];
  backupsState.listMeta = { ...backupsState.listMeta, total: 2 };

  const view = mount(<BackupsPage />);

  try {
    await flush();
    clickByText(view.container, "toggle-all");
    await flush();
    clickByText(view.container, "Delete selected");
    await flush();
    expect(view.container.textContent).toContain("Delete selected backups?");

    // A synchronous API rejection from the per-row client escapes the
    // allSettled batch and lands in the bulk delete catch.
    backupsState.deleteBackup.mockImplementationOnce(() => {
      throw backupsState.apiError("sync bulk boom");
    });
    clickByText(view.container, "confirm:Delete selected");
    await flush();
    expect(view.container.textContent).toContain("sync bulk boom");

    // Selection persists after the failure, so the same selection can be
    // retried; a synchronous generic failure surfaces the fallback message.
    backupsState.deleteBackup.mockImplementationOnce(() => {
      throw new Error("sync bulk exploded");
    });
    clickByText(view.container, "Delete selected");
    await flush();
    clickByText(view.container, "confirm:Delete selected");
    await flush();
    expect(view.container.textContent).toContain("Bulk backup delete failed.");
  } finally {
    view.cleanup();
  }
});

test("BackupsPage single delete removes the deleted backup from the selection", async () => {
  backupsState.listItems = [
    {
      id: "backup-1",
      kind: "manual",
      status: "complete",
      storageDriver: "local",
      artifactFormat: "v1",
      artifactPath: "/tmp/backup-1.zip",
      sizeBytes: 1024,
      error: null,
      createdAt: "2026-03-15T08:00:00.000Z",
      finishedAt: "2026-03-15T08:01:00.000Z",
    },
    {
      id: "backup-2",
      kind: "manual",
      status: "complete",
      storageDriver: "local",
      artifactFormat: "v1",
      artifactPath: "/tmp/backup-2.zip",
      sizeBytes: 2048,
      error: null,
      createdAt: "2026-03-16T08:00:00.000Z",
      finishedAt: "2026-03-16T08:01:00.000Z",
    },
  ];
  backupsState.listMeta = { ...backupsState.listMeta, total: 2 };

  const view = mount(<BackupsPage />);

  try {
    await flush();
    clickByText(view.container, "toggle:backup-1");
    await flush();
    expect(view.container.textContent).toContain("selected:1");

    clickByText(view.container, "delete:backup-1");
    await flush();
    clickByText(view.container, "confirm:Delete");
    await flush();
    expect(backupsState.deleteBackup).toHaveBeenCalledWith("backup-1");
    // The deleted id is pruned from the selection on the success path.
    expect(view.container.textContent).toContain("selected:0");
  } finally {
    view.cleanup();
  }
});

test("BackupsPage skips the initial load when unmounting before it starts", async () => {
  const view = mount(<BackupsPage />);
  // Unmount synchronously; the deferred load microtask then runs against an
  // inactive effect and bails before touching the clients.
  view.cleanup();
  await React.act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(backupsState.listBackups).not.toHaveBeenCalled();
  expect(backupsState.getBackupSchedule).not.toHaveBeenCalled();
});

test("BackupsPage ignores in-flight load outcomes after the component unmounts", async () => {
  let resolveList: ((value: unknown) => void) | null = null;
  let resolveSchedule: ((value: unknown) => void) | null = null;
  backupsState.listBackups.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveList = resolve;
      })
  );
  backupsState.getBackupSchedule.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveSchedule = resolve;
      })
  );

  const pendingView = mount(<BackupsPage />);
  // Flush the outer microtask so the initial load actually starts (active
  // still true) and suspends on the pending client promises.
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  // Unmount while the load is in flight, then let both promises settle.
  pendingView.cleanup();
  await React.act(async () => {
    resolveList?.({
      items: backupsState.listItems,
      ...backupsState.listMeta,
    });
    resolveSchedule?.(backupsState.scheduleResult);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(document.body.textContent).not.toContain("backup-count:");
  expect(document.body.textContent).not.toContain("schedule:daily");

  // A rejected load that settles after unmount is swallowed the same way.
  let rejectList: ((reason: Error) => void) | null = null;
  let rejectSchedule: ((reason: Error) => void) | null = null;
  backupsState.listBackups.mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectList = reject;
      })
  );
  backupsState.getBackupSchedule.mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectSchedule = reject;
      })
  );

  const rejectedView = mount(<BackupsPage />);
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  rejectedView.cleanup();
  await React.act(async () => {
    rejectList?.(new Error("late load failure"));
    rejectSchedule?.(new Error("late schedule failure"));
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(document.body.textContent).not.toContain("Settings error");
});
