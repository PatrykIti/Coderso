// @vitest-environment happy-dom

// TASK-479-15-L02 / L04: locks the Forms BUILDER restyle. Proves the three
// EditorShell regions (Fields/Library rail, canvas preview, inspector) are
// wired, the public-write `submissionAccess` control is still rendered by
// FormSettingsPanel, and add-field + Save still call the real client writes
// (restyle is presentation-only).

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

const builderState = vi.hoisted(() => {
  const form = {
    id: "form-1",
    name: "Contact",
    slug: "contact",
    status: "draft" as const,
    description: "Lead form",
    successMessage: "Thanks!",
    successRedirectUrl: null,
    submissionAccess: "public" as const,
    settings: {
      layoutMode: "single" as const,
      saveProgress: false,
      stepTitles: [],
      preset: "custom" as const,
      automationRetry: { enabled: false, maxAttempts: 1, baseDelayMs: 300, maxDelayMs: 2000 },
    },
    createdAt: "2026-03-06T10:00:00.000Z",
    updatedAt: "2026-03-06T10:00:00.000Z",
  };
  const field = {
    id: "field-1",
    type: "text",
    label: "Full name",
    name: "full_name",
    required: true,
    orderIndex: 0,
    settings: { placeholder: "Jane Doe", step: 1 },
  };
  return {
    form,
    field,
    detail: { form, fields: [field] },
    actions: [] as Array<Record<string, unknown>>,
    contentTypes: [{ id: "articles", name: "Articles" }],
    updateFormCalls: [] as Array<{ id: string; input: Record<string, unknown> }>,
    updateFieldsCalls: [] as Array<{ id: string; fields: Array<Record<string, unknown>> }>,
    updateActionsCalls: [] as Array<{ id: string; actions: Array<Record<string, unknown>> }>,
    reset() {
      this.updateFormCalls = [];
      this.updateFieldsCalls = [];
      this.updateActionsCalls = [];
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

// Native select so the real FormSettingsPanel (test 2) renders its
// submissionAccess options as <option>s.
vi.mock("@/components/ui/select", () => {
  const flatten = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) =>
        typeof child === "string" || typeof child === "number"
          ? String(child)
          : React.isValidElement(child)
            ? flatten(child.props.children)
            : ""
      )
      .join("");
  const options = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flatten(child.props.children) }];
      }
      return options(child.props.children);
    });
  return {
    Select: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {options(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  };
});

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    formDetail: (id: string) => `formDetail:${id}`,
    formActions: (id: string) => `formActions:${id}`,
  },
}));

vi.mock("@/services/contentTypesClient", () => ({
  listContentTypesCached: vi.fn(async () => builderState.contentTypes),
  getCachedContentTypes: () => builderState.contentTypes,
}));

vi.mock("@/services/formsClient", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/services/formsClient");
  return {
    ...actual,
    getCachedFormDetail: () => builderState.detail,
    getCachedFormActions: () => builderState.actions,
    getFormDetailCached: vi.fn(async () => builderState.detail),
    listFormActionsCached: vi.fn(async () => builderState.actions),
    updateForm: vi.fn(async (id: string, input: Record<string, unknown>) => {
      builderState.updateFormCalls.push({ id, input });
      return { ...builderState.form, ...input };
    }),
    updateFormFields: vi.fn(async (id: string, fields: Array<Record<string, unknown>>) => {
      builderState.updateFieldsCalls.push({ id, fields });
      return fields.map((field, index) => ({
        id: field.id ?? `field-${index + 1}`,
        type: field.type,
        label: field.label,
        name: field.name,
        required: field.required ?? false,
        orderIndex: field.orderIndex ?? index,
        settings: field.settings ?? {},
      }));
    }),
    updateFormActions: vi.fn(async (id: string, actions: Array<Record<string, unknown>>) => {
      builderState.updateActionsCalls.push({ id, actions });
      return [];
    }),
  };
});

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: vi.fn() }),
}));

// EditorShell passthrough exposes the three regions so we never mount the heavy
// real AdminShell. The regions test asserts these are wired.
vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    children,
    leftPanel,
    rightPanel,
    topbarActions,
  }: {
    children: React.ReactNode;
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    topbarActions?: React.ReactNode;
  }) => (
    <div>
      <div data-region="topbar">{topbarActions}</div>
      <aside data-region="left">{leftPanel}</aside>
      <main data-region="canvas">{children}</main>
      <aside data-region="right">{rightPanel}</aside>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FieldLibrary", () => ({
  FieldLibrary: ({
    onAddField,
  }: {
    onAddField: (item: { id: string; label: string; type: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onAddField({ id: "text", label: "Text Input", type: "text" })}
    >
      add-library-field
    </button>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FieldListPanel", () => ({
  FieldListPanel: ({ fields }: { fields: Array<{ id: string }> }) => (
    <div>{`field-list:${fields.length}`}</div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FormCanvas", () => ({
  FormCanvas: ({ fields }: { fields: Array<{ id: string }> }) => (
    <div>{`canvas:${fields.length}`}</div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FieldSettingsPanel", () => ({
  FieldSettingsPanel: () => <div>field-settings-panel</div>,
}));

vi.mock("../../../core/admin/ui/forms/FormSettingsPanel", () => ({
  FormSettingsPanel: () => <div>form-settings-panel</div>,
}));

vi.mock("../../../core/admin/ui/forms/FormActionsPanel", () => ({
  FormActionsPanel: () => <div>form-actions-panel</div>,
}));

vi.mock("../../../core/admin/ui/forms/FormRuntimePreviewDialog", () => ({
  FormRuntimePreviewDialog: () => <div data-testid="runtime-preview" />,
}));

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
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) throw new Error(`Missing button: ${text}`);
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  builderState.reset();
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/");
});

test("renders the Fields/Library rail + canvas preview + inspector", async () => {
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");
  const view = mount(<FormBuilderPage />);
  try {
    await flush();
    // Left rail wires the Fields list + Library.
    expect(view.container.querySelector('[data-region="left"]')?.textContent).toContain(
      "field-list:1"
    );
    expect(view.container.textContent).toContain("add-library-field");
    // Center region wires the live canvas preview.
    expect(view.container.querySelector('[data-region="canvas"]')?.textContent).toContain(
      "canvas:1"
    );
    // Right region wires the inspector (first field selected on load).
    expect(view.container.querySelector('[data-region="right"]')?.textContent).toContain(
      "field-settings-panel"
    );
  } finally {
    view.cleanup();
  }
});

test("submissionAccess control renders (FormSettingsPanel direct)", async () => {
  // Bypass the file-wide FormSettingsPanel mock to exercise the REAL panel.
  const { FormSettingsPanel } = await vi.importActual<
    typeof import("../../../core/admin/ui/forms/FormSettingsPanel")
  >("../../../core/admin/ui/forms/FormSettingsPanel");

  const html = renderToString(
    <FormSettingsPanel
      name="Contact"
      description="Lead form"
      status="draft"
      submissionAccess="public"
      successMessage=""
      successRedirectUrl=""
      settings={builderState.form.settings}
      presetOptions={[{ id: "custom", label: "Custom", description: "Custom" }]}
      stepCount={1}
      onNameChange={() => undefined}
      onDescriptionChange={() => undefined}
      onStatusChange={() => undefined}
      onSubmissionAccessChange={() => undefined}
      onSuccessMessageChange={() => undefined}
      onSuccessRedirectUrlChange={() => undefined}
      onSettingsChange={() => undefined}
      onAutomationRetryChange={() => undefined}
      onStepTitlesChange={() => undefined}
      onApplyPreset={() => undefined}
    />
  );

  expect(html).toContain("Submission Access");
  expect(html).toContain("Access mode");
  // public | internal options are present.
  expect(html).toContain("Public (recommended)");
  expect(html).toContain("Internal (auth or API key)");
});

test("add-field + Save call the client writes", async () => {
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");
  const view = mount(<FormBuilderPage />);
  try {
    await flush();

    clickByText(view.container, "add-library-field");
    await flush();
    expect(view.container.textContent).toContain("canvas:2");
    expect(view.container.textContent).toContain("Unsaved changes");

    clickByText(view.container, "Save form");
    await flush();

    expect(builderState.updateFormCalls[0]?.id).toBe("form-1");
    expect(builderState.updateFieldsCalls[0]?.id).toBe("form-1");
    expect(builderState.updateFieldsCalls[0]?.fields.length).toBeGreaterThan(1);
    expect(builderState.updateActionsCalls[0]?.id).toBe("form-1");
  } finally {
    view.cleanup();
  }
});
