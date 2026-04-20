// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { FormActionInput } from "../../../core/admin/services/formsClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
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
  }) => <input value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
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
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
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
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
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
  }) => <textarea value={value} onChange={onChange} {...props} />,
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

const clickButtonByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickElement = (element: Element | null | undefined) => {
  if (!element) return;
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findInputByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareaByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
  );

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

afterEach(() => {
  vi.restoreAllMocks();
});

test("FormActionsPanel adds every action type and exposes matching config editors", async () => {
  const { FormActionsPanel } = await import(
    "../../../core/admin/ui/forms/FormActionsPanel"
  );

  const onOpenLogs = vi.fn();
  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [actions, setActions] = useState<FormActionInput[]>([]);
    return (
      <FormActionsPanel
        actions={actions}
        contentTypes={[{ id: "articles", name: "Articles" }]}
        onOpenLogs={onOpenLogs}
        onChange={(next) => {
          onChangeSpy(next);
          setActions(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("No actions yet");

    clickButtonByText(view.container, "Action logs");
    expect(onOpenLogs).toHaveBeenCalledTimes(1);

    clickButtonByText(view.container, "Send email");
    clickButtonByText(view.container, "Call webhook");
    clickButtonByText(view.container, "Sync entry");
    clickButtonByText(view.container, "Redirect");
    clickButtonByText(view.container, "Success message");

    const lastActions = onChangeSpy.mock.lastCall?.[0] as FormActionInput[];
    expect(lastActions.map((action) => action.type)).toEqual([
      "email",
      "webhook",
      "entry_sync",
      "redirect",
      "success_message",
    ]);

    expect(view.container.textContent).toContain("Send email");
    expect(view.container.textContent).toContain("Call webhook");
    expect(view.container.textContent).toContain("Sync entry");
    expect(view.container.textContent).toContain("Redirect");
    expect(view.container.textContent).toContain("Success message");

    expect(
      findInputByPlaceholder(view.container, "To (e.g. {{submission.email}})")
    ).toBeTruthy();
    expect(
      findInputByPlaceholder(view.container, "https://example.com/webhook")
    ).toBeTruthy();
    expect(findInputByPlaceholder(view.container, "/thank-you")).toBeTruthy();
    expect(
      findTextareaByPlaceholder(view.container, "Thanks for your submission.")
    ).toBeTruthy();

    act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "Subject"),
        "Lead received"
      );
      setInputValue(
        findInputByPlaceholder(view.container, "/thank-you"),
        "/done"
      );
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Thanks for your submission."),
        "Saved"
      );
    });

    const editedActions = onChangeSpy.mock.lastCall?.[0] as FormActionInput[];
    expect(editedActions[0]?.config).toEqual(
      expect.objectContaining({ subject: "Lead received" })
    );
    expect(editedActions[3]?.config).toEqual(
      expect.objectContaining({ url: "/done" })
    );
    expect(editedActions[4]?.config).toEqual(
      expect.objectContaining({ message: "Saved" })
    );
  } finally {
    view.cleanup();
  }
});

test("FormActionsPanel updates conditions, webhook and entry-sync config, ordering, and removal", async () => {
  const { FormActionsPanel } = await import(
    "../../../core/admin/ui/forms/FormActionsPanel"
  );

  const onChangeSpy = vi.fn();
  const onOpenLogs = vi.fn();
  const initialActions: FormActionInput[] = [
    {
      type: "webhook",
      label: "Webhook",
      enabled: true,
      continueOnError: true,
      condition: { operator: "always" },
      config: {
        url: "https://",
        method: "POST",
        timeoutMs: 8000,
        includeSubmission: true,
      },
      orderIndex: 0,
    },
    {
      type: "entry_sync",
      label: "Entry sync",
      enabled: true,
      continueOnError: true,
      condition: { operator: "always" },
      config: {
        contentTypeId: "",
        mode: "create",
        titleTemplate: "{{submission.name}}",
        slugTemplate: "{{submissionId}}",
        dataMapping: {},
      },
      orderIndex: 1,
    },
  ];

  const Harness = () => {
    const [actions, setActions] = useState<FormActionInput[]>(initialActions);
    return (
      <FormActionsPanel
        actions={actions}
        contentTypes={[{ id: "articles", name: "Articles" }]}
        onOpenLogs={onOpenLogs}
        onChange={(next) => {
          onChangeSpy(next);
          setActions(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const sections = () => Array.from(view.container.querySelectorAll("section"));

    const webhookSection = sections()[0] as HTMLElement;
    act(() => {
      setSelectValue(
        findSelectByOptions(webhookSection, [
          "always",
          "equals",
          "not_equals",
          "exists",
          "not_exists",
        ]),
        "exists"
      );
      setInputValue(
        findInputByPlaceholder(webhookSection, "submission.fieldName"),
        "email"
      );
      setInputValue(
        findInputByPlaceholder(webhookSection, "https://example.com/webhook"),
        "https://hooks.test"
      );
      setSelectValue(
        findSelectByOptions(webhookSection, ["POST", "PUT", "PATCH"]),
        "PUT"
      );
      setInputValue(
        findInputByPlaceholder(webhookSection, "Timeout ms"),
        "12000"
      );
      setTextareaValue(
        findTextareaByPlaceholder(
          webhookSection,
          'Optional payload template (JSON or plain text). Example: {"lead":"{{submission.name}}"}'
        ),
        '{"lead":"{{submission.email}}"}'
      );
    });

    const webhookCheckboxes = Array.from(
      webhookSection.querySelectorAll("input[type='checkbox']")
    );
    clickElement(webhookCheckboxes[0]);
    clickElement(webhookCheckboxes[1]);
    clickElement(webhookCheckboxes[2]);

    const entrySyncSection = sections()[1] as HTMLElement;
    act(() => {
      setSelectValue(
        findSelectByOptions(entrySyncSection, [
          "always",
          "equals",
          "not_equals",
          "exists",
          "not_exists",
        ]),
        "equals"
      );
      setInputValue(
        findInputByPlaceholder(entrySyncSection, "submission.fieldName"),
        "newsletter"
      );
      setInputValue(
        findInputByPlaceholder(entrySyncSection, "Expected value"),
        "yes"
      );
      setSelectValue(
        findSelectByOptions(entrySyncSection, ["articles"]),
        "articles"
      );
      setSelectValue(
        findSelectByOptions(entrySyncSection, ["create", "upsert_by_slug"]),
        "upsert_by_slug"
      );
      setInputValue(
        findInputByPlaceholder(
          entrySyncSection,
          "Title template, e.g. {{submission.name}}"
        ),
        "{{submission.email}}"
      );
      setInputValue(
        findInputByPlaceholder(
          entrySyncSection,
          "Slug template, e.g. {{submissionId}}"
        ),
        "{{submission.slug}}"
      );
    });

    clickButtonByText(entrySyncSection, "Add field");
    act(() => {
      setInputValue(
        findInputByPlaceholder(entrySyncSection, "Entry field"),
        "headline"
      );
      setInputValue(
        findInputByPlaceholder(entrySyncSection, "Template"),
        "{{submission.name}}"
      );
    });

    const entrySyncButtons = Array.from(entrySyncSection.querySelectorAll("button"));
    clickElement(entrySyncButtons[0]);

    const movedActions = onChangeSpy.mock.lastCall?.[0] as FormActionInput[];
    expect(movedActions.map((action) => action.type)).toEqual([
      "entry_sync",
      "webhook",
    ]);

    const firstSectionButtons = Array.from(
      (sections()[0] as HTMLElement).querySelectorAll("button")
    );
    clickElement(firstSectionButtons[2]);

    const finalActions = onChangeSpy.mock.lastCall?.[0] as FormActionInput[];
    expect(finalActions).toHaveLength(1);
    expect(finalActions[0]).toEqual(
      expect.objectContaining({
        type: "webhook",
        enabled: false,
        continueOnError: false,
        condition: { operator: "exists", field: "email" },
        config: expect.objectContaining({
          url: "https://hooks.test",
          method: "PUT",
          timeoutMs: 12000,
          includeSubmission: false,
          bodyTemplate: '{"lead":"{{submission.email}}"}',
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("FormActionsPanel supports fallback labels, action relabeling, move-down ordering, and mapping removal", async () => {
  const { FormActionsPanel } = await import(
    "../../../core/admin/ui/forms/FormActionsPanel"
  );

  const onChangeSpy = vi.fn();
  const initialActions: FormActionInput[] = [
    {
      type: "redirect",
      label: "Redirect first",
      enabled: true,
      continueOnError: true,
      condition: { operator: "always" },
      config: { url: "/start" },
      orderIndex: 0,
    },
    {
      type: "entry_sync",
      label: "Entry sync",
      enabled: true,
      continueOnError: true,
      condition: { operator: "always" },
      config: {
        contentTypeId: "articles",
        mode: "create",
        titleTemplate: "{{submission.name}}",
        slugTemplate: "{{submissionId}}",
        dataMapping: {
          headline: "{{submission.name}}",
        },
      },
      orderIndex: 1,
    },
    {
      type: "custom_action" as unknown as FormActionInput["type"],
      label: "Custom action",
      enabled: true,
      continueOnError: true,
      condition: { operator: "unexpected" } as FormActionInput["condition"],
      config: {
        message: "Fallback message",
      },
      orderIndex: 2,
    },
  ];

  const Harness = () => {
    const [actions, setActions] = useState<FormActionInput[]>(initialActions);
    return (
      <FormActionsPanel
        actions={actions}
        contentTypes={[{ id: "articles", name: "Articles" }]}
        onOpenLogs={() => undefined}
        onChange={(next) => {
          onChangeSpy(next);
          setActions(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("custom_action");

    const sections = () => Array.from(view.container.querySelectorAll("section"));
    const redirectSection = sections()[0] as HTMLElement;
    const redirectLabelInput = Array.from(redirectSection.querySelectorAll("input")).find(
      (element) =>
        element instanceof HTMLInputElement &&
        element.getAttribute("placeholder") === "Action label"
    );

    act(() => {
      setInputValue(redirectLabelInput, "Redirect renamed");
    });

    const entrySection = sections()[1] as HTMLElement;
    const entryButtonsBeforeMove = Array.from(entrySection.querySelectorAll("button"));
    const removePairButton = entryButtonsBeforeMove[entryButtonsBeforeMove.length - 1];

    clickElement(removePairButton);

    const afterRemove = onChangeSpy.mock.lastCall?.[0] as FormActionInput[];
    expect(afterRemove[1]?.config).toEqual(
      expect.objectContaining({
        dataMapping: {},
      })
    );

    const redirectButtons = Array.from(redirectSection.querySelectorAll("button"));
    const moveDownButton = redirectButtons.find((button) =>
      button.textContent?.includes("↓")
    );

    clickElement(moveDownButton);

    const movedActions = onChangeSpy.mock.lastCall?.[0] as FormActionInput[];
    expect(movedActions.map((action) => action.type)).toEqual([
      "entry_sync",
      "redirect",
      "custom_action",
    ]);
    expect(movedActions[1]?.label).toBe("Redirect renamed");
  } finally {
    view.cleanup();
  }
});
