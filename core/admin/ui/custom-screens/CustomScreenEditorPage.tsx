import { Columns3, Eye, EyeOff, ListPlus, Save, Settings2, SlidersHorizontal } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  createCustomScreen,
  getCachedCustomScreen,
  getCustomScreenCached,
  updateCustomScreen,
  type CustomScreenRecord,
  type CustomScreenStatus,
} from "@/services/customScreensClient";
import {
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenDefinition,
  type ScreenBlockV1,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";

import { CustomScreenShell } from "./CustomScreenShell";
import { ListViewDesigner } from "./ListViewDesigner";
import { ListViewCanvas } from "./ListViewCanvas";
import { ListViewColumnInspector } from "./ListViewColumnInspector";
import { ListViewElementLibrary } from "./ListViewElementLibrary";
import { CustomScreenWorkspacePreviewDialog } from "./CustomScreenWorkspacePreviewDialog";
import { resolveCustomScreenId } from "./routeParams";
import { AuthoringCanvasFrame, AuthoringFloatingToolbar } from "@/ui/authoring";
import { buildCustomScreenAssistantSurface } from "./assistantSurface";
import {
  addScreenBlock,
  createScreenBlock,
  duplicateScreenBlockWithBindings,
  findScreenBlockById,
  getFirstScreenBlockId,
  moveScreenBlock,
  removeScreenBindingsForBlockTree,
  removeScreenBlock,
  updateScreenBlock,
  type ScreenBlockKind,
} from "../../../services/customScreens/screenDocumentOps";
import {
  buildListColumnFromOption,
  getVisibleListColumns,
  listSelectableListFields,
} from "./customScreenListModel";
import {
  useCustomScreenPreviewRecordState,
  type CustomScreenPreviewRecordState,
} from "./customScreenPreviewData";
import { createScreenFieldBinding } from "./ScreenBlockInspector";
import { ScreenAuthoringCanvas } from "./ScreenAuthoringCanvas";
import type { ContentField } from "../content-types/SchemaBuilder";

type ListViewAuthoringPanel = "elements" | "column" | "list" | "hidden" | "settings";

const normalizeText = (value: string) => value.trim();

const blockTreeContains = (blocks: readonly ScreenBlockV1[], blockId: string): boolean =>
  blocks.some(
    (block) =>
      block.id === blockId ||
      (block.children ? blockTreeContains(block.children, blockId) : false) ||
      (block.slots
        ? Object.values(block.slots).some((slotBlocks) => blockTreeContains(slotBlocks, blockId))
        : false)
  );

const findBlockSectionId = (document: ScreenDocumentV1, blockId: string | null) => {
  if (!blockId) return null;
  return (
    document.sections.find((section) => blockTreeContains(section.blocks, blockId))?.id ?? null
  );
};

const resolveInitialSelection = (document: ScreenDocumentV1) => {
  const blockId = getFirstScreenBlockId(document);
  return {
    blockId,
    sectionId: findBlockSectionId(document, blockId) ?? document.sections[0]?.id ?? null,
  };
};

const resolveScreenDefinition = (
  screen: CustomScreenRecord | null | undefined
): CustomScreenDefinition => {
  return normalizeCustomScreenDefinitionForRead({
    definition: screen?.definition,
    schemaVersion: screen?.schemaVersion,
    blocks: screen?.blocks,
    bindings: screen?.bindings,
  });
};

function PreviewStateNotice({
  contentType,
  previewRecordState,
  isLoading,
}: {
  contentType: ContentTypeSummary | null;
  previewRecordState: CustomScreenPreviewRecordState;
  isLoading: boolean;
}) {
  const message = isLoading
    ? `Loading the first record for ${contentType?.name ?? "this content type"}. Schema fallback values are shown until preview data is ready.`
    : previewRecordState.source === "entry"
      ? previewRecordState.note
      : previewRecordState.note;
  if (!message) return null;

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function CustomScreenPreviewRecordOwner({
  contentType,
  children,
}: {
  contentType: ContentTypeSummary | null;
  children: (state: {
    isLoading: boolean;
    previewRecordState: CustomScreenPreviewRecordState;
  }) => ReactNode;
}) {
  const state = useCustomScreenPreviewRecordState(contentType);
  return <>{children(state)}</>;
}

export function CustomScreenEditorPage() {
  const { path, navigate } = useAdminRouter();
  const screenId = useMemo(() => resolveCustomScreenId(path), [path]);
  const isCreateMode = !screenId || screenId === "new";

  const [contentTypes, setContentTypes] = useState<ContentTypeSummary[]>(
    () => getCachedContentTypes() ?? []
  );
  const [screen, setScreen] = useState<CustomScreenRecord | null>(() => {
    if (isCreateMode || !screenId) return null;
    return getCachedCustomScreen(screenId) ?? null;
  });
  const [name, setName] = useState(screen?.name ?? "");
  const [contentTypeId, setContentTypeId] = useState(screen?.contentTypeId ?? "");
  const [status, setStatus] = useState<CustomScreenStatus>(screen?.status ?? "draft");
  const [showInSidebar, setShowInSidebar] = useState(screen?.showInSidebar ?? false);
  const [sidebarLabel, setSidebarLabel] = useState(screen?.sidebarLabel ?? "");
  const [definition, setDefinition] = useState<CustomScreenDefinition>(() =>
    resolveScreenDefinition(screen)
  );
  const screenDocument = definition.editorView.document;
  const screenBindings = definition.editorView.bindings;
  const [selectedId, setSelectedId] = useState<string | null>(
    () => resolveInitialSelection(resolveScreenDefinition(screen).editorView.document).blockId
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    () => resolveInitialSelection(resolveScreenDefinition(screen).editorView.document).sectionId
  );
  const [isLoading, setIsLoading] = useState(() => !isCreateMode && !screen);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeBuilderTab, setActiveBuilderTab] = useState<"list-view" | "editor-view">(
    "list-view"
  );
  const [activeListPanel, setActiveListPanel] = useState<ListViewAuthoringPanel | null>(null);
  const [selectedListColumnId, setSelectedListColumnId] = useState<string | null>(
    () => resolveScreenDefinition(screen).listView.columns[0]?.id ?? null
  );
  const definitionRef = useRef(definition);

  const selectedContentType = useMemo(
    () => contentTypes.find((type) => type.id === contentTypeId) ?? null,
    [contentTypeId, contentTypes]
  );
  const contentFields = useMemo(
    () => (selectedContentType ? fieldsFromSchema(selectedContentType.schema) : []),
    [selectedContentType]
  );
  const previewCapabilities = useMemo(
    () => resolveCustomScreenCapabilities({ definition }),
    [definition]
  );

  const selectedListColumn = useMemo(
    () => definition.listView.columns.find((column) => column.id === selectedListColumnId) ?? null,
    [definition.listView.columns, selectedListColumnId]
  );
  const availableListFieldOptions = useMemo(() => {
    if (!selectedContentType) return [];
    const selectedKeys = new Set(
      definition.listView.columns.map((column) => `${column.source}:${column.field}`)
    );
    return listSelectableListFields(selectedContentType).filter(
      (option) => !selectedKeys.has(`${option.source}:${option.field}`)
    );
  }, [definition.listView.columns, selectedContentType]);

  useEffect(() => {
    if (isCreateMode || !screen || !screenId) {
      clearActiveAssistantSurfaceContext();
      return undefined;
    }

    setActiveAssistantSurfaceContext(
      buildCustomScreenAssistantSurface({
        screen: {
          ...screen,
          name: name.trim() || screen.name,
          contentTypeId: contentTypeId || screen.contentTypeId,
          status,
          showInSidebar,
          sidebarLabel: sidebarLabel.trim() || null,
          definition,
        },
        blocks: screenDocument.sections.flatMap((section) => section.blocks),
        bindings: screenBindings,
        capabilities: previewCapabilities,
        selectedBlockId: selectedId,
        warnings: [
          ...(hasUnsavedChanges ? ["custom_screen_has_unsaved_changes"] : []),
          ...(remoteUpdatePending ? ["custom_screen_remote_update_pending"] : []),
        ],
      })
    );

    return () => {
      clearActiveAssistantSurfaceContext();
    };
  }, [
    contentTypeId,
    definition,
    hasUnsavedChanges,
    isCreateMode,
    name,
    previewCapabilities,
    remoteUpdatePending,
    screen,
    screenBindings,
    screenDocument.sections,
    screenId,
    selectedId,
    showInSidebar,
    sidebarLabel,
    status,
  ]);

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setError(null);
  }, []);

  const updateDefinition = useCallback(
    (next: CustomScreenDefinition) => {
      definitionRef.current = next;
      setDefinition(next);
      markDirty();
    },
    [markDirty]
  );

  const updateEditorView = useCallback(
    (next: {
      document?: CustomScreenDefinition["editorView"]["document"];
      bindings?: ScreenFieldBinding[];
    }) => {
      const current = definitionRef.current;
      updateDefinition({
        ...current,
        editorView: {
          ...current.editorView,
          document: next.document ?? current.editorView.document,
          bindings: next.bindings ?? current.editorView.bindings,
        },
      });
    },
    [updateDefinition]
  );

  const updateListView = useCallback(
    (next: CustomScreenDefinition["listView"]) => {
      updateDefinition({
        ...definition,
        listView: next,
      });
      if (!next.columns.some((column) => column.id === selectedListColumnId)) {
        setSelectedListColumnId(next.columns[0]?.id ?? null);
      }
    },
    [definition, selectedListColumnId, updateDefinition]
  );

  const applyScreen = useCallback((record: CustomScreenRecord) => {
    const nextDefinition = resolveScreenDefinition(record);
    const nextSelection = resolveInitialSelection(nextDefinition.editorView.document);
    definitionRef.current = nextDefinition;
    setScreen(record);
    setName(record.name);
    setContentTypeId(record.contentTypeId);
    setStatus(record.status);
    setShowInSidebar(record.showInSidebar ?? false);
    setSidebarLabel(record.sidebarLabel ?? "");
    setDefinition(nextDefinition);
    setSelectedId(nextSelection.blockId);
    setSelectedSectionId(nextSelection.sectionId);
    setSelectedListColumnId(nextDefinition.listView.columns[0]?.id ?? null);
    setHasUnsavedChanges(false);
  }, []);

  const refreshScreen = useCallback(
    async (force?: boolean) => {
      if (!screenId || isCreateMode) return;
      try {
        const detail = await getCustomScreenCached(screenId, { force });
        if (!detail) {
          setError("Custom screen not found.");
          return;
        }
        applyScreen(detail);
        setError(null);
      } catch (err) {
        setError(isApiClientError(err) ? err.message : "Failed to load custom screen.");
      } finally {
        setIsLoading(false);
      }
    },
    [applyScreen, isCreateMode, screenId]
  );

  const handleSelectBlock = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setSelectedSectionId(findBlockSectionId(definitionRef.current.editorView.document, id));
    }
  }, []);

  useEffect(() => {
    listContentTypesCached({ force: true })
      .then((items) => setContentTypes(items))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isCreateMode) return;
    if (!screenId) return;
    let active = true;
    getCustomScreenCached(screenId, { force: true })
      .then((detail) => {
        if (!active || !detail) return;
        applyScreen(detail);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(isApiClientError(err) ? err.message : "Failed to load custom screen.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyScreen, isCreateMode, screenId]);

  useEffect(() => {
    if (isCreateMode || !screenId) return undefined;
    return subscribeCacheEvents((event) => {
      if (
        event.key !== cacheKeys.customScreensList &&
        event.key !== cacheKeys.customScreenDetail(screenId)
      ) {
        return;
      }
      if (hasUnsavedChanges) {
        setRemoteUpdatePending(true);
        return;
      }
      refreshScreen(true).catch(() => undefined);
    });
  }, [hasUnsavedChanges, isCreateMode, refreshScreen, screenId]);

  const resolveSelectedSlotTarget = (
    document: CustomScreenDefinition["editorView"]["document"]
  ) => {
    const selected = findScreenBlockById(document, selectedId);
    if (!selected?.slots) return undefined;
    if (selected.type === "field-group") return { parentId: selected.id, slotId: "content" };
    if (selected.type === "columns") return { parentId: selected.id, slotId: "left" };
    const slotId = Object.keys(selected.slots)[0];
    return slotId ? { parentId: selected.id, slotId } : undefined;
  };

  const handleAddBlock = (type: ScreenBlockKind, field?: ContentField) => {
    const current = definitionRef.current;
    const created = createScreenBlock({
      type,
      field: field?.name,
      label: field?.label,
    });
    const target = resolveSelectedSlotTarget(current.editorView.document);
    const nextDocument = addScreenBlock(current.editorView.document, created.block, target);
    updateEditorView({
      document: nextDocument,
      bindings: [...current.editorView.bindings, ...created.bindings],
    });
    setSelectedId(created.block.id);
    setSelectedSectionId(findBlockSectionId(nextDocument, created.block.id));
  };

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
    const current = definitionRef.current;
    updateEditorView({
      document: moveScreenBlock(current.editorView.document, blockId, direction),
    });
  };

  const handleDuplicateBlock = (blockId: string) => {
    const current = definitionRef.current;
    const result = duplicateScreenBlockWithBindings(
      current.editorView.document,
      current.editorView.bindings,
      blockId
    );
    updateEditorView({
      document: result.document,
      bindings: result.bindings,
    });
    if (result.duplicatedBlockId) {
      setSelectedId(result.duplicatedBlockId);
      setSelectedSectionId(findBlockSectionId(result.document, result.duplicatedBlockId));
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    const current = definitionRef.current;
    const result = removeScreenBlock(current.editorView.document, blockId);
    if (!result.removed) return;
    updateEditorView({
      document: result.document,
      bindings: removeScreenBindingsForBlockTree(current.editorView.bindings, result.removed),
    });
    if (selectedId && !findScreenBlockById(result.document, selectedId)) {
      const nextSelection = resolveInitialSelection(result.document);
      setSelectedId(nextSelection.blockId);
      setSelectedSectionId(nextSelection.sectionId);
    }
  };

  const handlePatchBlock = (blockId: string, patch: Partial<ScreenBlockV1>) => {
    const current = definitionRef.current;
    updateEditorView({
      document: updateScreenBlock(current.editorView.document, blockId, patch),
    });
  };

  const handlePatchBlockData = (blockId: string, patch: Record<string, unknown>) => {
    const current = definitionRef.current;
    updateEditorView({
      document: updateScreenBlock(current.editorView.document, blockId, (block) => ({
        ...block,
        data: {
          ...block.data,
          ...patch,
        },
      })),
    });
  };

  const handlePatchBinding = (
    blockId: string,
    propPath: string,
    patch: Partial<Pick<ScreenFieldBinding, "field" | "mode">>
  ) => {
    const current = definitionRef.current;
    const existing = current.editorView.bindings.find(
      (binding) => binding.blockId === blockId && binding.propPath === propPath
    );
    const fieldName = patch.field ?? existing?.field ?? "title";
    const nextBinding = existing
      ? {
          ...existing,
          ...patch,
        }
      : createScreenFieldBinding({
          blockId,
          propPath,
          field: fieldName,
          mode: patch.mode,
        });
    const nextBindings = existing
      ? current.editorView.bindings.map((binding) =>
          binding.id === existing.id ? nextBinding : binding
        )
      : [...current.editorView.bindings, nextBinding];
    const matchingField = contentFields.find((field) => field.name === fieldName);
    const nextDocument =
      propPath === "value"
        ? updateScreenBlock(current.editorView.document, blockId, (block) => ({
            ...block,
            data: {
              ...block.data,
              field: fieldName,
              ...(matchingField ? { label: matchingField.label } : {}),
            },
          }))
        : current.editorView.document;
    updateEditorView({
      document: nextDocument,
      bindings: nextBindings,
    });
  };

  const handleAddListColumn = (option: ReturnType<typeof listSelectableListFields>[number]) => {
    const nextColumn = buildListColumnFromOption(option);
    updateListView({
      ...definition.listView,
      columns: [...definition.listView.columns, nextColumn],
    });
    setSelectedListColumnId(nextColumn.id);
  };

  const handleMoveListColumn = (columnId: string, direction: "left" | "right") => {
    const visibleColumns = getVisibleListColumns(definition.listView);
    const visibleIds = visibleColumns.map((column) => column.id);
    const currentVisibleIndex = visibleIds.indexOf(columnId);
    if (currentVisibleIndex === -1) return;
    const swapVisibleId =
      direction === "left"
        ? visibleIds[currentVisibleIndex - 1]
        : visibleIds[currentVisibleIndex + 1];
    if (!swapVisibleId) return;

    const currentIndex = definition.listView.columns.findIndex((column) => column.id === columnId);
    const swapIndex = definition.listView.columns.findIndex(
      (column) => column.id === swapVisibleId
    );
    if (currentIndex === -1 || swapIndex === -1) return;
    const nextColumns = [...definition.listView.columns];
    [nextColumns[currentIndex], nextColumns[swapIndex]] = [
      nextColumns[swapIndex]!,
      nextColumns[currentIndex]!,
    ];
    updateListView({
      ...definition.listView,
      columns: nextColumns,
    });
  };

  const handleChangeSelectedListColumn = (
    patch: Partial<CustomScreenDefinition["listView"]["columns"][number]>
  ) => {
    if (!selectedListColumn) return;
    updateListView({
      ...definition.listView,
      columns: definition.listView.columns.map((column) =>
        column.id === selectedListColumn.id ? { ...column, ...patch } : column
      ),
    });
  };

  const handleRemoveSelectedListColumn = () => {
    if (!selectedListColumn) return;
    const nextColumns = definition.listView.columns.filter(
      (column) => column.id !== selectedListColumn.id
    );
    updateListView({
      ...definition.listView,
      columns: nextColumns,
    });
    setSelectedListColumnId(nextColumns[0]?.id ?? null);
  };

  const handleSave = async () => {
    const trimmedName = normalizeText(name);
    if (!trimmedName) {
      setError("Screen name is required.");
      return;
    }
    if (!contentTypeId) {
      setError("Select a content type before saving.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const payload = {
      name: trimmedName,
      contentTypeId,
      status,
      showInSidebar,
      sidebarLabel: sidebarLabel.trim() || null,
      definition,
    };

    try {
      if (isCreateMode) {
        const created = await createCustomScreen(payload);
        applyScreen(created);
        navigate(`/advanced/custom-screens/${encodeURIComponent(created.id)}`);
      } else if (screenId) {
        const updated = await updateCustomScreen(screenId, payload);
        applyScreen(updated);
      }
      setRemoteUpdatePending(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save custom screen.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const libraryPanel = (
    <ListViewElementLibrary options={availableListFieldOptions} onAddColumn={handleAddListColumn} />
  );

  const screenSettingsPanel = (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Screen name
        </p>
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            markDirty();
          }}
          placeholder="Custom screen name"
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content type
        </p>
        <Select
          value={contentTypeId}
          onValueChange={(value) => {
            setContentTypeId(value);
            markDirty();
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select content type" />
          </SelectTrigger>
          <SelectContent>
            {contentTypes.length === 0 ? (
              <SelectItem value="no-content-types" disabled>
                No content types available
              </SelectItem>
            ) : (
              contentTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </p>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as CustomScreenStatus);
            markDirty();
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sidebar shortcut
        </p>
        <div className="flex h-10 items-center justify-between rounded-md border px-3">
          <span className="text-sm text-muted-foreground">Show records workflow in left menu</span>
          <Switch
            checked={showInSidebar}
            onCheckedChange={(checked) => {
              setShowInSidebar(checked === true);
              markDirty();
            }}
          />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sidebar label
        </p>
        <Input
          value={sidebarLabel}
          onChange={(event) => {
            setSidebarLabel(event.target.value);
            markDirty();
          }}
          placeholder={name.trim() || "Use screen name"}
          disabled={!showInSidebar}
        />
        <p className="text-xs text-muted-foreground">
          When empty, the shortcut uses the screen name.
        </p>
      </div>
    </div>
  );

  const hiddenColumnsPanel = (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Hidden columns</p>
        <p className="text-xs text-muted-foreground">
          Select a hidden column to restore it from the Column panel.
        </p>
      </div>
      {definition.listView.columns.filter((column) => column.visible === false).length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          No hidden columns in this list view.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {definition.listView.columns
            .filter((column) => column.visible === false)
            .map((column) => (
              <button
                key={column.id}
                type="button"
                className="rounded-md border bg-background px-3 py-2 text-left hover:bg-muted/50"
                data-hidden-column-id={column.id}
                onClick={() => {
                  setSelectedListColumnId(column.id);
                  setActiveListPanel("column");
                }}
              >
                <p className="text-sm font-medium">{column.label}</p>
                <p className="text-xs text-muted-foreground">
                  {column.field} · {column.formatter}
                </p>
              </button>
            ))}
        </div>
      )}
    </div>
  );

  const listSettingsPanel = (
    <ListViewDesigner
      contentType={selectedContentType}
      value={definition.listView}
      onChange={updateListView}
    />
  );

  const listColumnPanel = (
    <ListViewColumnInspector
      column={selectedListColumn}
      onChange={handleChangeSelectedListColumn}
      onRemove={handleRemoveSelectedListColumn}
    />
  );

  const renderActiveListPanel = () => {
    if (activeListPanel === "elements") return libraryPanel;
    if (activeListPanel === "column") return listColumnPanel;
    if (activeListPanel === "list") return listSettingsPanel;
    if (activeListPanel === "hidden") return hiddenColumnsPanel;
    if (activeListPanel === "settings") return screenSettingsPanel;
    return null;
  };

  const listToolbarPanels = [
    {
      id: "elements",
      label: "Elements",
      description: "Add content and system fields as columns.",
      icon: ListPlus,
      active: activeListPanel === "elements",
      onSelect: () => setActiveListPanel(activeListPanel === "elements" ? null : "elements"),
    },
    {
      id: "column",
      label: "Column",
      description: "Edit the selected column.",
      icon: Columns3,
      active: activeListPanel === "column",
      onSelect: () => setActiveListPanel(activeListPanel === "column" ? null : "column"),
    },
    {
      id: "list",
      label: "List settings",
      description: "Configure sorting, filters, and bulk actions.",
      icon: SlidersHorizontal,
      active: activeListPanel === "list",
      onSelect: () => setActiveListPanel(activeListPanel === "list" ? null : "list"),
    },
    {
      id: "hidden",
      label: "Hidden columns",
      description: "Review columns hidden from records.",
      icon: EyeOff,
      active: activeListPanel === "hidden",
      onSelect: () => setActiveListPanel(activeListPanel === "hidden" ? null : "hidden"),
    },
    {
      id: "settings",
      label: "Screen settings",
      description: "Edit screen name, status, content type, and sidebar shortcut.",
      icon: Settings2,
      active: activeListPanel === "settings",
      onSelect: () => setActiveListPanel(activeListPanel === "settings" ? null : "settings"),
    },
  ];

  const previewOwnerKey = selectedContentType?.slug ?? "no-content-type";

  return (
    <CustomScreenPreviewRecordOwner key={previewOwnerKey} contentType={selectedContentType}>
      {({ isLoading: previewDataLoading, previewRecordState }) => (
        <>
          <CustomScreenShell
            name={name}
            status={status}
            hasUnsavedChanges={hasUnsavedChanges}
            isCreateMode={isCreateMode}
          >
            <div className="sticky top-0 z-10 w-full border-b bg-background/80 px-4 py-3 backdrop-blur">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="hidden items-center rounded-lg border bg-background p-1 shadow-sm sm:flex">
                      <Button
                        variant={activeBuilderTab === "list-view" ? "secondary" : "ghost"}
                        size="sm"
                        className="gap-2"
                        onClick={() => setActiveBuilderTab("list-view")}
                      >
                        List View
                      </Button>
                      <Button
                        variant={activeBuilderTab === "editor-view" ? "secondary" : "ghost"}
                        size="sm"
                        className="gap-2"
                        onClick={() => setActiveBuilderTab("editor-view")}
                      >
                        Editor View
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 sm:hidden"
                      onClick={() =>
                        setActiveBuilderTab((current) =>
                          current === "list-view" ? "editor-view" : "list-view"
                        )
                      }
                    >
                      {activeBuilderTab === "list-view" ? "Editor View" : "List View"}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handleSave}
                    disabled={isLoading || isSaving}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
            <div
              className={`mx-auto flex w-full flex-col gap-4 px-6 py-8 ${
                activeBuilderTab === "editor-view" ? "max-w-6xl" : "max-w-4xl"
              }`}
            >
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Custom screen error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              {remoteUpdatePending ? (
                <Alert>
                  <AlertTitle>Updated in another tab</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>New changes are available. Refresh to load the latest version.</span>
                    <Button variant="outline" size="sm" onClick={() => refreshScreen(true)}>
                      Refresh
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}

              {isLoading ? (
                <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
                  Loading custom screen...
                </div>
              ) : activeBuilderTab === "list-view" ? (
                <AuthoringCanvasFrame
                  borderless
                  toolbar={
                    <AuthoringFloatingToolbar
                      label={selectedListColumn?.label ?? "List view"}
                      panels={listToolbarPanels}
                      subpanel={renderActiveListPanel()}
                    />
                  }
                >
                  <ListViewCanvas
                    contentType={selectedContentType}
                    listView={definition.listView}
                    selectedColumnId={selectedListColumnId}
                    onSelectColumn={(columnId) => {
                      setSelectedListColumnId(columnId);
                      setActiveListPanel("column");
                    }}
                    onMoveColumn={handleMoveListColumn}
                  />
                </AuthoringCanvasFrame>
              ) : (
                <ScreenAuthoringCanvas
                  document={screenDocument}
                  bindings={screenBindings}
                  fields={contentFields}
                  values={previewRecordState.data}
                  previewNotice={
                    <PreviewStateNotice
                      contentType={selectedContentType}
                      previewRecordState={previewRecordState}
                      isLoading={previewDataLoading}
                    />
                  }
                  settingsPanel={screenSettingsPanel}
                  selectedSectionId={selectedSectionId}
                  selectedBlockId={selectedId}
                  onSelectSection={setSelectedSectionId}
                  onSelectBlock={handleSelectBlock}
                  onAddBlock={handleAddBlock}
                  onPatchBlock={handlePatchBlock}
                  onPatchBlockData={handlePatchBlockData}
                  onPatchBinding={handlePatchBinding}
                  onMove={handleMoveBlock}
                  onDuplicate={handleDuplicateBlock}
                  onDelete={handleDeleteBlock}
                />
              )}
            </div>
          </CustomScreenShell>

          <CustomScreenWorkspacePreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            mode={activeBuilderTab}
            contentType={selectedContentType}
            listView={definition.listView}
            document={screenDocument}
            bindings={screenBindings}
            fields={contentFields}
            previewRecordState={previewRecordState}
            previewLoading={previewDataLoading}
          />
        </>
      )}
    </CustomScreenPreviewRecordOwner>
  );
}
