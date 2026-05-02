// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  ScreenFieldGroupWizardEditor,
  ScreenFieldGroupVisualEditor,
  ScreenTwoColumnWizardEditor,
  ScreenTwoColumnVisualEditor,
} from "../../../core/admin/ui/widgets/editors/ScreenEditors";
import type { ScreenTwoColumnData } from "../../../core/widgets/core/screenTwoColumn";

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

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("screen field group visual editor keeps slot guidance visible", () => {
  const view = mount(
    <ScreenFieldGroupVisualEditor
      value={{ title: "Details", description: "Important fields" }}
      onChange={() => undefined}
      variant="card"
      onVariantChange={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Slot guidance");
    expect(view.container.textContent).toContain("selected record reads as one deliberate section");
  } finally {
    view.cleanup();
  }
});

test("screen two column visual editor updates normalized gap tokens", () => {
  let latestValue: ScreenTwoColumnData = {
    leftTitle: "Main",
    rightTitle: "Aside",
    gap: "md",
  };

  const Harness = () => {
    const [current, setCurrent] = useState(latestValue);
    return (
      <ScreenTwoColumnVisualEditor
        value={current}
        onChange={(next) => {
          latestValue = next;
          setCurrent(next);
        }}
        variant="balanced"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const select = view.container.querySelector("select");
    expect(select).not.toBeNull();
    act(() => {
      if (select instanceof HTMLSelectElement) {
        select.value = "lg";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    expect(latestValue.gap).toBe("lg");
    expect(view.container.textContent).toContain("supporting fields");
  } finally {
    view.cleanup();
  }
});

test("screen layout wizard editors delegate variant changes", () => {
  const groupVariantChange = vi.fn();
  const twoColumnVariantChange = vi.fn();

  const groupView = mount(
    <ScreenFieldGroupWizardEditor
      value={{ title: "Details", description: "Important fields" }}
      onChange={() => undefined}
      variant="card"
      onVariantChange={groupVariantChange}
    />
  );

  try {
    const subtleButton = Array.from(groupView.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Subtle")
    );
    act(() => {
      subtleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(groupVariantChange).toHaveBeenCalledWith("subtle");
  } finally {
    groupView.cleanup();
  }

  const twoColumnView = mount(
    <ScreenTwoColumnWizardEditor
      value={{ leftTitle: "Main", rightTitle: "Aside", gap: "md" }}
      onChange={() => undefined}
      variant="balanced"
      onVariantChange={twoColumnVariantChange}
    />
  );

  try {
    const asideButton = Array.from(twoColumnView.container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Aside")
    );
    act(() => {
      asideButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(twoColumnVariantChange).toHaveBeenCalledWith("aside");
  } finally {
    twoColumnView.cleanup();
  }
});
