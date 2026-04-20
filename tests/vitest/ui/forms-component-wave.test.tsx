// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

const formsRuntimeState = vi.hoisted(() => ({
  submitForm: vi.fn(async () => ({
    id: "submission-1",
    formId: "form-1",
    payload: { full_name: "Jane Doe" },
    status: "success",
    createdAt: "2026-03-06T12:00:00.000Z",
    ip: null,
    userAgent: null,
    runtime: {
      successMessage: "Thanks!",
      redirectUrl: "/thank-you",
    },
  })),
  reset() {
    formsRuntimeState.submitForm.mockReset();
    formsRuntimeState.submitForm.mockResolvedValue({
      id: "submission-1",
      formId: "form-1",
      payload: { full_name: "Jane Doe" },
      status: "success",
      createdAt: "2026-03-06T12:00:00.000Z",
      ip: null,
      userAgent: null,
      runtime: {
        successMessage: "Thanks!",
        redirectUrl: "/thank-you",
      },
    });
  },
}));

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
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
    [key: string]: unknown;
  }) =>
    asChild ? (
      <span>{children}</span>
    ) : (
      <button type="button" onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-dialog-open={String(Boolean(open))} data-has-open-change={String(Boolean(onOpenChange))}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    asChild,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    asChild?: boolean;
    disabled?: boolean;
  }) =>
    asChild ? (
      <span>{children}</span>
    ) : (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") {
          return String(child);
        }
        if (React.isValidElement(child)) {
          return flattenText(child.props.children);
        }
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [
          {
            value: child.props.value,
            label: flattenText(child.props.children),
          },
        ];
      }
      return collectOptions(child.props.children);
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
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  };
});

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-sheet-open={String(Boolean(open))} data-has-open-change={String(Boolean(onOpenChange))}>
      {children}
    </div>
  ),
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    colSpan,
    className,
  }: {
    children: React.ReactNode;
    colSpan?: number;
    className?: string;
  }) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    [key: string]: unknown;
  }) => <textarea defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/formsClient", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@/services/formsClient"
  );
  return {
    ...actual,
    submitForm: formsRuntimeState.submitForm,
  };
});

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

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) =>
    values.filter(Boolean).join(" "),
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

afterEach(() => {
  formsRuntimeState.reset();
});

test("FormCreateDrawer auto-generates slugs and submits normalized payloads", async () => {
  const { FormCreateDrawer } = await import(
    "../../../core/admin/ui/forms/FormCreateDrawer"
  );

  const onOpenChange = vi.fn();
  const onCreate = vi.fn();
  const view = mount(
    <FormCreateDrawer
      open
      onOpenChange={onOpenChange}
      onCreate={onCreate}
      isSubmitting={false}
      error="Creation failed"
    />
  );

  try {
    expect(view.container.textContent).toContain("Create New Form");
    expect(view.container.textContent).toContain("Unable to create form");

    const inputs = Array.from(view.container.querySelectorAll("input"));
    const textarea = view.container.querySelector("textarea");
    const select = view.container.querySelector("select");
    const buttons = Array.from(view.container.querySelectorAll("button"));

    act(() => {
      setInputValue(inputs[0], "Contact Form");
      setTextareaValue(textarea ?? undefined, "Lead form");
      setSelectValue(select ?? undefined, "published");
      buttons.find((button) => button.textContent === "Create form")?.click();
      buttons.find((button) => button.textContent === "Cancel")?.click();
      buttons.find((button) => button.getAttribute("aria-label") === "Close create form drawer")?.click();
    });

    expect((inputs[1] as HTMLInputElement).defaultValue).toBe("contact-form");
    expect(onCreate).toHaveBeenCalledWith({
      name: "Contact Form",
      slug: "contact-form",
      status: "published",
      description: "Lead form",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

test("FormTable and FieldListPanel render empty and interactive states", async () => {
  const { FormTable } = await import("../../../core/admin/ui/forms/FormTable");
  const { FieldListPanel } = await import(
    "../../../core/admin/ui/forms/FieldListPanel"
  );

  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onSelect = vi.fn();
  const onAdd = vi.fn();

  const html = renderToString(
    <>
      <FormTable items={[]} onEdit={onEdit} onDelete={onDelete} />
      <FieldListPanel
        fields={[]}
        selectedId={null}
        onSelect={onSelect}
        onAdd={onAdd}
      />
    </>
  );

  expect(html).toContain("No forms yet");
  expect(html).toContain("Add your first field");

  const view = mount(
    <>
      <FormTable
        items={[
          {
            id: "form-1",
            name: "Contact",
            slug: "contact",
            status: "published",
            description: "Lead form",
            successMessage: null,
            successRedirectUrl: null,
            submissionAccess: "public",
            settings: {
              layoutMode: "single",
              saveProgress: false,
              stepTitles: [],
              preset: "custom",
              automationRetry: {
                enabled: false,
                maxAttempts: 1,
                baseDelayMs: 300,
                maxDelayMs: 2000,
              },
            },
            createdAt: "2026-03-06T12:00:00.000Z",
            updatedAt: "2026-03-06T12:00:00.000Z",
          },
        ]}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <FieldListPanel
        fields={[
          {
            id: "field-1",
            label: "Email",
            name: "email",
            type: "email",
            required: true,
          },
          {
            id: "field-2",
            label: "Message",
            name: "message",
            type: "textarea",
            required: false,
          },
        ]}
        selectedId="field-1"
        onSelect={onSelect}
        onAdd={onAdd}
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Contact");
    expect(view.container.textContent).toContain("Required");

    const buttons = Array.from(view.container.querySelectorAll("button"));
    const searchInput = Array.from(view.container.querySelectorAll("input")).find(
      (input) => input.getAttribute("placeholder") === "Search fields..."
    );

    act(() => {
      buttons.find((button) => button.textContent === "Edit")?.click();
      buttons.find((button) => button.textContent === "Delete")?.click();
      buttons.find((button) => !button.textContent && button.getAttribute("type") === "button")?.click();
      setInputValue(searchInput, "message");
    });

    expect(onEdit).toHaveBeenCalledWith("form-1");
    expect(onDelete).toHaveBeenCalledWith("form-1");
    expect(view.container.textContent).toContain("Message");
    expect(view.container.textContent).not.toContain("Email");

    act(() => {
      buttons.find((button) => button.textContent?.includes("Message"))?.click();
    });

    expect(onSelect).toHaveBeenCalledWith("field-2");
  } finally {
    view.cleanup();
  }
});

test("FieldSettingsPanel forwards general, logic, style, and duplicate actions", async () => {
  const { FieldSettingsPanel } = await import(
    "../../../core/admin/ui/forms/FieldSettingsPanel"
  );

  const onChange = vi.fn();
  const onSettingsChange = vi.fn();
  const onDuplicate = vi.fn();

  const emptyHtml = renderToString(
    <FieldSettingsPanel
      field={null}
      allFields={[]}
      onChange={onChange}
      onSettingsChange={onSettingsChange}
      onDuplicate={onDuplicate}
    />
  );
  expect(emptyHtml).toContain("Select a field to configure");

  const view = mount(
    <FieldSettingsPanel
      field={{
        id: "field-1",
        label: "Email",
        type: "select",
        name: "email",
        required: false,
        settings: {
          helper: "We will reply here",
          options: ["Sales", "Support"],
          step: 1,
          logic: { operator: "always" },
          style: { width: "full", labelPosition: "above" },
        },
      }}
      allFields={[
        { id: "field-1", name: "email", label: "Email" },
        { id: "field-2", name: "company", label: "Company" },
      ]}
      onChange={onChange}
      onSettingsChange={onSettingsChange}
      onDuplicate={onDuplicate}
    />
  );

  try {
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const textareas = Array.from(view.container.querySelectorAll("textarea"));
    const selects = Array.from(view.container.querySelectorAll("select"));
    const buttons = Array.from(view.container.querySelectorAll("button")) as HTMLButtonElement[];
    const switches = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];

    act(() => {
      setInputValue(inputs[0], "Work email");
      setTextareaValue(textareas[0], "Visible helper");
      setTextareaValue(textareas[1], "Sales\nSupport\nBilling");
      setInputValue(inputs[1], "2");
      switches[0]?.click();
      setInputValue(inputs[2], "^.+@.+$");
      setSelectValue(selects[0], "equals");
      setSelectValue(selects[1], "company");
      setInputValue(inputs[3], "Acme");
      setSelectValue(selects[2], "half");
      setSelectValue(selects[3], "inline");
      buttons.find((button) => button.textContent?.includes("Duplicate Field"))?.click();
    });

    expect(onChange).toHaveBeenCalledWith("field-1", { label: "Work email" });
    expect(onChange).toHaveBeenCalledWith("field-1", { required: true });
    expect(onSettingsChange).toHaveBeenCalledWith("field-1", {
      helper: "Visible helper",
    });
    expect(onSettingsChange).toHaveBeenCalledWith("field-1", {
      options: ["Sales", "Support", "Billing"],
    });
    expect(onSettingsChange).toHaveBeenCalledWith("field-1", { step: 2 });
    expect(onSettingsChange.mock.calls.length).toBeGreaterThanOrEqual(6);
    expect(onDuplicate).toHaveBeenCalledWith("field-1");
  } finally {
    view.cleanup();
  }
});

test("FormSettingsPanel forwards metadata, presets, step titles, and retry controls", async () => {
  const { FormSettingsPanel } = await import(
    "../../../core/admin/ui/forms/FormSettingsPanel"
  );

  const onNameChange = vi.fn();
  const onDescriptionChange = vi.fn();
  const onStatusChange = vi.fn();
  const onSubmissionAccessChange = vi.fn();
  const onSuccessMessageChange = vi.fn();
  const onSuccessRedirectUrlChange = vi.fn();
  const onSettingsChange = vi.fn();
  const onAutomationRetryChange = vi.fn();
  const onStepTitlesChange = vi.fn();
  const onApplyPreset = vi.fn();

  const view = mount(
    <FormSettingsPanel
      name="Contact"
      description="Lead form"
      status="draft"
      submissionAccess="public"
      successMessage="Thanks"
      successRedirectUrl="/thanks"
      settings={{
        layoutMode: "multi_step",
        saveProgress: true,
        stepTitles: ["Intro", "Details"],
        preset: "contact",
        automationRetry: {
          enabled: false,
          maxAttempts: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
        },
      }}
      presetOptions={[
        { id: "custom", label: "Custom", description: "Custom" },
        { id: "contact", label: "Contact", description: "Contact preset" },
      ]}
      stepCount={2}
      onNameChange={onNameChange}
      onDescriptionChange={onDescriptionChange}
      onStatusChange={onStatusChange}
      onSubmissionAccessChange={onSubmissionAccessChange}
      onSuccessMessageChange={onSuccessMessageChange}
      onSuccessRedirectUrlChange={onSuccessRedirectUrlChange}
      onSettingsChange={onSettingsChange}
      onAutomationRetryChange={onAutomationRetryChange}
      onStepTitlesChange={onStepTitlesChange}
      onApplyPreset={onApplyPreset}
    />
  );

  try {
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const textareas = Array.from(view.container.querySelectorAll("textarea"));
    const selects = Array.from(view.container.querySelectorAll("select"));
    const checkboxes = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];
    const buttons = Array.from(view.container.querySelectorAll("button")) as HTMLButtonElement[];

    act(() => {
      setInputValue(inputs[0], "Support");
      setTextareaValue(textareas[0], "Support requests");
      setSelectValue(selects[0], "published");
      setSelectValue(selects[1], "contact");
      buttons.find((button) => button.textContent?.includes("Apply preset fields"))?.click();
      setSelectValue(selects[2], "single");
      checkboxes[0]?.click();
      setInputValue(inputs[1], "Step one");
      setInputValue(inputs[2], "Step two");
      setSelectValue(selects[3], "internal");
      setTextareaValue(textareas[1], "Saved");
      setInputValue(inputs[3], "/done");
      checkboxes[1]?.click();
      setInputValue(inputs[4], "3");
      setInputValue(inputs[5], "500");
      setInputValue(inputs[6], "4000");
    });

    expect(onNameChange).toHaveBeenCalledWith("Support");
    expect(onDescriptionChange).toHaveBeenCalledWith("Support requests");
    expect(onStatusChange).toHaveBeenCalledWith("published");
    expect(onSettingsChange).toHaveBeenCalledWith({ preset: "contact" });
    expect(onApplyPreset).toHaveBeenCalledWith("contact");
    expect(onSettingsChange).toHaveBeenCalledWith({ layoutMode: "single" });
    expect(onSettingsChange).toHaveBeenCalledWith({ saveProgress: false });
    expect(onStepTitlesChange).toHaveBeenCalledTimes(2);
    expect(onSubmissionAccessChange).toHaveBeenCalledWith("internal");
    expect(onSuccessMessageChange).toHaveBeenCalledWith("Saved");
    expect(onSuccessRedirectUrlChange).toHaveBeenCalled();
    expect(onAutomationRetryChange).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("FormRuntimePreviewDialog handles unsaved, multi-step, submit success, and submit errors", async () => {
  const { FormRuntimePreviewDialog } = await import(
    "../../../core/admin/ui/forms/FormRuntimePreviewDialog"
  );

  const onOpenLogs = vi.fn();
  const onOpenChange = vi.fn();

  const view = mount(
    <FormRuntimePreviewDialog
      open
      onOpenChange={onOpenChange}
      formId="form-1"
      formName="Service request"
      formDescription="Runtime preview"
      settings={{
        layoutMode: "multi_step",
        saveProgress: true,
        stepTitles: ["Intro", "Confirm"],
        preset: "custom",
        automationRetry: {
          enabled: false,
          maxAttempts: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
        },
      }}
      fields={[
        {
          id: "field-1",
          type: "text",
          label: "Full name",
          name: "full_name",
          required: true,
          settings: {
            placeholder: "Jane Doe",
            step: 1,
            helper: "Visible on first step",
          },
        },
        {
          id: "field-2",
          type: "checkbox",
          label: "Need invoice",
          name: "need_invoice",
          required: false,
          settings: {
            defaultValue: true,
            step: 2,
          },
        },
      ]}
      hasUnsavedChanges={false}
      onOpenLogs={onOpenLogs}
    />
  );

  try {
    expect(view.container.textContent).toContain("Step 1 of 2");
    expect(view.container.textContent).toContain("Full name");

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    const inputs = () => Array.from(view.container.querySelectorAll("input"));

    act(() => {
      buttons().find((button) => button.textContent?.includes("Open action logs"))?.click();
      setInputValue(inputs()[0], "Jane Doe");
      buttons().find((button) => button.textContent === "Next")?.click();
    });

    expect(onOpenLogs).toHaveBeenCalledOnce();
    expect(view.container.textContent).toContain("Need invoice");

    await act(async () => {
      buttons().find((button) => button.textContent?.includes("Submit preview"))?.click();
    });

    expect(formsRuntimeState.submitForm).toHaveBeenCalledWith("form-1", {
      full_name: "Jane Doe",
      need_invoice: true,
    });
    expect(view.container.textContent).toContain("Submission completed");
    expect(view.container.textContent).toContain("Runtime redirect configured");

    formsRuntimeState.submitForm.mockRejectedValueOnce({
      name: "ApiClientError",
      message: "Submit failed",
    });

    await act(async () => {
      buttons().find((button) => button.textContent === "Back")?.click();
      buttons().find((button) => button.textContent === "Next")?.click();
      buttons().find((button) => button.textContent?.includes("Submit preview"))?.click();
    });

    expect(view.container.textContent).toContain("Submit failed");
  } finally {
    view.cleanup();
  }

  const unsavedHtml = renderToString(
    <FormRuntimePreviewDialog
      open
      onOpenChange={onOpenChange}
      formId="form-1"
      formName="Form"
      formDescription=""
      settings={{
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
        preset: "custom",
        automationRetry: {
          enabled: false,
          maxAttempts: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
        },
      }}
      fields={[]}
      hasUnsavedChanges
      onOpenLogs={onOpenLogs}
    />
  );

  expect(unsavedHtml).toContain("Save required before runtime test");
});
