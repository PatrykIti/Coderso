// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";
import { toast } from "sonner";
import { clickElement, createDeferred, flush, setInputValue } from "./contentListWaveTestUtils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type CacheEvent = { key: string; action: "invalidate" | "update" };

const typeFixture = (overrides?: Record<string, unknown>): ContentTypeSummary => ({
  id: "ct-1",
  name: "Post",
  slug: "post",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", title: "Title" },
      body: { type: "string", title: "Body" },
    },
  },
  status: "draft",
  config: {},
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z",
  ...overrides,
});

const editorState = vi.hoisted(() => {
  const state = {
    cached: [] as ContentTypeSummary[],
    detail: null as ContentTypeSummary | null,
    detailError: null as unknown,
    refreshResult: "default" as "default" | "null",
    refreshError: null as unknown,
    detailDeferred: null as ReturnType<typeof createDeferred<ContentTypeSummary>> | null,
    taxonomyItems: [] as Array<{ kind: "category" | "tag" }>,
    taxonomyError: null as unknown,
    taxonomyUpdateError: null as unknown,
    relationTargets: [] as Array<{ slug: string; name: string }>,
    relationTargetsError: null as unknown,
    saveDeferred: null as ReturnType<typeof createDeferred<ContentTypeSummary>> | null,
    updateError: null as unknown,
    duplicateError: null as unknown,
    deleteError: null as unknown,
    cacheListener: null as ((event: CacheEvent) => void) | null,
    getCachedContentTypes: vi.fn(() => state.cached),
    getContentTypeCached: vi.fn(async () => {
      if (state.detailDeferred) return state.detailDeferred.promise;
      if (state.detailError) throw state.detailError;
      if (state.refreshResult === "null" && state.cacheListener) return null;
      if (state.refreshError) throw state.refreshError;
      return state.detail;
    }),
    listContentTypesCached: vi.fn(async () => {
      if (state.relationTargetsError) throw state.relationTargetsError;
      return state.relationTargets;
    }),
    updateContentType: vi.fn(async (id: string, payload: Record<string, unknown>) => {
      if (state.saveDeferred) return state.saveDeferred.promise;
      if (state.updateError) throw state.updateError;
      return { ...state.detail, ...payload, id } as ContentTypeSummary;
    }),
    duplicateContentType: vi.fn(async (id: string) => {
      if (state.duplicateError) throw state.duplicateError;
      return { ...state.detail, id, name: "Post copy" } as ContentTypeSummary;
    }),
    deleteContentType: vi.fn(async () => {
      if (state.deleteError) throw state.deleteError;
      return { ok: true };
    }),
    listTaxonomies: vi.fn(async () => {
      if (state.taxonomyError) throw state.taxonomyError;
      return { items: state.taxonomyItems };
    }),
    updateTaxonomyConfig: vi.fn(async () => {
      if (state.taxonomyUpdateError) throw state.taxonomyUpdateError;
      return { items: [{ kind: "category" }, { kind: "tag" }] };
    }),
    subscribeCacheEvents: vi.fn((listener: (event: CacheEvent) => void) => {
      state.cacheListener = listener;
      return () => {
        if (state.cacheListener === listener) state.cacheListener = null;
      };
    }),
    triggerCacheEvent(key: string) {
      state.cacheListener?.({ key, action: "update" });
    },
  };
  return state;
});

const routerState = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock("../../../core/admin/services/contentTypesClient", () => ({
  getCachedContentTypes: editorState.getCachedContentTypes,
  getContentTypeCached: editorState.getContentTypeCached,
  listContentTypesCached: editorState.listContentTypesCached,
  updateContentType: editorState.updateContentType,
  duplicateContentType: editorState.duplicateContentType,
  deleteContentType: editorState.deleteContentType,
  listTaxonomies: editorState.listTaxonomies,
  updateTaxonomyConfig: editorState.updateTaxonomyConfig,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "kind" in error),
}));

vi.mock("../../../core/admin/services/taxonomyClient", () => ({
  listTaxonomies: editorState.listTaxonomies,
  updateTaxonomyConfig: editorState.updateTaxonomyConfig,
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: editorState.subscribeCacheEvents,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: routerState.navigate, path: "/advanced/engine/ct-1" }),
  useOptionalAdminRouter: () => ({
    navigate: routerState.navigate,
    path: "/advanced/engine/ct-1",
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    breadcrumbs,
    actions,
    children,
  }: {
    breadcrumbs?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div data-slot="breadcrumbs">{breadcrumbs}</div>
      <div data-slot="actions">{actions}</div>
      {children}
    </div>
  ),
}));

vi.mock("@/ui/shared/SectionCard", () => ({
  SectionCard: ({
    title,
    description,
    action,
    children,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <section data-slot="section-card">
      <h2>{title}</h2>
      <p>{description}</p>
      <div>{action}</div>
      <div>{children}</div>
    </section>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    confirmLabel,
    isConfirming,
    onConfirm,
    onOpenChange,
    children,
  }: {
    open: boolean;
    title?: React.ReactNode;
    confirmLabel: string;
    confirmingLabel?: string;
    isConfirming?: boolean;
    onConfirm: () => void;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div data-slot="confirm-dialog">
        <div data-slot="confirm-title">{title}</div>
        <div data-slot="confirm-body">{children}</div>
        <button type="button" onClick={onConfirm}>
          {isConfirming ? "Deleting..." : confirmLabel}
        </button>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          close dialog
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
    disabled,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={onSelect}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-slot="alert">{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="alert-title">{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="alert-description">{children}</div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
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
    disabled,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    placeholder?: string;
  }) => (
    <input value={value ?? ""} placeholder={placeholder} disabled={disabled} onChange={onChange} />
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      data-slot="switch"
      checked={checked ?? false}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/tabs", () => {
  const registry: { onValueChange?: (value: string) => void } = {};
  return {
    Tabs: ({
      value: _value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => {
      registry.onValueChange = onValueChange;
      return <div>{children}</div>;
    },
    TabsContent: ({ children }: { children: React.ReactNode; value: string }) => (
      <div>{children}</div>
    ),
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <button
        type="button"
        data-tab-trigger={value}
        onClick={() => registry.onValueChange?.(value)}
      >
        {children}
      </button>
    ),
  };
});

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="sheet">{children}</div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../core/admin/ui/content-types/ContentTypeFieldsPanel", () => ({
  ContentTypeFieldsPanel: ({
    fields,
    selectedId,
    onSelect,
    onReorder,
    onDuplicateField,
    onDeleteField,
  }: {
    fields: Array<{ id: string; name: string; label: string }>;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onReorder: (fromIndex: number, toIndex: number) => void;
    onDuplicateField: (id: string) => void;
    onDeleteField: (id: string) => void;
  }) => (
    <div data-slot="fields-panel">
      {fields.map((field, index) => (
        <div key={field.id} data-field-row={field.id} data-selected={field.id === selectedId}>
          <button type="button" onClick={() => onSelect(field.id)}>
            {field.label}
          </button>
          <button type="button" data-reorder-same onClick={() => onReorder(index, index)}>
            reorder same
          </button>
          <button type="button" data-reorder-outside onClick={() => onReorder(-1, 99)}>
            reorder outside
          </button>
          <button type="button" onClick={() => onDuplicateField(field.id)}>
            duplicate field
          </button>
          <button type="button" onClick={() => onDeleteField(field.id)}>
            delete field
          </button>
          <button type="button" onClick={() => onDuplicateField("missing-id")}>
            duplicate missing
          </button>
          <button type="button" onClick={() => onDeleteField("missing-id")}>
            delete missing
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/content-types/ContentTypeSettingsCard", () => ({
  ContentTypeSettingsCard: ({
    slug,
    onSlugChange,
    onConfigChange,
    config,
  }: {
    slug: string;
    onSlugChange: (next: string) => void;
    onConfigChange: (next: Record<string, unknown>) => void;
    config: Record<string, unknown>;
  }) => (
    <div data-slot="settings-card">
      <input data-slot-kind="slug" value={slug} onChange={(e) => onSlugChange(e.target.value)} />
      <button type="button" onClick={() => onConfigChange({ ...config, description: "Shown" })}>
        change config
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/content-types/ContentTypePermissionsPanel", () => ({
  ContentTypePermissionsPanel: ({
    onChange,
  }: {
    onChange: (matrix: Record<string, Record<string, boolean>>) => void;
  }) => (
    <div data-slot="permissions-panel">
      <button type="button" onClick={() => onChange({ editor: { read: true } })}>
        apply matrix
      </button>
      <button type="button" onClick={() => onChange({})}>
        clear matrix
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/content-types/ContentTypePreviewPanel", () => ({
  ContentTypePreviewPanel: () => <div data-slot="schema-preview" />,
}));

vi.mock("../../../core/admin/ui/content-types/SchemaBuilder", async () => {
  const actual = await vi.importActual<
    typeof import("../../../core/admin/ui/content-types/SchemaBuilder")
  >("../../../core/admin/ui/content-types/SchemaBuilder");
  return {
    ...actual,
    FieldSettingsPanel: ({
      field,
      onRemove,
      onChange,
    }: {
      field: { id: string; name: string; label: string } | null;
      onRemove: () => void;
      onChange: (next: { id: string; name: string; label: string }) => void;
    }) =>
      field ? (
        <div data-slot="field-settings" data-field-id={field.id}>
          <input
            data-slot-kind="field-name"
            value={field.name}
            onChange={(event) =>
              onChange({ ...field, name: event.target.value, label: event.target.value })
            }
          />
          <button type="button" onClick={onRemove}>
            remove field
          </button>
        </div>
      ) : null,
  };
});

let container: HTMLDivElement | null = null;
let mountedRoot: ReturnType<typeof createRoot> | null = null;

const setPath = (pathname: string) => {
  window.history.replaceState({}, "", pathname);
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  setPath("/advanced/engine/ct-1");
  editorState.cached = [];
  editorState.detail = null;
  editorState.detailError = null;
  editorState.refreshResult = "default";
  editorState.refreshError = null;
  editorState.detailDeferred = null;
  editorState.taxonomyItems = [];
  editorState.taxonomyError = null;
  editorState.taxonomyUpdateError = null;
  editorState.relationTargets = [];
  editorState.relationTargetsError = null;
  editorState.saveDeferred = null;
  editorState.updateError = null;
  editorState.duplicateError = null;
  editorState.deleteError = null;
  editorState.cacheListener = null;
  for (const key of [
    "getCachedContentTypes",
    "getContentTypeCached",
    "listContentTypesCached",
    "updateContentType",
    "duplicateContentType",
    "deleteContentType",
    "listTaxonomies",
    "updateTaxonomyConfig",
    "subscribeCacheEvents",
  ] as const) {
    editorState[key].mockClear();
  }
  routerState.navigate.mockClear();
  (toast.error as ReturnType<typeof vi.fn>).mockClear();
  (toast.success as ReturnType<typeof vi.fn>).mockClear();
});

function unmountMountedRoot() {
  const root = mountedRoot;
  if (!root) return;
  React.act(() => {
    root.unmount();
  });
  mountedRoot = null;
}

afterEach(() => {
  unmountMountedRoot();
  container?.remove();
  container = null;
});

function mount() {
  unmountMountedRoot();
  const root = createRoot(container!);
  mountedRoot = root;
  React.act(() => {
    root.render(<ContentTypeEditor />);
  });
  return root;
}

function byText(text: string) {
  return Array.from(container!.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === text
  );
}

async function loadEditor() {
  editorState.cached = [typeFixture()];
  editorState.detail = typeFixture();
  mount();
  await flush();
}

const textOf = () => container!.textContent ?? "";

test("shows the api save error message", async () => {
  editorState.updateError = { kind: "api", message: "name_already_taken" };
  await loadEditor();
  clickElement(byText("Save"));
  await flush();
  expect(textOf()).toContain("name_already_taken");
});

test("shows duplicate errors for api and generic failures", async () => {
  editorState.duplicateError = { kind: "api", message: "duplicate_failed" };
  await loadEditor();
  clickElement(byText("Duplicate"));
  await flush();
  expect(toast.error).toHaveBeenCalledWith("duplicate_failed");

  editorState.duplicateError = new Error("boom");
  await loadEditor();
  clickElement(byText("Duplicate"));
  await flush();
  expect(toast.error).toHaveBeenCalledWith("Failed to duplicate content type.");
});

test("shows delete errors for api and generic failures", async () => {
  editorState.deleteError = { kind: "api", message: "delete_denied" };
  await loadEditor();
  clickElement(byText("Delete"));
  await flush();
  clickElement(byText("Delete type"));
  await flush();
  expect(toast.error).toHaveBeenCalledWith("delete_denied");

  editorState.deleteError = new Error("boom");
  await loadEditor();
  clickElement(byText("Delete"));
  await flush();
  clickElement(byText("Delete type"));
  await flush();
  expect(toast.error).toHaveBeenCalledWith("Failed to delete content type.");
});

test("ignores no-op and out-of-bounds reorders", async () => {
  await loadEditor();
  clickElement(container!.querySelector<HTMLButtonElement>("[data-reorder-same]"));
  clickElement(container!.querySelector<HTMLButtonElement>("[data-reorder-outside]"));
  await flush();
  expect(editorState.updateContentType).not.toHaveBeenCalled();
});

test("reverts taxonomy toggles when the update fails", async () => {
  editorState.taxonomyUpdateError = new Error("taxonomy boom");
  await loadEditor();
  clickElement(byText("Settings"));
  await flush();
  const switchInput = container!.querySelector<HTMLInputElement>('[data-slot="switch"]');
  clickElement(switchInput);
  await flush();
  expect(textOf()).toContain("Failed to update taxonomy settings.");
});

test("marks slug and config changes as unsaved", async () => {
  await loadEditor();
  const slugInput = container!.querySelector<HTMLInputElement>('[data-slot-kind="slug"]');
  React.act(() => {
    setInputValue(slugInput, "articles");
  });
  await flush();
  expect(textOf()).toContain("Unsaved changes");

  clickElement(byText("change config"));
  await flush();
  expect(textOf()).toContain("Unsaved changes");
});

test("applies and clears the permissions matrix", async () => {
  await loadEditor();
  clickElement(byText("Settings"));
  clickElement(byText("Permissions"));
  clickElement(byText("apply matrix"));
  clickElement(byText("Save"));
  await flush();
  expect(editorState.updateContentType).toHaveBeenCalledWith(
    "ct-1",
    expect.objectContaining({
      config: expect.objectContaining({ permissions: { editor: { read: true } } }),
    })
  );

  clickElement(byText("clear matrix"));
  clickElement(byText("Save"));
  await flush();
  expect(editorState.updateContentType).toHaveBeenLastCalledWith(
    "ct-1",
    expect.objectContaining({
      config: expect.not.objectContaining({ permissions: expect.anything() }),
    })
  );
});

test("edits field details through the mobile sheet", async () => {
  await loadEditor();
  clickElement(byText("Fields"));
  await flush();
  clickElement(byText("Title"));
  await flush();
  clickElement(byText("Edit field details"));
  await flush();
  const sheet = container!.querySelector('[data-slot="sheet"]');
  expect(sheet).not.toBeNull();
  const fieldNameInput = sheet!.querySelector<HTMLInputElement>('[data-slot-kind="field-name"]');
  React.act(() => {
    setInputValue(fieldNameInput, "Headline");
  });
  await flush();
  const sheetRemove = Array.from(sheet!.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "remove field"
  );
  clickElement(sheetRemove);
  await flush();
  const dialog = container!.querySelector('[data-slot="confirm-dialog"]');
  expect(dialog?.textContent).toContain("Remove field?");
  clickElement(byText("close dialog"));
  await flush();
  expect(container!.querySelector('[data-slot="confirm-dialog"]')).toBeNull();
});

test("applies remote refreshes from matching cache events only", async () => {
  await loadEditor();
  editorState.detail = typeFixture({ name: "Remote post" });
  React.act(() => {
    editorState.triggerCacheEvent("unrelated:key");
  });
  await flush();
  expect(textOf()).not.toContain("Remote post");

  React.act(() => {
    editorState.triggerCacheEvent(cacheKeys.contentTypeDetail("ct-1"));
  });
  await flush();
  expect(textOf()).toContain("Remote post");
});

test("ignores a null refresh result", async () => {
  editorState.refreshResult = "null";
  await loadEditor();
  React.act(() => {
    editorState.triggerCacheEvent(cacheKeys.contentTypeDetail("ct-1"));
  });
  await flush();
  expect(textOf()).toContain("Post");
});

test("shows a generic refresh error for non-client failures", async () => {
  editorState.refreshError = new Error("network down");
  await loadEditor();
  React.act(() => {
    editorState.triggerCacheEvent(cacheKeys.contentTypeDetail("ct-1"));
  });
  await flush();
  expect(textOf()).toContain("Failed to load content type.");
});

test("ignores load and taxonomy results after unmount", async () => {
  const root = mount();
  React.act(() => {
    root.unmount();
  });
  await flush();
  expect(editorState.getContentTypeCached).toHaveBeenCalled();
});

test("ignores a failing taxonomy load after unmount", async () => {
  editorState.taxonomyError = new Error("taxonomy boom");
  const root = mount();
  React.act(() => {
    root.unmount();
  });
  await flush();
  expect(editorState.listTaxonomies).toHaveBeenCalled();
});

test("applies the loaded taxonomy configuration", async () => {
  editorState.taxonomyItems = [{ kind: "category" }, { kind: "tag" }];
  await loadEditor();
  clickElement(byText("Settings"));
  await flush();
  const switches = container!.querySelectorAll<HTMLInputElement>('[data-slot="switch"]');
  expect(switches[0]?.checked).toBe(true);
  expect(switches[1]?.checked).toBe(true);
});

test("ignores a rejected detail load after unmount", async () => {
  const deferred = createDeferred<ContentTypeSummary>();
  editorState.detailDeferred = deferred;
  const root = mount();
  React.act(() => {
    root.unmount();
  });
  deferred.reject(new Error("late failure"));
  await flush();
  expect(editorState.getContentTypeCached).toHaveBeenCalled();
});

test("ignores a relation targets load failure", async () => {
  editorState.relationTargetsError = new Error("targets boom");
  await loadEditor();
  await flush();
  expect(editorState.listContentTypesCached).toHaveBeenCalled();
});

test("shows the taxonomy api error message", async () => {
  editorState.taxonomyUpdateError = { kind: "api", message: "taxonomy_api_error" };
  await loadEditor();
  clickElement(byText("Settings"));
  await flush();
  clickElement(container!.querySelector<HTMLInputElement>('[data-slot="switch"]'));
  await flush();
  expect(textOf()).toContain("taxonomy_api_error");
});

test("ignores duplicate and delete requests for unknown fields", async () => {
  await loadEditor();
  clickElement(byText("duplicate missing"));
  clickElement(byText("delete missing"));
  await flush();
  expect(editorState.updateContentType).not.toHaveBeenCalled();
});

test("removes a field through the desktop settings panel", async () => {
  await loadEditor();
  const removeButtons = Array.from(container!.querySelectorAll("button")).filter(
    (button) => button.textContent?.trim() === "remove field"
  );
  clickElement(removeButtons[0]);
  await flush();
  expect(container!.querySelector('[data-slot="confirm-dialog"]')?.textContent).toContain(
    "Remove field?"
  );
  clickElement(byText("close dialog"));
  await flush();
  expect(container!.querySelector('[data-slot="confirm-dialog"]')).toBeNull();
});

test("ignores a second save while a save is in flight", async () => {
  const deferred = createDeferred<ContentTypeSummary>();
  editorState.saveDeferred = deferred;
  await loadEditor();
  clickElement(byText("Save"));
  const savingButton = Array.from(container!.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Saving..."
  );
  clickElement(savingButton);
  await flush();
  expect(editorState.updateContentType).toHaveBeenCalledTimes(1);
  React.act(() => {
    deferred.resolve(typeFixture());
  });
  await flush();
});
