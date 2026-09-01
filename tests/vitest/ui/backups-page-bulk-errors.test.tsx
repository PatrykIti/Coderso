// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import { BackupsPage } from "../../../core/admin/ui/backups/BackupsPage";
import { clickByText, flush, mount } from "./backupsPageFixtures";

const harness = vi.hoisted(() => ({ throwOnCachedRead: false }));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
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
  listBackups: vi.fn(async () => emptyList),
  listBackupsCached: vi.fn(async () => listWithItem),
  getCachedBackups: vi.fn(() => {
    if (harness.throwOnCachedRead) {
      throw new Error("cache:boom");
    }
    return null;
  }),
  getBackupSchedule: vi.fn(async () => ({ id: "schedule-1", enabled: true })),
  getBackupScheduleCached: vi.fn(async () => ({ id: "schedule-1", enabled: true })),
  getCachedBackupSchedule: vi.fn(() => null),
  createBackup: vi.fn(),
  importBackup: vi.fn(),
  updateBackupSchedule: vi.fn(),
  restoreBackup: vi.fn(),
  downloadBackup: vi.fn(),
  deleteBackup: vi.fn(),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <div>{actions}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/SectionCard", () => ({
  SectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
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
  BackupNowDialog: ({ open }: { open: boolean }) => (open ? <div>now-dialog</div> : null),
}));

vi.mock("../../../core/admin/ui/backups/BackupImportDialog", () => ({
  BackupImportDialog: ({ open }: { open: boolean }) => (open ? <div>import-dialog</div> : null),
}));

vi.mock("../../../core/admin/ui/backups/BackupScheduleCard", () => ({
  BackupScheduleCard: ({ schedule }: { schedule: { frequency: string } | null }) => (
    <div>{`schedule:${schedule?.frequency ?? "none"}`}</div>
  ),
}));

vi.mock("../../../core/admin/ui/backups/BackupsTable", () => ({
  BackupsTable: ({
    result,
    selectedIds,
    onToggleBackup,
  }: {
    result: { items: Array<{ id: string }>; page: number };
    selectedIds: string[];
    onToggleBackup: (id: string) => void;
  }) => (
    <div>
      <span>{`selected:${selectedIds.length}`}</span>
      {result.items.map((item) => (
        <button key={item.id} type="button" onClick={() => onToggleBackup(item.id)}>
          {`toggle:${item.id}`}
        </button>
      ))}
    </div>
  ),
}));

const item = {
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
};

const emptyList = {
  items: [] as (typeof item)[],
  page: 1,
  limit: 10,
  total: 0,
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

const listWithItem = { ...emptyList, items: [item], total: 1 };

test("BackupsPage bulk delete surfaces a generic failure when the cache read throws", async () => {
  const client = await import("../../../core/admin/services/backupsClient");
  (client.deleteBackup as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
    new Error("disk:boom")
  );

  const view = mount(<BackupsPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("backup-1");

    harness.throwOnCachedRead = true;

    clickByText(view.container, "toggle:backup-1");
    expect(view.container.textContent).toContain("selected:1");

    clickByText(view.container, "Delete selected");
    await flush();
    clickByText(view.container, "confirm:Delete selected");
    await flush();

    expect(view.container.textContent).toContain("Backups unavailable");
    expect(view.container.textContent).toContain("Bulk backup delete failed.");
    // The cache read throws before the try body reaches setSelectedIds([]),
    // so the selection survives the generic failure path.
    expect(view.container.textContent).toContain("selected:1");
  } finally {
    view.cleanup();
  }
});
