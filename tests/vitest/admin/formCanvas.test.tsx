// @vitest-environment happy-dom
//
// TASK-516-04: FormCanvas — canvas fidelity, field-preview fixes (B2/B3/B5),
// and whole-form theme application. Admin/UI render lane (Bun-free).
//
// Covers: real <select> preview (B2), real typed inputs date/time/number/tel/email
// (B3), rating scale not a slider (B5), theme container width / submit label / card
// presence, submit full-width + alignment precedence (516-01:155), card border-width
// token wiring, themed input size/radius + color vars plumbed into FieldPreview, the
// prototype-aligned un-themed default look, and columns/field-width precedence.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { FormCanvas } from "../../../core/admin/ui/forms/FormCanvas";
import type { FormFormTheme } from "../../../core/services/forms/formTheme";
import { FORM_COLOR_CONSUMER_CASES, buildFormColorTheme } from "../forms/formColorConsumerTable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type CanvasField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  settings: {
    placeholder?: string;
    options?: string[];
    defaultValue?: string | boolean;
    min?: number;
    max?: number;
    step?: number;
    style?: { width?: "full" | "half"; labelPosition?: "above" | "inline" | "hidden" };
  };
};

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

const renderCanvas = (
  fields: CanvasField[],
  extra: {
    theme?: FormFormTheme;
    deviceWidth?: "desktop" | "mobile";
    layoutMode?: "single" | "multi_step";
    stepTitles?: string[];
    selectedFieldId?: string | null;
  } = {}
) =>
  mount(
    <FormCanvas
      formTitle="Contact"
      formDescription="Say hello"
      layoutMode={extra.layoutMode ?? "single"}
      stepTitles={extra.stepTitles}
      formSelected={false}
      selectedFieldId={extra.selectedFieldId ?? null}
      theme={extra.theme}
      deviceWidth={extra.deviceWidth}
      fields={fields}
      onSelectField={() => undefined}
      onSelectForm={() => undefined}
      onRemoveField={() => undefined}
    />
  );

const card = (container: HTMLElement) =>
  container.querySelector('[data-slot="card"]') as HTMLElement;
const submitButton = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("button")).find(
    (button) => button.getAttribute("disabled") !== null && !button.getAttribute("aria-label")
  ) as HTMLButtonElement;

const field = (over: Partial<CanvasField> & { id: string; type: string }): CanvasField => ({
  label: over.label ?? "Field",
  required: false,
  settings: over.settings ?? {},
  ...over,
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("B2: select field renders a real <select> DOM node, not a text input", () => {
  const view = renderCanvas([
    field({
      id: "f-select",
      type: "select",
      label: "Plan",
      settings: { options: ["Basic", "Pro"] },
    }),
  ]);
  try {
    const select = view.container.querySelector("select");
    expect(select).not.toBeNull();
    expect(view.container.querySelector('input[type="text"]')).toBeNull();
    expect(Array.from(select?.querySelectorAll("option") ?? []).map((o) => o.textContent)).toEqual([
      "Basic",
      "Pro",
    ]);
  } finally {
    view.cleanup();
  }
});

test("B3: date/time/number/phone/email render real typed inputs", () => {
  const view = renderCanvas([
    field({ id: "f-date", type: "date" }),
    field({ id: "f-time", type: "time" }),
    field({ id: "f-number", type: "number", settings: { step: 5 } }),
    field({ id: "f-phone", type: "phone" }),
    field({ id: "f-email", type: "email" }),
  ]);
  try {
    expect(view.container.querySelector('input[type="date"]')).not.toBeNull();
    expect(view.container.querySelector('input[type="time"]')).not.toBeNull();
    expect(view.container.querySelector('input[type="number"]')).not.toBeNull();
    expect(view.container.querySelector('input[type="tel"]')).not.toBeNull();
    expect(view.container.querySelector('input[type="email"]')).not.toBeNull();
    expect(view.container.querySelector('input[type="number"]')?.getAttribute("step")).toBe("5");
  } finally {
    view.cleanup();
  }
});

test("B5: rating renders a scale of `max` items, not a range slider", () => {
  const view = renderCanvas([field({ id: "f-rating", type: "rating", settings: { max: 7 } })]);
  try {
    expect(view.container.querySelector('input[type="range"]')).toBeNull();
    const scale = view.container.querySelector('[aria-label="Rating scale of 7"]');
    expect(scale).not.toBeNull();
    expect(scale?.querySelectorAll("svg").length).toBe(7);
  } finally {
    view.cleanup();
  }
});

test("516-07: file field renders an attachment preview affordance", () => {
  const view = renderCanvas([
    field({
      id: "f-file",
      type: "file",
      label: "Resume",
      settings: { placeholder: "Upload your CV" },
    }),
  ]);
  try {
    // File preview is NOT a generic text input and shows the upload affordance.
    expect(view.container.querySelector('input[type="text"]')).toBeNull();
    expect(view.container.textContent).toContain("Upload your CV");
  } finally {
    view.cleanup();
  }
});

test("theme changes container width, submit label, and card presence", () => {
  const themed = renderCanvas([field({ id: "f", type: "text" })], {
    theme: { layout: { width: "lg" }, submit: { label: "Send it" } },
  });
  try {
    expect(themed.container.innerHTML).toContain("max-w-2xl");
    expect(themed.container.innerHTML).not.toContain("max-w-lg");
    expect(submitButton(themed.container).textContent).toBe("Send it");
  } finally {
    themed.cleanup();
  }

  const cardless = renderCanvas([field({ id: "f", type: "text" })], {
    theme: { surface: { card: false } },
  });
  try {
    expect(card(cardless.container).className).toContain("border-0");
    expect(card(cardless.container).className).toContain("bg-transparent");
  } finally {
    cardless.cleanup();
  }
});

test("submit full-width + alignment precedence (516-01:155)", () => {
  const right = renderCanvas([field({ id: "f", type: "text" })], {
    theme: { submit: { fullWidth: false }, layout: { buttonAlignment: "right" } },
  });
  try {
    const button = submitButton(right.container);
    expect(button.className).not.toContain("w-full");
    expect(button.className).toContain("ml-auto");
  } finally {
    right.cleanup();
  }

  const full = renderCanvas([field({ id: "f", type: "text" })], {
    theme: { submit: { fullWidth: false }, layout: { buttonAlignment: "full" } },
  });
  try {
    expect(submitButton(full.container).className).toContain("w-full");
  } finally {
    full.cleanup();
  }

  const untheme = renderCanvas([field({ id: "f", type: "text" })]);
  try {
    expect(submitButton(untheme.container).className).toContain("w-full");
  } finally {
    untheme.cleanup();
  }
});

test("card border-width token is wired, not hardcoded", () => {
  const base = renderCanvas([field({ id: "f", type: "text" })]);
  try {
    const cls = card(base.container).className;
    expect(cls).toContain("border");
    expect(cls).not.toContain("border-2");
    expect(cls).not.toContain("border-0");
  } finally {
    base.cleanup();
  }

  const md = renderCanvas([field({ id: "f", type: "text" })], {
    theme: { surface: { borderWidth: "md" } },
  });
  try {
    expect(card(md.container).className).toContain("border-2");
  } finally {
    md.cleanup();
  }

  const none = renderCanvas([field({ id: "f", type: "text" })], {
    theme: { surface: { borderWidth: "none" } },
  });
  try {
    expect(card(none.container).className).toContain("border-0");
  } finally {
    none.cleanup();
  }
});

test("themed input size/radius + color vars plumb through to FieldPreview", () => {
  const view = renderCanvas(
    [field({ id: "f-select", type: "select", settings: { options: ["A"] } })],
    {
      theme: {
        input: {
          size: "lg",
          radius: "none",
          background: "#ff0000",
          borderColor: "#00ff00",
          textColor: "#0000ff",
        },
        typography: { labelColor: "#112233" },
      },
    }
  );
  try {
    const select = view.container.querySelector("select") as HTMLSelectElement;
    expect(select.className).toContain("h-11");
    expect(select.className).toContain("text-base");
    expect(select.className).toContain("rounded-none");
    expect(select.className).toContain("bg-[var(--form-input-bg)]");
    expect(select.className).toContain("border-[color:var(--form-input-border)]");
    expect(select.className).toContain("text-[color:var(--form-input-text)]");

    const label = view.container.querySelector("label") as HTMLElement;
    expect(label.className).toContain("text-[color:var(--form-label)]");

    const style = card(view.container).getAttribute("style") ?? "";
    expect(style).toContain("--form-input-bg");
    expect(style).toContain("--form-input-border");
    expect(style).toContain("--form-input-text");
    expect(style).toContain("--form-label");
  } finally {
    view.cleanup();
  }
});

test("FormCanvas consumes every canonical Form color variable at its concrete render target", () => {
  const view = renderCanvas([field({ id: "f-color", type: "text" })], {
    theme: buildFormColorTheme("raw"),
  });
  try {
    const renderedCard = card(view.container);
    for (const entry of FORM_COLOR_CONSUMER_CASES) {
      expect(renderedCard.style.getPropertyValue(entry.cssVar).trim()).toBe(entry.canonical);
    }

    expect(renderedCard.className).toContain("bg-[var(--form-surface-bg)]");
    expect(renderedCard.className).toContain("border-[color:var(--form-border)]");
    expect(view.container.querySelector("h2")?.className).toContain(
      "text-[color:var(--form-title)]"
    );
    expect(view.container.querySelector("h2 + p")?.className).toContain(
      "text-[color:var(--form-helper)]"
    );
    expect(view.container.querySelector("label")?.className).toContain(
      "text-[color:var(--form-label)]"
    );
    const input = view.container.querySelector("label + input") as HTMLInputElement;
    expect(input.className).toContain("bg-[var(--form-input-bg)]");
    expect(input.className).toContain("border-[color:var(--form-input-border)]");
    expect(input.className).toContain("text-[color:var(--form-input-text)]");
    const submit = submitButton(view.container);
    expect(submit.className).toContain("bg-[var(--form-submit-bg)]");
    expect(submit.className).toContain("text-[color:var(--form-submit-text)]");
  } finally {
    view.cleanup();
  }
});

test("un-themed default look is prototype-aligned (snapshot regeneration)", () => {
  const view = renderCanvas([
    field({ id: "f-text", type: "text", label: "Name", settings: { style: { width: "half" } } }),
  ]);
  try {
    const html = view.container.innerHTML;
    // container width
    expect(html).toContain("max-w-lg");
    expect(html).not.toContain("max-w-2xl");
    // card padding/radius/shadow defaults (no p-8 / rounded-3xl / shadow-xl)
    const cardCls = card(view.container).className;
    expect(cardCls).toContain("p-6");
    expect(cardCls).not.toContain("p-8");
    expect(cardCls).not.toContain("rounded-3xl");
    expect(cardCls).not.toContain("shadow-xl");
    // single-column grid
    expect(html).toContain("grid-cols-1");
    expect(html).not.toContain("md:grid-cols-2");
    // title typography moved OFF text-2xl to the resolved prototype default
    const h2 = view.container.querySelector("h2") as HTMLElement;
    expect(h2.className).toContain("text-lg");
    expect(h2.className).toContain("font-display");
    expect(h2.className).not.toContain("text-2xl");
    // labels normal-case
    const label = view.container.querySelector("label") as HTMLElement;
    expect(label.className).not.toContain("uppercase");
    expect(label.className).not.toContain("tracking-[0.2em]");
    // submit label
    expect(submitButton(view.container).textContent).toBe("Submit");
  } finally {
    view.cleanup();
  }
});

test("field width overrides form columns (precedence: field width > form columns)", () => {
  const twoCol = renderCanvas(
    [field({ id: "f", type: "text", settings: { style: { width: "half" } } })],
    { theme: { layout: { columns: 2 } } }
  );
  try {
    expect(twoCol.container.innerHTML).toContain("md:col-span-1");
    expect(twoCol.container.innerHTML).toContain("md:grid-cols-2");
  } finally {
    twoCol.cleanup();
  }

  const oneCol = renderCanvas(
    [field({ id: "f", type: "text", settings: { style: { width: "half" } } })],
    { theme: { layout: { columns: 1 } } }
  );
  try {
    expect(oneCol.container.innerHTML).toContain("col-span-1");
    expect(oneCol.container.innerHTML).not.toContain("md:col-span-1");
    expect(oneCol.container.innerHTML).not.toContain("md:grid-cols-2");
  } finally {
    oneCol.cleanup();
  }
});

test("mobile deviceWidth collapses the grid to a single column", () => {
  const view = renderCanvas(
    [field({ id: "f", type: "text", settings: { style: { width: "half" } } })],
    { theme: { layout: { columns: 2 } }, deviceWidth: "mobile" }
  );
  try {
    expect(view.container.innerHTML).toContain("max-w-sm");
    expect(view.container.innerHTML).toContain("grid-cols-1");
    expect(view.container.innerHTML).not.toContain("md:grid-cols-2");
    expect(view.container.innerHTML).not.toContain("md:col-span-1");
  } finally {
    view.cleanup();
  }
});
