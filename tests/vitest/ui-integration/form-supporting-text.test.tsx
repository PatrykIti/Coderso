// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

import { FormCanvas } from "../../../core/admin/ui/forms/FormCanvas";
import { FormDesignPanel } from "../../../core/admin/ui/forms/FormDesignPanel";
import { FormRuntimePreviewDialog } from "../../../core/admin/ui/forms/FormRuntimePreviewDialog";
import type { FormSettings } from "../../../core/admin/services/formsClient";
import { FORM_SCHEMA_LIMITS } from "../../../core/services/forms/formSettings";
import type { FormFormTheme } from "../../../core/services/forms/formTheme";
import { FormEmbedBlock } from "../../../core/services/renderContracts/formEmbedRenderer";
import type { FormEmbedData } from "../../../core/services/renderContracts/formEmbedContract";
import {
  PROJECT_BRIEF_INITIAL_NOTE,
  PROJECT_BRIEF_LOADING_LABEL,
  PROJECT_BRIEF_SUCCESS_MESSAGE,
} from "../../../scripts/projekty-domow/content/projectForm";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => root.render(node));
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const setTextAreaValue = (element: HTMLTextAreaElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const settingsWithTheme = (theme?: FormFormTheme): FormSettings => ({
  layoutMode: "single",
  saveProgress: false,
  stepTitles: [],
  preset: "custom",
  automationRetry: { enabled: false, maxAttempts: 1, baseDelayMs: 300, maxDelayMs: 2_000 },
  ...(theme ? { theme } : {}),
});

const runtimeFields = [
  {
    id: "name-field",
    type: "text",
    label: "Imię i nazwisko",
    name: "name",
    required: false,
    settings: { placeholder: "Jan Kowalski" },
  },
  {
    id: "stage-field",
    type: "select",
    label: "Na jakim jesteś etapie?",
    name: "stage",
    required: true,
    settings: {
      options: [
        "Mam działkę",
        "Szukam działki",
        "Mam gotowy projekt do adaptacji",
        "Chcę tylko konsultację",
      ],
    },
  },
  {
    id: "message-field",
    type: "textarea",
    label: "Krótki opis",
    name: "message",
    required: false,
    settings: { placeholder: "Napisz, jaki dom Ci się marzy." },
  },
] satisfies NonNullable<FormEmbedData["resolved"]>["fields"];

const embedData = (input?: {
  supportingText?: string;
  successBehavior?: "show-message-hide-form" | "show-message-keep-form";
  presentation?: boolean;
}): FormEmbedData => ({
  formId: "project-brief-id",
  title: "Zacznij projekt",
  successMessage: PROJECT_BRIEF_SUCCESS_MESSAGE,
  ...(input?.presentation ? { fields: { textareaRows: 5, showSelectPrompt: false } } : {}),
  submitBehavior: {
    loadingLabel: input?.presentation ? PROJECT_BRIEF_LOADING_LABEL : "Sending...",
    successBehavior: input?.successBehavior ?? "show-message-hide-form",
  },
  resolved: {
    formId: "project-brief-id",
    formName: "Zacznij projekt",
    description: null,
    status: "published",
    successMessage: PROJECT_BRIEF_SUCCESS_MESSAGE,
    successRedirectUrl: null,
    submissionAccess: "public",
    submissionNonce: "nonce-project-brief",
    settings: {
      layoutMode: "single",
      saveProgress: false,
      ...(input?.supportingText
        ? {
            theme: {
              submit: {
                label: "Wyślij brief",
                supportingText: input.supportingText,
              },
            },
          }
        : {}),
    },
    fields: runtimeFields,
  },
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  const runtimeWindow = window as typeof window & {
    __nextlessFormRuntimeClient?: boolean;
    __nextlessFormRuntimeBind?: () => void;
  };
  delete runtimeWindow.__nextlessFormRuntimeClient;
  delete runtimeWindow.__nextlessFormRuntimeBind;
});

test("Form Design authors and clears one complete submit-group replacement", () => {
  const onThemeChange = vi.fn();
  const theme: FormFormTheme = {
    submit: {
      label: "Wyślij brief",
      fullWidth: false,
      radius: "xl",
      supportingText: PROJECT_BRIEF_INITIAL_NOTE,
    },
  };
  const view = mount(<FormDesignPanel theme={theme} onThemeChange={onThemeChange} />);
  try {
    const textarea = view.container.querySelector(
      '[aria-label="Submit supporting text"]'
    ) as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(FORM_SCHEMA_LIMITS.submitSupportingText);
    expect(textarea.dataset.formThemeControl).toBe("submit.supportingText");
    React.act(() => setTextAreaValue(textarea, "Nowa informacja"));
    expect(onThemeChange).toHaveBeenNthCalledWith(1, {
      submit: {
        label: "Wyślij brief",
        fullWidth: false,
        radius: "xl",
        supportingText: "Nowa informacja",
      },
    });

    const reset = view.container.querySelector(
      '[aria-label="Reset submit supporting text"]'
    ) as HTMLButtonElement;
    React.act(() => reset.click());
    expect(onThemeChange).toHaveBeenNthCalledWith(2, {
      submit: { label: "Wyślij brief", fullWidth: false, radius: "xl" },
    });
  } finally {
    view.cleanup();
  }

  const clearOnly = vi.fn();
  const only = mount(
    <FormDesignPanel
      theme={{ submit: { supportingText: PROJECT_BRIEF_INITIAL_NOTE } }}
      onThemeChange={clearOnly}
    />
  );
  try {
    React.act(() =>
      (
        only.container.querySelector(
          '[aria-label="Reset submit supporting text"]'
        ) as HTMLButtonElement
      ).click()
    );
    expect(clearOnly).toHaveBeenCalledWith({ submit: undefined });
  } finally {
    only.cleanup();
  }
});

test("Canvas and Runtime Preview render supporting text once after their submit row", () => {
  const theme: FormFormTheme = {
    submit: { label: "Wyślij brief", supportingText: PROJECT_BRIEF_INITIAL_NOTE },
  };
  const canvas = mount(
    <FormCanvas
      formTitle="Zacznij projekt"
      formSelected={false}
      selectedFieldId={null}
      theme={theme}
      fields={[]}
      onSelectField={() => undefined}
      onSelectForm={() => undefined}
      onRemoveField={() => undefined}
    />
  );
  try {
    const notes = canvas.container.querySelectorAll('[data-form-submit-supporting-text="true"]');
    expect(notes).toHaveLength(1);
    expect(notes[0]?.textContent).toBe(PROJECT_BRIEF_INITIAL_NOTE);
    expect(notes[0]?.previousElementSibling?.querySelector("button")?.textContent).toBe(
      "Wyślij brief"
    );
  } finally {
    canvas.cleanup();
  }

  const preview = mount(
    <FormRuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      formId="project-brief-id"
      formName="Zacznij projekt"
      formDescription=""
      settings={settingsWithTheme(theme)}
      fields={[]}
      hasUnsavedChanges={false}
      onOpenLogs={() => undefined}
    />
  );
  try {
    const notes = document.body.querySelectorAll('[data-form-submit-supporting-text="true"]');
    expect(notes).toHaveLength(1);
    expect(notes[0]?.textContent).toBe(PROJECT_BRIEF_INITIAL_NOTE);
    expect(notes[0]?.previousElementSibling?.querySelector("button")?.textContent).toBe(
      "Wyślij brief"
    );
  } finally {
    preview.cleanup();
  }

  const absent = mount(
    <FormCanvas
      formTitle="Zacznij projekt"
      formSelected={false}
      selectedFieldId={null}
      fields={[]}
      onSelectField={() => undefined}
      onSelectForm={() => undefined}
      onRemoveField={() => undefined}
    />
  );
  try {
    expect(absent.container.querySelectorAll("[data-form-submit-supporting-text]")).toHaveLength(0);
  } finally {
    absent.cleanup();
  }
});

test("public Form Embed owns exact placement, rows, select prompt and loading label", () => {
  const markup = renderToStaticMarkup(
    <FormEmbedBlock
      data={embedData({
        supportingText: PROJECT_BRIEF_INITIAL_NOTE,
        successBehavior: "show-message-keep-form",
        presentation: true,
      })}
      variant="standard"
    />
  );
  const host = document.createElement("div");
  host.innerHTML = markup;
  const note = host.querySelector('[data-form-submit-supporting-text="true"]');
  expect(host.querySelectorAll('[data-form-submit-supporting-text="true"]')).toHaveLength(1);
  expect(host.querySelectorAll('[data-form-embed-success="true"]')).toHaveLength(1);
  expect(note?.getAttribute("data-form-embed-success")).toBe("true");
  expect(note?.getAttribute("aria-live")).toBe("polite");
  expect(note?.hasAttribute("role")).toBe(false);
  expect(note?.previousElementSibling?.querySelector('[data-form-submit="1"]')).not.toBeNull();
  expect(note?.parentElement?.dataset.formEmbedFormBody).toBe("true");

  expect(host.querySelector("textarea")?.getAttribute("rows")).toBe("5");
  expect(
    Array.from(host.querySelectorAll("select option"), (option) => option.textContent)
  ).toEqual([
    "Mam działkę",
    "Szukam działki",
    "Mam gotowy projekt do adaptacji",
    "Chcę tylko konsultację",
  ]);
  expect(host.textContent).not.toContain("Select an option");
  expect(host.querySelector("form")?.dataset.formLoadingLabel).toBe(PROJECT_BRIEF_LOADING_LABEL);

  const legacyHost = document.createElement("div");
  legacyHost.innerHTML = renderToStaticMarkup(
    <FormEmbedBlock data={embedData()} variant="standard" />
  );
  expect(legacyHost.querySelector("textarea")?.getAttribute("rows")).toBe("4");
  expect(legacyHost.textContent).toContain("Select an option");
  expect(legacyHost.querySelectorAll("[data-form-submit-supporting-text]")).toHaveLength(0);
});

test("supporting text remains inert escaped React text", () => {
  const hostile = '<img src=x onerror="window.pwned=true"><script>window.pwned=true</script>';
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    <FormEmbedBlock
      data={embedData({ supportingText: hostile, successBehavior: "show-message-keep-form" })}
      variant="standard"
    />
  );
  const note = host.querySelector('[data-form-submit-supporting-text="true"]');
  expect(note?.textContent).toBe(hostile);
  expect(note?.querySelector("img,script")).toBeNull();
});

test("keep-form success mutates the sole live supporting-text node without hiding controls", async () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  host.innerHTML = renderToStaticMarkup(
    <FormEmbedBlock
      data={embedData({
        supportingText: PROJECT_BRIEF_INITIAL_NOTE,
        successBehavior: "show-message-keep-form",
        presentation: true,
      })}
      variant="standard"
    />
  );
  const runtimeScript = host.querySelector("script")?.textContent;
  if (!runtimeScript) throw new Error("form_runtime_script_missing");
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ runtime: { successMessage: PROJECT_BRIEF_SUCCESS_MESSAGE } }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    )
  );

  eval(runtimeScript);
  await Promise.resolve();
  const form = host.querySelector("form") as HTMLFormElement;
  const stage = form.querySelector('select[name="stage"]') as HTMLSelectElement;
  stage.value = "Mam działkę";
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();
  expect(host.querySelector('[data-form-embed-success="true"]')?.textContent).toBe(
    PROJECT_BRIEF_SUCCESS_MESSAGE
  );
  const successNodes = host.querySelectorAll('[data-form-embed-success="true"]');
  expect(successNodes).toHaveLength(1);
  const success = successNodes[0]!;
  expect(success.getAttribute("aria-live")).toBe("polite");
  expect(success.hasAttribute("role")).toBe(false);
  expect(
    form.querySelector('[data-form-embed-form-body="true"]')?.classList.contains("hidden")
  ).toBe(false);
  expect((form.querySelector('[data-form-submit="1"]') as HTMLButtonElement).hidden).toBe(false);
  host.remove();
});
