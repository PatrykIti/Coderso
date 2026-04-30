// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  ScreenFieldGroupVisualEditor,
  ScreenFieldValueVisualEditor,
  ScreenRecordHeaderVisualEditor,
  ScreenTwoColumnVisualEditor,
} from "../../../core/admin/ui/widgets/editors/ScreenEditors";
import type { ScreenFieldGroupData } from "../../../core/widgets/core/screenFieldGroup";
import type { ScreenFieldValueData } from "../../../core/widgets/core/screenFieldValue";
import type { ScreenRecordHeaderData } from "../../../core/widgets/core/screenRecordHeader";
import type { ScreenTwoColumnData } from "../../../core/widgets/core/screenTwoColumn";

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
    placeholder,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    [key: string]: unknown;
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
    [key: string]: unknown;
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

const clickFirstClear = (container: ParentNode) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === "Clear"
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error("Missing Clear button");
  act(() => {
    button.click();
  });
};

function renderEditor<T>({
  value,
  editor: Editor,
  variant,
}: {
  value: T;
  editor: React.ComponentType<{
    value: T;
    onChange: (next: T) => void;
    variant: string;
    onVariantChange: (next: string) => void;
  }>;
  variant: string;
}) {
  let latestValue = value;

  const Harness = () => {
    const [current, setCurrent] = useState(value);
    return (
      <Editor
        value={current}
        onChange={(next) => {
          latestValue = next;
          setCurrent(next);
        }}
        variant={variant}
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);
  return {
    ...view,
    getLatestValue: () => latestValue,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("screen widget editors clear style keys instead of writing transparent sentinels", () => {
  const recordHeader = renderEditor<ScreenRecordHeaderData>({
    editor: ScreenRecordHeaderVisualEditor,
    variant: "card",
    value: {
      title: "Entry",
      style: {
        frameBackground: "#ffffff",
        frameGradient: "linear-gradient(red, blue)",
        frameBorderColor: "#e2e8f0",
      },
    },
  });
  try {
    clickFirstClear(recordHeader.container);
    expect(recordHeader.getLatestValue().style?.frameBackground).toBeUndefined();
    expect(JSON.stringify(recordHeader.getLatestValue())).not.toContain("transparent");
  } finally {
    recordHeader.cleanup();
  }

  const fieldValue = renderEditor<ScreenFieldValueData>({
    editor: ScreenFieldValueVisualEditor,
    variant: "inline",
    value: {
      label: "Status",
      value: "Published",
      style: {
        frameBackground: "#ffffff",
        frameBorderColor: "#e2e8f0",
      },
    },
  });
  try {
    clickFirstClear(fieldValue.container);
    expect(fieldValue.getLatestValue().style?.frameBackground).toBeUndefined();
    expect(JSON.stringify(fieldValue.getLatestValue())).not.toContain("transparent");
  } finally {
    fieldValue.cleanup();
  }

  const fieldGroup = renderEditor<ScreenFieldGroupData>({
    editor: ScreenFieldGroupVisualEditor,
    variant: "default",
    value: {
      title: "Details",
      style: {
        frameBackground: "#ffffff",
        frameBorderColor: "#e2e8f0",
      },
    },
  });
  try {
    clickFirstClear(fieldGroup.container);
    expect(fieldGroup.getLatestValue().style?.frameBackground).toBeUndefined();
    expect(JSON.stringify(fieldGroup.getLatestValue())).not.toContain("transparent");
  } finally {
    fieldGroup.cleanup();
  }

  const twoColumn = renderEditor<ScreenTwoColumnData>({
    editor: ScreenTwoColumnVisualEditor,
    variant: "balanced",
    value: {
      leftTitle: "Left",
      rightTitle: "Right",
      style: {
        columnBackground: "#ffffff",
        columnBorderColor: "#e2e8f0",
      },
    },
  });
  try {
    clickFirstClear(twoColumn.container);
    expect(twoColumn.getLatestValue().style?.columnBackground).toBeUndefined();
    expect(JSON.stringify(twoColumn.getLatestValue())).not.toContain("transparent");
  } finally {
    twoColumn.cleanup();
  }
});
