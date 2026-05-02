import { Eye, Save, Settings2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  normalizeCustomScreenDefinition,
  type CustomScreenDefinition,
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
import { listRegisteredWidgets, listRegisteredWidgetsForSurface } from "@/ui/widgets/registry";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";

import { CustomScreenShell } from "./CustomScreenShell";
import { FieldBindingPanel } from "./FieldBindingPanel";
import { ListViewDesigner } from "./ListViewDesigner";
import { ListViewCanvas } from "./ListViewCanvas";
import { ListViewColumnInspector } from "./ListViewColumnInspector";
import { ListViewElementLibrary } from "./ListViewElementLibrary";
import { CustomScreenWorkspacePreviewDialog } from "./CustomScreenWorkspacePreviewDialog";
import { resolveCustomScreenId } from "./routeParams";
import { buildCustomScreenAssistantSurface } from "./assistantSurface";
import { BlockList } from "@/ui/pages/builder/BlockList";
import { BlockSettings } from "@/ui/pages/builder/BlockSettings";
import {
  appendSlotBlock,
  createBlock,
  deleteBlockById,
  duplicateBlock,
  findBlockById,
  getFirstBlockId,
  moveBlockIntoSlot,
  reorderBlocksAtPath,
  updateBlockById,
  type BlockPath,
} from "@/ui/pages/builder/blockUtils";
import { WidgetPicker } from "@/ui/pages/builder/WidgetPicker";
import type { Block } from "@/ui/pages/builder/types";
import { buildListColumnFromOption, listSelectableListFields } from "./customScreenListModel";
import { applyBindingsToBlocks } from "../../../services/customScreens/bindingResolver";

const normalizeText = (value: string) => value.trim();

const buildPreviewValue = (field: {
  label: string;
  type: string;
  options?: Array<{ value: string } | string>;
  relation?: { multiple?: boolean };
}) => {
  switch (field.type) {
    case "number":
      return 120;
    case "boolean":
      return true;
    case "select": {
      const firstOption = Array.isArray(field.options) ? field.options[0] : undefined;
      if (typeof firstOption === "string") return firstOption;
      return firstOption?.value ?? `${field.label} option`;
    }
    case "media":
      return "Hero image";
    case "relation":
      return field.relation?.multiple ? ["Related item"] : "Related item";
    case "richtext":
      return `${field.label} example content`;
    default:
      return `${field.label} preview`;
  }
};

const buildEditorPreviewData = (contentType: ContentTypeSummary | null) => {
  if (!contentType) {
    return {
      title: "Project title",
      slug: "project-title",
      status: "draft",
      createdAt: "2026-05-01T08:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
      publishedAt: null,
    };
  }

  const schemaFields = fieldsFromSchema(contentType.schema);
  return {
    title: "Project title",
    slug: "project-title",
    status: "draft",
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
    publishedAt: null,
    ...Object.fromEntries(schemaFields.map((field) => [field.name, buildPreviewValue(field)])),
  };
};

const collectBlockTypes = (blocks: Block[]): string[] => {
  const result = new Set<string>();

  const visit = (items: Block[]) => {
    items.forEach((block) => {
      result.add(block.type);
      if (Array.isArray(block.children) && block.children.length > 0) {
        visit(block.children);
      }
      if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
        Object.values(block.slots).forEach((slotItems) => {
          if (Array.isArray(slotItems) && slotItems.length > 0) {
            visit(slotItems as Block[]);
          }
        });
      }
    });
  };

  visit(blocks);
  return Array.from(result);
};

const resolveScreenDefinition = (
  screen: CustomScreenRecord | null | undefined
): CustomScreenDefinition =>
  normalizeCustomScreenDefinition({
    definition: screen?.definition,
    schemaVersion: screen?.schemaVersion,
    blocks: screen?.blocks,
    bindings: screen?.bindings,
  });

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
  const blocks = definition.editorView.blocks as Block[];
  const bindings = definition.editorView.bindings;
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    getFirstBlockId(resolveScreenDefinition(screen).editorView.blocks as Block[])
  );
  const [isLoading, setIsLoading] = useState(() => !isCreateMode && !screen);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeBuilderTab, setActiveBuilderTab] = useState<"list-view" | "editor-view">(
    "list-view"
  );
  const [selectedListColumnId, setSelectedListColumnId] = useState<string | null>(
    () => resolveScreenDefinition(screen).listView.columns[0]?.id ?? null
  );

  const selectedContentType = useMemo(
    () => contentTypes.find((type) => type.id === contentTypeId) ?? null,
    [contentTypeId, contentTypes]
  );
  const screenWidgetRegistry = useMemo(() => {
    if (!selectedContentType) return [];
    return listRegisteredWidgetsForSurface({
      surface: "admin-editor-view",
      contentType: selectedContentType,
    });
  }, [selectedContentType]);
  const allWidgetRegistry = useMemo(() => listRegisteredWidgets(), []);
  const widgetRegistry = useMemo(() => {
    const byType = new Map(screenWidgetRegistry.map((widget) => [widget.type, widget]));
    collectBlockTypes(blocks).forEach((type) => {
      const existing = byType.get(type);
      if (existing) return;
      const legacy = allWidgetRegistry.find((widget) => widget.type === type);
      if (legacy) {
        byType.set(legacy.type, legacy);
      }
    });
    return Array.from(byType.values());
  }, [allWidgetRegistry, blocks, screenWidgetRegistry]);
  const contentFields = useMemo(
    () => (selectedContentType ? fieldsFromSchema(selectedContentType.schema) : []),
    [selectedContentType]
  );
  const editorPreviewData = useMemo(
    () => buildEditorPreviewData(selectedContentType),
    [selectedContentType]
  );
  const editorPreviewBlocks = useMemo(
    () => applyBindingsToBlocks(blocks, bindings, editorPreviewData) as Block[],
    [bindings, blocks, editorPreviewData]
  );
  const previewCapabilities = useMemo(
    () => resolveCustomScreenCapabilities({ blocks, bindings }),
    [bindings, blocks]
  );

  const selectedBlock = findBlockById(blocks, selectedId);
  const selectedWidget = selectedBlock
    ? widgetRegistry.find((item) => item.type === selectedBlock.type)
    : undefined;
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
          blocks,
          bindings,
        },
        blocks,
        bindings,
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
    bindings,
    blocks,
    contentTypeId,
    definition,
    hasUnsavedChanges,
    isCreateMode,
    name,
    previewCapabilities,
    remoteUpdatePending,
    screen,
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
      setDefinition(next);
      markDirty();
    },
    [markDirty]
  );

  const updateBlocks = useCallback(
    (next: Block[]) => {
      updateDefinition({
        ...definition,
        editorView: {
          ...definition.editorView,
          blocks: next,
        },
      });
    },
    [definition, updateDefinition]
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
    setScreen(record);
    setName(record.name);
    setContentTypeId(record.contentTypeId);
    setStatus(record.status);
    setShowInSidebar(record.showInSidebar ?? false);
    setSidebarLabel(record.sidebarLabel ?? "");
    setDefinition(nextDefinition);
    setSelectedId(getFirstBlockId(nextDefinition.editorView.blocks as Block[]));
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

  const handleAddBlock = (type: string) => {
    const nextBlock = createBlock(type);
    updateBlocks([...blocks, nextBlock]);
    setSelectedId(nextBlock.id);
  };

  const handleInsertIntoSlot = (parentId: string, slotId: string, type: string) => {
    const nextBlock = createBlock(type);
    updateBlocks(appendSlotBlock(blocks, parentId, slotId, nextBlock));
    setSelectedId(nextBlock.id);
  };

  const handleMoveIntoSlot = (blockId: string, parentId: string, slotId: string) => {
    updateBlocks(moveBlockIntoSlot(blocks, blockId, parentId, slotId));
  };

  const handleMove = (path: BlockPath, from: number, to: number) => {
    if (to < 0) return;
    updateBlocks(reorderBlocksAtPath(blocks, path, from, to));
  };

  const handleDuplicate = (id: string) => {
    updateBlocks(duplicateBlock(blocks, id));
  };

  const handleDelete = (id: string) => {
    const result = deleteBlockById(blocks, id);
    if (!result.deleted) return;
    updateBlocks(result.blocks);
    if (selectedId && !findBlockById(result.blocks, selectedId)) {
      setSelectedId(getFirstBlockId(result.blocks));
    }
  };

  const handleChangeBlock = (next: Block) => {
    updateBlocks(updateBlockById(blocks, next.id, () => next));
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
    const currentIndex = definition.listView.columns.findIndex((column) => column.id === columnId);
    if (currentIndex === -1) return;
    const nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= definition.listView.columns.length) return;
    const nextColumns = [...definition.listView.columns];
    const [column] = nextColumns.splice(currentIndex, 1);
    if (!column) return;
    nextColumns.splice(nextIndex, 0, column);
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
      blocks: definition.editorView.blocks,
      bindings: definition.editorView.bindings,
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

  const libraryPanel =
    activeBuilderTab === "list-view" ? (
      <ListViewElementLibrary
        options={availableListFieldOptions}
        onAddColumn={handleAddListColumn}
      />
    ) : (
      <WidgetPicker
        widgets={screenWidgetRegistry}
        onAdd={handleAddBlock}
        draggable
        onDragStart={(event, type) => {
          event.dataTransfer.setData("widget-type", type);
          event.dataTransfer.effectAllowed = "copy";
        }}
      />
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

  const detailsPanel =
    activeBuilderTab === "list-view" ? (
      <Tabs defaultValue="screen" className="flex h-full flex-col">
        <TabsList variant="line" className="px-1">
          <TabsTrigger value="screen">Screen</TabsTrigger>
          <TabsTrigger value="column">Selected Column</TabsTrigger>
        </TabsList>
        <TabsContent value="screen" className="mt-4 space-y-6">
          {screenSettingsPanel}
          <div className="rounded-xl border p-4">
            <ListViewDesigner
              contentType={selectedContentType}
              value={definition.listView}
              onChange={updateListView}
            />
          </div>
        </TabsContent>
        <TabsContent value="column" className="mt-4">
          <ListViewColumnInspector
            column={selectedListColumn}
            onChange={handleChangeSelectedListColumn}
            onRemove={handleRemoveSelectedListColumn}
          />
        </TabsContent>
      </Tabs>
    ) : (
      <Tabs defaultValue="screen" className="flex h-full flex-col">
        <TabsList variant="line" className="px-1">
          <TabsTrigger value="screen">Screen</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="widget">Selected Widget</TabsTrigger>
        </TabsList>
        <TabsContent value="screen" className="mt-4">
          {screenSettingsPanel}
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <FieldBindingPanel
            selectedBlock={selectedBlock}
            value={bindings}
            fields={contentFields}
            onChange={(next) => {
              updateDefinition({
                ...definition,
                editorView: {
                  ...definition.editorView,
                  bindings: next,
                },
              });
            }}
          />
        </TabsContent>
        <TabsContent value="widget" className="mt-4">
          <BlockSettings
            block={selectedBlock}
            widget={selectedWidget}
            onChange={handleChangeBlock}
          />
        </TabsContent>
      </Tabs>
    );

  const showEmptyState = !isLoading && blocks.length === 0;

  return (
    <>
      <CustomScreenShell
        name={name}
        status={status}
        hasUnsavedChanges={hasUnsavedChanges}
        isCreateMode={isCreateMode}
        leftPanel={libraryPanel}
        rightPanel={detailsPanel}
        rightPanelClassName="p-6"
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
            <div className="flex flex-wrap items-center gap-2 lg:hidden">
              <Button variant="outline" size="sm" onClick={() => setMobileLibraryOpen(true)}>
                Components
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMobileDetailsOpen(true)}>
                Details
              </Button>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8">
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
            <ListViewCanvas
              contentType={selectedContentType}
              listView={definition.listView}
              selectedColumnId={selectedListColumnId}
              onSelectColumn={setSelectedListColumnId}
              onMoveColumn={handleMoveListColumn}
            />
          ) : showEmptyState ? (
            <div className="mx-auto flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-background/40 px-10 py-16 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-primary">
                <Settings2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Build your custom screen</h2>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Add dedicated screen widgets from the library to compose the admin experience for
                this content type.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="w-full overflow-hidden rounded-xl border border-border/50 bg-background"
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const type = event.dataTransfer.getData("widget-type");
                  if (type) handleAddBlock(type);
                }}
              >
                <BlockList
                  blocks={editorPreviewBlocks}
                  className="p-4"
                  widgetRegistry={widgetRegistry}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onMove={handleMove}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onInsert={handleInsertIntoSlot}
                  onMoveToSlot={handleMoveIntoSlot}
                />
              </div>
            </div>
          )}
        </div>
      </CustomScreenShell>

      <Sheet open={mobileLibraryOpen} onOpenChange={setMobileLibraryOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Widget library</SheetTitle>
          <SheetDescription className="sr-only">
            Insert widgets into the custom screen layout.
          </SheetDescription>
          {libraryPanel}
        </SheetContent>
      </Sheet>

      <Sheet open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <SheetContent side="right" className="w-96 p-6">
          <SheetTitle className="sr-only">Screen details</SheetTitle>
          <SheetDescription className="sr-only">
            Configure screen metadata and widget settings.
          </SheetDescription>
          {detailsPanel}
        </SheetContent>
      </Sheet>

      <CustomScreenWorkspacePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        mode={activeBuilderTab}
        contentType={selectedContentType}
        listView={definition.listView}
        blocks={blocks}
        bindings={bindings}
        previewData={editorPreviewData}
      />
    </>
  );
}
