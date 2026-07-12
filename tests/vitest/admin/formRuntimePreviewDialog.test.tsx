// @vitest-environment happy-dom
//
// TASK-516-06: the admin Runtime Preview dialog applies the FULL resolved form
// theme via the SAME formTheme.ts maps the canvas (516-04) uses, so preview +
// canvas + public embed cannot drift. A themed preview shows the mapped container
// width + title typography (size/weight/color) + layout.columns grid + fieldGap +
// submit styling; an un-themed preview renders the theme DEFAULTS
// (resolveFormTheme(undefined) = FORM_THEME_DEFAULTS), i.e. parity with the canvas'
// un-themed look — not the legacy hardcoded preview styling.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

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
