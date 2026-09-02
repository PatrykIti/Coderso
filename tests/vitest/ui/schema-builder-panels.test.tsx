// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  FieldsListPanel,
  FieldSettingsPanel,
  SchemaBuilder,
  type ContentField,
} from "../../../core/admin/ui/content-types/SchemaBuilder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "aria-label"?: string;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => (
    <input data-slot="input" value={value ?? ""} placeholder={placeholder} onChange={onChange} />
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    rows,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
  }) => <textarea data-slot="textarea" value={value ?? ""} rows={rows} onChange={onChange} />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      data-slot="switch"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

const selectHandlers = vi.hoisted(() => new WeakMap<HTMLElement, (value: string) => void>());

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <div
      data-slot="select"
      data-value={value}
      ref={(element) => {
        if (element) selectHandlers.set(element, onValueChange ?? (() => undefined));
      }}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <button
      type="button"
      data-slot="select-item"
      data-value={value}
      onClick={(event) => {
        const root = (event.currentTarget as HTMLElement).closest(
          '[data-slot="select"]'
        ) as HTMLElement | null;
        selectHandlers.get(root!)?.(value);
      }}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/ui/shared/InfoTip", () => ({
  InfoTip: ({ label }: { label: string }) => <span data-slot="info-tip">{label}</span>,
}));

let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  container?.remove();
  container = null;
});

const text = () => container!.textContent ?? "";

const baseField = (overrides: Partial<ContentField> = {}): ContentField => ({
  id: "f1",
  name: "title",
  type: "text",
  label: "Title",
  keyAuto: true,
  required: false,
  ...overrides,
});

const setInputValue = (input: HTMLInputElement | HTMLTextAreaElement | null, value: string) => {
  if (!input) throw new Error("Missing input");
  const descriptor = Object.getOwnPropertyDescriptor(
    input instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
    "value"
  );
  React.act(() => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const inputByPlaceholder = (placeholder: string) =>
  container!.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`);

const inputByLabel = (labelText: string) => {
  const label = Array.from(container!.querySelectorAll("label")).find((candidate) =>
    candidate.textContent?.includes(labelText)
  );
  return label?.parentElement?.querySelector<HTMLInputElement>("input") ?? null;
};

test("FieldsListPanel renders the header, search and empty state", () => {
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <FieldsListPanel fields={[]} selectedId={null} onSelect={() => {}} onAdd={() => {}} />
    );
  });
  expect(text()).toContain("Fields");
  expect(text()).toContain("Add your first field to start building the schema.");
  React.act(() => root.unmount());
});

test("FieldsListPanel filters fields by query", () => {
  const fields = [baseField(), baseField({ id: "f2", name: "summary", label: "Summary" })];
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <FieldsListPanel fields={fields} selectedId="f1" onSelect={() => {}} onAdd={() => {}} />
    );
  });
  setInputValue(inputByPlaceholder("Search fields..."), "summary");
  expect(text()).toContain("Summary");
  expect(text()).not.toContain("Add your first field");
  React.act(() => root.unmount());
});

test("FieldsListPanel shows a no-match state and clears the query", () => {
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <FieldsListPanel
        fields={[baseField()]}
        selectedId={null}
        onSelect={() => {}}
        onAdd={() => {}}
      />
    );
  });
  setInputValue(inputByPlaceholder("Search fields..."), "zzz");
  expect(text()).toContain("No fields match this search.");
  setInputValue(inputByPlaceholder("Search fields..."), "");
  expect(text()).toContain("Title");
  React.act(() => root.unmount());
});

test("FieldsListPanel calls onAdd and onSelect", () => {
  const onAdd = vi.fn();
  const onSelect = vi.fn();
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <FieldsListPanel fields={[baseField()]} selectedId={null} onSelect={onSelect} onAdd={onAdd} />
    );
  });
  const addButton = Array.from(container!.querySelectorAll("button")).find(
    (candidate) => !candidate.textContent?.trim()
  );
  expect(addButton).toBeTruthy();
  React.act(() => {
    addButton?.click();
  });
  expect(onAdd).toHaveBeenCalled();
  const titleButton = Array.from(container!.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes("Title")
  );
  React.act(() => {
    titleButton?.click();
  });
  expect(onSelect).toHaveBeenCalledWith("f1");
  React.act(() => root.unmount());
});

test("FieldSettingsPanel shows a placeholder when no field is selected", () => {
  const root = createRoot(container!);
  React.act(() => {
    root.render(<FieldSettingsPanel field={null} onChange={() => {}} onRemove={() => {}} />);
  });
  expect(text()).toContain("Select a field to edit its settings.");
  React.act(() => root.unmount());
});

test("SchemaBuilder adds, updates and removes fields", () => {
  const fields = [baseField()];
  const onChange = vi.fn((next: ContentField[]) => {
    fields.length = 0;
    fields.push(...next);
  });
  const onSelect = vi.fn();
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <SchemaBuilder fields={fields} selectedId="f1" onSelect={onSelect} onChange={onChange} />
    );
  });
  expect(text()).toContain("Field settings");

  const addButton = Array.from(container!.querySelectorAll("button")).find(
    (candidate) => !candidate.textContent?.trim()
  );
  React.act(() => {
    addButton?.click();
  });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(fields[1]?.id);

  React.act(() => {
    root.render(
      <SchemaBuilder
        fields={fields}
        selectedId={fields[1]?.id ?? null}
        onSelect={onSelect}
        onChange={onChange}
      />
    );
  });
  setInputValue(inputByLabel("Field name"), "headline");
  expect(onChange).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ name: "headline" })])
  );

  const removeButton = Array.from(container!.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === "Remove field"
  );
  React.act(() => {
    removeButton?.click();
  });
  expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: "f1" })]);
  React.act(() => root.unmount());
});
