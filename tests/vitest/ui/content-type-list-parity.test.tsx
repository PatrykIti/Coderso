// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

type TestContentType = {
  id: string;
  name: string;
  slug: string;
  schema: {
    type: "object";
    additionalProperties: false;
    properties: Record<string, unknown>;
  };
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
};

const contentTypeListState = vi.hoisted(() => {
  const makeTypes = () =>
    Array.from({ length: 12 }, (_, index): TestContentType => {
      const number = String(index + 1).padStart(2, "0");
      return {
        id: `type-${number}`,
        name: `Type ${number}`,
        slug: `type-${number}`,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
          },
        },
        status: index % 2 === 0 ? "draft" : "published",
        createdAt: "2026-04-24T00:00:00.000Z",
        updatedAt: "2026-04-24T00:00:00.000Z",
      };
    });

  return {
    types: makeTypes(),
    updateCalls: [] as Array<{ id: string; status?: "draft" | "published" }>,
    deleteCalls: [] as string[],
    nextUpdateError: new Map<string, unknown>(),
    nextDeleteError: new Map<string, unknown>(),
    navigateCalls: [] as string[],
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    reset() {
      this.types = makeTypes();
      this.updateCalls = [];
      this.deleteCalls = [];
      this.nextUpdateError = new Map<string, unknown>();
      this.nextDeleteError = new Map<string, unknown>();
      this.navigateCalls = [];
      this.toastSuccess.mockClear();
      this.toastError.mockClear();
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <div data-alert-variant={variant ?? "default"}>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type = "button",
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    [key: string]: unknown;
  }) => (
    <button type={type} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
    "aria-label"?: string;
  }) => (
    <button
      aria-label={ariaLabel}
      aria-pressed={checked === true}
      type="button"
      onClick={() => onCheckedChange?.(checked !== true)}
    >
      checkbox
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div data-dialog-open="true">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
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
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) {
          return flattenText((child.props as { children?: React.ReactNode }).children);
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
      const props = child.props as { value?: string; children?: React.ReactNode };
      if (typeof props.value === "string") {
        return [{ value: props.value, label: flattenText(props.children) }];
      }
      return collectOptions(props.children);
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
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: React.ReactNode; value: string }) => (
      <>{children}</>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: () => null,
  };
});

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, ...props }: { children: React.ReactNode }) => (
    <td {...props}>{children}</td>
  ),
  TableHead: ({ children, ...props }: { children: React.ReactNode }) => (
    <th {...props}>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, ...props }: { children: React.ReactNode }) => (
    <tr {...props}>{children}</tr>
  ),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: () => false,
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    contentTypesList: "contentTypesList",
    contentTypeDetail: (id: string) => `contentTypeDetail:${id}`,
  },
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => contentTypeListState.types,
  listContentTypesCached: vi.fn(async () => contentTypeListState.types),
  duplicateContentType: vi.fn(),
  deleteContentType: vi.fn(async (id: string) => {
    contentTypeListState.deleteCalls.push(id);
    const error = contentTypeListState.nextDeleteError.get(id);
    if (error) throw error;
    contentTypeListState.types = contentTypeListState.types.filter((type) => type.id !== id);
    return { ok: true };
  }),
  updateContentType: vi.fn(async (id: string, payload: { status?: "draft" | "published" }) => {
    contentTypeListState.updateCalls.push({ id, status: payload.status });
    const error = contentTypeListState.nextUpdateError.get(id);
    if (error) throw error;
    contentTypeListState.types = contentTypeListState.types.map((type) =>
      type.id === id && payload.status ? { ...type, status: payload.status } : type
    );
    return contentTypeListState.types.find((type) => type.id === id);
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (href: string) => contentTypeListState.navigateCalls.push(href),
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({
    children,
    href,
    prefetch: _prefetch,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </header>
  ),
}));

vi.mock("@/utils/adminPaths", () => ({
  resolveAdminBasePath: () => "/admin",
  withAdminBasePath: (_basePath: string, path: string) => `/admin${path}`,
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

vi.mock("sonner", () => ({
  toast: {
    error: contentTypeListState.toastError,
    success: contentTypeListState.toastSuccess,
  },
}));

vi.mock("../../../core/admin/ui/content-types/ContentTypeCreateDrawer", () => ({
  ContentTypeCreateDrawer: ({
    open,
    onCreated,
    onCreateError,
  }: {
    open: boolean;
    onCreated?: (type: TestContentType) => void;
    onCreateError?: (error: unknown) => void;
  }) =>
    open ? (
      <div data-testid="content-type-create-drawer">
        <button
          type="button"
          onClick={() =>
            onCreated?.({
              id: "created-type",
              name: "Created Type",
              slug: "created-type",
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {},
              },
              status: "draft",
              createdAt: "2026-04-24T00:00:00.000Z",
              updatedAt: "2026-04-24T00:00:00.000Z",
            })
          }
        >
          mock create content type
        </button>
        <button
          type="button"
          onClick={() => onCreateError?.(new Error("create failed"))}
        >
          mock create content type error
        </button>
      </div>
    ) : null,
}));

const { ContentTypeList } = await import(
  "../../../core/admin/ui/content-types/ContentTypeList"
);

const flush = () => act(async () => Promise.resolve());

const mount = () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<ContentTypeList />);
  });
  return {
    host,
    cleanup: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
};

const setSelectValue = (select: HTMLSelectElement | undefined, value: string) => {
  if (!select) return;
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
};

const findSelectWithOption = (host: HTMLElement, value: string) =>
  Array.from(host.querySelectorAll("select")).find((select) =>
    select.querySelector(`option[value="${value}"]`)
  ) as HTMLSelectElement | undefined;

beforeEach(() => {
  contentTypeListState.reset();
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

test("ContentTypeList uses shared pagination footer and page-size options", async () => {
  const view = mount();
  try {
    await flush();

    expect(view.host.textContent).toContain("Showing 1-10 of 12 content types");
    expect(view.host.textContent).toContain("Type 10");
    expect(view.host.textContent).not.toContain("Type 11");

    act(() => {
      Array.from(view.host.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });

    expect(view.host.textContent).toContain("Showing 11-12 of 12 content types");
    expect(view.host.textContent).toContain("Type 11");

    act(() => {
      setSelectValue(findSelectWithOption(view.host, "20"), "20");
    });

    expect(view.host.textContent).toContain("Showing 1-12 of 12 content types");
    expect(view.host.textContent).toContain("Type 11");
  } finally {
    view.cleanup();
  }
});

test("ContentTypeList keeps selection page-visible and applies bulk actions through existing client", async () => {
  const view = mount();
  try {
    await flush();

    act(() => {
      Array.from(view.host.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });

    const selectAll = view.host.querySelector(
      'button[aria-label="Select all content types"]'
    ) as HTMLButtonElement;
    act(() => {
      selectAll.click();
    });

    expect(view.host.textContent).toContain("Selected 2");

    act(() => {
      setSelectValue(findSelectWithOption(view.host, "publish"), "publish");
    });

    await act(async () => {
      Array.from(view.host.querySelectorAll("button"))
        .find((button) => button.textContent === "Apply")
        ?.click();
      await Promise.resolve();
    });

    expect(contentTypeListState.updateCalls).toEqual([
      { id: "type-11", status: "published" },
      { id: "type-12", status: "published" },
    ]);
    expect(contentTypeListState.toastSuccess).toHaveBeenCalledWith(
      "2 content types published."
    );
    expect(view.host.textContent).toContain("Bulk action completed");
    expect(view.host.textContent).not.toContain("Selected 2");
  } finally {
    view.cleanup();
  }
});

test("ContentTypeList emits create and confirmed row delete toasts", async () => {
  const view = mount();
  try {
    await flush();

    act(() => {
      Array.from(view.host.querySelectorAll("button"))
        .find((button) => button.textContent === "New type")
        ?.click();
    });

    act(() => {
      Array.from(view.host.querySelectorAll("button"))
        .find((button) => button.textContent === "mock create content type")
        ?.click();
    });

    expect(contentTypeListState.toastSuccess).toHaveBeenCalledWith(
      'Collection "Created Type" created.'
    );
    expect(contentTypeListState.navigateCalls).toContain(
      "/content-types/created-type"
    );

    act(() => {
      Array.from(view.host.querySelectorAll("button"))
        .find((button) => button.textContent === "Delete")
        ?.click();
    });
    expect(view.host.textContent).toContain("Delete content type?");
    expect(contentTypeListState.toastSuccess).not.toHaveBeenCalledWith(
      'Content type "Created Type" deleted.'
    );

    await act(async () => {
      Array.from(view.host.querySelectorAll("button"))
        .find((button) => button.textContent === "Delete type")
        ?.click();
      await Promise.resolve();
    });

    expect(contentTypeListState.deleteCalls).toEqual(["created-type"]);
    expect(contentTypeListState.toastSuccess).toHaveBeenCalledWith(
      'Content type "Created Type" deleted.'
    );
  } finally {
    view.cleanup();
  }
});

test("ContentTypeList emits bulk partial-failure toasts and keeps failed ids selected", async () => {
  contentTypeListState.nextUpdateError.set("type-02", new Error("draft failed"));
  const view = mount();
  try {
    await flush();

    const selectAll = view.host.querySelector(
      'button[aria-label="Select all content types"]'
    ) as HTMLButtonElement;
    act(() => {
      selectAll.click();
    });
    act(() => {
      setSelectValue(findSelectWithOption(view.host, "draft"), "draft");
    });

    await act(async () => {
      Array.from(view.host.querySelectorAll("button"))
        .find((button) => button.textContent === "Apply")
        ?.click();
      await Promise.resolve();
    });

    expect(view.host.textContent).toContain(
      "Moved 9 content types to draft; failed 1."
    );
    expect(contentTypeListState.toastError).toHaveBeenCalledWith(
      "Moved 9 content types to draft; failed 1."
    );
    expect(view.host.textContent).toContain("Selected 1");
  } finally {
    view.cleanup();
  }
});

test("ContentTypeList delete confirmation uses token-backed dialog copy", async () => {
  const view = mount();
  try {
    await flush();

    const selectAll = view.host.querySelector(
      'button[aria-label="Select all content types"]'
    ) as HTMLButtonElement;
    act(() => {
      selectAll.click();
    });
    act(() => {
      setSelectValue(findSelectWithOption(view.host, "delete"), "delete");
    });

    act(() => {
      Array.from(view.host.querySelectorAll("button"))
        .find((button) => button.textContent === "Apply")
        ?.click();
    });

    expect(view.host.textContent).toContain("Delete selected content types?");
    expect(view.host.innerHTML).not.toContain("border-rose-200");
    expect(view.host.innerHTML).not.toContain("bg-rose-50/70");
    expect(contentTypeListState.deleteCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});
