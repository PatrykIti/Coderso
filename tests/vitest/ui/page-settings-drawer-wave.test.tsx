// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
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
  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        const label = React.Children.toArray(child.props.children).join("").trim();
        return [{ value: child.props.value, label }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      value,
      onValueChange,
      disabled,
    }: {
      children: React.ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
      disabled?: boolean;
    }) => (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  };
});

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <button type="button" onClick={() => onOpenChange?.(true)}>
          trigger-open
        </button>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          trigger-close
        </button>
        {children}
      </div>
    ) : null,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

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

import { PageSettingsDrawer } from "../../../core/admin/ui/pages/PageSettingsDrawer";
import { normalizePageLayoutSettings } from "../../../core/services/pages/layoutSettings";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const basePage = {
  id: "page-1",
  title: "Homepage",
  slug: "/",
  status: "draft" as const,
  currentData: { blocks: [] },
  updatedAt: "2026-03-14T09:00:00.000Z",
};

const baseSettings = {
  template: "landing",
  showInNav: true,
  layout: normalizePageLayoutSettings(undefined),
  revisionRetention: 10,
};

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
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input for value: ${value}`);
  }
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Missing select for value: ${value}`);
  }
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("PageSettingsDrawer saves trimmed payloads, preserves touched slug, and skips autosave after save", async () => {
  const onSave = vi.fn(async () => true);
  const onAutosave = vi.fn(async () => undefined);
  const onOpenChange = vi.fn();

  const view = mount(
    <PageSettingsDrawer
      open
      onOpenChange={onOpenChange}
      page={basePage}
      settings={baseSettings}
      templateOptions={[
        { key: "landing", label: "Landing" },
        { key: "story", label: "Story" },
      ]}
      onSave={onSave}
      onAutosave={onAutosave}
    />
  );

  try {
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const selects = Array.from(view.container.querySelectorAll("select"));
    const buttons = Array.from(view.container.querySelectorAll("button"));

    setInputValue(inputs[0], "  About us  ");
    expect(inputs[1]?.getAttribute("value") ?? (inputs[1] as HTMLInputElement).value).toBe("/about-us");

    setInputValue(inputs[1], "/team");
    setInputValue(inputs[0], "Company team");
    expect((inputs[1] as HTMLInputElement).value).toBe("/team");

    setSelectValue(selects[0], "story");
    act(() => {
      buttons.find((button) => button.textContent?.includes("Save settings"))?.click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Company team",
        slug: "/team",
        settings: expect.objectContaining({
          template: "story",
        }),
      })
    );

    act(() => {
      buttons.find((button) => button.textContent === "trigger-close")?.click();
    });

    expect(onAutosave).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

test("PageSettingsDrawer autosaves dirty drafts on close and forwards reopen requests", async () => {
  const onSave = vi.fn(async () => false);
  const onAutosave = vi.fn(async () => undefined);
  const onOpenChange = vi.fn();

  const view = mount(
    <PageSettingsDrawer
      open
      onOpenChange={onOpenChange}
      page={basePage}
      settings={{
        ...baseSettings,
        template: "bespoke",
      }}
      onSave={onSave}
      onAutosave={onAutosave}
      isAutosaving
    />
  );

  try {
    expect(view.container.textContent).toContain("Custom (bespoke)");
    expect(view.container.textContent).toContain("Saving autosave snapshot...");

    const inputs = Array.from(view.container.querySelectorAll("input"));
    const buttons = Array.from(view.container.querySelectorAll("button"));

    setInputValue(inputs[0], "Landing page");
    setInputValue(inputs[1], "/landing-page");

    act(() => {
      buttons.find((button) => button.textContent === "trigger-open")?.click();
      buttons.find((button) => button.textContent === "trigger-close")?.click();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(onAutosave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Landing page",
        slug: "/landing-page",
      })
    );
  } finally {
    view.cleanup();
  }
});
