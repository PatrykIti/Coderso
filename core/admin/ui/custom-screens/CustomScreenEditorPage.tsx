import { ArrowLeft, Eye, Save, Settings2, SquarePen } from "lucide-react";
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
  type ContentSchemaProperty,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  listRegisteredScreenWidgets,
  listRegisteredWidgets,
  listRegisteredWidgetsForSurface,
} from "@/ui/widgets/registry";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";

import { CustomScreenShell } from "./CustomScreenShell";
import { CustomScreenPreview } from "./CustomScreenPreview";
import { EditorViewDesigner } from "./EditorViewDesigner";
import { FieldBindingPanel } from "./FieldBindingPanel";
import { ListViewDesigner } from "./ListViewDesigner";
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
import type { ContentField } from "../content-types/SchemaBuilder";

const normalizeText = (value: string) => value.trim();

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

const buildPreviewValue = (field: ContentField, property?: ContentSchemaProperty) => {
  if (property?.default !== undefined) {
    return property.default;
  }

  switch (field.type) {
    case "number":
      return 1;
    case "boolean":
      return true;
    case "select": {
      const firstOption = Array.isArray(field.options) ? field.options[0] : undefined;
      if (typeof firstOption === "string") return firstOption;
      return firstOption?.value ?? `${field.label} option`;
    }
    case "media":
      return "https://images.unsplash.com/photo-1498050108023-c5249f4df085";
    case "relation":
      return field.relation?.multiple ? ["related-entry-1"] : "related-entry-1";
    case "richtext":
      return `${field.label} example content`;
    case "text":
    default:
      return `${field.label} preview`;
  }
};

const buildPreviewData = (contentType: ContentTypeSummary | null) => {
  if (!contentType) return {};
  const fields = fieldsFromSchema(contentType.schema);
  return fields.reduce<Record<string, unknown>>((result, field) => {
    result[field.name] = buildPreviewValue(field, contentType.schema.properties[field.name]);
    return result;
  }, {});
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
  const [canvasMode, setCanvasMode] = useState<"builder" | "preview">("builder");
  const [activeBuilderTab, setActiveBuilderTab] = useState<
    "list-view" | "editor-view" | "settings"
  >("list-view");

  const selectedContentType = useMemo(
    () => contentTypes.find((type) => type.id === contentTypeId) ?? null,
    [contentTypeId, contentTypes]
  );
  const legacyScreenWidgetRegistry = useMemo(() => listRegisteredScreenWidgets(), []);
  const screenWidgetRegistry = useMemo(() => {
    if (!selectedContentType) return legacyScreenWidgetRegistry;
    return listRegisteredWidgetsForSurface({
      surface: "admin-editor-view",
      contentType: selectedContentType,
    });
  }, [legacyScreenWidgetRegistry, selectedContentType]);
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
  const previewData = useMemo(() => buildPreviewData(selectedContentType), [selectedContentType]);
  const previewCapabilities = useMemo(
    () => resolveCustomScreenCapabilities({ blocks, bindings }),
    [bindings, blocks]
  );
  const previewState = useMemo(() => {
    if (!selectedContentType) {
      return {
        title: "Select a content type",
        message:
          "Choose the content type first so the preview can resolve sample values for mapped fields.",
      };
    }
    if (blocks.length === 0) {
      return {
        title: "No screen widgets yet",
        message:
          "Add dedicated screen widgets from the library to start composing the admin screen.",
      };
    }
    if (previewCapabilities.mode === "collection-only") {
      return {
        title: "Collection-only screen",
        message:
          "This setup currently narrows the records list only. Add dedicated screen widgets and map them to content fields to preview record data.",
      };
    }
    return null;
  }, [blocks.length, previewCapabilities.mode, selectedContentType]);

  const selectedBlock = findBlockById(blocks, selectedId);
  const selectedWidget = selectedBlock
    ? widgetRegistry.find((item) => item.type === selectedBlock.type)
    : undefined;

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

  const libraryPanel = (
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

  const detailsPanel = (
    <Tabs defaultValue="screen" className="flex h-full flex-col">
      <TabsList variant="line" className="px-1">
        <TabsTrigger value="screen">Screen</TabsTrigger>
        <TabsTrigger value="bindings">Bindings</TabsTrigger>
        <TabsTrigger value="block">Block</TabsTrigger>
      </TabsList>
      <TabsContent value="screen" className="mt-4">
        {screenSettingsPanel}
      </TabsContent>
      <TabsContent value="bindings" className="mt-4">
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
      <TabsContent value="block" className="mt-4">
        <BlockSettings block={selectedBlock} widget={selectedWidget} onChange={handleChangeBlock} />
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
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {canvasMode === "builder" ? "Screen canvas" : "Bound preview"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {canvasMode === "builder"
                    ? "Drag dedicated screen widgets from the library or use the quick insert buttons."
                    : "Preview uses sample content values and the current screen bindings."}
                </p>
              </div>
              {!isCreateMode && screenId ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    navigate(`/advanced/custom-screens/${encodeURIComponent(screenId)}/entries`)
                  }
                >
                  <SquarePen className="h-4 w-4" />
                  Open records
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden items-center rounded-lg border bg-background p-1 shadow-sm sm:flex">
                  <Button
                    variant={canvasMode === "builder" ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onClick={() => setCanvasMode("builder")}
                  >
                    <SquarePen className="h-4 w-4" />
                    Builder
                  </Button>
                  <Button
                    variant={canvasMode === "preview" ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onClick={() => setCanvasMode("preview")}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 sm:hidden"
                  onClick={() =>
                    setCanvasMode((current) => (current === "builder" ? "preview" : "builder"))
                  }
                >
                  {canvasMode === "builder" ? (
                    <>
                      <Eye className="h-4 w-4" />
                      Preview
                    </>
                  ) : (
                    <>
                      <SquarePen className="h-4 w-4" />
                      Builder
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => navigate("/advanced/custom-screens")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to list
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={isLoading || isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : isCreateMode ? "Create screen" : "Save screen"}
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

          <Tabs
            value={activeBuilderTab}
            onValueChange={(value) =>
              setActiveBuilderTab(value as "list-view" | "editor-view" | "settings")
            }
          >
            <TabsList variant="line">
              <TabsTrigger value="list-view">List View</TabsTrigger>
              <TabsTrigger value="editor-view">Editor View</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
              Loading custom screen...
            </div>
          ) : activeBuilderTab === "list-view" ? (
            <ListViewDesigner
              contentType={selectedContentType}
              value={definition.listView}
              onChange={(listView) =>
                updateDefinition({
                  ...definition,
                  listView,
                })
              }
            />
          ) : activeBuilderTab === "settings" ? (
            <div className="rounded-xl border bg-background p-6">{screenSettingsPanel}</div>
          ) : activeBuilderTab === "editor-view" && canvasMode === "builder" ? (
            <div className="space-y-4">
              <EditorViewDesigner
                contentType={selectedContentType}
                value={definition.editorView}
                onChange={(editorView) =>
                  updateDefinition({
                    ...definition,
                    editorView,
                  })
                }
              />
              {showEmptyState ? (
                <div className="mx-auto flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-background/40 px-10 py-16 text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-primary">
                    <Settings2 className="h-10 w-10" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    Build your custom screen
                  </h2>
                  <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                    Add dedicated screen widgets from the library to compose the admin experience
                    for this content type.
                  </p>
                </div>
              ) : (
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
                    blocks={blocks}
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
              )}
            </div>
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
          ) : canvasMode === "preview" ? (
            previewState ? (
              <CustomScreenPreview
                blocks={[]}
                bindings={[]}
                data={{}}
                emptyTitle={previewState.title}
                emptyMessage={previewState.message}
              />
            ) : (
              <CustomScreenPreview
                blocks={blocks}
                bindings={bindings}
                data={previewData}
                emptyTitle="Preview unavailable"
                emptyMessage={
                  "Add dedicated screen widgets and bindings to preview the custom screen."
                }
              />
            )
          ) : (
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
                blocks={blocks}
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
    </>
  );
}
