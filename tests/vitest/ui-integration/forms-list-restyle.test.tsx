// @vitest-environment happy-dom

// TASK-479-15-L01 / L04: locks the Forms LIST restyle (soft/violet stat band +
// rounded-2xl table) while proving the restyle is presentation-only — the stat
// band derives from real in-state items, name links resolve through the admin
// path helpers, and no fabricated field/submission count columns are shown.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { DEFAULT_ADMIN_PATH, resolveAdminHref } from "../../../core/admin/utils/adminPaths";

const listState = vi.hoisted(() => {
  const makeForm = (
    id: string,
    name: string,
    status: "published" | "draft" | "archived",
    submissionAccess: "public" | "internal"
  ) => ({
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    status,
    description: `${name} description`,
    successMessage: null,
    successRedirectUrl: null,
    submissionAccess,
    settings: {
      layoutMode: "single" as const,
      saveProgress: false,
      stepTitles: [],
      preset: "custom" as const,
      automationRetry: { enabled: false, maxAttempts: 1, baseDelayMs: 300, maxDelayMs: 2000 },
    },
    createdAt: "2026-03-06T10:00:00.000Z",
    updatedAt: "2026-03-06T10:00:00.000Z",
  });

  const forms = [
    makeForm("contact", "Contact", "published", "public"),
    makeForm("newsletter", "Newsletter", "published", "public"),
    makeForm("demo", "Demo", "published", "internal"),
    makeForm("job", "Job application", "draft", "public"),
    makeForm("rsvp", "Event RSVP", "draft", "internal"),
  ];

  return {
    forms,
    reset() {
      this.forms = [...forms];
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/formsClient", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/services/formsClient");
  return {
    ...actual,
    getCachedForms: () => listState.forms,
    listFormsCached: vi.fn(async () => listState.forms),
    createForm: vi.fn(async () => listState.forms[0]),
    updateForm: vi.fn(async () => listState.forms[0]),
    deleteForm: vi.fn(async () => ({ ok: true })),
  };
});

vi.mock("@/services/userSettingsClient", () => ({
  getUserSettings: vi.fn(async () => ({ "forms.openAfterCreate": true })),
  setUserSetting: vi.fn(async () => undefined),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children, activeHref }: { children: React.ReactNode; activeHref?: string }) => (
    <div data-active-href={activeHref}>{children}</div>
  ),
}));

vi.mock("@/ui/shared/ListPaginationFooter", () => ({
  ListPaginationFooter: () => <div data-testid="pagination" />,
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: () => null,
}));

// Native checkbox so selection toggles fire without radix internals.
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    onCheckedChange,
    checked,
    ...props
  }: {
    onCheckedChange?: (checked: boolean) => void;
    checked?: boolean | "indeterminate";
    [key: string]: unknown;
  }) => (
    <input
      type="checkbox"
      checked={checked === true}
      onChange={() => onCheckedChange?.(true)}
      {...props}
    />
  ),
}));

// Native select + closed dropdown so the real FormTable/FormFilters chrome
// renders without radix portal/observer dependencies.
vi.mock("@/components/ui/select", () => {
  const flatten = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) =>
        typeof child === "string" || typeof child === "number"
          ? String(child)
          : React.isValidElement(child)
            ? flatten(child.props.children)
            : ""
      )
      .join("");
  const options = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flatten(child.props.children) }];
      }
      return options(child.props.children);
    });
  return {
    Select: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {options(children).map((option) => (
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

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: () => null,
  DropdownMenuItem: () => null,
  DropdownMenuSeparator: () => null,
}));

vi.mock("../../../core/admin/ui/forms/FormCreateDrawer", () => ({
  FormCreateDrawer: ({ open }: { open: boolean }) => (
    <div data-testid="create-drawer">{open ? "drawer-open" : "drawer-closed"}</div>
  ),
}));

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
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const renderList = async () => {
  const { AdminRouterProvider } =
    await import("../../../core/admin/ui/contexts/AdminRouterContext");
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/forms">
      <FormListPage />
    </AdminRouterProvider>
  );
  await flush();
  return view;
};

afterEach(() => {
  listState.reset();
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/");
});

test("renders the stat band derived from items (Total/Active/Drafts)", async () => {
  const view = await renderList();
  try {
    const cards = Array.from(view.container.querySelectorAll<HTMLElement>('[data-slot="card"]'));
    const findCard = (label: string) => cards.find((card) => card.textContent?.includes(label));

    expect(view.container.textContent).toContain("Total forms");
    expect(view.container.textContent).toContain("Active");
    expect(view.container.textContent).toContain("Drafts");

    // 3 published + 2 draft seeded → Total 5 / Active 3 / Drafts 2.
    expect(findCard("Total forms")?.textContent).toContain("5");
    expect(findCard("Active")?.textContent).toContain("3");
    expect(findCard("Drafts")?.textContent).toContain("2");
  } finally {
    view.cleanup();
  }
});

test("renders one row per form with Status/Access badges + resolved name link", async () => {
  const view = await renderList();
  try {
    const rows = view.container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(listState.forms.length);

    const link = view.container.querySelector<HTMLAnchorElement>(
      'a[aria-label="Edit form: Contact"]'
    );
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe(
      resolveAdminHref(DEFAULT_ADMIN_PATH, "/advanced/forms/contact")
    );

    // Status + access badges still render their real domain labels.
    expect(view.container.textContent).toContain("Public");
    expect(view.container.textContent).toContain("Internal");
  } finally {
    view.cleanup();
  }
});

test("does NOT render fabricated field/submission count columns", async () => {
  const view = await renderList();
  try {
    const headText = view.container.querySelector("thead")?.textContent ?? "";
    expect(headText).not.toContain("Fields");
    expect(headText).not.toContain("Submissions");
    expect(headText).not.toContain("Last submission");
    // The real, derivable columns remain.
    expect(headText).toContain("Status");
    expect(headText).toContain("Access");
    expect(headText).toContain("Last updated");
  } finally {
    view.cleanup();
  }
});

test("selection shows FormBulkActionsBar; New opens FormCreateDrawer", async () => {
  const view = await renderList();
  try {
    expect(view.container.textContent).toContain("drawer-closed");

    const checkbox = view.container.querySelector<HTMLInputElement>(
      'input[aria-label="Select Contact"]'
    );
    expect(checkbox).not.toBeNull();
    await React.act(async () => {
      checkbox?.click();
    });
    expect(view.container.textContent).toContain("Selected 1");

    const newButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "New"
    );
    await React.act(async () => {
      newButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("drawer-open");
  } finally {
    view.cleanup();
  }
});
