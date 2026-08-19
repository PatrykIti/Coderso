// @vitest-environment happy-dom
//
// TASK-516-05: Field Settings Control Fixes (B1 phone / B4 time increment /
// B5 rating scale / B6 hidden guard) — admin/UI render lane (Bun-free).
// Verifies the field inspector exposes exactly the controls the backend
// (`core/services/forms/validation.ts`) actually supports for each field type:
//   B4 — `time` shows the "Input increment" control (validation.ts accepts
//        inputStep for time).
//   B5 — `rating` shows a "Rating scale (3–10)" control and NO "Minimum" control
//        (backend deletes rating `min` and clamps `max` to an integer 3..10); the
//        Scale control clamps + integer-coerces its write so the value handed to
//        PUT /forms/:id/fields can never be silently rejected on save.
//   B6 — `hidden` surfaces the required-value notice when the default value is
//        empty (backend rejects a hidden field with an empty defaultValue).
//   B1 — `phone` shows the Placeholder control (type=tel is reachable + configured).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  FieldSettingsPanel,
  type FieldSettings,
} from "../../../core/admin/ui/forms/FieldSettingsPanel";

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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const renderPanel = (field: FieldSettings, onSettingsChange = vi.fn()) => {
  const view = mount(
    <FieldSettingsPanel
      field={field}
      allFields={[{ id: field.id, name: field.name, label: field.label }]}
      onChange={vi.fn()}
      onSettingsChange={onSettingsChange}
      onDuplicate={vi.fn()}
    />
  );
  return { view, onSettingsChange };
};

const baseField = (overrides: Partial<FieldSettings>): FieldSettings => ({
  id: "field-1",
  label: "Field",
  type: "text",
  name: "field",
  required: false,
  settings: {},
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("B4 — a time field shows the Input increment control", () => {
  const { view } = renderPanel(baseField({ type: "time", label: "Preferred time" }));
  try {
    expect(view.container.textContent).toContain("Input increment");
  } finally {
    view.cleanup();
  }
});

test("B4 — a text field does NOT show the Input increment control", () => {
  const { view } = renderPanel(baseField({ type: "text" }));
  try {
    expect(view.container.textContent).not.toContain("Input increment");
  } finally {
    view.cleanup();
  }
});

test("B5 — a rating field shows a Rating scale control and NO Minimum control", () => {
  const { view } = renderPanel(baseField({ type: "rating", label: "Score" }));
  try {
    expect(view.container.textContent).toContain("Rating scale (3–10)");
    expect(view.container.textContent).not.toContain("Minimum");
    expect(view.container.textContent).not.toContain("Maximum");
    // The scale control is a bounded integer number input.
    const scale = view.container.querySelector<HTMLInputElement>(
      "input[type='number'][min='3'][max='10']"
    );
    expect(scale).not.toBeNull();
    expect(scale?.value).toBe("5"); // resolved default when settings.max is unset
  } finally {
    view.cleanup();
  }
});

test("B5 — the Rating scale coerces a decimal entry to an integer within 3..10", () => {
  const { view, onSettingsChange } = renderPanel(
    baseField({ type: "rating", settings: { max: 6 } })
  );
  try {
    const scale = view.container.querySelector<HTMLInputElement>(
      "input[type='number'][min='3'][max='10']"
    );
    React.act(() => {
      setInputValue(scale, "4.5");
    });
    // Number.parseInt("4.5",10) -> 4, clamp 3..10 -> 4 (integer, in range).
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { max: 4 });
  } finally {
    view.cleanup();
  }
});

test("B5 — the Rating scale clamps an out-of-range entry to 10", () => {
  const { view, onSettingsChange } = renderPanel(
    baseField({ type: "rating", settings: { max: 6 } })
  );
  try {
    const scale = view.container.querySelector<HTMLInputElement>(
      "input[type='number'][min='3'][max='10']"
    );
    React.act(() => {
      setInputValue(scale, "99");
    });
    // Clamped to 10 so validation.ts (Number.isInteger(max) && 3 <= max <= 10) accepts it.
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { max: 10 });
  } finally {
    view.cleanup();
  }
});

test("B5 — the Rating scale clamps a below-range entry to 3", () => {
  const { view, onSettingsChange } = renderPanel(
    baseField({ type: "rating", settings: { max: 6 } })
  );
  try {
    const scale = view.container.querySelector<HTMLInputElement>(
      "input[type='number'][min='3'][max='10']"
    );
    React.act(() => {
      setInputValue(scale, "1");
    });
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { max: 3 });
  } finally {
    view.cleanup();
  }
});

test("B6 — a hidden field with an empty default value shows the required-value notice", () => {
  const { view } = renderPanel(
    baseField({ type: "hidden", label: "Source", settings: { defaultValue: "" } })
  );
  try {
    expect(view.container.textContent).toContain("Trusted default value");
    expect(view.container.textContent).toContain("Hidden fields must submit a fixed value.");
    const defaultInput = Array.from(
      view.container.querySelectorAll<HTMLInputElement>("input")
    ).find((input) => input.getAttribute("aria-invalid") === "true");
    expect(defaultInput).not.toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("B6 — a hidden field with a fixed default value hides the required-value notice", () => {
  const { view } = renderPanel(
    baseField({ type: "hidden", settings: { defaultValue: "campaign-42" } })
  );
  try {
    expect(view.container.textContent).toContain("Trusted default value");
    expect(view.container.textContent).not.toContain("Hidden fields must submit a fixed value.");
  } finally {
    view.cleanup();
  }
});

test("B1 — a phone field shows the Placeholder control", () => {
  const { view } = renderPanel(baseField({ type: "phone", label: "Phone" }));
  try {
    expect(view.container.textContent).toContain("Placeholder");
  } finally {
    view.cleanup();
  }
});

// ---------------------------------------------------------------------------
// TASK-105-04 wave: branch coverage for the inspector's general/logic/style
// controls (placeholder, helper, options, defaults, numeric bounds, step
// clamps, pattern, required, label, duplicate) and the conditional-visibility
// logic chain. Assertions use a controlled harness so prop-driven patches
// re-render (matching real admin behavior) instead of being recomputed against
// a frozen props snapshot.
// ---------------------------------------------------------------------------

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const optionValues = (select: HTMLSelectElement) =>
  Array.from(select.options).map((option) => option.value);

const findSelectByOptions = (container: HTMLElement, options: string[]) =>
  Array.from(container.querySelectorAll("select")).find(
    (candidate) =>
      JSON.stringify(optionValues(candidate as HTMLSelectElement)) === JSON.stringify(options)
  ) ?? null;

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const inputUnderLabel = (root: HTMLElement, labelText: string) => {
  const label = Array.from(root.querySelectorAll("label")).find(
    (node) => node.textContent?.trim() === labelText
  );
  return label?.parentElement?.querySelector("input") ?? null;
};

// Radix Tabs triggers activate on mousedown (button 0), not click; dispatch
// both so the panel behaves like a real user interaction.
const clickTab = (container: HTMLElement, label: string) => {
  const tab = Array.from(container.querySelectorAll('[role="tab"]')).find(
    (candidate) => candidate.textContent?.trim() === label
  );
  expect(tab, `missing tab ${label}`).toBeTruthy();
  React.act(() => {
    (tab as HTMLElement).dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    (tab as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const OPERATOR_OPTIONS = [
  "always",
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "exists",
  "not_exists",
];

type PanelHandler = (fieldId: string, updates: Partial<FieldSettings>) => void;

type SettingsHandler = (fieldId: string, updates: Partial<FieldSettings["settings"]>) => void;

const ControlledPanel = ({
  initial,
  allFields,
  onSettingsChange,
  onChange,
}: {
  initial: FieldSettings;
  allFields: Array<Pick<FieldSettings, "id" | "name" | "label">>;
  onSettingsChange?: SettingsHandler;
  onChange?: PanelHandler;
}) => {
  const [field, setField] = React.useState(initial);
  return (
    <form>
      <FieldSettingsPanel
        field={field}
        allFields={allFields}
        onChange={(fieldId, updates) => {
          setField((current) => ({ ...current, ...updates }));
          onChange?.(fieldId, updates);
        }}
        onSettingsChange={(fieldId, updates) => {
          setField((current) => ({
            ...current,
            settings: { ...current.settings, ...updates },
          }));
          onSettingsChange?.(fieldId, updates);
        }}
        onDuplicate={vi.fn()}
      />
    </form>
  );
};

test("general tab: placeholder, helper, label and required write through their controls", () => {
  const onSettingsChange = vi.fn<SettingsHandler>();
  const onChange = vi.fn<PanelHandler>();
  const view = mount(
    <ControlledPanel
      initial={baseField({ type: "text", label: "Name", settings: { placeholder: "Jane" } })}
      allFields={[{ id: "field-1", name: "field", label: "Field" }]}
      onSettingsChange={onSettingsChange}
      onChange={onChange}
    />
  );
  try {
    const placeholder = inputUnderLabel(view.container, "Placeholder");
    setInputValue(placeholder, "Your full name");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { placeholder: "Your full name" });

    const helper = view.container.querySelector("textarea");
    setTextareaValue(helper, "Use your legal name");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { helper: "Use your legal name" });

    const label = inputUnderLabel(view.container, "Label");
    setInputValue(label, "Full name");
    expect(onChange).toHaveBeenLastCalledWith("field-1", { label: "Full name" });

    const requiredSwitch = Array.from(view.container.querySelectorAll('[role="switch"]')).find(
      (control) => control.closest("div")?.textContent?.includes("Required Field")
    ) as HTMLElement | null;
    React.act(() => {
      requiredSwitch?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith("field-1", { required: true });
  } finally {
    view.cleanup();
  }
});

test("general tab: options and default-option select write; missing options show the hint", () => {
  const onSettingsChange = vi.fn<SettingsHandler>();
  const view = mount(
    <ControlledPanel
      initial={baseField({
        type: "select",
        settings: { options: ["Alpha", "Beta"], defaultValue: "Alpha" },
      })}
      allFields={[{ id: "field-1", name: "field", label: "Field" }]}
      onSettingsChange={onSettingsChange}
    />
  );
  try {
    const optionsArea = Array.from(view.container.querySelectorAll("textarea")).find(
      (area) => area.getAttribute("placeholder") === "Option 1\nOption 2"
    );
    setTextareaValue(optionsArea, "Alpha\n Beta \n\nGamma");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", {
      options: ["Alpha", "Beta", "Gamma"],
    });

    setSelectValue(
      findSelectByOptions(view.container, ["__none__", "Alpha", "Beta", "Gamma"]),
      "__none__"
    );
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { defaultValue: undefined });
    setSelectValue(
      findSelectByOptions(view.container, ["__none__", "Alpha", "Beta", "Gamma"]),
      "Beta"
    );
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { defaultValue: "Beta" });

    // Clearing the options removes the select and shows the hint.
    setTextareaValue(optionsArea, "");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { options: [] });
    expect(view.container.textContent).toContain("Add options before selecting a default value.");
  } finally {
    view.cleanup();
  }

  const hintView = mount(
    <ControlledPanel
      initial={baseField({ type: "radio" })}
      allFields={[{ id: "field-1", name: "field", label: "Field" }]}
      onSettingsChange={vi.fn<SettingsHandler>()}
    />
  );
  try {
    expect(hintView.container.textContent).toContain(
      "Add options before selecting a default value."
    );
  } finally {
    hintView.cleanup();
  }
});

test("general tab: checkbox default state switch emits boolean defaultValue", () => {
  const onSettingsChange = vi.fn<SettingsHandler>();
  const view = mount(
    <ControlledPanel
      initial={baseField({ type: "checkbox" })}
      allFields={[{ id: "field-1", name: "field", label: "Field" }]}
      onSettingsChange={onSettingsChange}
    />
  );
  try {
    const defaultSwitch = view.container.querySelector('[role="switch"]') as HTMLElement | null;
    React.act(() => {
      defaultSwitch?.click();
    });
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { defaultValue: true });
  } finally {
    view.cleanup();
  }
});

test("general tab: number min/max and input increment write or clear their settings", () => {
  const onSettingsChange = vi.fn<SettingsHandler>();
  const view = mount(
    <ControlledPanel
      initial={baseField({
        type: "number",
        settings: { min: 1, max: 10, inputStep: 2 },
      })}
      allFields={[{ id: "field-1", name: "field", label: "Field" }]}
      onSettingsChange={onSettingsChange}
    />
  );
  try {
    const min = inputUnderLabel(view.container, "Minimum");
    setInputValue(min, "2");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { min: 2 });
    setInputValue(min, "  ");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { min: undefined });

    const max = inputUnderLabel(view.container, "Maximum");
    setInputValue(max, "25");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { max: 25 });

    const step = inputUnderLabel(view.container, "Input increment");
    setInputValue(step, "");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { inputStep: undefined });
  } finally {
    view.cleanup();
  }
});

test("general tab: form step clamps to 1..10 and pattern writes through", () => {
  const onSettingsChange = vi.fn<SettingsHandler>();
  const view = mount(
    <ControlledPanel
      initial={baseField({ type: "text" })}
      allFields={[{ id: "field-1", name: "field", label: "Field" }]}
      onSettingsChange={onSettingsChange}
    />
  );
  try {
    const stepInput = inputUnderLabel(view.container, "Step number");
    setInputValue(stepInput, "11");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { formStep: 10 });
    setInputValue(stepInput, "abc");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { formStep: 1 });

    const pattern = inputUnderLabel(view.container, "Regex Pattern");
    setInputValue(pattern, "^[A-Z]+$");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { pattern: "^[A-Z]+$" });
  } finally {
    view.cleanup();
  }
});

test("duplicate field button invokes onDuplicate with the field id", () => {
  const onDuplicate = vi.fn();
  const view = mount(
    <FieldSettingsPanel
      field={baseField({ type: "text", label: "Email" })}
      allFields={[{ id: "field-1", name: "field", label: "Field" }]}
      onChange={vi.fn()}
      onSettingsChange={vi.fn()}
      onDuplicate={onDuplicate}
    />
  );
  try {
    const duplicate = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Duplicate Field"
    ) as HTMLElement | null;
    React.act(() => {
      duplicate?.click();
    });
    expect(onDuplicate).toHaveBeenCalledWith("field-1");
  } finally {
    view.cleanup();
  }
});

test("empty field selection shows the idle placeholder", () => {
  const view = mount(
    <FieldSettingsPanel field={null} allFields={[]} onChange={vi.fn()} onSettingsChange={vi.fn()} />
  );
  try {
    expect(view.container.textContent).toContain("Select a field to configure.");
  } finally {
    view.cleanup();
  }
});

test("logic tab: operator -> field -> value chain, value drops on field-only ops", () => {
  const onSettingsChange = vi.fn<SettingsHandler>();
  const view = mount(
    <ControlledPanel
      initial={baseField({ type: "text", label: "Email" })}
      allFields={[
        { id: "field-1", name: "field", label: "Field" },
        { id: "field-2", name: "country", label: "Country" },
      ]}
      onSettingsChange={onSettingsChange}
    />
  );
  try {
    clickTab(view.container, "Logic");

    const operator = findSelectByOptions(view.container, OPERATOR_OPTIONS);
    expect(operator).not.toBeNull();
    setSelectValue(operator, "equals");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", {
      logic: { operator: "equals", field: "", value: "" },
    });

    // Radix bubbles an empty placeholder option while the value is unset.
    const dependent = findSelectByOptions(view.container, ["", "country"]);
    expect(dependent).not.toBeNull();
    setSelectValue(dependent, "country");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", {
      logic: { operator: "equals", field: "country", value: "" },
    });

    const match = Array.from(view.container.querySelectorAll("input")).find(
      (input) => input.getAttribute("placeholder") === "Value to match"
    );
    setInputValue(match, "PL");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", {
      logic: { operator: "equals", field: "country", value: "PL" },
    });

    // Field-only operator drops the value and hides the value input.
    setSelectValue(operator, "not_exists");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", {
      logic: { operator: "not_exists", field: "country" },
    });
    expect(view.container.textContent).not.toContain("Match value");

    // Back to a value operator: value resets to "".
    setSelectValue(operator, "equals");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", {
      logic: { operator: "equals", field: "country", value: "" },
    });
    expect(view.container.textContent).toContain("Match value");

    // Always drops the dependent field editor AND the emitted patch (the
    // always branch of createLogicPatch returns operator-only).
    setSelectValue(operator, "always");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", {
      logic: { operator: "always" },
    });
    expect(view.container.textContent).not.toContain("Dependent field");
  } finally {
    view.cleanup();
  }
});

test("logic tab: a configured field-only rule renders without a value input", () => {
  const view = mount(
    <ControlledPanel
      initial={baseField({
        type: "text",
        settings: { logic: { operator: "not_exists", field: "country" } },
      })}
      allFields={[
        { id: "field-1", name: "field", label: "Field" },
        { id: "field-2", name: "country", label: "Country" },
      ]}
      onSettingsChange={vi.fn<SettingsHandler>()}
    />
  );
  try {
    clickTab(view.container, "Logic");
    // The dependent field is already set -> no empty placeholder option.
    expect(findSelectByOptions(view.container, ["country"])).not.toBeNull();
    expect(view.container.textContent).not.toContain("Match value");
  } finally {
    view.cleanup();
  }
});

test("logic tab: with no other fields the dependent-field hint appears", () => {
  const onSettingsChange = vi.fn<SettingsHandler>();
  const view = mount(
    <ControlledPanel
      initial={baseField({ type: "text" })}
      allFields={[{ id: "field-1", name: "field", label: "Field" }]}
      onSettingsChange={onSettingsChange}
    />
  );
  try {
    clickTab(view.container, "Logic");
    setSelectValue(findSelectByOptions(view.container, OPERATOR_OPTIONS), "equals");
    expect(view.container.textContent).toContain(
      "Add at least one more field to create conditional visibility."
    );
  } finally {
    view.cleanup();
  }
});

test("style tab: width and label position emit a merged style patch", () => {
  const onSettingsChange = vi.fn<SettingsHandler>();
  const view = mount(
    <ControlledPanel
      initial={baseField({ type: "text" })}
      allFields={[{ id: "field-1", name: "field", label: "Field" }]}
      onSettingsChange={onSettingsChange}
    />
  );
  try {
    clickTab(view.container, "Style");
    setSelectValue(findSelectByOptions(view.container, ["full", "half"]), "half");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", { style: { width: "half" } });

    setSelectValue(findSelectByOptions(view.container, ["above", "inline", "hidden"]), "inline");
    expect(onSettingsChange).toHaveBeenLastCalledWith("field-1", {
      style: { width: "half", labelPosition: "inline" },
    });
  } finally {
    view.cleanup();
  }
});
