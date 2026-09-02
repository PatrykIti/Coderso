// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, vi } from "vitest";

import type {
  BackupIncludeOption,
  BackupItem,
  BackupListResult,
  BackupSchedule,
} from "../../../core/admin/services/backupsClient";

export const backupsState = (() => ({
  listItems: [
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
    include: ["database", "settings", "media"],
    createdAt: "2026-03-15T07:00:00.000Z",
    updatedAt: "2026-03-15T07:00:00.000Z",
  } as BackupSchedule,
  nextListError: null as unknown,
  nextScheduleError: null as unknown,
  nextCreateError: null as unknown,
  nextImportError: null as unknown,
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
    encoding?: "base64";
  },
  cachedBackups: null as BackupListResult | null,
  listBackups: vi.fn(),
  getBackupSchedule: vi.fn(),
  createBackup: vi.fn(),
  importBackup: vi.fn(),
  updateBackupSchedule: vi.fn(),
  restoreBackup: vi.fn(),
  downloadBackup: vi.fn(),
  deleteBackup: vi.fn(),
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
        artifactFormat: "v1",
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
      include: ["database", "settings", "media"],
      createdAt: "2026-03-15T07:00:00.000Z",
      updatedAt: "2026-03-15T07:00:00.000Z",
    };
    backupsState.nextListError = null;
    backupsState.nextScheduleError = null;
    backupsState.nextCreateError = null;
    backupsState.nextImportError = null;
    backupsState.nextUpdateError = null;
    backupsState.nextRestoreError = null;
    backupsState.nextDownloadError = null;
    backupsState.nextDeleteError = null;
    backupsState.nextDownloadPayload = { url: "https://cdn.test/backup-1.zip", path: null };
    backupsState.cachedBackups = null;
    backupsState.listBackups.mockReset();
    backupsState.getBackupSchedule.mockReset();
    backupsState.createBackup.mockReset();
    backupsState.importBackup.mockReset();
    backupsState.updateBackupSchedule.mockReset();
    backupsState.restoreBackup.mockReset();
    backupsState.downloadBackup.mockReset();
    backupsState.deleteBackup.mockReset();
    backupsState.listBackups.mockImplementation(defaultListBackups);
    backupsState.getBackupSchedule.mockImplementation(defaultGetBackupSchedule);
    backupsState.createBackup.mockImplementation(defaultCreateBackup);
    backupsState.importBackup.mockImplementation(defaultImportBackup);
    backupsState.updateBackupSchedule.mockImplementation(defaultUpdateBackupSchedule);
    backupsState.restoreBackup.mockImplementation(defaultRestoreBackup);
    backupsState.downloadBackup.mockImplementation(defaultDownloadBackup);
    backupsState.deleteBackup.mockImplementation(defaultDeleteBackup);
  },
}))();

const defaultListBackups = async (options?: Record<string, unknown>) => {
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
};

const defaultGetBackupSchedule = async () => {
  if (backupsState.nextScheduleError) {
    const error = backupsState.nextScheduleError;
    backupsState.nextScheduleError = null;
    throw error;
  }
  return backupsState.scheduleResult;
};

const defaultCreateBackup = async () => {
  if (backupsState.nextCreateError) {
    const error = backupsState.nextCreateError;
    backupsState.nextCreateError = null;
    throw error;
  }
  return backupsState.listItems[0];
};

const defaultImportBackup = async () => {
  if (backupsState.nextImportError) {
    const error = backupsState.nextImportError;
    backupsState.nextImportError = null;
    throw error;
  }
  return { tablesRestored: 4, rowsRestored: 12, usersRestored: 2, mediaRestored: 3 };
};

const defaultUpdateBackupSchedule = async (payload: Record<string, unknown>) => {
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
};

const defaultRestoreBackup = async () => {
  if (backupsState.nextRestoreError) {
    const error = backupsState.nextRestoreError;
    backupsState.nextRestoreError = null;
    throw error;
  }
  return { ok: true };
};

const defaultDownloadBackup = async () => {
  if (backupsState.nextDownloadError) {
    const error = backupsState.nextDownloadError;
    backupsState.nextDownloadError = null;
    throw error;
  }
  return backupsState.nextDownloadPayload;
};

const defaultDeleteBackup = async (id: string) => {
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
  if (backupsState.cachedBackups) {
    backupsState.cachedBackups = {
      ...backupsState.cachedBackups,
      items: backupsState.cachedBackups.items.filter((item) => item.id !== id),
      total: backupsState.cachedBackups.total - 1,
    };
  }
  return { ok: true, id };
};

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
  getCachedBackups: vi.fn(() => backupsState.cachedBackups),
  getBackupSchedule: backupsState.getBackupSchedule,
  getBackupScheduleCached: backupsState.getBackupSchedule,
  getCachedBackupSchedule: vi.fn(() => null),
  createBackup: backupsState.createBackup,
  importBackup: backupsState.importBackup,
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

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    confirmLabel,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <span>{title}</span>
        <button type="button" onClick={() => void onConfirm()}>
          {`confirm:${confirmLabel}`}
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          {`close:${confirmLabel}`}
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/backups/BackupNowDialog", () => ({
  BackupNowDialog: ({
    open,
    onOpenChange,
    onCreate,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (include: BackupIncludeOption[], passphrase: string) => Promise<boolean>;
  }) =>
    open ? (
      <div>
        <button
          type="button"
          onClick={() => void onCreate(["database", "media"], "mock-passphrase")}
        >
          backup-now-confirm
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          backup-now-close
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/backups/BackupImportDialog", () => ({
  BackupImportDialog: ({
    open,
    onOpenChange,
    onImport,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (input: {
      file: File;
      passphrase: string;
      restoreUsers: boolean;
    }) => Promise<boolean>;
  }) =>
    open ? (
      <div>
        <button
          type="button"
          onClick={() =>
            void onImport({
              file: new File([new Uint8Array([1, 2, 3])], "backup.cbk"),
              passphrase: "import-passphrase",
              restoreUsers: true,
            })
          }
        >
          import-confirm
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          import-close
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
    selectedIds,
    isAllSelected,
    isIndeterminate,
    onToggleAll,
    onToggleBackup,
    onRestore,
    onDownload,
    onDelete,
    onRefresh,
    onPageChange,
    onQueryChange,
  }: {
    result: BackupListResult;
    query: string;
    isLoading: boolean;
    isSaving: boolean;
    selectedIds: string[];
    isAllSelected: boolean;
    isIndeterminate: boolean;
    onToggleAll: () => void;
    onToggleBackup: (id: string) => void;
    onRestore: (id: string) => Promise<void>;
    onDownload: (id: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onRefresh: () => void;
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
      <span>{`selected:${selectedIds.length}`}</span>
      <span>{`all-selected:${String(isAllSelected)}`}</span>
      <span>{`indeterminate:${String(isIndeterminate)}`}</span>
      <button type="button" onClick={onToggleAll}>
        toggle-all
      </button>
      {result.items.map((item) => (
        <div key={item.id}>
          <span>{item.id}</span>
          <button type="button" onClick={() => onToggleBackup(item.id)}>
            toggle:{item.id}
          </button>
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
      <button type="button" onClick={onRefresh}>
        refresh-list
      </button>
      <button type="button" onClick={() => onPageChange(result.page + 1)}>
        next-page
      </button>
      <button type="button" onClick={() => onQueryChange("queued")}>
        query-queued
      </button>
    </div>
  ),
}));

export const mount = (node: React.ReactNode) => {
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

export const clickByText = (container: HTMLElement, text: string) => {
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

export const flush = async () => {
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
