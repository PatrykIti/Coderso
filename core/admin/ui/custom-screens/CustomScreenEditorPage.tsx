import { Eye, Search, Settings2, SquarePen } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  createCustomScreen,
  getCachedCustomScreen,
  getCustomScreenCached,
  updateCustomScreen,
  type CustomScreenBinding,
  type CustomScreenRecord,
  type CustomScreenStatus,
} from "@/services/customScreensClient";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentSchemaProperty,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { listRegisteredWidgets } from "@/ui/widgets/registry";
import { WidgetCard } from "@/ui/widgets/WidgetCard";

import { CustomScreenShell } from "./CustomScreenShell";
import { CustomScreenPreview } from "./CustomScreenPreview";
import { FieldBindingPanel } from "./FieldBindingPanel";
import { resolveCustomScreenId } from "./routeParams";
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
import type { Block } from "@/ui/pages/builder/types";
import type { ContentField } from "../content-types/SchemaBuilder";

const widgetCategoryLabels: Record<string, string> = {
  layout: "Layout",
  content: "Content",
  forms: "Forms",
  navigation: "Navigation",
  media: "Media",
};

const normalizeText = (value: string) => value.trim();

const buildPreviewValue = (field: ContentField, property?: ContentSchemaProperty) => {
  if (property?.default !== undefined) {
    return property.default;
  }

  switch (field.type) {
    case "number":
      return 1;
    case "boolean":
      return true;
    case "select":
      return field.options?.[0] ?? `${field.label} option`;
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
    result[field.name] = buildPreviewValue(
      field,
      contentType.schema.properties[field.name]
    );
    return result;
  }, {});
};

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
  const [blocks, setBlocks] = useState<Block[]>(() => screen?.blocks ?? []);
  const [bindings, setBindings] = useState<CustomScreenBinding[]>(
    () => screen?.bindings ?? []
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => getFirstBlockId(screen?.blocks ?? [])
  );
  const [isLoading, setIsLoading] = useState(() => !isCreateMode && !screen);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState<"builder" | "preview">("builder");

  const widgetRegistry = useMemo(() => listRegisteredWidgets(), []);
  const [query, setQuery] = useState("");
  const selectedContentType = useMemo(
    () => contentTypes.find((type) => type.id === contentTypeId) ?? null,
    [contentTypeId, contentTypes]
  );
  const contentFields = useMemo(
    () => (selectedContentType ? fieldsFromSchema(selectedContentType.schema) : []),
    [selectedContentType]
  );
  const previewData = useMemo(
    () => buildPreviewData(selectedContentType),
    [selectedContentType]
  );

  const selectedBlock = findBlockById(blocks, selectedId);
  const selectedWidget = selectedBlock
    ? widgetRegistry.find((item) => item.type === selectedBlock.type)
    : undefined;

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setError(null);
  }, []);

  const updateBlocks = useCallback(
    (next: Block[]) => {
      setBlocks(next);
      markDirty();
    },
    [markDirty]
  );

  const applyScreen = useCallback((record: CustomScreenRecord) => {
    setScreen(record);
    setName(record.name);
    setContentTypeId(record.contentTypeId);
    setStatus(record.status);
    setShowInSidebar(record.showInSidebar ?? false);
    setSidebarLabel(record.sidebarLabel ?? "");
    setBlocks(record.blocks ?? []);
    setBindings(record.bindings ?? []);
    setSelectedId(getFirstBlockId(record.blocks ?? []));
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
        setError(
          isApiClientError(err) ? err.message : "Failed to load custom screen."
        );
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
    if (isCreateMode) {
      setIsLoading(false);
      return;
    }
    refreshScreen(true).catch(() => undefined);
  }, [isCreateMode, refreshScreen]);

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

  const filteredWidgets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return widgetRegistry
      .filter((widget) => widget.type !== "template-section")
      .filter((widget) => {
        if (!normalized) return true;
        const haystack = [widget.title, widget.description, widget.type]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      });
  }, [query, widgetRegistry]);

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
      blocks,
      bindings,
    };

    try {
      if (isCreateMode) {
        const created = await createCustomScreen(payload);
        applyScreen(created);
        navigate(`/coderso/custom-screens/${encodeURIComponent(created.id)}`);
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
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Find widgets..."
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {filteredWidgets.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              No widgets match this search.
            </div>
          ) : null}
          {filteredWidgets.map((widget) => (
            <WidgetCard
              key={widget.type}
              name={widget.title}
              categoryLabel={widgetCategoryLabels[widget.category] ?? widget.category}
              variant="compact"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("widget-type", widget.type);
                event.dataTransfer.effectAllowed = "copy";
              }}
              onSelect={() => handleAddBlock(widget.type)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
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
          <span className="text-sm text-muted-foreground">
            Show records workflow in left menu
          </span>
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
            setBindings(next);
            markDirty();
          }}
        />
      </TabsContent>
      <TabsContent value="block" className="mt-4">
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
        isSaving={isSaving}
        isCreateMode={isCreateMode}
        saveDisabled={isLoading}
        additionalActions={
          !isCreateMode && screenId ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                navigate(
                  `/coderso/custom-screens/${encodeURIComponent(screenId)}/entries`
                )
              }
            >
              <SquarePen className="h-4 w-4" />
              Open records
            </Button>
          ) : null
        }
        onSave={handleSave}
        onBack={() => navigate("/coderso/custom-screens")}
        leftPanel={libraryPanel}
        rightPanel={detailsPanel}
        rightPanelClassName="p-6"
      >
        <div className="sticky top-0 z-10 w-full border-b bg-background/80 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {canvasMode === "builder" ? "Screen canvas" : "Bound preview"}
              </p>
              <p className="text-xs text-muted-foreground">
                {canvasMode === "builder"
                  ? "Drag widgets from the library or use the quick insert buttons."
                  : "Preview uses content type defaults and the current field bindings."}
              </p>
            </div>
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
                  setCanvasMode((current) =>
                    current === "builder" ? "preview" : "builder"
                  )
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
            <div className="flex flex-wrap items-center gap-2 lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileLibraryOpen(true)}
              >
                Components
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileDetailsOpen(true)}
              >
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
          ) : showEmptyState ? (
            <div className="mx-auto flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-background/40 px-10 py-16 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-primary">
                <Settings2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">
                Build your custom screen
              </h2>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Add widgets from the library to compose the admin experience for this
                content type.
              </p>
            </div>
          ) : canvasMode === "preview" ? (
            <CustomScreenPreview
              blocks={blocks}
              bindings={bindings}
              data={previewData}
              emptyMessage={
                selectedContentType
                  ? "Add widgets to preview the custom screen."
                  : "Select a content type to preview bound fields."
              }
            />
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
