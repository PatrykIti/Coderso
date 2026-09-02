// @vitest-environment happy-dom
//
// TASK-105-08-08 forms residual closure. Renders the REAL domain components
// (FormFilters, FormBulkActionsBar, FormTable, FieldSettingsPanel,
// FormSettingsPanel, FormCreateDrawer) so the last uncovered control paths are
// exercised through their actual seams. UI primitives are mocked to stable
// happy-dom elements (select -> <select>, checkbox -> button) exactly like the
// existing forms wave suites.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { FormRecord } from "../../../core/admin/services/formsClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

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
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
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
    ...props
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      aria-checked={checked === true ? "true" : "false"}
      data-checked={String(Boolean(checked))}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      const props = child.props as { value?: unknown; children?: React.ReactNode };
      if (typeof props.value === "string") {
        return [{ value: props.value, label: flattenText(props.children) }];
      }
      return collectOptions(props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: () => null,
  };
});

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      data-checked={String(Boolean(checked))}
      onClick={() => onCheckedChange?.(!checked)}
    >
      switch
    </button>
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <table className={className}>{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <thead className={className}>{children}</thead>
  ),
  TableRow: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <tr className={className}>{children}</tr>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/ui/shared/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" "),
}));

let cleanupFns: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanupFns.splice(0)) cleanup();
});

const mount = (node: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => root.render(node));
  cleanupFns.push(() => {
    React.act(() => root.unmount());
    container.remove();
  });
  return container;
};

const setInputValue = (input: HTMLInputElement | null | undefined, value: string) => {
  if (!(input instanceof HTMLInputElement)) throw new Error("Missing input");
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const changeSelectValue = (container: HTMLElement, optionLabel: string, value: string) => {
  const select = Array.from(container.querySelectorAll("select")).find((node) =>
    Array.from(node.querySelectorAll("option")).some((option) => option.textContent === optionLabel)
  );
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing select with option ${optionLabel}`);
  }
  React.act(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButton = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => button.click());
};

const formRecord = (overrides: Partial<FormRecord> = {}): FormRecord => ({
  id: "form-1",
  name: "Contact",
  slug: "contact",
  status: "draft",
  description: "Lead form",
  successMessage: null,
  successRedirectUrl: null,
  submissionAccess: "public",
  settings: {
    layoutMode: "single",
    saveProgress: false,
    stepTitles: [],
    preset: "custom",
    automationRetry: { enabled: false, maxAttempts: 1, baseDelayMs: 300, maxDelayMs: 2000 },
  },
  createdAt: "2026-03-06T10:00:00.000Z",
  updatedAt: "2026-03-06T10:00:00.000Z",
  ...overrides,
});

test("FormFilters forwards search, status, and access filter changes", async () => {
  const { FormFilters } = await import("../../../core/admin/ui/forms/FormFilters");
  const onSearchChange = vi.fn();
  const onStatusChange = vi.fn();
  const onAccessChange = vi.fn();

  const container = mount(
    <FormFilters
      search=""
      status="all"
      access="all"
      onSearchChange={onSearchChange}
      onStatusChange={onStatusChange}
      onAccessChange={onAccessChange}
    />
  );

  const input = container.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Missing search input");
  setInputValue(input, "lead");

  changeSelectValue(container, "Published", "published");
  changeSelectValue(container, "Internal", "internal");

  expect(onSearchChange).toHaveBeenCalledWith("lead");
  expect(onStatusChange).toHaveBeenCalledWith("published");
  expect(onAccessChange).toHaveBeenCalledWith("internal");
});

test("FormBulkActionsBar forwards the selected bulk action", async () => {
  const { FormBulkActionsBar } = await import("../../../core/admin/ui/forms/FormBulkActionsBar");
  const onActionChange = vi.fn();

  const container = mount(
    <FormBulkActionsBar
      selectedCount={2}
      action=""
      onActionChange={onActionChange}
      onApply={() => undefined}
      onClear={() => undefined}
    />
  );

  changeSelectValue(container, "Archive", "archive");
  expect(onActionChange).toHaveBeenCalledWith("archive");
});

test("FormTable renders the publish action for a draft form", async () => {
  const { FormTable } = await import("../../../core/admin/ui/forms/FormTable");
  const onPublish = vi.fn();

  const container = mount(
    <FormTable
      items={[formRecord({ updatedAt: "not-a-date" })]}
      onEdit={() => undefined}
      onSubmissions={() => undefined}
      onActionLogs={() => undefined}
      onPublish={onPublish}
      onMoveToDraft={() => undefined}
      onArchive={() => undefined}
    />
  );

  clickButton(container, "Publish");
  expect(onPublish).toHaveBeenCalledWith("form-1");
});

test("FieldSettingsPanel forwards hidden-field default value changes", async () => {
  const { FieldSettingsPanel } = await import("../../../core/admin/ui/forms/FieldSettingsPanel");
  const onSettingsChange = vi.fn();

  const container = mount(
    <FieldSettingsPanel
      field={{
        id: "field-hidden",
        label: "Campaign source",
        type: "hidden",
        name: "source",
        required: true,
        settings: {},
      }}
      allFields={[{ id: "field-hidden", name: "source", label: "Campaign source" }]}
      onChange={() => undefined}
      onSettingsChange={onSettingsChange}
    />
  );

  const labels = Array.from(container.querySelectorAll("label"));
  const defaultLabel = labels.find((label) => label.textContent?.includes("Trusted default value"));
  const defaultInput = defaultLabel?.nextElementSibling;
  if (!(defaultInput instanceof HTMLInputElement)) {
    throw new Error("Missing hidden default value input");
  }
  setInputValue(defaultInput, "newsletter");
  expect(onSettingsChange).toHaveBeenCalledWith("field-hidden", { defaultValue: "newsletter" });
});

test("FormSettingsPanel forwards base and max retry delay changes", async () => {
  const { FormSettingsPanel } = await import("../../../core/admin/ui/forms/FormSettingsPanel");
  const onAutomationRetryChange = vi.fn();

  const container = mount(
    <FormSettingsPanel
      name="Contact"
      description="Lead form"
      status="draft"
      submissionAccess="public"
      successMessage="Thanks"
      successRedirectUrl="/thanks"
      settings={{
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
        preset: "custom",
        automationRetry: { enabled: true, maxAttempts: 1, baseDelayMs: 300, maxDelayMs: 2000 },
      }}
      presetOptions={[{ id: "custom", label: "Custom", description: "Custom" }]}
      stepCount={1}
      onNameChange={() => undefined}
      onDescriptionChange={() => undefined}
      onStatusChange={() => undefined}
      onSubmissionAccessChange={() => undefined}
      onSuccessMessageChange={() => undefined}
      onSuccessRedirectUrlChange={() => undefined}
      onSettingsChange={() => undefined}
      onAutomationRetryChange={onAutomationRetryChange}
      onStepTitlesChange={() => undefined}
      onApplyPreset={() => undefined}
    />
  );

  const inputs = Array.from(container.querySelectorAll("input"));
  const baseDelay = inputs.find((input) => input.value === "300");
  const maxDelay = inputs.find((input) => input.value === "2000");
  if (!(baseDelay instanceof HTMLInputElement) || !(maxDelay instanceof HTMLInputElement)) {
    throw new Error("Missing retry delay inputs");
  }

  setInputValue(baseDelay, "500");
  expect(onAutomationRetryChange).toHaveBeenCalledWith({ baseDelayMs: 500 });

  setInputValue(maxDelay, "4000");
  expect(onAutomationRetryChange).toHaveBeenCalledWith({ maxDelayMs: 4000 });
});

test("FormCreateDrawer forwards slug edits and the open-after-create checkbox", async () => {
  const { FormCreateDrawer } = await import("../../../core/admin/ui/forms/FormCreateDrawer");
  const onCreate = vi.fn();
  const onOpenAfterCreateChange = vi.fn();

  const container = mount(
    <FormCreateDrawer
      open
      onOpenChange={() => undefined}
      onCreate={onCreate}
      openAfterCreate
      onOpenAfterCreateChange={onOpenAfterCreateChange}
    />
  );

  const inputs = Array.from(container.querySelectorAll("input"));
  const slugInput = inputs.find((input) => input.getAttribute("placeholder") === "contact-form");
  if (!(slugInput instanceof HTMLInputElement)) throw new Error("Missing slug input");
  setInputValue(slugInput, "lead-capture");

  const nameInput = inputs.find(
    (input) => input.getAttribute("placeholder") === "e.g. Contact form"
  );
  if (!(nameInput instanceof HTMLInputElement)) throw new Error("Missing name input");
  setInputValue(nameInput, "Lead Capture");

  // The slug was manually edited, so the name change must NOT overwrite it.
  clickButton(container, "Create form");
  expect(onCreate).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Lead Capture", slug: "lead-capture" })
  );

  const checkbox = container.querySelector("button[data-checked]");
  if (!(checkbox instanceof HTMLButtonElement)) throw new Error("Missing checkbox button");
  React.act(() => checkbox.click());
  expect(onOpenAfterCreateChange).toHaveBeenCalledWith(false);
});
