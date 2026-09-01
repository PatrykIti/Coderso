// @vitest-environment happy-dom

import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { BackupItem, BackupListResult } from "../../../core/admin/services/backupsClient";
import { BackupImportDialog } from "../../../core/admin/ui/backups/BackupImportDialog";
import { BackupNowDialog } from "../../../core/admin/ui/backups/BackupNowDialog";
import { BackupScheduleCard } from "../../../core/admin/ui/backups/BackupScheduleCard";
import { BackupsTable } from "../../../core/admin/ui/backups/BackupsTable";

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
    disabled,
    ...props
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean | "indeterminate") => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <input
      type="checkbox"
      checked={checked === true}
      data-indeterminate={checked === "indeterminate"}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <span {...props}>{children}</span>
  ),
}));

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({ value: "", onValueChange: () => {} });

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div data-select-value={value}>{children}</div>
    </SelectContext.Provider>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <SelectContext.Consumer>
      {({ onValueChange }) => (
        <button type="button" onClick={() => onValueChange(value)}>
          {children}
        </button>
      )}
    </SelectContext.Consumer>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => (
    <SelectContext.Consumer>
      {({ value }) => (
        <span>
          {value}
          {children}
        </span>
      )}
    </SelectContext.Consumer>
  ),
  SelectValue: () => null,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <td {...props}>{children}</td>
  ),
  TableHead: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <th {...props}>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <tr {...props}>{children}</tr>
  ),
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
      <div>{action}</div>
      <div>{children}</div>
    </section>
  ),
}));

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

import { createRoot } from "react-dom/client";

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

const setInputValue = (container: HTMLElement, selector: string, value: string) => {
  const input = container.querySelector(selector);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input: ${selector}`);
  }
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    nativeSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const toggleCheckbox = (container: HTMLElement, label: string) => {
  const checkbox = Array.from(container.querySelectorAll('input[type="checkbox"]')).find(
    (candidate) =>
      candidate.getAttribute("aria-label") === label ||
      candidate.closest("label")?.textContent?.includes(label)
  );
  if (!(checkbox instanceof HTMLInputElement)) {
    throw new Error(`Missing checkbox: ${label}`);
  }
  React.act(() => {
    checkbox.click();
  });
};

const item: BackupItem = {
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

const result = (overrides: Partial<BackupListResult> = {}): BackupListResult => ({
  items: [item],
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
  ...overrides,
});

const scheduleBase = {
  id: "schedule-1",
  enabled: true,
  frequency: "daily" as const,
  retentionDays: 30,
  storageDriver: "local" as const,
  include: ["database", "settings", "media"] as Array<"database" | "media" | "settings" | "users">,
  createdAt: "2026-03-15T07:00:00.000Z",
  updatedAt: "2026-03-15T07:00:00.000Z",
};

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("BackupImportDialog branches", () => {
  test("cancel resets file, passphrase, and restore-users state", () => {
    const onOpenChange = vi.fn();
    const onImport = vi.fn(async () => true);
    const view = mount(
      <BackupImportDialog
        open
        onOpenChange={onOpenChange}
        onImport={onImport}
        isSubmitting={false}
      />
    );
    try {
      const fileInput = view.container.querySelector<HTMLInputElement>("#backup-import-file");
      expect(fileInput).not.toBeNull();
      React.act(() => {
        Object.defineProperty(fileInput, "files", {
          value: [new File([new Uint8Array([1])], "a.cbk")],
        });
        fileInput?.dispatchEvent(new Event("change", { bubbles: true }));
      });
      setInputValue(view.container, "#backup-import-passphrase", "secret");
      toggleCheckbox(view.container, "Restore users");
      expect(view.container.textContent).toContain("Import Backup");

      clickByText(view.container, "Cancel");
      expect(onOpenChange).toHaveBeenCalledWith(false);

      // Reopen with cleared state: import stays guarded while fields are empty.
      view.cleanup();
      const reopened = mount(
        <BackupImportDialog
          open
          onOpenChange={onOpenChange}
          onImport={onImport}
          isSubmitting={false}
        />
      );
      try {
        expect(
          reopened.container.querySelector<HTMLInputElement>("#backup-import-passphrase")?.value
        ).toBe("");
        const importButtons = Array.from(reopened.container.querySelectorAll("button")).filter(
          (b) => b.textContent?.includes("Import Backup")
        );
        expect(importButtons.length).toBeGreaterThan(0);
        for (const button of importButtons) {
          expect(button.disabled || !reopened.container.contains(button)).toBe(true);
        }
        expect(onImport).not.toHaveBeenCalled();
      } finally {
        reopened.cleanup();
      }
    } finally {
      view.cleanup();
    }
  });

  test("failed import keeps the dialog open; successful import closes it", async () => {
    let outcome = false;
    const onOpenChange = vi.fn();
    const onImport = vi.fn(async () => outcome);
    const view = mount(
      <BackupImportDialog
        open
        onOpenChange={onOpenChange}
        onImport={onImport}
        isSubmitting={false}
      />
    );
    try {
      const fileInput = view.container.querySelector<HTMLInputElement>("#backup-import-file");
      React.act(() => {
        Object.defineProperty(fileInput, "files", {
          value: [new File([new Uint8Array([1])], "a.cbk")],
        });
        fileInput?.dispatchEvent(new Event("change", { bubbles: true }));
      });
      setInputValue(view.container, "#backup-import-passphrase", "secret");

      clickByText(view.container, "Import Backup");
      await flush();
      expect(onImport).toHaveBeenCalledTimes(1);
      expect(onOpenChange).not.toHaveBeenCalledWith(false);

      outcome = true;
      clickByText(view.container, "Import Backup");
      await flush();
      expect(onImport).toHaveBeenCalledTimes(2);
      expect(onOpenChange).toHaveBeenCalledWith(false);
      // The close path also clears local form state.
      expect(
        view.container.querySelector<HTMLInputElement>("#backup-import-passphrase")?.value
      ).toBe("");
    } finally {
      view.cleanup();
    }
  });

  test("submitting state disables actions and relabels the confirm button", () => {
    const view = mount(
      <BackupImportDialog
        open
        onOpenChange={() => {}}
        onImport={async () => true}
        isSubmitting={true}
      />
    );
    try {
      expect(view.container.textContent).toContain("Importing...");
      const cancel = Array.from(view.container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Cancel")
      );
      expect(cancel?.disabled).toBe(true);
    } finally {
      view.cleanup();
    }
  });

  test("file change to empty selection clears the chosen file", () => {
    const onImport = vi.fn(async () => true);
    const view = mount(
      <BackupImportDialog open onOpenChange={() => {}} onImport={onImport} isSubmitting={false} />
    );
    try {
      const fileInput = view.container.querySelector<HTMLInputElement>("#backup-import-file");
      React.act(() => {
        Object.defineProperty(fileInput, "files", { value: [] });
        fileInput?.dispatchEvent(new Event("change", { bubbles: true }));
      });
      setInputValue(view.container, "#backup-import-passphrase", "secret");
      const importButtons = Array.from(view.container.querySelectorAll("button")).filter((b) =>
        b.textContent?.includes("Import Backup")
      );
      for (const button of importButtons) {
        expect(button.disabled).toBe(true);
      }
      expect(onImport).not.toHaveBeenCalled();
    } finally {
      view.cleanup();
    }
  });
});

describe("BackupNowDialog branches", () => {
  test("toggling include off then all off disables submit; failed create keeps dialog open", async () => {
    let outcome = false;
    const onCreate = vi.fn(async () => outcome);
    const onOpenChange = vi.fn();
    const view = mount(
      <BackupNowDialog open onOpenChange={onOpenChange} onCreate={onCreate} isSubmitting={false} />
    );
    try {
      setInputValue(
        view.container,
        'input[placeholder*="passphrase"], input[type="password"]',
        "pw"
      );
      // Uncheck both default-checked options.
      toggleCheckbox(view.container, "Database snapshot");
      toggleCheckbox(view.container, "Media assets");
      await flush();

      const createButtons = Array.from(view.container.querySelectorAll("button")).filter((b) =>
        b.textContent?.includes("Start Backup")
      );
      expect(createButtons.some((b) => b.disabled)).toBe(true);
      expect(onCreate).not.toHaveBeenCalled();

      // Re-check database only, then a failing create keeps the dialog state.
      toggleCheckbox(view.container, "Database snapshot");
      clickByText(view.container, "Start Backup");
      await flush();
      expect(onCreate).toHaveBeenCalledWith(["database"], "pw");
      expect(onOpenChange).not.toHaveBeenCalledWith(false);

      outcome = true;
      clickByText(view.container, "Start Backup");
      await flush();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    } finally {
      view.cleanup();
    }
  });

  test("users option requires encryption passphrase warning copy", () => {
    const view = mount(
      <BackupNowDialog
        open
        onOpenChange={() => {}}
        onCreate={async () => true}
        isSubmitting={false}
      />
    );
    try {
      expect(view.container.textContent).toContain("Users & roles");
    } finally {
      view.cleanup();
    }
  });

  test("submitting state shows progress label", () => {
    const view = mount(
      <BackupNowDialog
        open
        onOpenChange={() => {}}
        onCreate={async () => true}
        isSubmitting={true}
      />
    );
    try {
      expect(view.container.textContent).toContain("Starting...");
    } finally {
      view.cleanup();
    }
  });
});

describe("BackupScheduleCard branches", () => {
  test("loading schedule badge, users warning, and save payload", async () => {
    const onSave = vi.fn(async () => {});
    const view = mount(
      <BackupScheduleCard
        schedule={scheduleBase}
        isLoading={false}
        isSaving={false}
        onSave={onSave}
      />
    );
    try {
      expect(view.container.textContent).toContain("Auto-backup active");
      toggleCheckbox(view.container, "Users & roles");
      expect(view.container.textContent).toContain("BACKUP_ENCRYPTION_PASSPHRASE");
      clickByText(view.container, "Update Schedule");
      await flush();
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ frequency: "daily", storageDriver: "local" })
      );
      const firstCall = onSave.mock.calls[0] as unknown as [
        { include: string[]; frequency: string; storageDriver: string },
      ];
      expect(firstCall[0].include).toContain("users");
    } finally {
      view.cleanup();
    }
  });

  test("null schedule shows loading badge and disables save; paused badge when disabled", () => {
    const onSave = vi.fn();
    const loading = mount(
      <BackupScheduleCard schedule={null} isLoading={true} isSaving={false} onSave={onSave} />
    );
    try {
      expect(loading.container.textContent).toContain("Loading schedule");
      const save = Array.from(loading.container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Update Schedule")
      );
      expect(save?.disabled).toBe(true);
    } finally {
      loading.cleanup();
    }

    const paused = mount(
      <BackupScheduleCard
        schedule={{ ...scheduleBase, enabled: false }}
        isLoading={false}
        isSaving={false}
        onSave={onSave}
      />
    );
    try {
      expect(paused.container.textContent).toContain("Auto-backup paused");
    } finally {
      paused.cleanup();
    }
  });

  test("empty include disables save and shows the minimum-selection warning", () => {
    const onSave = vi.fn();
    const view = mount(
      <BackupScheduleCard
        schedule={{ ...scheduleBase, include: ["database"] }}
        isLoading={false}
        isSaving={false}
        onSave={onSave}
      />
    );
    try {
      toggleCheckbox(view.container, "Database");
      expect(view.container.textContent).toContain("Select at least one section.");
      const save = Array.from(view.container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Update Schedule")
      );
      expect(save?.disabled).toBe(true);
      expect(onSave).not.toHaveBeenCalled();
    } finally {
      view.cleanup();
    }
  });

  test("saving state relabels the save button", () => {
    const view = mount(
      <BackupScheduleCard
        schedule={scheduleBase}
        isLoading={false}
        isSaving={true}
        onSave={async () => {}}
      />
    );
    try {
      expect(view.container.textContent).toContain("Saving...");
    } finally {
      view.cleanup();
    }
  });
});

describe("BackupsTable branches", () => {
  test("loading row replaces body content", () => {
    const view = mount(
      <BackupsTable
        result={result()}
        query=""
        isLoading={true}
        isSaving={false}
        selectedIds={[]}
        isAllSelected={false}
        isIndeterminate={false}
        onToggleAll={() => {}}
        onToggleBackup={() => {}}
        onRestore={async () => {}}
        onDownload={async () => {}}
        onDelete={async () => {}}
        onRefresh={() => {}}
        onPageChange={() => {}}
        onQueryChange={() => {}}
      />
    );
    try {
      expect(view.container.textContent).toContain("Loading backups...");
    } finally {
      view.cleanup();
    }
  });

  test("empty rows differ by active query", () => {
    const props = {
      isLoading: false,
      isSaving: false,
      selectedIds: [] as string[],
      isAllSelected: false,
      isIndeterminate: false,
      onToggleAll: () => {},
      onToggleBackup: () => {},
      onRestore: async () => {},
      onDownload: async () => {},
      onDelete: async () => {},
      onRefresh: () => {},
      onPageChange: () => {},
      onQueryChange: () => {},
    };
    const noQuery = mount(
      <BackupsTable result={result({ items: [], total: 0 })} query="" {...props} />
    );
    try {
      expect(noQuery.container.textContent).toContain("No backups found.");
    } finally {
      noQuery.cleanup();
    }
    const withQuery = mount(
      <BackupsTable result={result({ items: [], total: 0 })} query="zzz" {...props} />
    );
    try {
      expect(withQuery.container.textContent).toContain("No backups match this search.");
    } finally {
      withQuery.cleanup();
    }
  });

  test("unhealthy worker surfaces the slow-jobs banner", () => {
    const view = mount(
      <BackupsTable
        result={result({
          worker: {
            mode: "internal",
            healthy: false,
            queuedCount: 2,
            oldestQueuedAt: null,
            message: "worker:degraded",
          },
        })}
        query=""
        isLoading={false}
        isSaving={false}
        selectedIds={["backup-1"]}
        isAllSelected={false}
        isIndeterminate={true}
        onToggleAll={() => {}}
        onToggleBackup={() => {}}
        onRestore={async () => {}}
        onDownload={async () => {}}
        onDelete={async () => {}}
        onRefresh={() => {}}
        onPageChange={() => {}}
        onQueryChange={() => {}}
      />
    );
    try {
      expect(view.container.textContent).toContain("Backup jobs are taking longer than expected");
      expect(view.container.querySelector('input[data-indeterminate="true"]')).not.toBeNull();
      expect(view.container.textContent).toContain("worker:degraded");
    } finally {
      view.cleanup();
    }
  });
});
