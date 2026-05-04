// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { afterEach, expect, test, vi } from "vitest";

import {
  ScreenFieldGroupAdvancedEditor,
  ScreenFieldGroupVisualEditor,
  ScreenFieldGroupWizardEditor,
  ScreenFieldValueAdvancedEditor,
  ScreenFieldValueVisualEditor,
  ScreenFieldValueWizardEditor,
  ScreenRecordHeaderAdvancedEditor,
  ScreenRecordHeaderVisualEditor,
  ScreenRecordHeaderWizardEditor,
  ScreenTwoColumnAdvancedEditor,
  ScreenTwoColumnVisualEditor,
  ScreenTwoColumnWizardEditor,
} from "../../../core/admin/ui/widgets/editors/ScreenEditors";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} {...props} />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children?: React.ReactNode;
  }) => (
    <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
  }) => <textarea value={value} onChange={onChange} placeholder={placeholder} {...props} />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
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

const renderText = (node: React.ReactNode) => {
  const view = mount(node);
  try {
    return view.container.textContent ?? "";
  } finally {
    view.cleanup();
  }
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("screen widget editor mode exports are no longer aliases", () => {
  expect(ScreenRecordHeaderWizardEditor).not.toBe(ScreenRecordHeaderVisualEditor);
  expect(ScreenRecordHeaderVisualEditor).not.toBe(ScreenRecordHeaderAdvancedEditor);
  expect(ScreenFieldValueWizardEditor).not.toBe(ScreenFieldValueVisualEditor);
  expect(ScreenFieldValueVisualEditor).not.toBe(ScreenFieldValueAdvancedEditor);
  expect(ScreenFieldGroupWizardEditor).not.toBe(ScreenFieldGroupVisualEditor);
  expect(ScreenFieldGroupVisualEditor).not.toBe(ScreenFieldGroupAdvancedEditor);
  expect(ScreenTwoColumnWizardEditor).not.toBe(ScreenTwoColumnVisualEditor);
  expect(ScreenTwoColumnVisualEditor).not.toBe(ScreenTwoColumnAdvancedEditor);
});

test("screen widget modes expose distinct copy and control intent", () => {
  const commonProps = {
    onChange: () => undefined,
    onVariantChange: () => undefined,
  };

  expect(
    renderText(
      <ScreenRecordHeaderWizardEditor value={{ title: "Entry" }} variant="card" {...commonProps} />
    )
  ).toContain("Start here");
  expect(
    renderText(
      <ScreenRecordHeaderVisualEditor value={{ title: "Entry" }} variant="card" {...commonProps} />
    )
  ).toContain("Main content");
  expect(
    renderText(
      <ScreenRecordHeaderAdvancedEditor
        value={{ title: "Entry" }}
        variant="card"
        {...commonProps}
      />
    )
  ).toContain("Expert controls");

  expect(
    renderText(
      <ScreenFieldGroupVisualEditor value={{ title: "Group" }} variant="card" {...commonProps} />
    )
  ).toContain("Slot guidance");
  expect(
    renderText(
      <ScreenFieldGroupAdvancedEditor value={{ title: "Group" }} variant="card" {...commonProps} />
    )
  ).toContain("Surface");

  expect(
    renderText(
      <ScreenTwoColumnVisualEditor
        value={{ leftTitle: "Left", rightTitle: "Right" }}
        variant="balanced"
        {...commonProps}
      />
    )
  ).toContain("supporting fields");
  expect(
    renderText(
      <ScreenTwoColumnAdvancedEditor
        value={{ leftTitle: "Left", rightTitle: "Right" }}
        variant="balanced"
        {...commonProps}
      />
    )
  ).toContain("Column Surface");
});
