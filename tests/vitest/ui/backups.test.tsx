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
  }) => <input value={value} onChange={onChange} {...props} />,
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

  expect(html).toContain("Backup Schedule");
  expect(html).toContain("Recent Backups");
  expect(html).toContain("Create Backup Now");
});

test("BackupNowDialog sends selected include options and blocks empty selections", async () => {
  const onCreate = vi.fn(async () => true);
  const view = mount(
    <BackupNowDialog open onOpenChange={() => undefined} onCreate={onCreate} isSubmitting={false} />
  );

  try {
    const checkboxes = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>("[role='checkbox']")
    );
    React.act(() => {
      checkboxes[1]?.click();
      checkboxes[2]?.click();
    });
    await React.act(async () => {
      clickByText(view.container, "Start Backup");
      await Promise.resolve();
    });

    expect(onCreate).toHaveBeenCalledWith(["database", "settings"]);
  } finally {
    view.cleanup();
  }

  const emptyView = mount(
    <BackupNowDialog open onOpenChange={() => undefined} onCreate={onCreate} isSubmitting={false} />
  );

  try {
    const checkboxes = Array.from(
      emptyView.container.querySelectorAll<HTMLButtonElement>("[role='checkbox']")
    );
    React.act(() => {
      checkboxes[0]?.click();
      checkboxes[1]?.click();
    });
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

test("BackupsTable shows worker boundary, disabled reasons, and real pagination/delete actions", () => {
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
            id: "backup-local-artifact",
            kind: "manual",
            status: "complete",
            storageDriver: "local",
            artifactPath: "/var/backups/backup-local-artifact.zip",
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
          mode: "external",
          healthy: false,
          queuedCount: 1,
          oldestQueuedAt: "2026-06-01T00:00:00.000Z",
          message: "Backup jobs are still waiting for the external backup worker.",
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

  expect(html).toContain("external backup worker");
  expect(html).toContain("Backup is waiting for the external backup worker.");
  expect(html).toContain("Backup artifact is not downloadable from this admin route.");
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
          mode: "external",
          healthy: true,
          queuedCount: 0,
          oldestQueuedAt: null,
          message: "No backup jobs are waiting for the external backup worker.",
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
