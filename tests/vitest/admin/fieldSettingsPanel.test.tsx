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
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
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
