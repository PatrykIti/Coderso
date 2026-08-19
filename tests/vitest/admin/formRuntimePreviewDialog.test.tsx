// @vitest-environment happy-dom
//
// TASK-516-06: the admin Runtime Preview dialog applies the FULL resolved form
// theme via the SAME formTheme.ts maps the canvas (516-04) uses, so preview +
// canvas + public embed cannot drift. A themed preview shows the mapped container
// width + title typography (size/weight/color) + layout.columns grid + fieldGap +
// submit styling; an un-themed preview renders the theme DEFAULTS
// (resolveFormTheme(undefined) = FORM_THEME_DEFAULTS), i.e. parity with the canvas'
// un-themed look — not the legacy hardcoded preview styling.

vi.mock("@/services/formsClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../core/admin/services/formsClient")>();
  return { ...actual, submitForm: vi.fn() };
});

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { FormRuntimePreviewDialog } from "../../../core/admin/ui/forms/FormRuntimePreviewDialog";
import type { FormSettings } from "../../../core/admin/services/formsClient";
import type { FormFormTheme } from "../../../core/services/forms/formTheme";
import { FORM_COLOR_CONSUMER_CASES, buildFormColorTheme } from "../forms/formColorConsumerTable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const baseSettings = (theme?: FormFormTheme): FormSettings => ({
  layoutMode: "single",
  saveProgress: false,
  stepTitles: [],
  preset: "custom",
  automationRetry: { enabled: false, maxAttempts: 1, baseDelayMs: 300, maxDelayMs: 2000 },
  ...(theme ? { theme } : {}),
});

const previewFields = [
  {
    id: "f1",
    type: "text",
    label: "Name",
    name: "name",
    required: true,
    settings: { helper: "Use your full name" },
  },
  {
    id: "f2",
    type: "text",
    label: "City",
    name: "city",
    required: false,
    settings: {} as Record<string, never>,
  },
];

const renderDialog = (settings: FormSettings) =>
  mount(
    <FormRuntimePreviewDialog
      open
      onOpenChange={() => {}}
      formId="form-1"
      formName="Contact"
      formDescription="Reach us"
      settings={settings}
      fields={previewFields}
      hasUnsavedChanges={false}
      onOpenLogs={() => {}}
    />
  );

afterEach(() => {
  document.body.innerHTML = "";
});

test("runtime preview exposes its visible explanation as the dialog description", () => {
  const { cleanup } = renderDialog(baseSettings());
  try {
    const dialog = document.body.querySelector('[role="dialog"]');
    const descriptionId = dialog?.getAttribute("aria-describedby");

    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId ?? "")?.textContent?.trim()).toBe(
      "Interactive preview for test submissions and automation verification."
    );
  } finally {
    cleanup();
  }
});

test("516-06: a themed preview applies width, title typography, columns, fieldGap and submit styling", () => {
  const { cleanup } = renderDialog(
    baseSettings({
      layout: { width: "full", columns: 2, fieldGap: "sm" },
      typography: { titleSize: "xl", titleWeight: "bold", titleColor: "#ff0000" },
      submit: { background: "#00ff00", radius: "xl", fullWidth: true, label: "Send it" },
    })
  );

  const html = document.body.innerHTML;
  // container width via formThemeWidthClass (full → max-w-none).
  expect(html).toContain("max-w-none");
  // title typography: size xl + weight bold + color var.
  expect(html).toContain("text-xl");
  expect(html).toContain("font-bold");
  expect(html).toContain("--form-title");
  expect(html).toContain("#ff0000");
  // the title node carries the title-color var class.
  expect(html).toContain("text-[color:var(--form-title)]");
  // layout.columns:2 grid class + fieldGap sm → gap-2 (theme map).
  expect(html).toContain("md:grid-cols-2");
  expect(html).toContain("gap-2");
  // submit: theme label + full width + xl radius + bg var.
  expect(html).toContain("Send it");
  expect(html).toContain("w-full");
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("--form-submit-bg");
  expect(html).toContain("#00ff00");
  expect(html).toContain("bg-[var(--form-submit-bg)]");

  cleanup();
});

test("runtime preview consumes all ten canonical Form colors at concrete elements", () => {
  const { cleanup } = renderDialog(baseSettings(buildFormColorTheme("raw")));
  try {
    const styleOwner = document.body.querySelector(
      '[style*="--form-surface-bg"]'
    ) as HTMLElement | null;
    expect(styleOwner).not.toBeNull();
    for (const entry of FORM_COLOR_CONSUMER_CASES) {
      expect(styleOwner?.style.getPropertyValue(entry.cssVar).trim()).toBe(entry.canonical);
    }

    expect(styleOwner?.querySelector("h3")?.className).toContain("text-[color:var(--form-title)]");
    expect(styleOwner?.querySelector("h3 + p")?.className).toContain(
      "text-[color:var(--form-helper)]"
    );
    expect(styleOwner?.querySelector('label[for="runtime-field-f1"]')?.className).toContain(
      "text-[color:var(--form-label)]"
    );
    const input = styleOwner?.querySelector("#runtime-field-f1") as HTMLInputElement | null;
    expect(input?.className).toContain("bg-[var(--form-input-bg)]");
    expect(input?.className).toContain("border-[color:var(--form-input-border)]");
    expect(input?.className).toContain("text-[color:var(--form-input-text)]");
    const helper = Array.from(styleOwner?.querySelectorAll("p") ?? []).find(
      (node) => node.textContent === "Use your full name"
    );
    expect(helper?.className).toContain("text-[color:var(--form-helper)]");
    const submit = Array.from(styleOwner?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent?.trim() === "Submit preview"
    );
    expect(submit?.className).toContain("bg-[var(--form-submit-bg)]");
    expect(submit?.className).toContain("text-[color:var(--form-submit-text)]");
  } finally {
    cleanup();
  }
});

test("516-06: a columns:1 themed preview collapses the grid to a single column", () => {
  const { cleanup } = renderDialog(baseSettings({ layout: { columns: 1 } }));

  const html = document.body.innerHTML;
  expect(html).toContain("grid-cols-1");
  expect(html).not.toContain("md:grid-cols-2");

  cleanup();
});

test("516-06: an un-themed preview renders the resolveFormTheme DEFAULTS (canvas parity)", () => {
  const { cleanup } = renderDialog(baseSettings());

  const html = document.body.innerHTML;
  // FORM_THEME_DEFAULTS: width md → max-w-lg, columns 1 → grid-cols-1,
  // title lg/semibold/font-display, card padding lg → p-6, radius xl → rounded-2xl.
  expect(html).toContain("max-w-lg");
  expect(html).toContain("grid-cols-1");
  expect(html).toContain("text-lg");
  expect(html).toContain("font-semibold");
  expect(html).toContain("font-display");
  expect(html).toContain("p-6");
  // no author color-var classes leak into the un-themed preview.
  expect(html).not.toContain("text-[color:var(--form-title)]");
  expect(html).not.toContain("bg-[var(--form-submit-bg)]");

  cleanup();
});

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButtonByText = (root: HTMLElement, text: string) => {
  const button = Array.from(root.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  expect(button, `missing button ${text}`).toBeTruthy();
  React.act(() => {
    (button as HTMLButtonElement).click();
  });
};

const interactiveFields = [
  {
    id: "c1",
    type: "checkbox",
    label: "Subscribe",
    name: "subscribe",
    required: false,
    settings: {},
  },
  {
    id: "t1",
    type: "textarea",
    label: "Message",
    name: "message",
    required: false,
    settings: { placeholder: "Tell us more" },
  },
  {
    id: "s1",
    type: "select",
    label: "Topic",
    name: "topic",
    required: false,
    settings: { options: ["Support", "Sales"] },
  },
  {
    id: "h1",
    type: "hidden",
    label: "Source",
    name: "source",
    required: false,
    settings: { defaultValue: "preview" },
  },
];

const renderInteractiveDialog = (settings: FormSettings, fields: typeof interactiveFields) =>
  mount(
    <FormRuntimePreviewDialog
      open
      onOpenChange={() => {}}
      formId="form-1"
      formName="Contact"
      formDescription="Reach us"
      settings={settings}
      fields={fields}
      hasUnsavedChanges={false}
      onOpenLogs={() => {}}
    />
  );

test("checkbox, textarea and select interactions feed the submitted payload", async () => {
  const { submitForm } = await import("../../../core/admin/services/formsClient");
  vi.mocked(submitForm).mockResolvedValue({
    id: "sub-1",
    formId: "form-1",
    payload: {},
    status: "accepted",
    createdAt: new Date().toISOString(),
    ip: null,
    userAgent: null,
    runtime: { successMessage: "Test accepted", redirectUrl: null },
  });

  const { cleanup } = renderInteractiveDialog(baseSettings(), interactiveFields);
  try {
    const checkbox = document.querySelector(
      'input[type="checkbox"][id="runtime-field-c1"]'
    ) as HTMLInputElement | null;
    React.act(() => {
      checkbox?.click();
    });
    expect(checkbox?.checked).toBe(true);

    const message = document.querySelector("textarea#runtime-field-t1");
    setTextareaValue(message, "Hello team");

    const topic = document.querySelector("select#runtime-field-s1") as HTMLSelectElement | null;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    React.act(() => {
      descriptor?.set?.call(topic, "Sales");
      topic?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    clickButtonByText(document.body, "Submit preview");
    // Drain the submit promise chain inside act (same pattern as the shared
    // formsWave fixtures' flush) so the post-resolution state updates are
    // captured and no act warning escapes.
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(vi.mocked(submitForm)).toHaveBeenCalledWith("form-1", {
      subscribe: true,
      message: "Hello team",
      topic: "Sales",
      source: "preview",
    });
    expect(document.body.textContent).toContain("Submission completed");
    expect(document.body.textContent).toContain("Test accepted");
  } finally {
    cleanup();
    vi.mocked(submitForm).mockReset();
  }
});

test("a generic submit failure surfaces the fallback message", async () => {
  const { submitForm } = await import("../../../core/admin/services/formsClient");
  vi.mocked(submitForm).mockRejectedValue(new Error("boom"));

  const { cleanup } = renderInteractiveDialog(baseSettings(), interactiveFields);
  try {
    clickButtonByText(document.body, "Submit preview");
    // Drain the submit promise chain inside act (same pattern as the shared
    // formsWave fixtures' flush) so the post-resolution state updates are
    // captured and no act warning escapes.
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain("Preview submit failed");
    expect(document.body.textContent).toContain("Failed to submit preview payload.");
  } finally {
    cleanup();
    vi.mocked(submitForm).mockReset();
  }
});

test("an ApiClientError submit failure surfaces the machine-readable message", async () => {
  const { submitForm } = await import("../../../core/admin/services/formsClient");
  const { ApiClientError } = await import("../../../core/admin/services/apiClient");
  vi.mocked(submitForm).mockRejectedValue(
    new ApiClientError("forms_submit_rejected", "Payload rejected", 422)
  );

  const { cleanup } = renderInteractiveDialog(baseSettings(), interactiveFields);
  try {
    clickButtonByText(document.body, "Submit preview");
    // Drain the submit promise chain inside act (same pattern as the shared
    // formsWave fixtures' flush) so the post-resolution state updates are
    // captured and no act warning escapes.
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain("Preview submit failed");
    expect(document.body.textContent).toContain("Payload rejected");
  } finally {
    cleanup();
    vi.mocked(submitForm).mockReset();
  }
});

const ResetHarness = () => {
  const [isOpen, setIsOpen] = React.useState(true);
  return (
    <div>
      <button data-reopen onClick={() => setIsOpen(true)}>
        Reopen
      </button>
      <FormRuntimePreviewDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        formId="form-1"
        formName="Contact"
        formDescription="Reach us"
        settings={baseSettings()}
        fields={interactiveFields}
        hasUnsavedChanges={false}
        onOpenLogs={() => {}}
      />
    </div>
  );
};

test("closing the preview resets values, error and result for the next run", async () => {
  const { submitForm } = await import("../../../core/admin/services/formsClient");
  vi.mocked(submitForm).mockRejectedValue(new Error("boom"));

  const view = mount(<ResetHarness />);
  try {
    const checkbox = document.querySelector(
      'input[type="checkbox"][id="runtime-field-c1"]'
    ) as HTMLInputElement | null;
    React.act(() => {
      checkbox?.click();
    });
    setTextareaValue(document.querySelector("textarea#runtime-field-t1"), "Draft message");
    clickButtonByText(document.body, "Submit preview");
    // Drain the submit promise chain inside act (same pattern as the shared
    // formsWave fixtures' flush) so the post-resolution state updates are
    // captured and no act warning escapes.
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("Failed to submit preview payload.");
    expect(document.body.textContent).toContain("Draft message");

    // Escape triggers onOpenChange(false) -> handleOpenChange resets internal state.
    React.act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
      );
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    // Reopen: the next run starts clean (no error, default values).
    clickButtonByText(document.body, "Reopen");
    const reopenedCheckbox = document.querySelector(
      'input[type="checkbox"][id="runtime-field-c1"]'
    ) as HTMLInputElement | null;
    expect(reopenedCheckbox?.checked).toBe(false);
    expect(
      (document.querySelector("textarea#runtime-field-t1") as HTMLTextAreaElement | null)?.value
    ).toBe("");
    expect(document.body.textContent).not.toContain("Failed to submit preview payload.");
    expect(document.body.textContent).not.toContain("Draft message");
  } finally {
    view.cleanup();
  }
});
