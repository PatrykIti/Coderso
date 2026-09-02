// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ContentTypePermissionsPanel } from "../../../core/admin/ui/content-types/ContentTypePermissionsPanel";
import { CAPABILITIES } from "../../../core/admin/ui/content-types/contentTypePermissions";
import type { PermissionsMatrix } from "../../../core/admin/ui/content-types/contentTypePermissions";
import { flush } from "./contentListWaveTestUtils";

const mocks = vi.hoisted(() => ({ roles: [] as unknown[], reject: false, pending: false }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/adminRolesClient", () => ({
  listAdminRoles: () => {
    if (mocks.pending) return new Promise<unknown[]>(() => {});
    if (mocks.reject) return Promise.reject(new Error("offline"));
    return Promise.resolve(mocks.roles);
  },
}));

vi.mock("@/ui/shared/SectionCard", () => ({
  SectionCard: ({
    title,
    description,
    action,
    children,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div data-slot="section-card">
      <div data-slot="card-title">{title}</div>
      <div data-slot="card-description">{description}</div>
      <div data-slot="card-action">{action}</div>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    disabled,
    onCheckedChange,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    "aria-label"?: string;
  }) => (
    <input
      type="checkbox"
      data-slot="checkbox"
      aria-label={ariaLabel}
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table data-slot="table">{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  mocks.roles = [];
  mocks.reject = false;
  mocks.pending = false;
});

afterEach(() => {
  container?.remove();
  container = null;
});

function mount(props: { permissions?: PermissionsMatrix; disabled?: boolean }) {
  const onChange = vi.fn();
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <ContentTypePermissionsPanel
        permissions={props.permissions}
        onChange={onChange}
        disabled={props.disabled}
      />
    );
  });
  return { onChange };
}

describe("ContentTypePermissionsPanel", () => {
  test("renders a loading state while roles are pending", () => {
    mocks.pending = true;
    mount({});
    expect(container!.textContent).toContain("Loading roles…");
  });

  test("renders an error state with a working retry button", async () => {
    mocks.reject = true;
    mount({});
    await flush();
    expect(container!.textContent).toContain("Could not load roles.");
    expect(container!.textContent).toContain("Retry");
    mocks.reject = false;
    mocks.roles = [];
    const retry = container!.querySelector("button");
    React.act(() => {
      retry!.click();
    });
    await flush();
    expect(container!.textContent).toContain("No roles yet.");
  });

  test("renders a no-roles message when the list is empty", async () => {
    mocks.roles = [];
    mount({});
    await flush();
    expect(container!.textContent).toContain("No roles yet.");
  });

  test("renders one row per role with the fixed capability columns", async () => {
    mocks.roles = [
      { id: "editor", name: "Editor", permissions: [] },
      { id: "viewer", name: "Viewer", permissions: [] },
    ];
    mount({});
    await flush();
    expect(container!.textContent).toContain("Editor");
    expect(container!.textContent).toContain("Viewer");
    const labels: Record<string, string> = {
      read: "Read",
      create: "Create",
      update: "Update",
      delete: "Delete",
      publish: "Publish",
    };
    CAPABILITIES.forEach((cap) => expect(container!.textContent).toContain(labels[cap]));
    expect(container!.querySelectorAll('[data-slot="checkbox"]')).toHaveLength(
      2 * CAPABILITIES.length
    );
  });

  test("checks boxes from the permissions matrix and toggles emit normalized matrices", async () => {
    mocks.roles = [{ id: "editor", name: "Editor", permissions: [] }];
    const { onChange } = mount({
      permissions: { editor: { read: true } },
    });
    await flush();
    const checkboxes = Array.from(
      container!.querySelectorAll<HTMLInputElement>('[data-slot="checkbox"]')
    );
    expect(checkboxes[0].checked).toBe(true); // read for editor
    checkboxes[1].click(); // create for editor
    expect(onChange).toHaveBeenCalledWith({ editor: { read: true, create: true } });
    // The controlled checkbox stays checked (props not re-rendered), so the
    // next click emits `false` and clearing the last cap removes the row.
    checkboxes[0].click();
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  test("reset to defaults emits an empty matrix", async () => {
    mocks.roles = [{ id: "editor", name: "Editor", permissions: [] }];
    const { onChange } = mount({
      permissions: { editor: { read: true, delete: true } },
    });
    await flush();
    const buttons = Array.from(container!.querySelectorAll("button"));
    const reset = buttons.find((button) => button.textContent === "Reset to defaults");
    reset!.click();
    expect(onChange).toHaveBeenCalledWith({});
  });

  test("disabled mode disables every control and never emits", async () => {
    mocks.roles = [{ id: "editor", name: "Editor", permissions: [] }];
    const { onChange } = mount({ disabled: true });
    await flush();
    container!
      .querySelectorAll<HTMLInputElement>('[data-slot="checkbox"]')
      .forEach((box) => expect(box.disabled).toBe(true));
    container!.querySelectorAll("button").forEach((button) => expect(button.disabled).toBe(true));
    container!.querySelectorAll<HTMLInputElement>('[data-slot="checkbox"]')[0].click();
    expect(onChange).not.toHaveBeenCalled();
  });
});
