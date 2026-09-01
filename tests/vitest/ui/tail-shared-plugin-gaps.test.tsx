// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  ClearableFieldHeader,
  ClearableInputField,
  ColorContrastNotice,
  SharedColorFieldInputs,
} from "../../../core/admin/ui/shared/ClearableFields";
import { ConfirmActionDialog } from "../../../core/admin/ui/shared/ConfirmActionDialog";
import { SharedColorControl } from "../../../core/admin/ui/shared/SharedColorControl";
import {
  useListPagination,
  type ListPaginationState,
} from "../../../core/admin/ui/shared/useListPagination";
import { PluginList } from "../../../core/admin/ui/plugins/PluginList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The shared tail components emit their "cleared" feedback through sonner's
// info toast, so capture that seam here instead of rendering real toasts.
const toastInfo = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    info: toastInfo,
    success: vi.fn(),
    error: vi.fn(),
  },
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
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/utils/adminPaths", () => ({
  resolveAdminBasePath: () => "/admin",
  withAdminBasePath: (basePath: string, path: string) => `${basePath}${path}`,
}));

beforeEach(() => {
  toastInfo.mockClear();
});

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
      document.body.innerHTML = "";
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const pressEscape = async () => {
  await React.act(async () => {
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await Promise.resolve();
  });
};

const findButton = (root: ParentNode, text: string): HTMLButtonElement => {
  const button = Array.from(root.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  return button;
};

const findButtonByAriaLabel = (root: ParentNode, label: string): HTMLButtonElement => {
  const button = Array.from(root.querySelectorAll("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === label
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${label}`);
  }
  return button;
};

describe("ConfirmActionDialog open-change guard", () => {
  test("routes Escape through the guard and reports the close", async () => {
    const onOpenChange = vi.fn();
    function StatefulConfirm() {
      const [open, setOpen] = React.useState(true);
      return (
        <ConfirmActionDialog
          open={open}
          title="Delete record?"
          description="This cannot be undone."
          confirmLabel="Delete"
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          onConfirm={() => undefined}
        />
      );
    }

    const view = mount(<StatefulConfirm />);
    try {
      expect(document.body.textContent).toContain("Delete record?");
      await pressEscape();
      expect(onOpenChange).toHaveBeenCalledWith(false);
      // The dialog content is torn down once the open state actually flips.
      expect(document.body.textContent).not.toContain("Delete record?");
    } finally {
      view.cleanup();
    }
  });

  test("refuses to close via Escape while a confirmation is in flight", async () => {
    const onOpenChange = vi.fn();
    const view = mount(
      <ConfirmActionDialog
        open
        isConfirming
        title="Delete record?"
        description="This cannot be undone."
        confirmLabel="Deleting"
        onOpenChange={onOpenChange}
        onConfirm={() => undefined}
      />
    );

    try {
      await pressEscape();
      expect(onOpenChange).not.toHaveBeenCalled();
    } finally {
      view.cleanup();
    }
  });

  test("forwards typed-value keystrokes through onChange to unlock confirm", async () => {
    const onConfirm = vi.fn();
    const view = mount(
      <ConfirmActionDialog
        open
        title="Grant access?"
        description="This grants every permission."
        confirmLabel="Grant access"
        requireTypedValue="GRANT"
        onOpenChange={() => undefined}
        onConfirm={onConfirm}
      />
    );

    try {
      const input = document.body.querySelector("input");
      if (!input) throw new Error("Missing typed confirmation input");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (!setter) throw new Error("value setter unavailable");
      React.act(() => {
        setter.call(input, "GRANT");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

      const confirmButton = findButton(document.body, "Grant access");
      expect(confirmButton.disabled).toBe(false);
      React.act(() => {
        confirmButton.click();
      });
      await flush();
      expect(onConfirm).toHaveBeenCalledOnce();
    } finally {
      view.cleanup();
    }
  });
});

describe("ClearableFields tail branches", () => {
  test("ClearableFieldHeader offers an Undo restore for a string value via onRestoreValue", () => {
    const onClear = vi.fn();
    const onRestoreValue = vi.fn();
    const view = mount(
      <ClearableFieldHeader
        label="Header"
        value="saved-value"
        onClear={onClear}
        onRestoreValue={onRestoreValue}
      />
    );

    try {
      const clearButton = findButtonByAriaLabel(view.container, "Clear Header");
      React.act(() => {
        clearButton.click();
      });
      expect(onClear).toHaveBeenCalledOnce();
      expect(toastInfo).toHaveBeenCalledWith(
        "Header cleared.",
        expect.objectContaining({
          action: { label: "Undo", onClick: expect.any(Function) },
        })
      );
      const options = toastInfo.mock.calls.at(-1)?.[1] as { action: { onClick: () => void } };
      React.act(() => {
        options.action.onClick();
      });
      expect(onRestoreValue).toHaveBeenCalledWith("saved-value");
    } finally {
      view.cleanup();
    }
  });

  test("ClearableInputField forwards typing through onChange", () => {
    const onChange = vi.fn();
    const view = mount(
      <ClearableInputField label="Field" value="" onChange={onChange} placeholder="Type here" />
    );

    try {
      const input = view.container.querySelector("input");
      if (!input) throw new Error("missing input");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (!setter) throw new Error("value setter unavailable");
      React.act(() => {
        setter.call(input, "next value");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(onChange).toHaveBeenCalledWith("next value");
    } finally {
      view.cleanup();
    }
  });

  test("ColorContrastNotice renders nothing for an ok advisory", () => {
    const view = mount(
      <ColorContrastNotice advisory={{ status: "ok", message: "Readable." }} label="Contrast" />
    );

    try {
      expect(view.container.textContent).not.toContain("Contrast");
    } finally {
      view.cleanup();
    }
  });

  test("SharedColorFieldInputs forwards free-text color input through onChange", () => {
    const onChange = vi.fn();
    const view = mount(
      <SharedColorFieldInputs
        value=""
        onChange={onChange}
        placeholder="#RRGGBB"
        pickerFallback="#000000"
        inputId="color-text"
      />
    );

    try {
      const textInput = Array.from(view.container.querySelectorAll("input")).find(
        (input) => input.getAttribute("id") === "color-text"
      ) as HTMLInputElement | null;
      if (!textInput) throw new Error("missing text input");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (!setter) throw new Error("value setter unavailable");
      React.act(() => {
        setter.call(textInput, "#ff0000");
        textInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(onChange).toHaveBeenCalledWith("#ff0000");
    } finally {
      view.cleanup();
    }
  });
});

describe("SharedColorControl free-text commit", () => {
  test("commits a changed free-text value with Enter", () => {
    const onChange = vi.fn();
    const view = mount(<SharedColorControl label="Accent" value="#336699" onChange={onChange} />);

    try {
      const valueInput = view.container.querySelector("input[aria-label='Accent value']");
      if (!(valueInput instanceof HTMLInputElement)) throw new Error("missing value input");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (!setter) throw new Error("value setter unavailable");
      React.act(() => {
        setter.call(valueInput, "#abcdef");
        valueInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^#[0-9a-f]{6}$/i));
    } finally {
      view.cleanup();
    }
  });
});

describe("useListPagination reset", () => {
  test("resetPage returns to the first page and range after navigating", () => {
    let latest: ListPaginationState<string> | null = null;
    function Harness() {
      const pagination = useListPagination<string>(
        Array.from({ length: 25 }, (_, index) => `row-${index + 1}`)
      );
      latest = pagination;
      return (
        <div>
          <span>{`page:${pagination.pageIndex + 1}`}</span>
          <span>{`range:${pagination.rangeStart}-${pagination.rangeEnd}`}</span>
          <button type="button" onClick={pagination.nextPage}>
            next
          </button>
          <button type="button" onClick={pagination.resetPage}>
            reset
          </button>
        </div>
      );
    }

    const view = mount(<Harness />);
    try {
      expect(view.container.textContent).toContain("page:1");
      expect(view.container.textContent).toContain("range:1-10");
      React.act(() => {
        findButton(view.container, "next").click();
      });
      expect(view.container.textContent).toContain("page:2");
      expect(view.container.textContent).toContain("range:11-20");
      React.act(() => {
        findButton(view.container, "reset").click();
      });
      expect(view.container.textContent).toContain("page:1");
      expect(view.container.textContent).toContain("range:1-10");
      expect((latest as ListPaginationState<string> | null)?.canPreviousPage).toBe(false);
    } finally {
      view.cleanup();
    }
  });

  test("clamps a stale page index when rows shrink under the same resetKey", () => {
    let latest: ListPaginationState<string> | null = null;
    function ClampHarness({ rows }: { rows: readonly string[] }) {
      const pagination = useListPagination<string>(rows);
      latest = pagination;
      return (
        <div>
          <span>{`page:${pagination.pageIndex + 1}`}</span>
          <span>{`range:${pagination.rangeStart}-${pagination.rangeEnd}`}</span>
          <button type="button" onClick={pagination.nextPage}>
            next
          </button>
        </div>
      );
    }
    function Shell() {
      const [rows, setRows] = React.useState<readonly string[]>(
        Array.from({ length: 25 }, (_, index) => `row-${index + 1}`)
      );
      return (
        <div>
          <ClampHarness rows={rows} />
          <button type="button" onClick={() => setRows(["only"])}>
            shrink
          </button>
        </div>
      );
    }
    const view = mount(<Shell />);
    try {
      // 25 rows at pageSize 10 => 3 pages; advance to page 3.
      React.act(() => {
        findButton(view.container, "next").click();
      });
      React.act(() => {
        findButton(view.container, "next").click();
      });
      expect(view.container.textContent).toContain("page:3");
      // Shrink to 1 row under the same resetKey: the stale index clamps to page 1.
      React.act(() => {
        findButton(view.container, "shrink").click();
      });
      expect(view.container.textContent).toContain("page:1");
      expect(view.container.textContent).toContain("range:1-1");
      expect((latest as ListPaginationState<string> | null)?.canPreviousPage).toBe(false);
      expect((latest as ListPaginationState<string> | null)?.canNextPage).toBe(false);
    } finally {
      view.cleanup();
    }
  });

  test("empty rows report a zero range with no paging", () => {
    let latest: ListPaginationState<string> | null = null;
    function EmptyHarness() {
      const pagination = useListPagination<string>([]);
      latest = pagination;
      return (
        <div>
          <span>{`page:${pagination.pageIndex + 1}`}</span>
          <span>{`range:${pagination.rangeStart}-${pagination.rangeEnd}`}</span>
        </div>
      );
    }
    const view = mount(<EmptyHarness />);
    try {
      expect(view.container.textContent).toContain("page:1");
      expect(view.container.textContent).toContain("range:0-0");
      expect((latest as ListPaginationState<string> | null)?.canPreviousPage).toBe(false);
      expect((latest as ListPaginationState<string> | null)?.canNextPage).toBe(false);
    } finally {
      view.cleanup();
    }
  });
});

describe("PluginList empty state", () => {
  test("renders the empty state when no plugins are installed", () => {
    const view = mount(<PluginList items={[]} onSelect={vi.fn()} />);

    try {
      expect(view.container.textContent).toContain("No plugins installed yet.");
    } finally {
      view.cleanup();
    }
  });
});
