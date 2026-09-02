// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";
import { clickElement, flush, setInputValue } from "./contentListWaveTestUtils";

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
  test("saves a draft through the header save button", async () => {
    await loadEditor();
    clickElement(byText("Save"));
    await flush();
    expect(editorState.updateContentType).toHaveBeenCalledWith(
      "ct-1",
      expect.objectContaining({ status: "draft" })
    );
    expect(container!.textContent).toContain("Saved");
  });

  test("publishes through the more menu", async () => {
    await loadEditor();
    clickElement(byText("Publish"));
    await flush();
    expect(editorState.updateContentType).toHaveBeenCalledWith(
      "ct-1",
      expect.objectContaining({ status: "published" })
    );
  });

  test("surfaces a validation error for duplicate field names", async () => {
    await loadEditor();
    const panel = container!.querySelector('[data-slot="fields-panel"]')!;
    clickElement(panel.querySelector('[data-slot="duplicate-field"]'));
    const nameInput = container!.querySelector<HTMLInputElement>('[data-slot="field-name-input"]')!;
    React.act(() => setInputValue(nameInput, "title"));
    await flush();
    clickElement(byText("Save"));
    await flush();
    expect(container!.querySelector('[data-variant="destructive"]')!.textContent).toContain(
      "Field name must be unique."
    );
    expect(editorState.updateContentType).not.toHaveBeenCalled();
  });

  test("blocks saves when a select option is missing a value", async () => {
    editorState.cached = [
      typeFixture({
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            status: { type: "string", xFieldType: "select" },
          },
        },
      }),
    ];
    editorState.detail = editorState.cached[0];
    mount();
    await flush();
    clickElement(container!.querySelector('[data-slot="mutate-select-option"]'));
    await flush();
    clickElement(byText("Save"));
    await flush();
    expect(container!.querySelector('[data-variant="destructive"]')!.textContent).toContain(
      "Select options need labels and values."
    );
    expect(editorState.updateContentType).not.toHaveBeenCalled();
  });

  test("blocks saves when select option values repeat", async () => {
    editorState.cached = [
      typeFixture({
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            status: {
              type: "string",
              xFieldType: "select",
              xFieldConfig: {
                select: {
                  options: [
                    { label: "Draft", value: "draft" },
                    { label: "Draft again", value: "draft" },
                  ],
                },
              },
            },
          },
        },
      }),
    ];
    editorState.detail = editorState.cached[0];
    mount();
    await flush();
    clickElement(byText("Save"));
    await flush();
    expect(container!.querySelector('[data-variant="destructive"]')!.textContent).toContain(
      "Select option values must be unique."
    );
  });

  test("blocks saves when number minimum exceeds maximum", async () => {
    editorState.cached = [
      typeFixture({
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            count: {
              type: "number",
              xFieldType: "number",
              xFieldConfig: { number: { format: "decimal", min: 10, max: 2 } },
            },
          },
        },
      }),
    ];
    editorState.detail = editorState.cached[0];
    mount();
    await flush();
    clickElement(byText("Save"));
    await flush();
    expect(container!.querySelector('[data-variant="destructive"]')!.textContent).toContain(
      "Number field minimum cannot exceed maximum."
    );
  });

  test("blocks saves when number step is not positive", async () => {
    editorState.cached = [
      typeFixture({
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            count: { type: "number", xFieldType: "number" },
          },
        },
      }),
    ];
    editorState.detail = editorState.cached[0];
    mount();
    await flush();
    clickElement(container!.querySelector('[data-slot="mutate-number-step"]'));
    await flush();
    clickElement(byText("Save"));
    await flush();
    expect(container!.querySelector('[data-variant="destructive"]')!.textContent).toContain(
      "Number field step must be positive."
    );
  });

  test("blocks saves when an integer field uses a decimal default", async () => {
    editorState.cached = [
      typeFixture({
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            count: {
              type: "integer",
              xFieldType: "number",
              xFieldConfig: { number: { format: "integer" } },
              default: 1.5,
            },
          },
        },
      }),
    ];
    editorState.detail = editorState.cached[0];
    mount();
    await flush();
    clickElement(byText("Save"));
    await flush();
    expect(container!.querySelector('[data-variant="destructive"]')!.textContent).toContain(
      "Integer number fields cannot use decimal defaults."
    );
  });

  test("shows a save error alert when update fails", async () => {
    await loadEditor();
    editorState.updateError = new Error("save boom");
    clickElement(byText("Save"));
    await flush();
    expect(container!.querySelector('[data-variant="destructive"]')!.textContent).toContain(
      "Failed to save content type."
    );
  });

  test("duplicates the content type and navigates to the clone", async () => {
    await loadEditor();
    clickElement(byText("Duplicate"));
    await flush();
    expect(routerState.navigate).toHaveBeenCalledWith("/advanced/engine/ct-1");
  });

  test("deletes the content type through the danger zone dialog", async () => {
    await loadEditor();
    clickElement(byText("Delete"));
    await flush();
    expect(container!.textContent).toContain("Delete content type?");
    clickElement(byText("Delete type"));
    await flush();
    expect(editorState.deleteContentType).toHaveBeenCalledWith("ct-1");
    expect(routerState.navigate).toHaveBeenCalledWith("/advanced/engine");
  });

  test("opens the schema route", async () => {
    await loadEditor();
    clickElement(byText("Open schema"));
    expect(routerState.navigate).toHaveBeenCalledWith("/advanced/engine/ct-1/schema");
  });

  test("switches to the relations tab and renders relation rows", async () => {
    editorState.cached = [
      typeFixture({
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            author: {
              type: "string",
              xFieldType: "relation",
              xRelationTarget: "people",
              xFieldConfig: { relation: { target: "people", multiple: true } },
            },
          },
        },
      }),
    ];
    editorState.detail = editorState.cached[0];
    editorState.relationTargets = [{ slug: "people", name: "People" }];
    mount();
    await flush();
    React.act(() => tabState.onValueChange?.("relations"));
    expect(container!.textContent).toContain("People");
    expect(container!.textContent).toContain("many");
  });

  test("switches to the settings tab and edits the name", async () => {
    await loadEditor();
    React.act(() => tabState.onValueChange?.("settings"));
    const inputs = container!.querySelectorAll<HTMLInputElement>('[data-slot="input"]');
    const nameInput = Array.from(inputs).find((input) => input.value === "Post")!;
    React.act(() => setInputValue(nameInput, "Article"));
    await flush();
    expect(container!.querySelector('[data-slot="page-title"]')!.textContent).toContain("Article");
  });

  test("toggles taxonomies and reverts on failure", async () => {
    await loadEditor();
    React.act(() => tabState.onValueChange?.("settings"));
    const switches = container!.querySelectorAll<HTMLInputElement>('[data-slot="switch"]');
    clickElement(switches[0]);
    await flush();
    expect(editorState.updateTaxonomyConfig).toHaveBeenCalledWith("ct-1", {
      categories: true,
    });
    editorState.taxonomyError = new Error("taxonomy boom");
    clickElement(switches[1]);
    await flush();
    expect(editorState.updateTaxonomyConfig).toHaveBeenCalledWith("ct-1", { tags: true });
  });

  test("deletes from the settings danger zone", async () => {
    await loadEditor();
    React.act(() => tabState.onValueChange?.("settings"));
    clickElement(byText("Delete type"));
    await flush();
    clickElement(container!.querySelector('[data-slot="confirm-dialog"] button'));
    await flush();
    expect(editorState.deleteContentType).toHaveBeenCalledWith("ct-1");
  });

  test("switches to the permissions tab and applies a matrix", async () => {
    await loadEditor();
    React.act(() => tabState.onValueChange?.("permissions"));
    const apply = container!.querySelector('[data-slot="permissions-apply"]')!;
    clickElement(apply);
    clickElement(byText("Save"));
    await flush();
    expect(editorState.updateContentType).toHaveBeenCalledWith(
      "ct-1",
      expect.objectContaining({ config: expect.objectContaining({ permissions: { editor: {} } }) })
    );
  });

  test("refreshes from a cache event and applies remote updates", async () => {
    await loadEditor();
    const listener = editorState.cacheListener!;
    editorState.detail = typeFixture({ name: "Remote Post" });
    React.act(() => listener({ key: cacheKeys.contentTypeDetail("ct-1"), action: "invalidate" }));
    await flush();
    expect(container!.querySelector('[data-slot="page-title"]')!.textContent).toContain(
      "Remote Post"
    );
  });

  test("defers remote updates when local changes exist", async () => {
    await loadEditor();
    clickElement(byText("Add field"));
    const listener = editorState.cacheListener!;
    listener({ key: cacheKeys.contentTypeDetail("ct-1"), action: "invalidate" });
    await flush();
    expect(container!.textContent).toContain("Updated in another tab");
    clickElement(byText("Refresh"));
    await flush();
    expect(container!.textContent).not.toContain("Updated in another tab");
  });

  test("saves with Cmd+S", async () => {
    await loadEditor();
    React.act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", metaKey: true, bubbles: true })
      );
    });
    await flush();
    expect(editorState.updateContentType).toHaveBeenCalled();
  });

  test("opens the schema preview sheet", async () => {
    await loadEditor();
    clickElement(byText("Schema preview"));
    expect(container!.querySelector('[data-slot="schema-preview"]')).not.toBeNull();
  });

  test("opens the mobile field details sheet", async () => {
    await loadEditor();
    clickElement(byText("Edit field details"));
    expect(container!.querySelector('[data-slot="sheet"]')).not.toBeNull();
    expect(container!.textContent).toContain("Field settings");
  });

  test("navigates to the collection workspace", async () => {
    await loadEditor();
    clickElement(byText("Collection workspace"));
    expect(routerState.navigate).toHaveBeenCalledWith("/advanced/engine/ct-1/collection");
  });
});

test("surfaces a refresh error from a cache event", async () => {
  await loadEditor();
  const listener = editorState.cacheListener!;
  editorState.detailError = { kind: "http_error", message: "refresh boom" };
  React.act(() => listener({ key: cacheKeys.contentTypeDetail("ct-1"), action: "invalidate" }));
  await flush();
  expect(container!.querySelector('[data-variant="destructive"]')!.textContent).toContain(
    "refresh boom"
  );
});

test("keeps taxonomies disabled when the initial taxonomy fetch fails", async () => {
  editorState.taxonomyError = new Error("taxonomy offline");
  editorState.cached = [typeFixture()];
  editorState.detail = typeFixture();
  mount();
  await flush();
  React.act(() => tabState.onValueChange?.("settings"));
  const switches = container!.querySelectorAll<HTMLInputElement>('[data-slot="switch"]');
  expect(switches[0].checked).toBe(false);
  expect(switches[1].checked).toBe(false);
});

test("guards saves when no type id is present", async () => {
  setPath("/advanced/engine");
  editorState.cached = [];
  editorState.detail = null;
  mount();
  await flush();
  clickElement(byText("Save"));
  await flush();
  expect(editorState.updateContentType).not.toHaveBeenCalled();
});
