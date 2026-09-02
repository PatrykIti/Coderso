// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const state = vi.hoisted(() => {
  const makeTypes = (): TestContentType[] =>
    Array.from({ length: 4 }, (_, index): TestContentType => ({
      id: `type-${index + 1}`,
      name: `Type ${index + 1}`,
      slug: `type-${index + 1}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { title: { type: "string" } },
      },
      status: index === 0 ? "draft" : "published",
      createdAt: "2026-04-24T00:00:00.000Z",
      updatedAt: "2026-04-24T00:00:00.000Z",
    }));

  return {
    types: makeTypes() as TestContentType[] | null,
    deleteCalls: [] as string[],
    updateCalls: [] as Array<{ id: string; status?: "draft" | "published" }>,
    navigateCalls: [] as string[],
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    cacheListener: null as null | ((event: { key: string; action: string }) => void),
    listCalls: 0,
    getCachedContentTypes: () => state.types,
    listContentTypesCached: vi.fn(async () => state.types ?? []),
    duplicateContentType: vi.fn(async (id: string) => {
      const source = state.types?.find((type) => type.id === id);
      if (!source) throw new Error("missing");
      return {
        ...source,
        id: "duplicated-type",
        name: `${source.name} copy`,
        slug: `${source.slug}-copy`,
      };
    }),
    deleteContentType: vi.fn(async (id: string) => {
      state.deleteCalls.push(id);
      state.types = (state.types ?? []).filter((type) => type.id !== id);
      return { ok: true };
    }),
    updateContentType: vi.fn(async (id: string, payload: { status?: "draft" | "published" }) => {
      state.updateCalls.push({ id, status: payload.status });
      state.types = (state.types ?? []).map((type) =>
        type.id === id && payload.status ? { ...type, status: payload.status } : type
      );
      return state.types?.find((type) => type.id === id);
    }),
    subscribeCacheEvents: vi.fn((listener: (event: { key: string; action: string }) => void) => {
      state.cacheListener = listener;
      return () => {
        if (state.cacheListener === listener) state.cacheListener = null;
      };
    }),
    triggerCacheEvent(key: string) {
      state.cacheListener?.({ key, action: "update" });
    },
    reset() {
      state.types = makeTypes();
      state.deleteCalls = [];
      state.updateCalls = [];
      state.navigateCalls = [];
      state.cacheListener = null;
      state.listCalls = 0;
      state.toastSuccess.mockClear();
      state.toastError.mockClear();
      state.listContentTypesCached.mockClear();
      state.duplicateContentType.mockClear();
      state.deleteContentType.mockClear();
      state.updateContentType.mockClear();
      state.subscribeCacheEvents.mockClear();
    },
  };
});

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-alert-variant={variant ?? "default"}>{children}</div>
  ),
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
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-dialog-open="true">{children}</div> : null,
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

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
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
    SelectItem: ({ children }: { children: React.ReactNode; value: string }) => <>{children}</>,
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
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "kind" in error),
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    contentTypesList: "contentTypesList",
    contentTypeDetail: (id: string) => `contentTypeDetail:${id}`,
  },
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: state.getCachedContentTypes,
  listContentTypesCached: state.listContentTypesCached,
  duplicateContentType: state.duplicateContentType,
  deleteContentType: state.deleteContentType,
  updateContentType: state.updateContentType,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (href: string) => state.navigateCalls.push(href),
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
  resolveAdminRoutePath: (path: string) => path.replace(/^\/content-types/, "/advanced/engine"),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: state.subscribeCacheEvents,
}));

vi.mock("sonner", () => ({
  toast: {
    error: state.toastError,
    success: state.toastSuccess,
  },
}));

vi.mock("../../../core/admin/ui/content-types/ContentTypeCreateDrawer", () => ({
  ContentTypeCreateDrawer: () => null,
}));

const { ContentTypeList } = await import("../../../core/admin/ui/content-types/ContentTypeList");

const flush = () => React.act(async () => Promise.resolve());

const mount = () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  React.act(() => {
    root.render(<ContentTypeList />);
  });
  return {
    host,
    cleanup: () => {
      React.act(() => root.unmount());
      host.remove();
    },
  };
};

const setSelectValue = (select: HTMLSelectElement | undefined, value: string) => {
  if (!select) return;
  React.act(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const findSelectWithOption = (host: HTMLElement, value: string) =>
  Array.from(host.querySelectorAll("select")).find((select) =>
    select.querySelector(`option[value="${value}"]`)
  ) as HTMLSelectElement | undefined;

const clickButton = (host: HTMLElement, label: string) => {
  const button = Array.from(host.querySelectorAll("button")).find(
    (candidate) =>
      candidate.textContent?.includes(label) || candidate.getAttribute("aria-label") === label
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  React.act(() => {
    button.click();
  });
};

beforeEach(() => {
  state.reset();
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

test("surfaces an api load error in an alert", async () => {
  state.types = null;
  state.listContentTypesCached.mockRejectedValueOnce({
    kind: "http_error",
    message: "list boom",
  });
  const view = mount();
  try {
    await flush();
    expect(view.host.textContent).toContain("Unable to load content types");
    expect(view.host.textContent).toContain("list boom");
  } finally {
    view.cleanup();
  }
});

test("shows a generic load error for non-api failures", async () => {
  state.types = null;
  state.listContentTypesCached.mockRejectedValueOnce(new Error("offline"));
  const view = mount();
  try {
    await flush();
    expect(view.host.textContent).toContain("Unable to load content types");
    expect(view.host.textContent).toContain("Failed to load content types.");
  } finally {
    view.cleanup();
  }
});

test("reloads the list when a content-types cache event arrives", async () => {
  const view = mount();
  try {
    await flush();
    const callsBefore = state.listContentTypesCached.mock.calls.length;
    React.act(() => {
      state.triggerCacheEvent("contentTypesList");
    });
    await flush();
    expect(state.listContentTypesCached.mock.calls.length).toBeGreaterThan(callsBefore);

    const afterListEvent = state.listContentTypesCached.mock.calls.length;
    React.act(() => {
      state.triggerCacheEvent("contentTypeDetail:type-1");
    });
    await flush();
    expect(state.listContentTypesCached.mock.calls.length).toBe(afterListEvent);
  } finally {
    view.cleanup();
  }
});

test("keeps rendered rows when a cache-triggered reload fails", async () => {
  const view = mount();
  try {
    await flush();
    state.listContentTypesCached.mockRejectedValueOnce(new Error("cache refresh failed"));
    React.act(() => {
      state.triggerCacheEvent("contentTypesList");
    });
    await flush();
    expect(view.host.textContent).toContain("Type 1");
    expect(view.host.textContent).not.toContain("cache refresh failed");
  } finally {
    view.cleanup();
  }
});

test("sorts by name in table view and toggles direction", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Table view");
    expect(view.host.querySelector("table")).toBeTruthy();

    const clickNameHeader = () => {
      const header = Array.from(view.host.querySelectorAll("th")).find((candidate) =>
        candidate.textContent?.trim().startsWith("Name")
      );
      const button = header?.querySelector("button");
      if (!button) throw new Error("Missing sort header button");
      React.act(() => {
        button.click();
      });
    };

    clickNameHeader();
    const firstDesc = Array.from(view.host.querySelectorAll("tr"))[1]?.textContent ?? "";
    expect(firstDesc).toContain("Type 4");

    clickNameHeader();
    const firstAsc = Array.from(view.host.querySelectorAll("tr"))[1]?.textContent ?? "";
    expect(firstAsc).toContain("Type 1");
  } finally {
    view.cleanup();
  }
});

test("uses table controls for select-all, row selection, a new sort key, and duplicate", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Table view");
    const tableSelectAll = view.host.querySelector<HTMLButtonElement>(
      '[aria-label="Select all content types"]'
    );
    expect(tableSelectAll).not.toBeNull();
    React.act(() => {
      tableSelectAll!.click();
    });
    expect(view.host.textContent).toContain("Selected 4");

    const typeOneCheckbox = view.host.querySelector<HTMLButtonElement>(
      '[aria-label="Select Type 1"]'
    );
    expect(typeOneCheckbox).not.toBeNull();
    React.act(() => {
      typeOneCheckbox!.click();
    });
    expect(view.host.textContent).toContain("Selected 3");

    const slugHeader = Array.from(view.host.querySelectorAll("th")).find((header) =>
      header.textContent?.trim().startsWith("Slug")
    );
    const slugSort = slugHeader?.querySelector<HTMLButtonElement>("button");
    expect(slugSort).not.toBeNull();
    React.act(() => {
      slugSort!.click();
    });
    expect(slugHeader!.textContent).toContain("Slug ↑");

    const typeTwoActions = view.host.querySelector<HTMLButtonElement>(
      '[aria-label="Open actions for Type 2"]'
    );
    expect(typeTwoActions).not.toBeNull();
    React.act(() => {
      typeTwoActions!.click();
    });
    const typeTwoRow = typeTwoActions!.closest("tr");
    const duplicate = Array.from(typeTwoRow?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent === "Duplicate"
    );
    expect(duplicate).toBeDefined();
    React.act(() => {
      duplicate!.click();
    });
    await flush();
    expect(state.duplicateContentType).toHaveBeenCalledWith("type-2");
    expect(state.navigateCalls).toContain("/content-types/duplicated-type");
  } finally {
    view.cleanup();
  }
});

test("surfaces a table-row delete failure after confirmation", async () => {
  state.deleteContentType.mockRejectedValueOnce({ kind: "http_error", message: "delete denied" });
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Table view");
    const typeTwoActions = view.host.querySelector<HTMLButtonElement>(
      '[aria-label="Open actions for Type 2"]'
    );
    expect(typeTwoActions).not.toBeNull();
    React.act(() => {
      typeTwoActions!.click();
    });
    const typeTwoRow = typeTwoActions!.closest("tr");
    const remove = Array.from(typeTwoRow?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent === "Delete"
    );
    expect(remove).toBeDefined();
    React.act(() => {
      remove!.click();
    });
    expect(view.host.textContent).toContain("Delete content type?");
    clickButton(view.host, "Delete type");
    await flush();
    expect(state.deleteContentType).toHaveBeenCalledWith("type-2");
    expect(view.host.textContent).toContain("Failed to delete content type.");
  } finally {
    view.cleanup();
  }
});

test("duplicates a content type from the row actions", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Open actions for Type 1");
    clickButton(view.host, "Duplicate");
    await flush();
    expect(state.toastSuccess).toHaveBeenCalledWith('Duplicated "Type 1 copy".');
    expect(state.navigateCalls).toContain("/content-types/duplicated-type");
    expect(view.host.textContent).toContain("Type 1 copy");
  } finally {
    view.cleanup();
  }
});

test("surfaces duplicate failures through the error alert", async () => {
  state.duplicateContentType.mockRejectedValueOnce({
    kind: "http_error",
    message: "duplicate boom",
  });
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Open actions for Type 2");
    clickButton(view.host, "Duplicate");
    await flush();
    expect(view.host.textContent).toContain("Unable to load content types");
    expect(view.host.textContent).toContain("duplicate boom");
    expect(state.toastError).toHaveBeenCalledWith("duplicate boom");
  } finally {
    view.cleanup();
  }
});

test("falls back to a generic duplicate error message", async () => {
  state.duplicateContentType.mockRejectedValueOnce(new Error("copy failed"));
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Open actions for Type 2");
    clickButton(view.host, "Duplicate");
    await flush();
    expect(view.host.textContent).toContain("Failed to duplicate content type.");
  } finally {
    view.cleanup();
  }
});

test("toggles rows, shows the bulk bar and clears the selection", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Select Type 1");
    expect(view.host.textContent).toContain("Selected 1");
    expect(view.host.textContent).toContain("Apply");

    clickButton(view.host, "Clear selection");
    expect(view.host.textContent).not.toContain("Selected 1");
    expect(view.host.textContent).not.toContain("Apply");
  } finally {
    view.cleanup();
  }
});

test("applies a bulk draft to selected rows", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Select Type 1");
    setSelectValue(findSelectWithOption(view.host, "draft"), "draft");
    await React.act(async () => {
      clickButton(view.host, "Apply");
      await Promise.resolve();
    });
    expect(state.updateCalls).toEqual([{ id: "type-1", status: "draft" }]);
    expect(view.host.textContent).toContain("Bulk action completed");
    expect(view.host.textContent).not.toContain("Selected 1");
  } finally {
    view.cleanup();
  }
});

test("keeps failed draft targets selected and reports the exact bulk failure", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Select all content types");
    setSelectValue(findSelectWithOption(view.host, "draft"), "draft");
    for (let index = 0; index < 4; index += 1) {
      state.updateContentType.mockRejectedValueOnce(new Error(`draft failure ${index}`));
    }
    await React.act(async () => {
      clickButton(view.host, "Apply");
      await Promise.resolve();
    });
    expect(view.host.textContent).toContain("Failed to move 4 content types to draft.");
    expect(view.host.textContent).toContain("Selected 4");
  } finally {
    view.cleanup();
  }
});

test("reports a bulk failure when the post-update list refresh rejects", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Select Type 1");
    setSelectValue(findSelectWithOption(view.host, "publish"), "publish");
    state.listContentTypesCached.mockRejectedValueOnce(new Error("follow-up list failed"));
    await React.act(async () => {
      clickButton(view.host, "Apply");
      await Promise.resolve();
    });
    expect(view.host.textContent).toContain("Bulk action failed.");
  } finally {
    view.cleanup();
  }
});

test("shows an empty state when filters match nothing", async () => {
  const view = mount();
  try {
    await flush();
    const search = view.host.querySelector<HTMLInputElement>(
      'input[placeholder="Search by name or slug..."]'
    );
    React.act(() => {
      if (!search) throw new Error("Missing search input");
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        search,
        "zzz"
      );
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(view.host.textContent).toContain("No matching content types");
    expect(view.host.textContent).toContain("No content types match the current filters.");

    React.act(() => {
      if (!search) throw new Error("Missing search input");
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    setSelectValue(findSelectWithOption(view.host, "published"), "published");
    expect(view.host.textContent).toContain("Type 2");
    expect(view.host.textContent).not.toContain("Type 1");
  } finally {
    view.cleanup();
  }
});

test("switches from table back to grid with the visible pressed-state change", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Table view");
    const grid = view.host.querySelector<HTMLButtonElement>('[aria-label="Grid view"]');
    expect(grid?.getAttribute("aria-pressed")).toBe("false");
    React.act(() => {
      grid!.click();
    });
    expect(grid?.getAttribute("aria-pressed")).toBe("true");
    expect(view.host.querySelector("table")).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("renders the loading skeleton until the initial fetch settles", async () => {
  state.types = null;
  state.listContentTypesCached.mockImplementationOnce(() => new Promise(() => undefined));
  const view = mount();
  try {
    await flush();
    expect(view.host.textContent).toContain("Loading");
  } finally {
    view.cleanup();
  }
});

test("bulk delete confirms and removes the selected types", async () => {
  const view = mount();
  try {
    await flush();
    clickButton(view.host, "Select all content types");
    setSelectValue(findSelectWithOption(view.host, "delete"), "delete");
    clickButton(view.host, "Apply");
    expect(view.host.textContent).toContain("Delete selected content types?");
    expect(state.deleteCalls).toEqual([]);

    clickButton(view.host, "Delete selected");
    await flush();
    expect(state.deleteCalls.sort()).toEqual(["type-1", "type-2", "type-3", "type-4"]);
    expect(view.host.textContent).not.toContain("Type 1");
  } finally {
    view.cleanup();
  }
});

test("bulk apply is a no-op without a selection or action", async () => {
  const view = mount();
  try {
    await flush();
    const applyButton = Array.from(view.host.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Apply")
    );
    expect(applyButton).toBeFalsy();
    expect(state.updateCalls).toEqual([]);
    expect(state.deleteCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});
