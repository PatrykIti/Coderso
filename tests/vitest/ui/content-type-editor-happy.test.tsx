// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";
import { clickElement, flush } from "./contentListWaveTestUtils";

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
    pendingDetail: false,
    taxonomyItems: [] as Array<{ kind: "category" | "tag" }>,
    taxonomyError: null as unknown,
    relationTargets: [] as Array<{ slug: string; name: string }>,
    updateResult: null as ContentTypeSummary | null,
    updateError: null as unknown,
    duplicateError: null as unknown,
    deleteError: null as unknown,
    cacheListener: null as ((event: CacheEvent) => void) | null,
    getCachedContentTypes: vi.fn(() => state.cached),
    getContentTypeCached: vi.fn(async () => {
      if (state.pendingDetail) return new Promise<ContentTypeSummary>(() => {});
      if (state.detailError) throw state.detailError;
      return state.detail;
    }),
    listContentTypesCached: vi.fn(async () => state.relationTargets),
    updateContentType: vi.fn(async (id: string, payload: Record<string, unknown>) => {
      if (state.updateError) throw state.updateError;
      const base = state.updateResult ?? { ...state.detail, id };
      return { ...base, ...payload } as ContentTypeSummary;
    }),
    duplicateContentType: vi.fn(
      async (id: string) =>
        ({
          ...state.detail,
          id,
          name: `${state.detail?.name ?? "Copy"} copy`,
        }) as ContentTypeSummary
    ),
    deleteContentType: vi.fn(async () => {
      if (state.deleteError) throw state.deleteError;
      return { ok: true };
    }),
    listTaxonomies: vi.fn(async () => {
      if (state.taxonomyError) throw state.taxonomyError;
      return { items: state.taxonomyItems };
    }),
    updateTaxonomyConfig: vi.fn(async (_id: string, patch: Record<string, boolean>) => {
      const items: Array<{ kind: "category" | "tag" }> = [];
      if (patch.categories) items.push({ kind: "category" });
      if (patch.tags) items.push({ kind: "tag" });
      return { items };
    }),
    subscribeCacheEvents: vi.fn((listener: (event: CacheEvent) => void) => {
      state.cacheListener = listener;
      return () => {
        if (state.cacheListener === listener) state.cacheListener = null;
      };
    }),
  };
  return state;
});

const routerState = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const tabState = vi.hoisted(() => ({
  onValueChange: null as ((value: string) => void) | null,
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: editorState.getCachedContentTypes,
  getContentTypeCached: editorState.getContentTypeCached,
  listContentTypesCached: editorState.listContentTypesCached,
  updateContentType: editorState.updateContentType,
  duplicateContentType: editorState.duplicateContentType,
  deleteContentType: editorState.deleteContentType,
  resolveDraftsEnabled: (config: Record<string, unknown> | undefined) =>
    config?.draftsEnabled !== false,
  resolveVersioning: (config: Record<string, unknown> | undefined) => config?.versioning === true,
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
        <div
          key={field.id}
          data-slot="field-row"
          data-field-label={field.label}
          data-selected={field.id === selectedId ? "true" : "false"}
        >
          <button type="button" onClick={() => onSelect(field.id)}>
            {field.label}
          </button>
          <span data-slot="field-name">{field.name}</span>
          <button
            type="button"
            aria-label={`reorder ${index} ${index + 1}`}
            onClick={() => onReorder(index, index + 1)}
          >
            move down
          </button>
          <button
            type="button"
            data-slot="duplicate-field"
            onClick={() => onDuplicateField(field.id)}
          >
            duplicate
          </button>
          <button type="button" data-slot="delete-field" onClick={() => onDeleteField(field.id)}>
            delete
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
  }: {
    slug: string;
    onSlugChange: (next: string) => void;
  }) => (
    <div data-slot="settings-card">
      <input
        data-slot="input"
        data-slot-kind="slug"
        value={slug}
        onChange={(e) => onSlugChange(e.target.value)}
      />
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
      <button type="button" data-slot="permissions-apply" onClick={() => onChange({ editor: {} })}>
        apply matrix
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/content-types/ContentTypePreviewPanel", () => ({
  ContentTypePreviewPanel: ({ name, slug }: { name: string; slug: string }) => (
    <div data-slot="schema-preview">
      {name} {slug}
    </div>
  ),
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
      field: ContentField | null;
      onRemove: () => void;
      onChange: (next: ContentField) => void;
    }) => (
      <div data-slot="field-settings">
        <span data-slot="field-settings-name">{field?.name ?? "none"}</span>
        <input
          data-slot="field-name-input"
          value={field?.name ?? ""}
          onChange={(e) => field && onChange({ ...field, name: e.target.value })}
        />
        <button
          type="button"
          data-slot="mutate-number-step"
          onClick={() => field && onChange({ ...field, number: { format: "decimal", step: 0 } })}
        >
          corrupt step
        </button>
        <button
          type="button"
          data-slot="mutate-select-option"
          onClick={() =>
            field && onChange({ ...field, options: [{ id: "o1", label: "Draft", value: "" }] })
          }
        >
          corrupt option
        </button>
        <button type="button" onClick={onRemove}>
          remove field
        </button>
      </div>
    ),
  };
});

vi.mock("@/services/taxonomyClient", () => ({
  listTaxonomies: editorState.listTaxonomies,
  updateTaxonomyConfig: editorState.updateTaxonomyConfig,
}));

vi.mock("@/services/adminRolesClient", () => ({
  listAdminRoles: vi.fn(async () => ({ items: [], total: 0 })),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "kind" in error),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: editorState.subscribeCacheEvents,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: routerState.navigate }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="admin-shell">{children}</div>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({ title, actions }: { title: React.ReactNode; actions?: React.ReactNode }) => (
    <div>
      <h1 data-slot="page-title">{title}</h1>
      <div data-slot="page-actions">{actions}</div>
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
      <h2 data-slot="section-title">{title}</h2>
      <p data-slot="section-description">{description}</p>
      <div data-slot="section-action">{action}</div>
      <div data-slot="section-body">{children}</div>
    </section>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    confirmingLabel,
    isConfirming,
    onConfirm,
    children,
  }: {
    open: boolean;
    title?: React.ReactNode;
    description?: React.ReactNode;
    confirmLabel: string;
    confirmingLabel: string;
    isConfirming?: boolean;
    onConfirm: () => void;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div data-slot="confirm-dialog">
        <div data-slot="confirm-title">{title}</div>
        <div data-slot="confirm-description">{description}</div>
        <div data-slot="confirm-body">{children}</div>
        <button type="button" onClick={onConfirm}>
          {isConfirming ? confirmingLabel : confirmLabel}
        </button>
      </div>
    ) : null,
}));

vi.mock("@/ui/shared/InfoTip", () => ({
  InfoTip: ({ label }: { label: string }) => <span data-slot="info-tip">{label}</span>,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-slot="alert" data-variant={variant}>
      {children}
    </div>
  ),
  AlertTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="alert-title">{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="alert-description">{children}</div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-slot="badge">{children}</span>,
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
    <input
      data-slot="input"
      value={value ?? ""}
      placeholder={placeholder}
      disabled={disabled}
      onChange={onChange}
    />
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value }: { value?: string }) => (
    <textarea data-slot="textarea" value={value ?? ""} readOnly />
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

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked }: { checked?: boolean }) => (
    <input type="checkbox" data-slot="checkbox" checked={checked ?? false} readOnly />
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => {
    tabState.onValueChange = onValueChange ?? null;
    return <div data-tabs-value={value}>{children}</div>;
  },
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <button type="button" data-tab={value} onClick={() => tabState.onValueChange?.(value)}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-slot="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-slot="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/select", () => {
  const handlers = new WeakMap<HTMLElement, (value: string) => void>();
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => (
      <div
        data-slot="select"
        data-value={value}
        ref={(element: HTMLElement | null) => {
          if (element) handlers.set(element, onValueChange ?? (() => undefined));
        }}
      >
        {children}
      </div>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
      <button
        type="button"
        data-slot="select-item"
        data-value={value}
        onClick={(event) => {
          const root = (event.currentTarget as HTMLElement).closest(
            '[data-slot="select"]'
          ) as HTMLElement | null;
          handlers.get(root!)?.(value);
        }}
      >
        {children}
      </button>
    ),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

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
  editorState.pendingDetail = false;
  editorState.taxonomyItems = [];
  editorState.taxonomyError = null;
  editorState.relationTargets = [];
  editorState.updateResult = null;
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
});

afterEach(() => {
  const root = mountedRoot;
  if (root) {
    React.act(() => {
      root.unmount();
    });
    mountedRoot = null;
  }
  container?.remove();
  container = null;
});

function mount() {
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

describe("ContentTypeEditor happy", () => {
  test("loads an existing content type from the path id", async () => {
    await loadEditor();
    expect(editorState.getContentTypeCached).toHaveBeenCalledWith("ct-1", { force: true });
    expect(editorState.listTaxonomies).toHaveBeenCalledWith("ct-1");
    expect(container!.querySelector('[data-slot="page-title"]')!.textContent).toContain("Post");
    expect(container!.textContent).not.toContain("Unsaved changes");
  });

  test("renders the fallback shell when no type id is in the path", async () => {
    setPath("/advanced/engine");
    editorState.detail = null;
    mount();
    await flush();
    expect(container!.querySelector('[data-slot="page-title"]')!.textContent).toContain(
      "Content type"
    );
    expect(editorState.getContentTypeCached).not.toHaveBeenCalled();
  });

  test("shows a load error alert when the detail fetch fails", async () => {
    editorState.detail = null;
    editorState.detailError = { kind: "http_error", message: "detail boom" };
    mount();
    await flush();
    expect(container!.querySelector('[data-variant="destructive"]')!.textContent).toContain(
      "detail boom"
    );
  });

  test("shows a generic load error for non-client failures", async () => {
    editorState.detail = null;
    editorState.detailError = new Error("network down");
    mount();
    await flush();
    expect(container!.querySelector('[data-variant="destructive"]')!.textContent).toContain(
      "Failed to load content type."
    );
  });

  test("adds a new field and selects it", async () => {
    await loadEditor();
    clickElement(byText("Add field"));
    const fieldsPanel = container!.querySelector('[data-slot="fields-panel"]')!;
    expect(fieldsPanel.textContent).toContain("field-2");
    expect(fieldsPanel.textContent).toContain("New field");
  });

  test("reorders fields through the panel callback", async () => {
    editorState.cached = [
      typeFixture({
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", title: "Title" },
            body: { type: "string", title: "Body" },
          },
        },
      }),
    ];
    editorState.detail = editorState.cached[0];
    mount();
    await flush();
    const panel = container!.querySelector('[data-slot="fields-panel"]')!;
    const reorder = panel.querySelector('[aria-label="reorder 0 1"]')!;
    clickElement(reorder);
    const rowLabels = Array.from(panel.querySelectorAll('[data-slot="field-row"]')).map((row) =>
      row.getAttribute("data-field-label")
    );
    expect(rowLabels).toEqual(["Body", "Title"]);
  });

  test("duplicates a field and selects the clone", async () => {
    await loadEditor();
    const panel = container!.querySelector('[data-slot="fields-panel"]')!;
    clickElement(panel.querySelector('[data-slot="duplicate-field"]'));
    expect(panel.textContent).toContain("Title copy");
    expect(panel.textContent).toContain("title-2");
  });

  test("removes a field with confirmation and undoes the removal", async () => {
    await loadEditor();
    const panel = container!.querySelector('[data-slot="fields-panel"]')!;
    clickElement(panel.querySelector('[data-slot="delete-field"]'));
    await flush();
    expect(container!.textContent).toContain("Remove field?");
    clickElement(byText("Remove field"));
    await flush();
    expect(container!.textContent).toContain("was removed from the local draft");
    clickElement(byText("Undo"));
    expect(container!.querySelector('[data-slot="fields-panel"]')!.textContent).toContain("Title");
  });
});

test("leaves the shell empty when the detail fetch returns nothing", async () => {
  editorState.cached = [];
  editorState.detail = null;
  mount();
  await flush();
  expect(editorState.getContentTypeCached).toHaveBeenCalledWith("ct-1", { force: true });
  expect(container!.querySelector('[data-slot="page-title"]')!.textContent).toContain(
    "Content type"
  );
});
