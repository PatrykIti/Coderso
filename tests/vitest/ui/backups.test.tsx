// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={Boolean(checked)}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      // happy-dom does not route dispatched `input` events through React's
      // delegated onChange, so mirror the access-logs mock and forward the
      // native onInput listener as well.
      onInput={(event) => onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {children}
    </select>
  ),
  // Trigger content (icons) must never land inside the <select>; only the
  // SelectContent options are valid children there.
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

vi.mock("@/ui/shared/SectionCard", () => ({
  SectionCard: ({
    title,
    description,
    action,
    children,
  }: {
    title: string;
    description: string;
    action?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
      {children}
    </section>
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    colSpan,
    className,
  }: {
    children: React.ReactNode;
    colSpan?: number;
    className?: string;
  }) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

import type { BackupListResult } from "../../../core/admin/services/backupsClient";
import { BackupsPage } from "../../../core/admin/ui/backups/BackupsPage";
import { BackupImportDialog } from "../../../core/admin/ui/backups/BackupImportDialog";
import { BackupNowDialog } from "../../../core/admin/ui/backups/BackupNowDialog";
import { BackupScheduleCard } from "../../../core/admin/ui/backups/BackupScheduleCard";
import { BackupsTable } from "../../../core/admin/ui/backups/BackupsTable";

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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button ${text}`);
  React.act(() => {
    button.click();
  });
};

test("BackupsPage renders schedule and table", () => {
  const html = renderAdminUi(<BackupsPage />);

  expect(html).toContain("Automatic backups");
  expect(html).toContain("Recent Backups");
  expect(html).toContain("Create");
});

const typeInto = (container: HTMLElement, id: string, value: string) => {
  const input = container.querySelector<HTMLInputElement>(`#${id}`);
  if (!(input instanceof HTMLInputElement)) throw new Error(`Missing input ${id}`);
  React.act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

test("BackupNowDialog sends selected include options + passphrase and blocks empty/no-passphrase submits", async () => {
  const onCreate = vi.fn(async () => true);
  const view = mount(
    <BackupNowDialog open onOpenChange={() => undefined} onCreate={onCreate} isSubmitting={false} />
  );

  try {
    // Defaults: database + media checked. Toggle media OFF, settings ON, then
    // type the mandatory encryption passphrase and submit.
    const checkboxes = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>("[role='checkbox']")
    );
    React.act(() => {
      checkboxes[1]?.click(); // media -> off
      checkboxes[2]?.click(); // settings -> on
    });
    // Without a passphrase the submit stays disabled: no call fires.
    clickByText(view.container, "Start Backup");
    expect(onCreate).not.toHaveBeenCalled();

    typeInto(view.container, "backup-passphrase", "test-passphrase");
    await React.act(async () => {
      clickByText(view.container, "Start Backup");
      await Promise.resolve();
    });

    expect(onCreate).toHaveBeenCalledWith(["database", "settings"], "test-passphrase");
  } finally {
    view.cleanup();
  }

  // Empty selection: submit disabled + inline error, even with a passphrase.
  const emptyView = mount(
    <BackupNowDialog open onOpenChange={() => undefined} onCreate={onCreate} isSubmitting={false} />
  );

  try {
    const checkboxes = Array.from(
      emptyView.container.querySelectorAll<HTMLButtonElement>("[role='checkbox']")
    );
    React.act(() => {
      checkboxes[0]?.click(); // database -> off
      checkboxes[1]?.click(); // media -> off
    });
    typeInto(emptyView.container, "backup-passphrase", "test-passphrase");
    expect(emptyView.container.textContent).toContain("Select at least one backup section.");
    expect(
      Array.from(emptyView.container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Start Backup")
      )?.disabled
    ).toBe(true);
  } finally {
    emptyView.cleanup();
  }
});

test("BackupNowDialog flags users selection as sensitive and encrypted-only", async () => {
  const onCreate = vi.fn(async () => true);
  const view = mount(
    <BackupNowDialog open onOpenChange={() => undefined} onCreate={onCreate} isSubmitting={false} />
  );

  try {
    const checkboxes = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>("[role='checkbox']")
    );
    React.act(() => {
      checkboxes[3]?.click(); // users -> on
    });
    expect(view.container.textContent).toContain("Users & roles are sensitive.");
    expect(view.container.textContent).toContain(
      "encrypted with the passphrase below and can only be restored through Import"
    );
  } finally {
    view.cleanup();
  }
});

test("BackupsTable shows worker boundary, disabled reasons, v2 import-only restore, and pagination", () => {
  const onPageChange = vi.fn();
  const onQueryChange = vi.fn();
  const onDelete = vi.fn();
  const html = renderToString(
    <BackupsTable
      result={{
        items: [
          {
            id: "backup-queued",
            kind: "manual",
            status: "queued",
            storageDriver: "local",
            artifactFormat: null,
            artifactPath: null,
            sizeBytes: null,
            error: null,
            createdAt: "2026-06-01T00:00:00.000Z",
            finishedAt: null,
          },
          {
            id: "backup-v2-cbk",
            kind: "manual",
            status: "complete",
            storageDriver: "local",
            // The admin list redacts the artifactPath to "local" for local
            // storage; the restore gate MUST use artifactFormat, never the
            // path suffix, or v2 rows would offer restore-by-id.
            artifactFormat: "v2",
            artifactPath: "local",
            sizeBytes: 128,
            error: null,
            createdAt: "2026-06-01T00:00:00.000Z",
            finishedAt: "2026-06-01T00:01:00.000Z",
          },
        ],
        page: 1,
        limit: 10,
        total: 11,
        hasNext: true,
        hasPrevious: false,
        worker: {
          mode: "internal",
          healthy: false,
          queuedCount: 1,
          oldestQueuedAt: "2026-06-01T00:00:00.000Z",
          message: "CMS backup worker has jobs running longer than expected.",
        },
      }}
      query=""
      isLoading={false}
      isSaving={false}
      onRestore={() => undefined}
      onDownload={() => undefined}
      onDelete={onDelete}
      onRefresh={() => undefined}
      onPageChange={onPageChange}
      onQueryChange={onQueryChange}
    />
  );

  expect(html).toContain("CMS backup worker has jobs running longer than expected.");
  expect(html).toContain("Backup is still being processed.");
  // v2 `.cbk` archives have no stored passphrase: restore-by-id is impossible,
  // so the row explains the download → Import flow instead.
  expect(html).toContain("Download this backup and use Import to restore it.");
  expect(html.replace(/<!-- -->/g, "")).toContain("Showing 2 of 11 backups");

  const view = mount(
    <BackupsTable
      result={{
        items: [],
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
      }}
      query=""
      isLoading={false}
      isSaving={false}
      onRestore={() => undefined}
      onDownload={() => undefined}
      onDelete={onDelete}
      onRefresh={() => undefined}
      onPageChange={onPageChange}
      onQueryChange={onQueryChange}
    />
  );

  try {
    clickByText(view.container, "Next");
    expect(onPageChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("BackupImportDialog requires file + passphrase, imports, and closes on success", async () => {
  const onImport = vi.fn(async () => true);
  const onOpenChange = vi.fn();
  const view = mount(
    <BackupImportDialog open onOpenChange={onOpenChange} onImport={onImport} isSubmitting={false} />
  );

  try {
    // Empty form: submit is disabled and never calls onImport.
    clickByText(view.container, "Import Backup");
    expect(onImport).not.toHaveBeenCalled();

    // Pick a file, type a passphrase, toggle restore users.
    const fileInput = view.container.querySelector<HTMLInputElement>("#backup-import-file");
    if (!(fileInput instanceof HTMLInputElement)) throw new Error("Missing file input");
    const file = new File(["archive"], "backup.cbk", { type: "application/octet-stream" });
    React.act(() => {
      Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    typeInto(view.container, "backup-import-passphrase", "secret");
    React.act(() => {
      view.container.querySelector<HTMLButtonElement>("[role='checkbox']")?.click();
    });

    await React.act(async () => {
      clickByText(view.container, "Import Backup");
      await Promise.resolve();
    });

    expect(onImport).toHaveBeenCalledWith({ file, passphrase: "secret", restoreUsers: true });
    // Successful import closes the dialog through the parent callback.
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }

  // Failed import keeps the dialog open.
  const failingImport = vi.fn(async () => false);
  const failingOpen = vi.fn();
  const retryView = mount(
    <BackupImportDialog
      open
      onOpenChange={failingOpen}
      onImport={failingImport}
      isSubmitting={false}
    />
  );

  try {
    const fileInput = retryView.container.querySelector<HTMLInputElement>("#backup-import-file");
    if (!(fileInput instanceof HTMLInputElement)) throw new Error("Missing file input");
    React.act(() => {
      Object.defineProperty(fileInput, "files", {
        value: [new File(["x"], "b.cbk")],
        configurable: true,
      });
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    typeInto(retryView.container, "backup-import-passphrase", "secret");
    await React.act(async () => {
      clickByText(retryView.container, "Import Backup");
      await Promise.resolve();
    });
    expect(failingOpen).not.toHaveBeenCalled();
  } finally {
    retryView.cleanup();
  }

  // Close via the header X and Cancel button.
  const closeView = mount(
    <BackupImportDialog open onOpenChange={onOpenChange} onImport={onImport} isSubmitting={false} />
  );
  try {
    closeView.container
      .querySelector<HTMLButtonElement>('[aria-label="Close import dialog"]')
      ?.click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    closeView.cleanup();
  }

  const cancelView = mount(
    <BackupImportDialog open onOpenChange={onOpenChange} onImport={onImport} isSubmitting={false} />
  );
  try {
    clickByText(cancelView.container, "Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    cancelView.cleanup();
  }
});

test("BackupNowDialog closes through header and cancel, and shows submitting state", () => {
  const onOpenChange = vi.fn();
  const view = mount(
    <BackupNowDialog open onOpenChange={onOpenChange} onCreate={vi.fn()} isSubmitting={false} />
  );

  try {
    view.container.querySelector<HTMLButtonElement>('[aria-label="Close backup dialog"]')?.click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }

  const cancelView = mount(
    <BackupNowDialog open onOpenChange={onOpenChange} onCreate={vi.fn()} isSubmitting={false} />
  );
  try {
    clickByText(cancelView.container, "Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    cancelView.cleanup();
  }

  const submittingView = mount(
    <BackupNowDialog open onOpenChange={vi.fn()} onCreate={vi.fn()} isSubmitting={true} />
  );
  try {
    expect(submittingView.container.textContent).toContain("Starting...");
  } finally {
    submittingView.cleanup();
  }
});

test("BackupsTable wires search, selection, actions, and both pagination buttons", () => {
  const onToggleAll = vi.fn();
  const onToggleBackup = vi.fn();
  const onRestore = vi.fn();
  const onDownload = vi.fn();
  const onDelete = vi.fn();
  const onPageChange = vi.fn();
  const onQueryChange = vi.fn();

  const result: BackupListResult = {
    items: [
      {
        id: "backup-v1",
        kind: "manual",
        status: "complete",
        storageDriver: "local",
        artifactFormat: "v1",
        artifactPath: "/tmp/backup.zip",
        sizeBytes: 2048,
        error: null,
        createdAt: "2026-06-01T00:00:00.000Z",
        finishedAt: "2026-06-01T00:01:00.000Z",
      },
      {
        id: "backup-failed",
        kind: "manual",
        status: "failed",
        storageDriver: "local",
        artifactFormat: null,
        artifactPath: null,
        sizeBytes: null,
        error: "Disk full.",
        createdAt: "2026-06-01T00:00:00.000Z",
        finishedAt: null,
      },
      {
        id: "backup-no-artifact",
        kind: "manual",
        status: "complete",
        storageDriver: "local",
        artifactFormat: null,
        artifactPath: null,
        sizeBytes: 512,
        error: null,
        createdAt: "2026-06-01T00:00:00.000Z",
        finishedAt: "2026-06-01T00:01:00.000Z",
      },
      {
        id: "backup-fresh-queued",
        kind: "manual",
        status: "queued",
        storageDriver: "local",
        artifactFormat: null,
        artifactPath: null,
        sizeBytes: null,
        error: null,
        createdAt: new Date().toISOString(),
        finishedAt: null,
      },
    ],
    page: 2,
    limit: 10,
    total: 11,
    hasNext: true,
    hasPrevious: true,
    worker: {
      mode: "internal",
      healthy: true,
      queuedCount: 1,
      oldestQueuedAt: null,
      message: "CMS backup worker is ready.",
    },
  };

  const view = mount(
    <BackupsTable
      result={result}
      query=""
      isLoading={false}
      isSaving={false}
      onToggleAll={onToggleAll}
      onToggleBackup={onToggleBackup}
      onRestore={onRestore}
      onDownload={onDownload}
      onDelete={onDelete}
      onRefresh={() => undefined}
      onPageChange={onPageChange}
      onQueryChange={onQueryChange}
    />
  );

  try {
    // Search input forwards changes.
    const search = view.container.querySelector<HTMLInputElement>(
      'input[placeholder="Search backups..."]'
    );
    if (!(search instanceof HTMLInputElement)) throw new Error("Missing search input");
    React.act(() => {
      search.value = "v1";
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onQueryChange).toHaveBeenCalledWith("v1");

    // Select-all and row checkbox (the Checkbox mock drops aria-label, so
    // address the role-based buttons by order: 0 = select-all, 1 = first row).
    const checkboxes = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>("[role='checkbox']")
    );
    React.act(() => {
      checkboxes[0]?.click();
    });
    expect(onToggleAll).toHaveBeenCalled();
    React.act(() => {
      checkboxes[1]?.click();
    });
    expect(onToggleBackup).toHaveBeenCalledWith("backup-v1");

    // Action buttons on the restorable v1 row.
    view.container.querySelector<HTMLButtonElement>('[aria-label="Restore backup"]')?.click();
    expect(onRestore).toHaveBeenCalledWith("backup-v1");
    view.container.querySelector<HTMLButtonElement>('[aria-label="Download backup"]')?.click();
    expect(onDownload).toHaveBeenCalledWith("backup-v1");
    view.container.querySelector<HTMLButtonElement>('[aria-label="Delete backup"]')?.click();
    expect(onDelete).toHaveBeenCalledWith("backup-v1");

    // Both pagination directions are wired.
    clickByText(view.container, "Previous");
    expect(onPageChange).toHaveBeenCalledWith(1);
    clickByText(view.container, "Next");
    expect(onPageChange).toHaveBeenCalledWith(3);

    // Disabled-reason and queue-message rendering.
    expect(view.container.textContent).toContain("Disk full.");
    expect(view.container.textContent).toContain("Backup artifact is not ready.");
    expect(view.container.textContent).toContain("Processing backup.");
    expect(view.container.textContent).toContain("2.0 KB");
  } finally {
    view.cleanup();
  }
});

test("BackupScheduleCard toggles include, changes frequency/storage, and saves", () => {
  const onSave = vi.fn();
  const schedule = {
    enabled: true,
    frequency: "daily",
    storageDriver: "local",
    include: ["database", "media"],
  } as unknown as Parameters<typeof BackupScheduleCard>[0]["schedule"];

  const view = mount(
    <BackupScheduleCard schedule={schedule} isLoading={false} isSaving={false} onSave={onSave} />
  );

  try {
    // Change frequency to weekly.
    clickByText(view.container, "Weekly");
    // Change storage driver to s3.
    const select = view.container.querySelector<HTMLSelectElement>("select");
    if (!(select instanceof HTMLSelectElement)) throw new Error("Missing select");
    React.act(() => {
      select.value = "s3";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    // Toggle settings on, then users on (both unchecked initially).
    const checkboxes = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>("[role='checkbox']")
    );
    React.act(() => {
      checkboxes[2]?.click(); // settings -> on
      checkboxes[3]?.click(); // users -> on
    });
    expect(view.container.textContent).toContain(
      "Users & roles are sensitive and require BACKUP_ENCRYPTION_PASSPHRASE"
    );

    clickByText(view.container, "Update Schedule");
    expect(onSave).toHaveBeenCalledWith({
      frequency: "weekly",
      storageDriver: "s3",
      include: ["database", "media", "settings", "users"],
    });

    // Toggle users back off.
    React.act(() => {
      checkboxes[3]?.click();
    });
    clickByText(view.container, "Update Schedule");
    expect(onSave).toHaveBeenCalledWith({
      frequency: "weekly",
      storageDriver: "s3",
      include: ["database", "media", "settings"],
    });
  } finally {
    view.cleanup();
  }

  // Empty schedule: save guard + disabled button, and loading state text.
  const emptyOnSave = vi.fn();
  const emptyView = mount(
    <BackupScheduleCard schedule={null} isLoading={false} isSaving={false} onSave={emptyOnSave} />
  );
  try {
    expect(emptyView.container.textContent).toContain("Loading schedule");
    clickByText(emptyView.container, "Update Schedule");
    expect(emptyOnSave).not.toHaveBeenCalled();
  } finally {
    emptyView.cleanup();
  }
});
