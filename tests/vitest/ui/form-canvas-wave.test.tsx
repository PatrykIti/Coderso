// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: (event: MouseEvent) => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={(event) => onClick?.(event as unknown as MouseEvent)} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <div onClick={onClick} {...props}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, defaultValue, placeholder, className }: Record<string, unknown>) => (
    <input
      value={value as string | undefined}
      defaultValue={defaultValue as string | undefined}
      placeholder={placeholder as string | undefined}
      className={className as string | undefined}
      readOnly
    />
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ defaultValue, placeholder, className }: Record<string, unknown>) => (
    <textarea
      defaultValue={defaultValue as string | undefined}
      placeholder={placeholder as string | undefined}
      className={className as string | undefined}
      readOnly
    />
  ),
}));

import { FormCanvas } from "../../../core/admin/ui/forms/FormCanvas";

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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll<HTMLElement>("[role='button'],button")).find(
    (candidate) => candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button-like element: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("FormCanvas handles single-layout selection, checkbox fallback copy, and remove actions", () => {
  const onSelectField = vi.fn();
  const onSelectForm = vi.fn();
  const onRemoveField = vi.fn();

  const view = mount(
    <FormCanvas
      formTitle="Lead form"
      formDescription="Collect leads"
      formSelected
      selectedFieldId="field-textarea"
      fields={[
        {
          id: "field-text",
          label: "Name",
          type: "text",
          required: true,
          settings: {
            placeholder: "Jane Doe",
            style: { width: "half", labelPosition: "above" },
          },
        },
        {
          id: "field-select",
          label: "Plan",
          type: "select",
          required: false,
          settings: {
            placeholder: "Choose a plan",
            style: { width: "full", labelPosition: "above" },
          },
        },
        {
          id: "field-textarea",
          label: "Notes",
          type: "textarea",
          required: false,
          settings: {
            placeholder: "Tell us more",
            defaultValue: "Initial notes",
            style: { width: "full", labelPosition: "above" },
          },
        },
        {
          id: "field-checkbox",
          label: "Consent",
          type: "checkbox",
          required: false,
          settings: {
            style: { width: "half", labelPosition: "hidden" },
          },
        },
      ]}
      onSelectField={onSelectField}
      onSelectForm={onSelectForm}
      onRemoveField={onRemoveField}
    />
  );

  try {
    expect(view.container.textContent).toContain("Lead form");
    expect(view.container.textContent).toContain("Collect leads");
    expect(view.container.textContent).toContain("Yes, I agree");
    expect(view.container.textContent).not.toContain("Consent</label>");
    expect(view.container.innerHTML).toContain("md:col-span-1");
    expect(view.container.innerHTML).toContain("md:col-span-2");

    clickByText(view.container, "Lead form");
    expect(onSelectForm).toHaveBeenCalledTimes(1);

    const fieldButtons = Array.from(
      view.container.querySelectorAll('[role="button"]')
    ) as HTMLElement[];
    const fieldButton = fieldButtons.find(
      (button) =>
        button.textContent?.includes("Notes") && !button.textContent?.includes("Lead form")
    );
    if (!fieldButton) {
      throw new Error("Missing field button");
    }
    React.act(() => {
      fieldButton.click();
    });
    expect(onSelectForm).toHaveBeenCalledTimes(1);

    const removeButton = view.container.querySelector(
      'button[aria-label="Remove field"]'
    ) as HTMLButtonElement | null;
    if (!removeButton) {
      throw new Error("Missing remove button");
    }
    React.act(() => {
      removeButton.click();
    });

    expect(onSelectForm).toHaveBeenCalledTimes(1);
    expect(onSelectField).toHaveBeenCalledWith("field-textarea");
    expect(onRemoveField).toHaveBeenCalledWith("field-textarea");
  } finally {
    view.cleanup();
  }
});

test("FormCanvas normalizes invalid steps and fallback step titles in multi-step layout", () => {
  const view = mount(
    <FormCanvas
      formTitle="Checkout"
      formDescription=""
      layoutMode="multi_step"
      stepTitles={["Customer"]}
      formSelected={false}
      selectedFieldId={null}
      fields={[
        {
          id: "field-invalid-step",
          label: "Email",
          type: "text",
          required: true,
          settings: {
            placeholder: "name@example.com",
            step: 0,
            style: { width: "half", labelPosition: "above" },
          },
        },
        {
          id: "field-later-step",
          label: "Comments",
          type: "textarea",
          required: false,
          settings: {
            placeholder: "Optional notes",
            step: 3,
            style: { width: "full", labelPosition: "above" },
          },
        },
      ]}
      onSelectField={() => undefined}
      onSelectForm={() => undefined}
      onRemoveField={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Checkout");
    expect(view.container.textContent).toContain("Add a short description for this form.");
    expect(view.container.textContent).toContain("Customer");
    expect(view.container.textContent).toContain("Step 3");
    expect(view.container.querySelector('input[placeholder="name@example.com"]')).not.toBeNull();
    expect(view.container.querySelector('textarea[placeholder="Optional notes"]')).not.toBeNull();
    expect(view.container.innerHTML).toContain("md:col-span-1");
    expect(view.container.innerHTML).toContain("md:col-span-2");
  } finally {
    view.cleanup();
  }
});
