// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  ClearableInputField,
  hasClearableFieldValue,
} from "../../../core/admin/ui/widgets/editors/ClearableFields";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
    placeholder,
    type,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    [key: string]: unknown;
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} {...props} />
  ),
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

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("clearable field helper detects real values without treating empty text as set", () => {
  expect(hasClearableFieldValue(undefined)).toBe(false);
  expect(hasClearableFieldValue("   ")).toBe(false);
  expect(hasClearableFieldValue("transparent")).toBe(true);
  expect(hasClearableFieldValue("#ffffff")).toBe(true);
});

test("clearable input disables empty clear and delegates configured clear behavior", () => {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const view = mount(
    <ClearableInputField
      label="Surface"
      value=""
      onChange={onChange}
      onClear={onClear}
      placeholder="transparent"
    />
  );

  try {
    const button = view.container.querySelector("button");
    expect(button?.disabled).toBe(true);
    act(() => {
      button?.click();
    });
    expect(onClear).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }

  const filled = mount(
    <ClearableInputField
      label="Surface"
      value="transparent"
      onChange={onChange}
      onClear={onClear}
      placeholder="transparent"
    />
  );

  try {
    const button = filled.container.querySelector("button");
    expect(button?.disabled).toBe(false);
    act(() => {
      button?.click();
    });
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalledWith("transparent");
  } finally {
    filled.cleanup();
  }
});
