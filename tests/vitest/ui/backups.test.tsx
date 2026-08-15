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

import { BackupsPage } from "../../../core/admin/ui/backups/BackupsPage";
import { BackupNowDialog } from "../../../core/admin/ui/backups/BackupNowDialog";
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
            artifactPath: "/var/backups/backup-v2-cbk.cbk",
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
