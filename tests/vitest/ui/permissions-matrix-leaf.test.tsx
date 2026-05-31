// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { PermissionsMatrix } from "../../../core/admin/ui/roles/PermissionsMatrix";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      data-checkbox={String(Boolean(checked))}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      checkbox
    </button>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) => (
    <td colSpan={colSpan}>{children}</td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

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

test("PermissionsMatrix renders fallback groups and forwards bulk and per-permission toggles", () => {
  const onTogglePermission = vi.fn();
  const onToggleRoleAll = vi.fn();
  const view = mount(
    <PermissionsMatrix
      roles={[
        { id: "admin", name: "Admin", permissions: [] },
        { id: "editor", name: "Editor", permissions: [] },
      ]}
      rolePermissions={{
        admin: ["content:read", "content:write"],
        editor: ["content:read"],
      }}
      onTogglePermission={onTogglePermission}
      onToggleRoleAll={onToggleRoleAll}
    />
  );

  try {
    expect(view.container.textContent).toContain("Bulk toggles");
    expect(view.container.textContent).toContain("2 roles");
    expect(view.container.textContent).toContain("Content");
    expect(view.container.textContent).toContain("Read content");

    const byLabel = (label: string) =>
      view.container.querySelector(`button[aria-label='${label}']`);

    React.act(() => {
      byLabel("Toggle all Admin permissions")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      byLabel("Read content for Editor")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onToggleRoleAll).toHaveBeenCalledWith("admin");
    expect(onTogglePermission).toHaveBeenCalledWith("editor", "content:read");
  } finally {
    view.cleanup();
  }
});

test("PermissionsMatrix renders custom groups and descriptions", () => {
  const view = mount(
    <PermissionsMatrix
      roles={[{ id: "viewer", name: "Viewer", permissions: [] }]}
      permissionGroups={[
        {
          id: "custom",
          label: "Custom",
          permissions: [
            {
              id: "custom:read",
              label: "Read custom",
              description: "Read custom resources",
            },
          ],
        },
      ]}
    />
  );

  try {
    expect(view.container.textContent).toContain("Custom");
    expect(view.container.textContent).toContain("Read custom");
    expect(view.container.textContent).toContain("Read custom resources");
  } finally {
    view.cleanup();
  }
});
