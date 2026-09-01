// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import { RedirectsPage } from "../../../core/admin/ui/redirects/RedirectsPage";

const redirectsState = vi.hoisted(() => ({
  listResult: [] as Array<{
    id: string;
    fromPath: string;
    toPath: string;
    statusCode: 301 | 302 | 307 | 308;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }>,
  listError: null as unknown,
  createError: null as unknown,
  updateError: null as unknown,
  deleteError: null as unknown,
  listRedirectsCached: vi.fn(async () => {
    if (redirectsState.listError) throw redirectsState.listError;
    return redirectsState.listResult;
  }),
  getCachedRedirects: vi.fn(() => null),
  createRedirect: vi.fn(async (payload: unknown) => {
    if (redirectsState.createError) throw redirectsState.createError;
    redirectsState.listResult = [
      ...redirectsState.listResult,
      {
        id: "created-1",
        fromPath: (payload as { fromPath: string }).fromPath,
        toPath: (payload as { toPath: string }).toPath,
        statusCode: (payload as { statusCode: 301 | 302 | 307 | 308 }).statusCode,
        enabled: (payload as { enabled?: boolean }).enabled ?? true,
        createdAt: "2026-03-06",
        updatedAt: "2026-03-06",
      },
    ];
    return redirectsState.listResult[redirectsState.listResult.length - 1];
  }),
  updateRedirect: vi.fn(async (id: string, payload: unknown) => {
    if (redirectsState.updateError) throw redirectsState.updateError;
    const index = redirectsState.listResult.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("missing");
    redirectsState.listResult[index] = {
      ...redirectsState.listResult[index],
      ...(payload as { enabled?: boolean; fromPath?: string; toPath?: string }),
    };
    return redirectsState.listResult[index];
  }),
  deleteRedirect: vi.fn(async (id: string) => {
    if (redirectsState.deleteError) throw redirectsState.deleteError;
    redirectsState.listResult = redirectsState.listResult.filter((item) => item.id !== id);
    return { ok: true };
  }),
  reset() {
    redirectsState.listResult = [];
    redirectsState.listError = null;
    redirectsState.createError = null;
    redirectsState.updateError = null;
    redirectsState.deleteError = null;
    redirectsState.listRedirectsCached.mockClear();
    redirectsState.createRedirect.mockClear();
    redirectsState.updateRedirect.mockClear();
    redirectsState.deleteRedirect.mockClear();
  },
}));

const toastState = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastState.success,
    error: toastState.error,
  },
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" && error !== null && "kind" in error && error.kind === "api",
}));

vi.mock("@/services/redirectsClient", () => ({
  listRedirectsCached: redirectsState.listRedirectsCached,
  getCachedRedirects: redirectsState.getCachedRedirects,
  createRedirect: redirectsState.createRedirect,
  updateRedirect: redirectsState.updateRedirect,
  deleteRedirect: redirectsState.deleteRedirect,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: string;
    [key: string]: unknown;
  }) => (
    <button
      type={type === "submit" ? "submit" : "button"}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
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
  } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) => (
    <input
      {...props}
      value={value}
      onInput={(event) => onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>)}
      onChange={onChange}
    />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <input
      type="checkbox"
      data-indeterminate={checked === "indeterminate" ? "true" : undefined}
      checked={checked === true}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
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

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <section>{children}</section> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      {children}
    </div>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </div>
  ),
}));

vi.mock("@/ui/shared/StatCard", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <span>{title}</span>
        <span>{description}</span>
        <button type="button" onClick={() => void onConfirm()}>
          {confirmLabel}
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          cancel-confirm
        </button>
      </div>
    ) : null,
}));

import {
  baseRedirects,
  clickButton,
  flushEffects,
  mount,
  setInputValue,
} from "./redirectsWaveFixtures";

test("RedirectsPage renders stats, rows, badges, and search", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    expect(view.container.textContent).toContain("Site management - 1 active routes.");
    expect(view.container.textContent).toContain("Total redirects");
    expect(view.container.textContent).toContain("/old-home");
    expect(view.container.textContent).toContain("301");
    expect(view.container.textContent).toContain("302");
    expect(view.container.textContent).toContain("Showing 2 of 2 redirects");

    const search = view.container.querySelector(
      "input[placeholder='Search redirects...']"
    ) as HTMLInputElement | null;
    if (!search) throw new Error("missing search");
    React.act(() => {
      setInputValue(search, "zzz");
    });
    await flushEffects();
    expect(view.container.textContent).toContain("No redirects match your search.");
    expect(view.container.textContent).toContain("Showing 0 of 0 redirects");

    React.act(() => {
      setInputValue(search, "shop");
    });
    await flushEffects();
    expect(view.container.textContent).toContain("/shop-old");
    expect(view.container.textContent).not.toContain("/old-home");
    expect(view.container.textContent).toContain("Showing 1 of 1 redirects");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage inline quick-add creates a redirect through the shared path", async () => {
  redirectsState.reset();
  redirectsState.listResult = [];
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const fromInput = view.container.querySelector(
      "input[aria-label='Redirect source path']"
    ) as HTMLInputElement | null;
    const toInput = view.container.querySelector(
      "input[aria-label='Redirect destination path']"
    ) as HTMLInputElement | null;
    if (!fromInput || !toInput) throw new Error("missing inline inputs");

    React.act(() => {
      setInputValue(fromInput, "/legacy");
      setInputValue(toInput, "/archive");
    });
    const typeSelect = view.container.querySelector("select") as HTMLSelectElement | null;
    if (!typeSelect) throw new Error("missing type select");
    React.act(() => {
      typeSelect.value = "308";
      typeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clickButton(view.container, "Add");
    await flushEffects();

    expect(redirectsState.createRedirect).toHaveBeenCalledWith({
      fromPath: "/legacy",
      toPath: "/archive",
      statusCode: 308,
    });
    expect(toastState.success).toHaveBeenCalledWith("Redirect created.");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage inline quick-add is a no-op when fields are blank", async () => {
  redirectsState.reset();
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    clickButton(view.container, "Add");
    await flushEffects();
    expect(redirectsState.createRedirect).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage drawer create saves normalized values and closes", async () => {
  redirectsState.reset();
  redirectsState.listResult = [];
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    clickButton(view.container, "Create");
    expect(view.container.textContent).toContain("New Redirect");

    const source = view.container.querySelector("#redirect-source") as HTMLInputElement | null;
    const destination = view.container.querySelector(
      "#redirect-destination"
    ) as HTMLInputElement | null;
    if (!source || !destination) throw new Error("missing drawer inputs");

    React.act(() => {
      setInputValue(source, "promo");
      setInputValue(destination, "/shop");
    });
    const drawerSelects = Array.from(
      view.container.querySelectorAll<HTMLSelectElement>("section select")
    );
    const typeSelect = drawerSelects.find((select) =>
      Array.from(select.options).some((option) => option.textContent?.startsWith("308"))
    );
    if (!typeSelect) throw new Error("missing drawer type select");
    React.act(() => {
      typeSelect.value = "308";
      typeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clickButton(view.container, "Add redirect");
    await flushEffects();

    expect(redirectsState.createRedirect).toHaveBeenCalledWith({
      fromPath: "/promo",
      toPath: "/shop",
      statusCode: 308,
      enabled: true,
    });
    expect(view.container.textContent).not.toContain("New Redirect");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage drawer save is a no-op when fields are empty", async () => {
  redirectsState.reset();
  redirectsState.listResult = [];
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    clickButton(view.container, "Create");
    const saveButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Add redirect"
    );
    expect(saveButton?.hasAttribute("disabled")).toBe(true);
    React.act(() => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushEffects();
    expect(redirectsState.createRedirect).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage drawer save surfaces API errors and keeps the drawer open", async () => {
  redirectsState.reset();
  redirectsState.listResult = [];
  redirectsState.createError = { kind: "api", message: "Source path already exists" };
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    clickButton(view.container, "Create");

    const source = view.container.querySelector("#redirect-source") as HTMLInputElement | null;
    const destination = view.container.querySelector(
      "#redirect-destination"
    ) as HTMLInputElement | null;
    if (!source || !destination) throw new Error("missing drawer inputs");

    React.act(() => {
      setInputValue(source, "promo");
      setInputValue(destination, "/shop");
    });
    clickButton(view.container, "Add redirect");
    await flushEffects();

    expect(view.container.textContent).toContain("Source path already exists");
    expect(view.container.textContent).toContain("New Redirect");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage drawer edit prefills and updates the redirect", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const editButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (button) => button.getAttribute("aria-label") === "Edit redirect"
    );
    React.act(() => {
      editButtons[0]?.click();
    });
    expect(view.container.textContent).toContain("Edit Redirect");
    const source = view.container.querySelector("#redirect-source") as HTMLInputElement | null;
    if (!source) throw new Error("missing source");
    expect(source.value).toBe("old-home");

    React.act(() => {
      setInputValue(source, "new-home");
    });
    clickButton(view.container, "Save changes");
    await flushEffects();

    expect(redirectsState.updateRedirect).toHaveBeenCalledWith("redirect-1", {
      fromPath: "/new-home",
      toPath: "/home",
      statusCode: 301,
      enabled: true,
    });
    expect(view.container.textContent).not.toContain("Edit Redirect");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage toggles a redirect active state", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const disableButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Disable redirect"
    );
    React.act(() => {
      disableButton?.click();
    });
    await flushEffects();
    expect(redirectsState.updateRedirect).toHaveBeenCalledWith("redirect-1", {
      enabled: false,
    });

    const enableButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Enable redirect"
    );
    React.act(() => {
      enableButton?.click();
    });
    await flushEffects();
    expect(redirectsState.updateRedirect).toHaveBeenCalledWith("redirect-1", {
      enabled: true,
    });
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage surfaces toggle API errors", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  redirectsState.updateError = { kind: "api", message: "Toggle failed" };
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const disableButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Disable redirect"
    );
    React.act(() => {
      disableButton?.click();
    });
    await flushEffects();
    expect(view.container.textContent).toContain("Toggle failed");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage deletes a redirect through the confirm dialog", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const deleteButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Delete redirect"
    );
    React.act(() => {
      deleteButton?.click();
    });
    expect(view.container.textContent).toContain("Delete redirect?");
    expect(view.container.textContent).toContain(
      "Delete redirect from /old-home to /home? This cannot be undone."
    );

    clickButton(view.container, "Delete");
    await flushEffects();
    expect(redirectsState.deleteRedirect).toHaveBeenCalledWith("redirect-1");
    expect(view.container.textContent).not.toContain("/old-home");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage surfaces delete API errors", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  redirectsState.deleteError = { kind: "api", message: "Delete failed" };
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const deleteButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Delete redirect"
    );
    React.act(() => {
      deleteButton?.click();
    });
    clickButton(view.container, "Delete");
    await flushEffects();
    expect(view.container.textContent).toContain("Delete failed");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage bulk enable applies to selected redirects", async () => {
  redirectsState.reset();
  redirectsState.listResult = [
    ...baseRedirects(),
    {
      id: "redirect-3",
      fromPath: "/old-3",
      toPath: "/new-3",
      statusCode: 307 as const,
      enabled: false,
      createdAt: "2026-03-06",
      updatedAt: "2026-03-06",
    },
  ];
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const rowCheckboxes = Array.from(
      view.container.querySelectorAll<HTMLInputElement>("input[aria-label^='Select redirect from']")
    );
    React.act(() => {
      rowCheckboxes[0]?.click();
      rowCheckboxes[1]?.click();
    });
    await flushEffects();
    expect(view.container.textContent).toContain("2 selected");

    const bulkSelect = view.container.querySelector("select") as HTMLSelectElement | null;
    if (!bulkSelect) throw new Error("missing bulk select");
    React.act(() => {
      bulkSelect.value = "enable";
      bulkSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clickButton(view.container, "Apply");
    await flushEffects();

    expect(redirectsState.updateRedirect).toHaveBeenCalledWith("redirect-1", {
      enabled: true,
    });
    expect(redirectsState.updateRedirect).toHaveBeenCalledWith("redirect-2", {
      enabled: true,
    });
    expect(view.container.textContent).not.toContain("2 selected");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage bulk disable and clear selection", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const selectAll = view.container.querySelector(
      "input[aria-label='Select all redirects']"
    ) as HTMLInputElement | null;
    React.act(() => {
      selectAll?.click();
    });
    await flushEffects();
    expect(view.container.textContent).toContain("2 selected");

    const bulkSelect = view.container.querySelector("select") as HTMLSelectElement | null;
    if (!bulkSelect) throw new Error("missing bulk select");
    React.act(() => {
      bulkSelect.value = "disable";
      bulkSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clickButton(view.container, "Apply");
    await flushEffects();
    expect(redirectsState.updateRedirect).toHaveBeenCalledWith("redirect-1", {
      enabled: false,
    });
    expect(redirectsState.updateRedirect).toHaveBeenCalledWith("redirect-2", {
      enabled: false,
    });

    const rowCheckboxes = Array.from(
      view.container.querySelectorAll<HTMLInputElement>("input[aria-label^='Select redirect from']")
    );
    React.act(() => {
      rowCheckboxes[0]?.click();
    });
    await flushEffects();
    clickButton(view.container, "Clear");
    await flushEffects();
    expect(view.container.textContent).not.toContain("selected");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage bulk delete confirms and removes redirects", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const selectAll = view.container.querySelector(
      "input[aria-label='Select all redirects']"
    ) as HTMLInputElement | null;
    React.act(() => {
      selectAll?.click();
    });
    await flushEffects();

    const bulkSelect = view.container.querySelector("select") as HTMLSelectElement | null;
    if (!bulkSelect) throw new Error("missing bulk select");
    React.act(() => {
      bulkSelect.value = "delete";
      bulkSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clickButton(view.container, "Apply");
    expect(view.container.textContent).toContain("Delete selected redirects?");
    expect(view.container.textContent).toContain("Delete 2 redirects? This cannot be undone.");

    clickButton(view.container, "Delete selected");
    await flushEffects();
    expect(redirectsState.deleteRedirect).toHaveBeenCalledWith("redirect-1");
    expect(redirectsState.deleteRedirect).toHaveBeenCalledWith("redirect-2");
    expect(toastState.success).toHaveBeenCalledWith("2 redirects deleted.");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage bulk action reports partial failures", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const selectAll = view.container.querySelector(
      "input[aria-label='Select all redirects']"
    ) as HTMLInputElement | null;
    React.act(() => {
      selectAll?.click();
    });
    await flushEffects();

    redirectsState.updateRedirect.mockImplementationOnce(async () => {
      throw { kind: "api", message: "second failed" };
    });

    const bulkSelect = view.container.querySelector("select") as HTMLSelectElement | null;
    if (!bulkSelect) throw new Error("missing bulk select");
    React.act(() => {
      bulkSelect.value = "enable";
      bulkSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clickButton(view.container, "Apply");
    await flushEffects();

    expect(view.container.textContent).toContain("Updated 1 redirect; failed 1.");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});
