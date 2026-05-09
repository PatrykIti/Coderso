// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const formsPageState = vi.hoisted(() => {
  const apiError = (message: string) => ({
    name: "ApiClientError",
    message,
    code: "request_failed",
    status: 400,
  });

  const form = {
    id: "form-1",
    name: "Contact",
    slug: "contact",
    status: "draft" as const,
    description: "Lead form",
    successMessage: "Thanks!",
    successRedirectUrl: null,
    submissionAccess: "public" as const,
    settings: {
      layoutMode: "single" as const,
      saveProgress: false,
      stepTitles: [],
      preset: "custom" as const,
      automationRetry: {
        enabled: false,
        maxAttempts: 1,
        baseDelayMs: 300,
        maxDelayMs: 2000,
      },
    },
    createdAt: "2026-03-06T10:00:00.000Z",
    updatedAt: "2026-03-06T10:00:00.000Z",
  };

  const field = {
    id: "field-1",
    type: "text",
    label: "Full name",
    name: "full_name",
    required: true,
    orderIndex: 0,
    settings: {
      placeholder: "Jane Doe",
      step: 1,
    },
  };

  const action = {
    id: "action-1",
    formId: "form-1",
    type: "success_message" as const,
    label: "Success message",
    enabled: true,
    continueOnError: true,
    condition: { operator: "always" as const },
    config: { message: "Thanks!" },
    orderIndex: 0,
    createdAt: "2026-03-06T10:00:00.000Z",
    updatedAt: "2026-03-06T10:00:00.000Z",
  };

  return {
    apiError,
    form: {
      ...form,
      settings: {
        ...form.settings,
        automationRetry: {
          ...form.settings.automationRetry,
        },
      },
    },
    field: {
      ...field,
      settings: {
        ...field.settings,
      },
    },
    action: {
      ...action,
      condition: {
        ...action.condition,
      },
      config: {
        ...action.config,
      },
    },
    formsList: [form],
    formDetail: { form, fields: [field] },
    formActions: [action],
    contentTypes: [{ id: "articles", name: "Articles" }],
    listError: null as unknown,
    createError: null as unknown,
    createReturnsNull: false,
    deleteError: null as unknown,
    detailError: null as unknown,
    updateError: null as unknown,
    settingsError: null as unknown,
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    subscribers: new Set<(event: { key: string; action?: string }) => void>(),
    listCalls: [] as Array<boolean | undefined>,
    refreshCalls: [] as Array<boolean | undefined>,
    createCalls: [] as Array<Record<string, unknown>>,
    deleteCalls: [] as string[],
    settingsSetCalls: [] as Array<{ key: string; value: unknown }>,
    detailCalls: [] as Array<{ id: string; force?: boolean }>,
    actionsCalls: [] as Array<{ id: string; force?: boolean }>,
    updateFormCalls: [] as Array<{ id: string; input: Record<string, unknown> }>,
    updateFieldsCalls: [] as Array<{ id: string; fields: Array<Record<string, unknown>> }>,
    updateActionsCalls: [] as Array<{ id: string; actions: Array<Record<string, unknown>> }>,
    navigateCalls: [] as string[],
    reset() {
      this.form = {
        ...form,
        settings: {
          ...form.settings,
          automationRetry: {
            ...form.settings.automationRetry,
          },
        },
      };
      this.field = {
        ...field,
        settings: {
          ...field.settings,
        },
      };
      this.action = {
        ...action,
        condition: {
          ...action.condition,
        },
        config: {
          ...action.config,
        },
      };
      this.formsList = [this.form];
      this.formDetail = { form: this.form, fields: [this.field] };
      this.formActions = [this.action];
      this.contentTypes = [{ id: "articles", name: "Articles" }];
      this.listError = null;
      this.createError = null;
      this.createReturnsNull = false;
      this.deleteError = null;
      this.detailError = null;
      this.updateError = null;
      this.settingsError = null;
      this.toastSuccess.mockClear();
      this.toastError.mockClear();
      this.subscribers.clear();
      this.listCalls = [];
      this.refreshCalls = [];
      this.createCalls = [];
      this.deleteCalls = [];
      this.settingsSetCalls = [];
      this.detailCalls = [];
      this.actionsCalls = [];
      this.updateFormCalls = [];
      this.updateFieldsCalls = [];
      this.updateActionsCalls = [];
      this.navigateCalls = [];
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => <div data-dialog-open={String(Boolean(open))}>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    formsList: "formsList",
    formDetail: (id: string) => `formDetail:${id}`,
    formActions: (id: string) => `formActions:${id}`,
  },
}));

vi.mock("@/services/contentTypesClient", () => ({
  listContentTypesCached: vi.fn(async () => formsPageState.contentTypes),
  getCachedContentTypes: () => formsPageState.contentTypes,
}));

vi.mock("@/services/formsClient", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/services/formsClient");
  return {
    ...actual,
    getCachedForms: () => formsPageState.formsList,
    listFormsCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
      formsPageState.listCalls.push(force);
      if (formsPageState.listError) throw formsPageState.listError;
      return formsPageState.formsList;
    }),
    createForm: vi.fn(async (input) => {
      formsPageState.createCalls.push(input);
      if (formsPageState.createError) throw formsPageState.createError;
      if (formsPageState.createReturnsNull) return null;
      return { ...formsPageState.form, id: "created-form", ...input };
    }),
    deleteForm: vi.fn(async (id: string) => {
      formsPageState.deleteCalls.push(id);
      if (formsPageState.deleteError) throw formsPageState.deleteError;
      return { ok: true };
    }),
    getCachedFormDetail: () => formsPageState.formDetail,
    getCachedFormActions: () => formsPageState.formActions,
    getFormDetailCached: vi.fn(async (id: string, { force }: { force?: boolean } = {}) => {
      formsPageState.detailCalls.push({ id, force });
      if (formsPageState.detailError) throw formsPageState.detailError;
      return formsPageState.formDetail;
    }),
    listFormActionsCached: vi.fn(async (id: string, { force }: { force?: boolean } = {}) => {
      formsPageState.actionsCalls.push({ id, force });
      return formsPageState.formActions;
    }),
    updateForm: vi.fn(async (id: string, input) => {
      formsPageState.updateFormCalls.push({ id, input });
      if (formsPageState.updateError) throw formsPageState.updateError;
      return { ...formsPageState.form, ...input };
    }),
    updateFormFields: vi.fn(async (id: string, fields) => {
      formsPageState.updateFieldsCalls.push({ id, fields });
      if (formsPageState.updateError) throw formsPageState.updateError;
      return fields.map((field: Record<string, unknown>, index: number) => ({
        id: field.id ?? `field-${index + 1}`,
        type: field.type,
        label: field.label,
        name: field.name,
        required: field.required ?? false,
        orderIndex: field.orderIndex ?? index,
        settings: field.settings ?? {},
      }));
    }),
    updateFormActions: vi.fn(async (id: string, actions) => {
      formsPageState.updateActionsCalls.push({ id, actions });
      if (formsPageState.updateError) throw formsPageState.updateError;
      return actions.map((action: Record<string, unknown>, index: number) => ({
        id: action.id ?? `action-${index + 1}`,
        formId: id,
        type: action.type,
        label: action.label ?? "Action",
        enabled: action.enabled ?? true,
        continueOnError: action.continueOnError ?? true,
        condition: action.condition ?? { operator: "always" },
        config: action.config ?? {},
        orderIndex: action.orderIndex ?? index,
        createdAt: "2026-03-06T12:00:00.000Z",
        updatedAt: "2026-03-06T12:00:00.000Z",
      }));
    }),
  };
});

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (path: string) => formsPageState.navigateCalls.push(path),
  }),
}));

vi.mock("@/services/userSettingsClient", () => ({
  getUserSettings: vi.fn(async () => {
    if (formsPageState.settingsError) throw formsPageState.settingsError;
    return {
      "pages.openAfterCreate": true,
      "customScreens.openAfterCreate": true,
      "forms.openAfterCreate": true,
      "media.openAfterUpload": false,
      "widgets.favorites": [],
      "widgets.hero.presets": [],
      "posts.editor.preferences": {
        version: 2,
        focusModeOnOpen: false,
        compactSidePanels: false,
        showOutlineHints: true,
        editorDensity: "comfortable",
        showKeyboardHints: true,
        defaultInspectorTab: "post",
        restoreLastSidebarsState: true,
      },
      "assistant.mode": null,
      "assistant.ui.enabled": true,
      "assistant.ui.avatarEnabled": false,
      "assistant.ui.avatarAsset": null,
    };
  }),
  setUserSetting: vi.fn(async (key: string, value: unknown) => {
    formsPageState.settingsSetCalls.push({ key, value });
    if (formsPageState.settingsError) throw formsPageState.settingsError;
    return { key, value };
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: formsPageState.toastSuccess,
    error: formsPageState.toastError,
  },
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
    activeHref,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    activeHref?: string;
  }) => (
    <div data-active-href={activeHref}>
      <div>{breadcrumbs}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    children,
    leftPanel,
    rightPanel,
    breadcrumbs,
  }: {
    children: React.ReactNode;
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    breadcrumbs?: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <aside>{leftPanel}</aside>
      <main>{children}</main>
      <aside>{rightPanel}</aside>
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
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </div>
  ),
}));

vi.mock("@/ui/shared/ListPaginationFooter", () => ({
  ListPaginationFooter: ({
    resourceLabel,
    pagination,
    isLoading,
  }: {
    resourceLabel: string;
    pagination: { totalItems: number; visibleRows: unknown[] };
    isLoading?: boolean;
  }) => (
    <div>
      {isLoading
        ? `Loading ${resourceLabel}...`
        : `pagination:${resourceLabel}:${pagination.visibleRows.length}/${pagination.totalItems}`}
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    formsPageState.subscribers.add(handler);
    return () => formsPageState.subscribers.delete(handler);
  },
}));

vi.mock("../../../core/admin/ui/forms/FormCreateDrawer", () => ({
  FormCreateDrawer: ({
    open,
    onCreate,
    openAfterCreate,
    onOpenAfterCreateChange,
  }: {
    open: boolean;
    onCreate: (payload: {
      name: string;
      slug?: string | null;
      status: "draft" | "published" | "archived";
      description?: string | null;
      openAfterCreate: boolean;
    }) => Promise<void> | void;
    openAfterCreate: boolean;
    onOpenAfterCreateChange: (value: boolean) => void;
  }) => (
    <div>
      <span>{open ? "drawer-open" : "drawer-closed"}</span>
      <span>{`open-after:${String(openAfterCreate)}`}</span>
      <button type="button" onClick={() => onOpenAfterCreateChange(false)}>
        disable-open-after-create
      </button>
      <button
        type="button"
        onClick={() =>
          onCreate({
            name: "Created form",
            slug: "created-form",
            status: "draft",
            description: "Created from drawer",
            openAfterCreate,
          })
        }
      >
        create-form-drawer
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FormTable", () => ({
  FormTable: ({
    items,
    onEdit,
    onActionLogs,
    onPublish,
    onMoveToDraft,
    onArchive,
    onDelete,
    emptyMessage,
  }: {
    items: Array<{ id: string; name: string }>;
    onEdit: (id: string) => void;
    onActionLogs: (id: string) => void;
    onPublish: (id: string) => void;
    onMoveToDraft: (id: string) => void;
    onArchive: (id: string) => void;
    onDelete?: (id: string) => void;
    emptyMessage?: string;
  }) => (
    <div>
      <span>{emptyMessage ?? "rows-loaded"}</span>
      {items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
      {items[0] ? (
        <>
          <button type="button" onClick={() => onEdit(items[0]!.id)}>
            edit-form-row
          </button>
          <button type="button" onClick={() => onActionLogs(items[0]!.id)}>
            action-logs-form-row
          </button>
          <button type="button" onClick={() => onPublish(items[0]!.id)}>
            publish-form-row
          </button>
          <button type="button" onClick={() => onMoveToDraft(items[0]!.id)}>
            draft-form-row
          </button>
          <button type="button" onClick={() => onArchive(items[0]!.id)}>
            archive-form-row
          </button>
          <button type="button" onClick={() => onDelete?.(items[0]!.id)}>
            delete-form-row
          </button>
        </>
      ) : null}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FormFilters", () => ({
  FormFilters: ({
    onSearchChange,
    onStatusChange,
    onAccessChange,
  }: {
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onAccessChange: (value: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSearchChange("contact")}>
        filter-search-contact
      </button>
      <button type="button" onClick={() => onStatusChange("published")}>
        filter-status-published
      </button>
      <button type="button" onClick={() => onAccessChange("internal")}>
        filter-access-internal
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FormBulkActionsBar", () => ({
  FormBulkActionsBar: ({
    selectedCount,
    onActionChange,
    onApply,
    onClear,
  }: {
    selectedCount: number;
    onActionChange: (value: string) => void;
    onApply: () => void;
    onClear: () => void;
  }) => (
    <div>
      <span>{`bulk-selected:${selectedCount}`}</span>
      <button type="button" onClick={() => onActionChange("publish")}>
        bulk-action-publish
      </button>
      <button type="button" onClick={() => onActionChange("delete")}>
        bulk-action-delete
      </button>
      <button type="button" onClick={onApply}>
        bulk-action-apply
      </button>
      <button type="button" onClick={onClear}>
        bulk-action-clear
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FieldLibrary", () => ({
  FieldLibrary: ({
    onAddField,
  }: {
    onAddField: (item: { id: string; label: string; type: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onAddField({ id: "text", label: "Text Input", type: "text" })}
    >
      add-library-field
    </button>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FieldListPanel", () => ({
  FieldListPanel: ({
    fields,
    onSelect,
    onAdd,
  }: {
    fields: Array<{ id: string; label: string }>;
    onSelect: (id: string) => void;
    onAdd: () => void;
  }) => (
    <div>
      <span>{`field-list:${fields.length}`}</span>
      <button type="button" onClick={() => onSelect(fields[0]?.id ?? "")}>
        select-first-field
      </button>
      <button type="button" onClick={onAdd}>
        open-library
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FormActionsPanel", () => ({
  FormActionsPanel: ({
    onChange,
    onOpenLogs,
  }: {
    onChange: (actions: Array<Record<string, unknown>>) => void;
    onOpenLogs: () => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onChange([
            {
              id: "action-2",
              type: "webhook",
              label: "Webhook",
              enabled: true,
              continueOnError: false,
              condition: { operator: "always" },
              config: {},
              orderIndex: 0,
            },
          ])
        }
      >
        update-actions
      </button>
      <button type="button" onClick={onOpenLogs}>
        open-action-logs
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FieldSettingsPanel", () => ({
  FieldSettingsPanel: ({
    field,
    onChange,
    onSettingsChange,
    onDuplicate,
  }: {
    field: { id: string };
    onChange: (id: string, updates: Record<string, unknown>) => void;
    onSettingsChange: (id: string, updates: Record<string, unknown>) => void;
    onDuplicate?: (id: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onChange(field.id, { label: "Updated field" })}>
        change-field
      </button>
      <button type="button" onClick={() => onSettingsChange(field.id, { placeholder: "Updated" })}>
        change-field-settings
      </button>
      <button type="button" onClick={() => onDuplicate?.(field.id)}>
        duplicate-field
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FormCanvas", () => ({
  FormCanvas: ({
    fields,
    onSelectField,
    onSelectForm,
    onRemoveField,
  }: {
    fields: Array<{ id: string; label: string }>;
    onSelectField: (id: string) => void;
    onSelectForm: () => void;
    onRemoveField: (id: string) => void;
  }) => (
    <div>
      <span>{`canvas:${fields.length}`}</span>
      <button type="button" onClick={() => onSelectField(fields[0]?.id ?? "")}>
        canvas-select-field
      </button>
      <button type="button" onClick={onSelectForm}>
        canvas-select-form
      </button>
      <button type="button" onClick={() => onRemoveField(fields[0]?.id ?? "")}>
        canvas-remove-field
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FormSettingsPanel", () => ({
  FormSettingsPanel: ({
    onNameChange,
    onSettingsChange,
    onAutomationRetryChange,
    onStepTitlesChange,
    onApplyPreset,
  }: {
    onNameChange: (value: string) => void;
    onSettingsChange: (updates: Record<string, unknown>) => void;
    onAutomationRetryChange: (updates: Record<string, unknown>) => void;
    onStepTitlesChange: (titles: string[]) => void;
    onApplyPreset: (presetId: "contact" | "lead_capture" | "service_intake") => void;
  }) => (
    <div>
      <button type="button" onClick={() => onNameChange("Updated form name")}>
        change-form-name
      </button>
      <button type="button" onClick={() => onSettingsChange({ layoutMode: "multi_step" })}>
        change-form-settings
      </button>
      <button type="button" onClick={() => onAutomationRetryChange({ enabled: true })}>
        change-retry
      </button>
      <button type="button" onClick={() => onStepTitlesChange(["Intro", "Review"])}>
        change-step-titles
      </button>
      <button type="button" onClick={() => onApplyPreset("contact")}>
        apply-preset
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/forms/FormRuntimePreviewDialog", () => ({
  FormRuntimePreviewDialog: ({
    open,
    hasUnsavedChanges,
  }: {
    open: boolean;
    hasUnsavedChanges: boolean;
  }) => (
    <div>{`runtime-preview:${open ? "open" : "closed"}:${hasUnsavedChanges ? "dirty" : "clean"}`}</div>
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
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  formsPageState.reset();
  window.history.replaceState({}, "", "/");
});

test("useForms consumes cache, refreshes, and reacts to cache bus events", async () => {
  const { useForms } = await import("../../../core/admin/ui/forms/hooks/useForms");

  const Harness = () => {
    const { items, isLoading, error, refresh } = useForms();
    return (
      <div>
        <span>{`count:${items.length}`}</span>
        <span>{`loading:${String(isLoading)}`}</span>
        <span>{error ?? "no-error"}</span>
        <button type="button" onClick={() => refresh(true)}>
          refresh-forms
        </button>
      </div>
    );
  };

  const view = mount(<Harness />);

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("count:1");
    expect(formsPageState.listCalls).toContain(false);

    await React.act(async () => {
      for (const subscriber of formsPageState.subscribers) {
        subscriber({ key: "formsList" });
      }
      await Promise.resolve();
    });

    expect(formsPageState.listCalls.length).toBeGreaterThan(1);

    formsPageState.listError = formsPageState.apiError("Forms load failed");
    await React.act(async () => {
      view.container
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Forms load failed");
  } finally {
    view.cleanup();
  }
});

test("FormListPage creates, refreshes fallback, confirms row actions, and reports form errors", async () => {
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");

  const view = mount(<FormListPage />);

  try {
    expect(view.container.textContent).toContain("Forms");
    expect(view.container.textContent).toContain("Contact");
    expect(
      view.container.querySelector("[data-active-href]")?.getAttribute("data-active-href")
    ).toBe("/admin/advanced/forms");

    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("New"))
        ?.click();
      buttons()
        .find((button) => button.textContent === "create-form-drawer")
        ?.click();
    });
    await flush();

    expect(formsPageState.createCalls[0]).toEqual({
      name: "Created form",
      slug: "created-form",
      status: "draft",
      description: "Created from drawer",
    });
    expect(formsPageState.navigateCalls).toContain("/advanced/forms/created-form");
    expect(formsPageState.toastSuccess).toHaveBeenCalledWith('Form "Created form" created.');

    formsPageState.createReturnsNull = true;
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "create-form-drawer")
        ?.click();
    });
    await flush();
    expect(formsPageState.listCalls.at(-1)).toBe(true);

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "edit-form-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "action-logs-form-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "publish-form-row")
        ?.click();
    });
    await flush();
    expect(formsPageState.navigateCalls).toContain("/advanced/forms/form-1");
    expect(formsPageState.navigateCalls).toContain("/advanced/forms/form-1/action-runs");
    expect(formsPageState.updateFormCalls).toContainEqual({
      id: "form-1",
      input: { status: "published" },
    });

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "delete-form-row")
        ?.click();
    });
    expect(formsPageState.deleteCalls).toHaveLength(0);

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "Delete form")
        ?.click();
    });
    await flush();
    expect(formsPageState.deleteCalls).toContain("form-1");
    expect(formsPageState.toastSuccess).toHaveBeenCalledWith("Form deleted.");

    formsPageState.createError = formsPageState.apiError("Create failed");
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "create-form-drawer")
        ?.click();
    });
    await flush();
    expect(view.container.textContent).toContain("Forms update failed");
    expect(view.container.textContent).toContain("Create failed");

    formsPageState.createError = null;
    formsPageState.deleteError = new Error("boom");
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "delete-form-row")
        ?.click();
    });
    await flush();
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "Delete form")
        ?.click();
    });
    await flush();
    expect(view.container.textContent).toContain("Failed to delete form.");
  } finally {
    view.cleanup();
  }
});

test("FormListPage reports load failures", async () => {
  formsPageState.listError = formsPageState.apiError("Forms load failed");
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");

  const view = mount(<FormListPage />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Unable to load forms");
    expect(view.container.textContent).toContain("Forms load failed");
  } finally {
    view.cleanup();
  }
});

test("FormBuilderPage hydrates cache, tracks dirty state, refreshes remote updates, saves, previews, and opens logs", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const originalConfirm = window.confirm;
  const confirmSpy = vi.fn(() => true);
  Object.defineProperty(window, "confirm", {
    value: confirmSpy,
    configurable: true,
    writable: true,
  });
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Contact");
    expect(view.container.textContent).toContain("canvas:1");
    expect(formsPageState.detailCalls).toContainEqual({ id: "form-1", force: true });
    expect(formsPageState.actionsCalls).toContainEqual({ id: "form-1", force: true });

    clickByText(view.container, "open-library");
    clickByText(view.container, "add-library-field");
    clickByText(view.container, "duplicate-field");
    await flush();

    expect(view.container.textContent).toContain("canvas:3");
    expect(view.container.textContent).toContain("Unsaved changes");

    const mobileSelectButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (button) => button.textContent === "select-first-field"
    );
    const mobileAddButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (button) => button.textContent === "add-library-field"
    );

    React.act(() => {
      mobileSelectButtons.at(-1)?.click();
      mobileAddButtons.at(-1)?.click();
    });
    await flush();

    expect(view.container.textContent).toContain("canvas:4");

    clickByText(view.container, "canvas-select-field");
    await flush();

    clickByText(view.container, "Runtime preview");
    await flush();

    expect(view.container.textContent).toContain("Save form before opening runtime preview.");

    clickByText(view.container, "canvas-select-form");
    clickByText(view.container, "change-form-name");
    clickByText(view.container, "change-form-settings");
    clickByText(view.container, "change-retry");
    clickByText(view.container, "change-step-titles");
    clickByText(view.container, "apply-preset");
    await flush();

    expect(confirmSpy).toHaveBeenCalled();

    formsPageState.formDetail = {
      form: {
        ...formsPageState.form,
        name: "Remote Contact",
      },
      fields: [formsPageState.formDetail.fields[0]!],
    };

    await React.act(async () => {
      for (const subscriber of formsPageState.subscribers) {
        subscriber({ key: "formDetail:form-1" });
      }
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Updated in another tab");

    clickByText(view.container, "Refresh");
    await flush();

    expect(view.container.textContent).toContain("Remote Contact");
    expect(view.container.textContent).not.toContain("Updated in another tab");

    clickByText(view.container, "canvas-select-form");
    clickByText(view.container, "change-form-name");
    await flush();

    clickByText(view.container, "Save form");
    await flush();

    expect(formsPageState.updateFormCalls[0]).toEqual({
      id: "form-1",
      input: expect.objectContaining({
        name: "Updated form name",
      }),
    });
    expect(formsPageState.updateFieldsCalls[0]?.id).toBe("form-1");
    expect(formsPageState.updateFieldsCalls[0]?.fields.length).toBeGreaterThan(0);
    expect(formsPageState.updateActionsCalls[0]?.id).toBe("form-1");
    expect(view.container.textContent).toContain("Form saved.");

    clickByText(view.container, "Runtime preview");
    await flush();

    expect(view.container.textContent).toContain("runtime-preview:open:clean");

    clickByText(view.container, "Action logs");
    expect(formsPageState.navigateCalls).toContain("/advanced/forms/form-1/action-runs");
  } finally {
    Object.defineProperty(window, "confirm", {
      value: originalConfirm,
      configurable: true,
      writable: true,
    });
    view.cleanup();
  }
});

test("FormBuilderPage handles routes without form ids", async () => {
  window.history.replaceState({}, "", "/admin/forms");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Loading form builder");
    expect(formsPageState.detailCalls).toHaveLength(0);
    expect(formsPageState.actionsCalls).toHaveLength(0);

    clickByText(view.container, "Action logs");

    expect(formsPageState.navigateCalls).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("FormBuilderPage reports not-found, load, and save errors", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  formsPageState.formDetail = null as never;

  const missingView = mount(<FormBuilderPage />);

  try {
    await flush();

    expect(missingView.container.textContent).toContain("Unable to load form");
    expect(missingView.container.textContent).toContain("Form not found.");

    clickByText(missingView.container, "change-form-name");
    await flush();
    clickByText(missingView.container, "Save form");
    await flush();

    expect(formsPageState.updateFormCalls).toHaveLength(0);
  } finally {
    missingView.cleanup();
  }

  formsPageState.reset();
  window.history.replaceState({}, "", "/admin/forms/form-1");
  formsPageState.detailError = new Error("boom");

  const loadView = mount(<FormBuilderPage />);

  try {
    await flush();

    expect(loadView.container.textContent).toContain("Unable to load form");
    expect(loadView.container.textContent).toContain("Failed to load form.");
  } finally {
    loadView.cleanup();
  }

  formsPageState.reset();
  window.history.replaceState({}, "", "/admin/forms/form-1");

  const saveView = mount(<FormBuilderPage />);

  try {
    await flush();

    formsPageState.updateError = formsPageState.apiError("Save failed");
    clickByText(saveView.container, "add-library-field");
    await flush();
    clickByText(saveView.container, "Save form");
    await flush();

    expect(saveView.container.textContent).toContain("Save failed");
  } finally {
    saveView.cleanup();
  }
});
