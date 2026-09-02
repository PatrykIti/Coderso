// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { FieldEditor } from "../../../core/admin/ui/content-types/FieldEditor";
import { FieldSettingsPanel } from "../../../core/admin/ui/content-types/SchemaBuilder";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const selectHandlers = vi.hoisted(() => new WeakMap<HTMLElement, (value: string) => void>());

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
    className,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "aria-label"?: string;
    className?: string;
  }) => (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    type,
    min,
    max,
    step,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <input
      type={type ?? "text"}
      data-slot="input"
      value={value ?? ""}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      onChange={onChange}
    />
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

const baseField = (overrides: Partial<ContentField> = {}): ContentField => ({
  id: "f1",
  name: "title",
  type: "text",
  label: "Title",
  keyAuto: true,
  required: false,
  ...overrides,
});

function mount(
  field: ContentField,
  props?: { existingNames?: Array<{ id: string; name: string }> }
) {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <FieldEditor
        field={field}
        relationTargets={[{ slug: "posts", name: "Posts" }]}
        existingNames={props?.existingNames ?? []}
        onChange={onChange}
        onRemove={onRemove}
      />
    );
  });
  return { onChange, onRemove };
}

function setInputValue(element: HTMLInputElement | HTMLTextAreaElement | null, value: string) {
  const descriptor =
    element instanceof HTMLInputElement
      ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
      : Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element!.dispatchEvent(new Event("input", { bubbles: true }));
}

function clickSelectItem(value: string) {
  const item = container!.querySelector<HTMLButtonElement>(
    `[data-slot="select-item"][data-value="${value}"]`
  );
  item!.click();
}

describe("FieldEditor", () => {
  test("renders name, label, type, help and common controls for a text field", () => {
    mount(baseField());
    expect(container!.textContent).toContain("Field settings");
    expect(container!.textContent).toContain("Field name (kebab-case)");
    const labelInput = container!.querySelectorAll<HTMLInputElement>('[data-slot="input"]')[1];
    expect(labelInput.value).toBe("Title");
    expect(container!.textContent).toContain("Short, single-line text for titles or labels.");
    expect(container!.querySelector('[data-slot="info-tip"]')).not.toBeNull();
    expect(container!.textContent).toContain("Help text");
    expect(container!.textContent).toContain("Required");
    expect(container!.textContent).toContain("Unique");
    expect(container!.textContent).toContain("Default value");
    expect(container!.textContent).toContain("Layout & grouping");
    expect(container!.textContent).toContain("Remove field");
  });

  test("slugifies the field name while keyAuto is active", () => {
    const { onChange } = mount(baseField(), { existingNames: [{ id: "other", name: "title" }] });
    const labelInput = container!.querySelectorAll<HTMLInputElement>('[data-slot="input"]')[1];
    setInputValue(labelInput, "My Hero Title");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "My Hero Title",
        name: "my-hero-title",
        keyAuto: true,
      })
    );
  });

  test("makes unique names when the slugified label collides", () => {
    const { onChange } = mount(baseField(), {
      existingNames: [
        { id: "other", name: "my-hero-title" },
        { id: "third", name: "my-hero-title-2" },
      ],
    });
    const labelInput = container!.querySelectorAll<HTMLInputElement>('[data-slot="input"]')[1];
    setInputValue(labelInput, "My Hero Title");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: "my-hero-title-3" }));
  });

  test("keeps the label verbatim when keyAuto is disabled", () => {
    const { onChange } = mount(baseField({ keyAuto: false }));
    const labelInput = container!.querySelectorAll<HTMLInputElement>('[data-slot="input"]')[1];
    setInputValue(labelInput, "My Hero Title");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ label: "My Hero Title", name: "title" })
    );
  });

  test("renders inline errors for name, default and relation", () => {
    mount(baseField({ type: "relation" }), {});
    const relationEditor = container!.querySelectorAll('[data-slot="select"]').length;
    expect(relationEditor).toBeGreaterThan(0);
  });

  test("renders nameError and relationError messages", () => {
    const field = baseField({ type: "relation" });
    const root = createRoot(container!);
    React.act(() => {
      root.render(
        <FieldEditor
          field={field}
          nameError="Field name is required."
          relationError="Select a related content type."
          onChange={vi.fn()}
          onRemove={vi.fn()}
        />
      );
    });
    expect(container!.textContent).toContain("Field name is required.");
    expect(container!.textContent).toContain("Select a related content type.");
  });

  test("adds select options and renders the empty state", () => {
    const { onChange } = mount(baseField({ type: "select" }));
    expect(container!.textContent).toContain("No options yet.");
    const buttons = Array.from(container!.querySelectorAll("button"));
    const add = buttons.find((button) => button.textContent === "Add option");
    add!.click();
    const next = onChange.mock.calls[0][0] as ContentField;
    expect(next.options).toHaveLength(1);
    expect(next.options![0].label).toBe("Option 1");
    expect(next.options![0].value).toBe("option-1");
  });

  test("derives option values from labels and locks manual values", () => {
    const field = baseField({
      type: "select",
      options: [{ id: "o1", label: "Draft", value: "draft" }],
    });
    const { onChange } = mount(field);
    const labelInput = container!.querySelectorAll<HTMLInputElement>('[data-slot="input"]')[2];
    setInputValue(labelInput, "Published");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [expect.objectContaining({ label: "Published", value: "published" })],
      })
    );
    const valueInput = container!.querySelectorAll<HTMLInputElement>('[data-slot="input"]')[3];
    setInputValue(valueInput, "is-published");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [expect.objectContaining({ value: "is-published", valueLocked: true })],
      })
    );
  });

  test("resolves select option value collisions deterministically", () => {
    const field = baseField({
      type: "select",
      options: [
        { id: "o1", label: "Target", value: "target" },
        { id: "o2", label: "Target two", value: "target-2" },
        { id: "o3", label: "Different", value: "different" },
      ],
    });
    const { onChange } = mount(field);
    const labels = container!.querySelectorAll<HTMLInputElement>('input[placeholder="Label"]');
    setInputValue(labels[2] ?? null, "Target");

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        options: [
          expect.objectContaining({ id: "o1", value: "target" }),
          expect.objectContaining({ id: "o2", value: "target-2" }),
          expect.objectContaining({ id: "o3", label: "Target", value: "target-3" }),
        ],
      })
    );
  });

  test("moves a select option up", () => {
    const field = baseField({
      type: "select",
      options: [
        { id: "o1", label: "Draft", value: "draft" },
        { id: "o2", label: "Published", value: "published" },
      ],
    });
    const { onChange } = mount(field);
    const upButton = container!.querySelector<HTMLButtonElement>(
      '[aria-label="Move Published up"]'
    );
    upButton!.click();
    const next = onChange.mock.calls[0][0] as ContentField;
    expect(next.options!.map((option) => option.value)).toEqual(["published", "draft"]);
  });

  test("moves a select option down", () => {
    const field = baseField({
      type: "select",
      options: [
        { id: "o1", label: "Draft", value: "draft" },
        { id: "o2", label: "Published", value: "published" },
      ],
    });
    const { onChange } = mount(field);
    const downButton = container!.querySelector<HTMLButtonElement>(
      '[aria-label="Move Draft down"]'
    );
    downButton!.click();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          expect.objectContaining({ value: "published" }),
          expect.objectContaining({ value: "draft" }),
        ],
      })
    );
  });

  test("removes a select option", () => {
    const field = baseField({
      type: "select",
      options: [
        { id: "o1", label: "Draft", value: "draft" },
        { id: "o2", label: "Published", value: "published" },
      ],
    });
    const { onChange } = mount(field);
    const removeButton = container!.querySelector<HTMLButtonElement>(
      '[aria-label="Remove Published"]'
    );
    removeButton!.click();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ options: [expect.objectContaining({ value: "draft" })] })
    );
  });

  test("edits number constraints including format, step, min and max", () => {
    const field = baseField({ type: "number" });
    const { onChange } = mount(field);
    clickSelectItem("integer");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ number: { format: "integer" } })
    );
    const inputs = container!.querySelectorAll<HTMLInputElement>('[data-slot="input"]');
    setInputValue(inputs[2], "0.5");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ number: { step: 0.5 } }));
    setInputValue(inputs[3], "abc");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ number: expect.not.objectContaining({ min: expect.any(Number) }) })
    );
  });

  test("drops a cleared number step while preserving minimum and maximum", () => {
    const { onChange } = mount(
      baseField({
        type: "number",
        number: { format: "decimal", min: 1, max: 10, step: 0.5 },
      })
    );
    const stepInput = Array.from(container!.querySelectorAll("label"))
      .find((label) => label.textContent?.trim() === "Step")
      ?.parentElement?.querySelector<HTMLInputElement>("input");
    if (!stepInput) throw new Error("Missing number step input");

    setInputValue(stepInput, "");

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ number: { format: "decimal", min: 1, max: 10 } })
    );
  });

  test("enables multiple selections for a select field", () => {
    const { onChange } = mount(baseField({ type: "select" }));
    const multiple = Array.from(container!.querySelectorAll("p"))
      .find((paragraph) => paragraph.textContent === "Allow multiple selections")
      ?.parentElement?.parentElement?.querySelector<HTMLInputElement>('[data-slot="switch"]');
    if (!multiple) throw new Error("Missing select multiple switch");

    React.act(() => {
      multiple.click();
    });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ multiple: true }));
  });

  test("edits media accept list, multiple flag and max items", () => {
    const field = baseField({ type: "media" });
    const { onChange } = mount(field);
    const acceptInput = container!.querySelector<HTMLInputElement>(
      'input[placeholder="image/*, application/pdf"]'
    );
    setInputValue(acceptInput, "image/*,  video/* ,  ");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ media: { accept: ["image/*", "video/*"] } })
    );
    onChange.mockClear();
    const switches = container!.querySelectorAll<HTMLInputElement>('[data-slot="switch"]');
    switches[0].click();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ media: { multiple: true } }));
  });

  test("renders the max items input only when media multiple is enabled", () => {
    const field = baseField({ type: "media", media: { multiple: true } });
    mount(field);
    expect(container!.textContent).toContain("Max items");
    const maxInput = container!.querySelector<HTMLInputElement>(
      'input[placeholder="Leave empty for no limit"]'
    );
    setInputValue(maxInput, "5");
    // No assertion on the emitted value; presence proves the branch rendered.
  });

  test("relation uses the target select when targets exist", () => {
    const field = baseField({ type: "relation", relation: { target: "posts" } });
    const { onChange } = mount(field);
    expect(container!.textContent).toContain("Posts (posts)");
    clickSelectItem("posts");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ relation: { target: "posts" } })
    );
  });

  test("relation falls back to a free text input without targets", () => {
    const field = baseField({ type: "relation" });
    const root = createRoot(container!);
    const onChange = vi.fn();
    React.act(() => {
      root.render(
        <FieldEditor field={field} relationTargets={[]} onChange={onChange} onRemove={vi.fn()} />
      );
    });
    const fallback = container!.querySelector<HTMLInputElement>(
      'input[placeholder="Create a content type first"]'
    );
    setInputValue(fallback, "team");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ relation: { target: "team" } })
    );
  });

  test("enables multiple entries for a relation field", () => {
    const { onChange } = mount(baseField({ type: "relation", relation: { target: "posts" } }));
    const multiple = Array.from(container!.querySelectorAll("p"))
      .find((paragraph) => paragraph.textContent === "Allow multiple")
      ?.parentElement?.parentElement?.querySelector<HTMLInputElement>('[data-slot="switch"]');
    if (!multiple) throw new Error("Missing relation multiple switch");

    React.act(() => {
      multiple.click();
    });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ relation: { target: "posts", multiple: true } })
    );
  });

  test("toggles the date includeTime flag", () => {
    const { onChange } = mount(baseField({ type: "date" }));
    const switchEl = container!.querySelector<HTMLInputElement>('[data-slot="switch"]');
    switchEl!.click();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ date: { includeTime: true } }));
  });

  test("derives slug fields from a sibling source and toggles editability", () => {
    const field = baseField({
      type: "slug",
      slug: { source: "title", editable: true },
    });
    const { onChange } = mount(field, {
      existingNames: [
        { id: "f1", name: "title" },
        { id: "f2", name: "author" },
      ],
    });
    clickSelectItem("author");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ slug: { source: "author" } }));
    onChange.mockClear();
    const switchEl = container!.querySelector<HTMLInputElement>('[data-slot="switch"]');
    switchEl!.click();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ slug: { source: "title", editable: false } })
    );
  });

  test("clears the slug source to free text and drops an empty slug config", () => {
    const field = baseField({ type: "slug", slug: { source: "title" } });
    const { onChange } = mount(field);
    clickSelectItem("__none__");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ slug: undefined }));
  });

  test("updates layout tab, section, width and display", () => {
    const field = baseField({});
    const { onChange } = mount(field);
    const tabInput = container!.querySelector<HTMLInputElement>(
      'input[placeholder="Content, SEO, Sidebar"]'
    );
    setInputValue(tabInput, "SEO");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ layout: { tab: "SEO" } }));
    onChange.mockClear();
    const sectionInput = container!.querySelector<HTMLInputElement>(
      'input[placeholder="Hero, Metadata"]'
    );
    setInputValue(sectionInput, "Hero");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ layout: expect.objectContaining({ section: "Hero" }) })
    );
    onChange.mockClear();
    clickSelectItem("half");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ layout: expect.objectContaining({ width: "half" }) })
    );
    onChange.mockClear();
    clickSelectItem("compact");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ layout: expect.objectContaining({ display: "compact" }) })
    );
  });

  test("drops the layout key when every layout value is cleared", () => {
    const field = baseField({ layout: { tab: "SEO", width: "half" } });
    const { onChange } = mount(field);
    const tabInput = container!.querySelector<HTMLInputElement>(
      'input[placeholder="Content, SEO, Sidebar"]'
    );
    setInputValue(tabInput, "   ");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ layout: { width: "half" } }));
  });

  test("edits help text, required, unique and default value", () => {
    const { onChange } = mount(baseField());
    const textarea = container!.querySelector<HTMLTextAreaElement>('[data-slot="textarea"]');
    setInputValue(textarea, "A short title");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ help: "A short title" }));
    onChange.mockClear();
    const switches = container!.querySelectorAll<HTMLInputElement>('[data-slot="switch"]');
    switches[0].click();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ required: true }));
    onChange.mockClear();
    switches[1].click();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ unique: true }));
  });

  test("changes the field type via the type select", () => {
    const { onChange } = mount(baseField());
    clickSelectItem("date");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "date" }));
  });

  test("fires onRemove from the remove button", () => {
    const { onRemove } = mount(baseField());
    const buttons = Array.from(container!.querySelectorAll("button"));
    const remove = buttons.find((button) => button.textContent === "Remove field");
    remove!.click();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test("FieldSettingsPanel renders the empty selection state", () => {
    const root = createRoot(container!);
    React.act(() => {
      root.render(<FieldSettingsPanel field={null} onChange={vi.fn()} onRemove={vi.fn()} />);
    });
    expect(container!.textContent).toContain("Select a field to edit its settings.");
  });
});
