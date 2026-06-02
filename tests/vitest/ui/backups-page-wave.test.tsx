// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type {
  BackupIncludeOption,
  BackupItem,
  BackupListResult,
  BackupSchedule,
} from "../../../core/admin/services/backupsClient";

const backupsState = vi.hoisted(() => ({
  listItems: [
    {
      id: "backup-1",
      kind: "manual",
      status: "complete",
      storageDriver: "local",
      artifactPath: "/tmp/backup-1.zip",
      sizeBytes: 1024,
      error: null,
      createdAt: "2026-03-15T08:00:00.000Z",
      finishedAt: "2026-03-15T08:01:00.000Z",
    },
  ] as BackupItem[],
  listMeta: {
    page: 1,
    limit: 10,
    total: 1,
    hasNext: false,
    hasPrevious: false,
    worker: {
      mode: "internal",
      healthy: true,
      queuedCount: 0,
      oldestQueuedAt: null,
      message: "CMS backup worker is ready.",
    },
  } as Omit<BackupListResult, "items">,
  scheduleResult: {
    id: "schedule-1",
    enabled: true,
    frequency: "daily",
    retentionDays: 30,
    storageDriver: "local",
    createdAt: "2026-03-15T07:00:00.000Z",
    updatedAt: "2026-03-15T07:00:00.000Z",
  },
  nextListError: null as unknown,
  nextScheduleError: null as unknown,
  nextCreateError: null as unknown,
  nextUpdateError: null as unknown,
  nextRestoreError: null as unknown,
  nextDownloadError: null as unknown,
  nextDeleteError: null as unknown,
  nextDownloadPayload: { url: "https://cdn.test/backup-1.zip", path: null } as {
    url: string | null;
    path: string | null;
    content?: string;
    contentType?: string;
    fileName?: string;
  },
  listBackups: vi.fn(async (options?: Record<string, unknown>) => {
    if (backupsState.nextListError) {
      const error = backupsState.nextListError;
      backupsState.nextListError = null;
      throw error;
    }
    return {
      items: backupsState.listItems,
      ...backupsState.listMeta,
      page: Number(options?.page ?? backupsState.listMeta.page),
      limit: Number(options?.limit ?? backupsState.listMeta.limit),
    };
  }),
  getBackupSchedule: vi.fn(async () => {
    if (backupsState.nextScheduleError) {
      const error = backupsState.nextScheduleError;
      backupsState.nextScheduleError = null;
      throw error;
    }
    return backupsState.scheduleResult;
  }),
  createBackup: vi.fn(async () => {
    if (backupsState.nextCreateError) {
      const error = backupsState.nextCreateError;
      backupsState.nextCreateError = null;
      throw error;
    }
    return backupsState.listItems[0];
  }),
  updateBackupSchedule: vi.fn(async (payload: Record<string, unknown>) => {
    if (backupsState.nextUpdateError) {
      const error = backupsState.nextUpdateError;
      backupsState.nextUpdateError = null;
      throw error;
    }
    backupsState.scheduleResult = {
      ...backupsState.scheduleResult,
      ...payload,
    } as BackupSchedule;
    return backupsState.scheduleResult;
  }),
  restoreBackup: vi.fn(async () => {
    if (backupsState.nextRestoreError) {
      const error = backupsState.nextRestoreError;
      backupsState.nextRestoreError = null;
      throw error;
    }
    return { ok: true };
  }),
  downloadBackup: vi.fn(async () => {
    if (backupsState.nextDownloadError) {
      const error = backupsState.nextDownloadError;
      backupsState.nextDownloadError = null;
      throw error;
    }
    return backupsState.nextDownloadPayload;
  }),
  deleteBackup: vi.fn(async (id: string) => {
    if (backupsState.nextDeleteError) {
      const error = backupsState.nextDeleteError;
      backupsState.nextDeleteError = null;
      throw error;
    }
    backupsState.listItems = backupsState.listItems.filter((item) => item.id !== id);
    backupsState.listMeta = {
      ...backupsState.listMeta,
      total: backupsState.listItems.length,
      hasNext: false,
      hasPrevious: false,
    };
    return { ok: true, id };
  }),
  apiError(message: string) {
    return { kind: "api", message };
  },
  reset() {
    backupsState.listItems = [
      {
        id: "backup-1",
        kind: "manual",
        status: "complete",
        storageDriver: "local",
        artifactPath: "/tmp/backup-1.zip",
        sizeBytes: 1024,
        error: null,
        createdAt: "2026-03-15T08:00:00.000Z",
        finishedAt: "2026-03-15T08:01:00.000Z",
      },
    ];
    backupsState.listMeta = {
      page: 1,
      limit: 10,
      total: 1,
      hasNext: false,
      hasPrevious: false,
      worker: {
        mode: "internal",
        healthy: true,
        queuedCount: 0,
        oldestQueuedAt: null,
        message: "CMS backup worker is ready.",
      },
    };
    backupsState.scheduleResult = {
      id: "schedule-1",
      enabled: true,
      frequency: "daily",
      retentionDays: 30,
      storageDriver: "local",
      createdAt: "2026-03-15T07:00:00.000Z",
      updatedAt: "2026-03-15T07:00:00.000Z",
    };
    backupsState.nextListError = null;
    backupsState.nextScheduleError = null;
    backupsState.nextCreateError = null;
    backupsState.nextUpdateError = null;
    backupsState.nextRestoreError = null;
    backupsState.nextDownloadError = null;
    backupsState.nextDeleteError = null;
    backupsState.nextDownloadPayload = { url: "https://cdn.test/backup-1.zip", path: null };
    backupsState.listBackups.mockClear();
    backupsState.getBackupSchedule.mockClear();
    backupsState.createBackup.mockClear();
    backupsState.updateBackupSchedule.mockClear();
    backupsState.restoreBackup.mockClear();
    backupsState.downloadBackup.mockClear();
    backupsState.deleteBackup.mockClear();
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: string }).kind === "api",
}));

vi.mock("@/services/backupsClient", () => ({
  listBackups: backupsState.listBackups,
  listBackupsCached: backupsState.listBackups,
  getCachedBackups: vi.fn(() => null),
  getBackupSchedule: backupsState.getBackupSchedule,
  getBackupScheduleCached: backupsState.getBackupSchedule,
  getCachedBackupSchedule: vi.fn(() => null),
  createBackup: backupsState.createBackup,
  updateBackupSchedule: backupsState.updateBackupSchedule,
  restoreBackup: backupsState.restoreBackup,
  downloadBackup: backupsState.downloadBackup,
  deleteBackup: backupsState.deleteBackup,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      <div>{actions}</div>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/backups/BackupNowDialog", () => ({
  BackupNowDialog: ({
    open,
    onOpenChange,
    onCreate,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (include: BackupIncludeOption[]) => Promise<boolean>;
  }) =>
    open ? (
      <div>
        <button type="button" onClick={() => void onCreate(["database", "media"])}>
          backup-now-confirm
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          backup-now-close
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/backups/BackupScheduleCard", () => ({
  BackupScheduleCard: ({
    schedule,
    isLoading,
    isSaving,
    onSave,
  }: {
    schedule: BackupSchedule | null;
    isLoading: boolean;
    isSaving: boolean;
    onSave: (payload: Record<string, unknown>) => Promise<void>;
  }) => (
    <div>
      <span>{`schedule:${schedule?.frequency ?? "none"}`}</span>
      <span>{`schedule-loading:${String(isLoading)}`}</span>
      <span>{`schedule-saving:${String(isSaving)}`}</span>
      <button
        type="button"
        onClick={() =>
          void onSave({
            enabled: false,
            frequency: "weekly",
            timeOfDay: "03:00",
          })
        }
      >
        schedule-save
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/backups/BackupsTable", () => ({
  BackupsTable: ({
    result,
    isLoading,
    isSaving,
    onRestore,
    onDownload,
    onDelete,
    onPageChange,
    onQueryChange,
  }: {
    result: BackupListResult;
    query: string;
    isLoading: boolean;
    isSaving: boolean;
    onRestore: (id: string) => Promise<void>;
    onDownload: (id: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onPageChange: (page: number) => void;
    onQueryChange: (query: string) => void;
  }) => (
    <div>
      <span>{`backup-count:${result.items.length}`}</span>
      <span>{`backup-page:${result.page}`}</span>
      <span>{`backup-total:${result.total}`}</span>
      <span>{`worker:${result.worker.message}`}</span>
      <span>{`backups-loading:${String(isLoading)}`}</span>
      <span>{`backups-saving:${String(isSaving)}`}</span>
      {result.items.map((item) => (
        <div key={item.id}>
          <span>{item.id}</span>
          <button type="button" onClick={() => void onRestore(item.id)}>
            restore:{item.id}
          </button>
          <button type="button" onClick={() => void onDownload(item.id)}>
            download:{item.id}
          </button>
          <button type="button" onClick={() => void onDelete(item.id)}>
            delete:{item.id}
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onPageChange(result.page + 1)}>
        next-page
      </button>
      <button type="button" onClick={() => onQueryChange("queued")}>
        query-queued
      </button>
    </div>
  ),
}));

import { BackupsPage } from "../../../core/admin/ui/backups/BackupsPage";

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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  backupsState.reset();
  vi.stubGlobal("open", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

test("BackupsPage loads data, creates manual backups, updates schedule, restores, and downloads", async () => {
  const view = mount(<BackupsPage />);

  try {
    await flush();

    expect(backupsState.listBackups).toHaveBeenCalled();
    expect(backupsState.getBackupSchedule).toHaveBeenCalled();
    expect(view.container.textContent).toContain("schedule:daily");
    expect(view.container.textContent).toContain("backup-count:1");

    clickByText(view.container, "Create Backup Now");
    await flush();
    clickByText(view.container, "backup-now-confirm");
    await flush();

    expect(backupsState.createBackup).toHaveBeenCalledWith({
      kind: "manual",
      include: ["database", "media"],
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

    clickByText(view.container, "download:backup-1");
    await flush();
    expect(backupsState.downloadBackup).toHaveBeenCalledWith("backup-1");
    expect(window.open).toHaveBeenCalledWith(
      "https://cdn.test/backup-1.zip",
      "_blank",
      "noopener,noreferrer"
    );

    vi.stubGlobal(
      "confirm",
      vi.fn(() => true)
    );
    clickByText(view.container, "delete:backup-1");
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

    backupsState.nextCreateError = new Error("create exploded");
    clickByText(view.container, "Create Backup Now");
    await flush();
    clickByText(view.container, "backup-now-confirm");
    await flush();
    expect(view.container.textContent).toContain("Failed to create backup.");

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
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true)
    );
    clickByText(view.container, "delete:backup-1");
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
