// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const listState = vi.hoisted(() => ({
  items: [] as Array<Record<string, unknown>>,
  isLoading: false,
  loadError: null as string | null,
  refresh: vi.fn(async () => undefined),
  deleteError: null as unknown,
  statusError: null as unknown,
}));

const editorState = vi.hoisted(() => ({
  cachedRecord: null as Record<string, unknown> | null,
  fetchedRecord: null as Record<string, unknown> | null,
  fetchError: null as unknown,
  createdRecord: null as Record<string, unknown> | null,
  updatedRecord: null as Record<string, unknown> | null,
  saveError: null as unknown,
  listeners: [] as Array<(event: { key: string }) => void>,
}));

vi.mock("../../../core/admin/ui/popups/hooks/usePopups", () => ({
  usePopups: () => ({
    items: listState.items as never[],
    isLoading: listState.isLoading,
    error: listState.loadError,
    refresh: listState.refresh,
  }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    />
  ),
}));

vi.mock("@/services/popupsClient", async () => {
  const actual = await import("../../../core/admin/services/popupsClient");
  return {
    ...actual,
    deletePopup: vi.fn(async () => {
      if (listState.deleteError) throw listState.deleteError;
      return { ok: true };
    }),
    updatePopupStatus: vi.fn(async () => {
      if (listState.statusError) throw listState.statusError;
      return { ok: true };
    }),
    getCachedPopup: vi.fn(() => editorState.cachedRecord),
    getPopupCached: vi.fn(async () => {
      if (editorState.fetchError) throw editorState.fetchError;
      return editorState.fetchedRecord;
    }),
    createPopup: vi.fn(async () => {
      if (editorState.saveError) throw editorState.saveError;
      return editorState.createdRecord;
    }),
    updatePopup: vi.fn(async () => {
      if (editorState.saveError) throw editorState.saveError;
      return editorState.updatedRecord;
    }),
  };
});

vi.mock("@/services/cachePolicy", async () => {
  const actual = await import("../../../core/admin/services/cachePolicy");
  return { ...actual, cacheKeys: { ...actual.cacheKeys, popupsList: "popups:list" } };
});

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (listener: (event: { key: string }) => void) => {
    editorState.listeners.push(listener);
    return () => {
      editorState.listeners = editorState.listeners.filter((entry) => entry !== listener);
    };
  },
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: React.ReactNode;
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

vi.mock("@/ui/shared/StatCard", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid="stat-card">
      <span data-testid={`stat-${label.toLowerCase()}`}>{value}</span>
      {label}
    </div>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children?: React.ReactNode;
  }) => (
    <select
      data-testid="status-tabs"
      aria-label="Status filter"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  TabsList: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TabsTrigger: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import { ApiClientError } from "../../../core/admin/services/apiClient";
import type { PopupRecord } from "../../../core/admin/services/popupsClient";
import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../core/admin/ui/contexts/AdminRouterContext";
import { PopupEditorPage } from "../../../core/admin/ui/popups/PopupEditorPage";
import { PopupsListPage } from "../../../core/admin/ui/popups/PopupsListPage";
import { samplePopup } from "./popup-editor-model.test";

// Sibling probe that renders the live router path so navigation clicks are observable.
const RouterPathProbe = () => {
  const { path } = useAdminRouter();
  return <div data-testid="probe-path">{path}</div>;
};

const record = (): PopupRecord => samplePopup() as unknown as PopupRecord;

const mount = (node: React.ReactNode, initialPath: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<AdminRouterProvider initialPath={initialPath}>{node}</AdminRouterProvider>);
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const clickButtonWithText = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button ${label}`);
  React.act(() => {
    button.click();
  });
};

const setInputByLabel = (container: HTMLElement, selector: string, value: string) => {
  const input = container.querySelector<HTMLInputElement>(selector)!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  React.act(() => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

afterEach(async () => {
  listState.items = [];
  listState.isLoading = false;
  listState.loadError = null;
  listState.deleteError = null;
  listState.statusError = null;
  listState.refresh.mockClear();
  editorState.cachedRecord = null;
  editorState.fetchedRecord = null;
  editorState.fetchError = null;
  editorState.createdRecord = null;
  editorState.updatedRecord = null;
  editorState.saveError = null;
  // Mock call counts accumulate across tests in this file; clear them so the
  // "bare popups path" assertion below can check getPopupCached from a clean slate.
  const popups = await import("@/services/popupsClient");
  vi.mocked(popups.getPopupCached).mockClear();
  vi.mocked(popups.createPopup).mockClear();
  vi.mocked(popups.updatePopup).mockClear();
  document.body.innerHTML = "";
});

describe("PopupsListPage interactions", () => {
  it("renders stat counts, rows, and filters by search text", () => {
    listState.items = [
      record(),
      { ...record(), id: "popup-2", name: "Exit Catcher", slug: "exit-catcher", status: "draft" },
    ] as never[];
    const view = mount(<PopupsListPage />, "/admin/advanced/popups");

    expect(view.container.querySelector("[data-testid='stat-total']")!.textContent).toBe("2");
    expect(view.container.querySelector("[data-testid='stat-published']")!.textContent).toBe("1");
    expect(view.container.querySelector("[data-testid='stat-drafts']")!.textContent).toBe("1");
    expect(view.container.textContent).toContain("Winter Promo");
    expect(view.container.textContent).toContain("Exit Catcher");

    setInputByLabel(view.container, "input[aria-label='Search popups']", "exit");
    expect(view.container.textContent).toContain("Exit Catcher");
    expect(view.container.textContent).not.toContain("Winter Promo");

    setInputByLabel(view.container, "input[aria-label='Search popups']", "winter-promo");
    expect(view.container.textContent).toContain("Winter Promo");
    view.unmount();
  });

  it("filters by status tab and shows the load error banner", () => {
    listState.items = [
      record(),
      { ...record(), id: "popup-2", name: "Draft One", slug: "draft-one", status: "draft" },
    ] as never[];
    listState.loadError = "backend down";
    const view = mount(<PopupsListPage />, "/admin/advanced/popups");
    expect(view.container.textContent).toContain("Unable to load popups");
    expect(view.container.textContent).toContain("backend down");

    const tabs = view.container.querySelector<HTMLSelectElement>(
      "select[data-testid='status-tabs']"
    )!;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    if (!setter) throw new Error("value setter unavailable");
    setter.call(tabs, "published");
    React.act(() => {
      tabs.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("Winter Promo");
    expect(view.container.textContent).not.toContain("Draft One");
    view.unmount();
  });

  it("delete flows refresh the list or surface an api failure banner", async () => {
    listState.items = [record()] as never[];
    const view = mount(<PopupsListPage />, "/admin/advanced/popups");
    clickButtonWithText(view.container, "Delete");
    await flushEffects();
    expect(listState.refresh).toHaveBeenCalledWith(true);

    // reset and force a delete failure
    listState.refresh.mockClear();
    listState.deleteError = new ApiClientError("forbidden", "denied", 403);
    clickButtonWithText(view.container, "Delete");
    await flushEffects();
    expect(view.container.textContent).toContain("Popup action failed");
    expect(view.container.textContent).toContain("denied");

    listState.deleteError = new Error("offline");
    clickButtonWithText(view.container, "Delete");
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to delete popup.");
    view.unmount();
  });

  it("status toggle failures surface the generic fallback copy", async () => {
    listState.items = [record()] as never[];
    listState.statusError = new Error("offline");
    const view = mount(<PopupsListPage />, "/admin/advanced/popups");
    const toggle = view.container.querySelector<HTMLButtonElement>(
      "button[role='switch'][aria-label='Toggle Winter Promo']"
    )!;
    React.act(() => {
      toggle.click();
    });
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to update popup status.");
    view.unmount();
  });
});

describe("PopupEditorPage interactions", () => {
  it("create mode saves a draft payload and reports success", async () => {
    editorState.createdRecord = { ...record(), id: "created-9" };
    const view = mount(<PopupEditorPage />, "/admin/advanced/popups/new");
    await flushEffects();

    expect(view.container.textContent).toContain("New popup");
    clickButtonWithText(view.container, "Save changes");
    await flushEffects();

    expect(vi.mocked((await import("@/services/popupsClient")).createPopup)).toHaveBeenCalled();
    expect(view.container.textContent).toContain("Popup saved successfully.");
    view.unmount();
  });

  it("edit mode loads the record into the draft and supports discard", async () => {
    editorState.fetchedRecord = record();
    const view = mount(<PopupEditorPage />, "/admin/advanced/popups/popup-1");
    await flushEffects();

    expect(view.container.textContent).toContain("Edit popup");
    // loaded record name is reflected in the editor badge
    expect(view.container.textContent).toContain("Winter Promo · published");

    // patch the name field
    const nameInput = Array.from(view.container.querySelectorAll("input")).find(
      (candidate) => (candidate as HTMLInputElement).value === "Winter Promo"
    ) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("value setter unavailable");
    setter.call(nameInput, "Renamed Promo");
    React.act(() => {
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("Renamed Promo · published");

    clickButtonWithText(view.container, "Discard");
    expect(view.container.textContent).toContain("Winter Promo · published");
    view.unmount();
  });

  it("save publishes through the publish override and errors surface verbatim", async () => {
    editorState.fetchedRecord = { ...record(), status: "draft" };
    editorState.updatedRecord = { ...record(), status: "draft" };
    const view = mount(<PopupEditorPage />, "/admin/advanced/popups/popup-1");
    await flushEffects();

    // draft status exposes the Publish override button
    clickButtonWithText(view.container, "Publish");
    await flushEffects();
    const popups = await import("@/services/popupsClient");
    expect(vi.mocked(popups.updatePopup)).toHaveBeenCalledWith(
      "popup-1",
      expect.objectContaining({ status: "published" })
    );

    editorState.saveError = new ApiClientError("popup_invalid", "nope", 422);
    clickButtonWithText(view.container, "Save changes");
    await flushEffects();
    expect(view.container.textContent).toContain("nope");

    editorState.saveError = new Error("offline");
    clickButtonWithText(view.container, "Save changes");
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to save popup.");
    view.unmount();
  });

  it("load failures show the editor error banner and stop loading", async () => {
    editorState.fetchError = new Error("offline");
    const view = mount(<PopupEditorPage />, "/admin/advanced/popups/popup-1");
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to load popup editor.");
    expect(view.container.textContent).not.toContain("Loading popup editor...");
    view.unmount();
  });

  it("cache events refresh the editor unless there are unsaved changes", async () => {
    editorState.fetchedRecord = record();
    const view = mount(<PopupEditorPage />, "/admin/advanced/popups/popup-1");
    await flushEffects();
    expect(editorState.listeners.length).toBeGreaterThanOrEqual(1);

    // clean editor: event triggers refetch of the SAME record
    const getPopupMock = vi.mocked(
      (
        (await import("@/services/popupsClient")) as unknown as {
          getPopupCached: ReturnType<typeof vi.fn>;
        }
      ).getPopupCached
    );
    const baseline = getPopupMock.mock.calls.length;
    React.act(() => {
      for (const listener of editorState.listeners) listener({ key: "popups:list" });
    });
    await flushEffects();
    expect(getPopupMock.mock.calls.length).toBeGreaterThan(baseline);

    // dirty editor: event must NOT trigger a refetch that would clobber edits
    const nameInput = Array.from(view.container.querySelectorAll("input")).find(
      (candidate) => (candidate as HTMLInputElement).value === "Winter Promo"
    ) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("value setter unavailable");
    setter.call(nameInput, "Dirty edit");
    React.act(() => {
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const afterDirty = getPopupMock.mock.calls.length;
    React.act(() => {
      for (const listener of editorState.listeners) listener({ key: "popups:list" });
    });
    await flushEffects();
    expect(getPopupMock.mock.calls.length).toBe(afterDirty);
    expect(view.container.textContent).toContain("Dirty edit");
    view.unmount();
  });

  it("treats a bare popups path as create mode without touching the detail cache", async () => {
    const view = mount(<PopupEditorPage />, "/admin/advanced/popups");
    await flushEffects();

    // no id segment after "popups" resolves to null, so create mode applies
    expect(view.container.textContent).toContain("New popup");
    expect(view.container.textContent).toContain("Untitled · draft");
    const popups = (await import("@/services/popupsClient")) as unknown as {
      getPopupCached: ReturnType<typeof vi.fn>;
    };
    expect(popups.getPopupCached).not.toHaveBeenCalled();
    view.unmount();
  });

  it("load failures arriving after unmount are ignored instead of surfacing late", async () => {
    editorState.fetchError = new Error("late failure");
    const view = mount(<PopupEditorPage />, "/admin/advanced/popups/popup-1");
    // unmount while the fetch is still in flight, then let it reject
    view.unmount();
    await expect(flushEffects()).resolves.toBeUndefined();
  });

  it("cache events with an unrelated key do not refetch the editor", async () => {
    editorState.fetchedRecord = record();
    const view = mount(<PopupEditorPage />, "/admin/advanced/popups/popup-1");
    await flushEffects();

    const popups = (await import("@/services/popupsClient")) as unknown as {
      getPopupCached: ReturnType<typeof vi.fn>;
    };
    const baseline = popups.getPopupCached.mock.calls.length;
    React.act(() => {
      for (const listener of editorState.listeners) listener({ key: "other:key" });
    });
    await flushEffects();
    expect(popups.getPopupCached.mock.calls.length).toBe(baseline);
    expect(view.container.textContent).toContain("Winter Promo · published");
    view.unmount();
  });

  it("a failing background refetch is swallowed without surfacing an error banner", async () => {
    editorState.fetchedRecord = record();
    const view = mount(<PopupEditorPage />, "/admin/advanced/popups/popup-1");
    await flushEffects();
    expect(view.container.textContent).not.toContain("Popup editor error");

    editorState.fetchError = new Error("background offline");
    React.act(() => {
      for (const listener of editorState.listeners) listener({ key: "popups:list" });
    });
    await flushEffects();
    // the silent catch keeps the loaded draft and shows no failure banner
    expect(view.container.textContent).not.toContain("Popup editor error");
    expect(view.container.textContent).toContain("Winter Promo · published");
    view.unmount();
  });

  it("the Back to list action navigates back to the popups index", async () => {
    editorState.fetchedRecord = record();
    const view = mount(
      <>
        <RouterPathProbe />
        <PopupEditorPage />
      </>,
      "/admin/advanced/popups/popup-1"
    );
    await flushEffects();
    expect(view.container.querySelector("[data-testid='probe-path']")!.textContent).toBe(
      "/admin/advanced/popups/popup-1"
    );

    clickButtonWithText(view.container, "Back to list");
    expect(view.container.querySelector("[data-testid='probe-path']")!.textContent).toBe(
      "/admin/advanced/popups"
    );
    view.unmount();
  });

  it("a path without the popups segment resolves to create mode", async () => {
    const view = mount(<PopupEditorPage />, "/admin/advanced/popup-misc");
    await flushEffects();

    // resolvePopupId finds no "popups" segment, so the page enters create mode
    expect(view.container.textContent).toContain("New popup");
    expect(view.container.textContent).toContain("Untitled · draft");
    const popups = (await import("@/services/popupsClient")) as unknown as {
      getPopupCached: ReturnType<typeof vi.fn>;
    };
    expect(popups.getPopupCached).not.toHaveBeenCalled();
    view.unmount();
  });

  it("an ApiClientError on initial load surfaces its message verbatim", async () => {
    editorState.fetchError = new ApiClientError("not_found", "popup missing", 404);
    const view = mount(<PopupEditorPage />, "/admin/advanced/popups/popup-1");
    await flushEffects();
    expect(view.container.textContent).toContain("Popup editor error");
    expect(view.container.textContent).toContain("popup missing");
    expect(view.container.textContent).not.toContain("Failed to load popup editor.");
    view.unmount();
  });

  it("a background refresh resolving empty leaves the loaded draft untouched", async () => {
    editorState.fetchedRecord = record();
    const view = mount(<PopupEditorPage />, "/admin/advanced/popups/popup-1");
    await flushEffects();
    expect(view.container.textContent).toContain("Winter Promo · published");

    // the next refresh resolves empty: applyPopup must be skipped
    editorState.fetchedRecord = null;
    React.act(() => {
      for (const listener of editorState.listeners) listener({ key: "popups:list" });
    });
    await flushEffects();
    // the loaded draft survives a null refresh
    expect(view.container.textContent).toContain("Winter Promo · published");
    view.unmount();
  });
});
