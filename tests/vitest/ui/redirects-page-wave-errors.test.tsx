// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
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
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    value?: string | number | readonly string[];
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
  }) => (
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

test("RedirectsPage drawer save surfaces generic failures", async () => {
  redirectsState.reset();
  redirectsState.listResult = [];
  redirectsState.createError = new Error("boom");
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

    expect(view.container.textContent).toContain("Failed to save redirect.");
    expect(toastState.error).toHaveBeenCalledWith("Failed to save redirect.");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage surfaces generic toggle failures", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  redirectsState.updateError = new Error("boom");
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
    expect(view.container.textContent).toContain("Failed to update redirect.");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage surfaces generic delete failures", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  redirectsState.deleteError = new Error("boom");
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
    expect(view.container.textContent).toContain("Failed to delete redirect.");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage row selection toggles off and select-all toggles off", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const rowCheckboxes = Array.from(
      view.container.querySelectorAll<HTMLInputElement>("input[aria-label^='Select redirect from']")
    );
    React.act(() => {
      rowCheckboxes[0]?.click();
    });
    await flushEffects();
    expect(view.container.textContent).toContain("1 selected");
    React.act(() => {
      rowCheckboxes[0]?.click();
    });
    await flushEffects();
    expect(view.container.textContent).not.toContain("selected");

    const selectAll = view.container.querySelector(
      "input[aria-label='Select all redirects']"
    ) as HTMLInputElement | null;
    React.act(() => {
      selectAll?.click();
    });
    await flushEffects();
    expect(view.container.textContent).toContain("2 selected");
    React.act(() => {
      selectAll?.click();
    });
    await flushEffects();
    expect(view.container.textContent).not.toContain("selected");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage bulk action surfaces a refresh failure", async () => {
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

    redirectsState.listError = { kind: "api", message: "Refresh failed" };
    const bulkSelect = view.container.querySelector("select") as HTMLSelectElement | null;
    if (!bulkSelect) throw new Error("missing bulk select");
    React.act(() => {
      bulkSelect.value = "enable";
      bulkSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clickButton(view.container, "Apply");
    await flushEffects();
    expect(view.container.textContent).toContain("Refresh failed");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage bulk apply is a no-op without a bulk action", async () => {
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
    const applyButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Apply"
    );
    React.act(() => {
      applyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushEffects();
    expect(redirectsState.updateRedirect).not.toHaveBeenCalled();
    expect(redirectsState.deleteRedirect).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage bulk apply is a no-op when selection was cleared", async () => {
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
      bulkSelect.value = "enable";
      bulkSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const applyButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Apply"
    );
    const rowCheckboxes = Array.from(
      view.container.querySelectorAll<HTMLInputElement>("input[aria-label^='Select redirect from']")
    );
    React.act(() => {
      rowCheckboxes[0]?.click();
      rowCheckboxes[1]?.click();
    });
    await flushEffects();
    React.act(() => {
      applyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushEffects();
    expect(redirectsState.updateRedirect).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage cancelling delete dialogs clears the pending state", async () => {
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
    clickButton(view.container, "cancel-confirm");
    await flushEffects();
    expect(view.container.textContent).not.toContain("Delete redirect?");
    expect(redirectsState.deleteRedirect).not.toHaveBeenCalled();

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
    clickButton(view.container, "cancel-confirm");
    await flushEffects();
    expect(view.container.textContent).not.toContain("Delete selected redirects?");
    expect(redirectsState.deleteRedirect).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage deletes a selected redirect and clears its selection", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    const rowCheckboxes = Array.from(
      view.container.querySelectorAll<HTMLInputElement>("input[aria-label^='Select redirect from']")
    );
    React.act(() => {
      rowCheckboxes[0]?.click();
    });
    await flushEffects();
    expect(view.container.textContent).toContain("1 selected");

    const deleteButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Delete redirect"
    );
    React.act(() => {
      deleteButton?.click();
    });
    clickButton(view.container, "Delete");
    await flushEffects();
    expect(redirectsState.deleteRedirect).toHaveBeenCalledWith("redirect-1");
    expect(view.container.textContent).not.toContain("1 selected");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage paginates with Previous and Next controls", async () => {
  redirectsState.reset();
  redirectsState.listResult = Array.from({ length: 12 }, (_, index) => ({
    id: `redirect-${index + 1}`,
    fromPath: `/old-${index + 1}`,
    toPath: `/new-${index + 1}`,
    statusCode: 301 as const,
    enabled: true,
    createdAt: "2026-03-06",
    updatedAt: "2026-03-06",
  }));
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    expect(view.container.textContent).toContain("Page 1 of 2");
    expect(view.container.textContent).toContain("Showing 10 of 12 redirects");

    clickButton(view.container, "Next");
    await flushEffects();
    expect(view.container.textContent).toContain("Page 2 of 2");
    expect(view.container.textContent).toContain("/old-11");

    clickButton(view.container, "Previous");
    await flushEffects();
    expect(view.container.textContent).toContain("Page 1 of 2");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage refreshes from the redirects cache event", async () => {
  redirectsState.reset();
  redirectsState.listResult = baseRedirects();
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    redirectsState.listResult = [
      ...baseRedirects(),
      {
        id: "redirect-3",
        fromPath: "/old-3",
        toPath: "/new-3",
        statusCode: 308 as const,
        enabled: true,
        createdAt: "2026-03-06",
        updatedAt: "2026-03-06",
      },
    ];
    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.redirectsList, action: "invalidate" });
    });
    await flushEffects();
    expect(view.container.textContent).toContain("/old-3");
    expect(redirectsState.listRedirectsCached).toHaveBeenCalledWith({ force: true });
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage shows a loading state while fetching", async () => {
  redirectsState.reset();
  redirectsState.listError = new Error("boom");
  const view = mount(<RedirectsPage />);

  try {
    expect(view.container.textContent).toContain("Loading redirects...");
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to load redirects.");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage shows an empty state when nothing is configured", async () => {
  redirectsState.reset();
  redirectsState.listResult = [];
  const view = mount(<RedirectsPage />);

  try {
    await flushEffects();
    expect(view.container.textContent).toContain("No redirects found.");
    expect(view.container.textContent).toContain("Showing 0 of 0 redirects");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});

test("RedirectsPage bulk action surfaces synchronous client failures", async () => {
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

    // A synchronous API rejection from the per-row client escapes the
    // allSettled batch and lands in the bulk action catch.
    redirectsState.updateRedirect.mockImplementationOnce(() => {
      throw { kind: "api", message: "bulk sync api boom" };
    });
    const bulkSelect = view.container.querySelector("select") as HTMLSelectElement | null;
    if (!bulkSelect) throw new Error("missing bulk select");
    React.act(() => {
      bulkSelect.value = "enable";
      bulkSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clickButton(view.container, "Apply");
    await flushEffects();
    expect(view.container.textContent).toContain("bulk sync api boom");
    expect(toastState.error).toHaveBeenCalledWith("bulk sync api boom");

    // A synchronous generic failure surfaces the fallback message instead.
    redirectsState.updateRedirect.mockImplementationOnce(() => {
      throw new Error("sync exploded");
    });
    const secondSelect = view.container.querySelector("select") as HTMLSelectElement | null;
    if (!secondSelect) throw new Error("missing bulk select");
    React.act(() => {
      secondSelect.value = "enable";
      secondSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clickButton(view.container, "Apply");
    await flushEffects();
    expect(view.container.textContent).toContain("Bulk redirect action failed.");
    expect(toastState.error).toHaveBeenCalledWith("Bulk redirect action failed.");
  } finally {
    view.cleanup();
    redirectsState.reset();
  }
});
