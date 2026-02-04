import { useMemo, useState, useEffect } from "react";
import { Eye, Save, Settings2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import {
  getPage,
  publishPage,
  previewPage,
  updatePage,
  type PageDetail,
} from "@/services/pagesClient";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { DeviceSwitcher } from "@/ui/pages/DeviceSwitcher";

import { BlockList } from "./builder/BlockList";
import { BlockSettings } from "./builder/BlockSettings";
import { WidgetPicker } from "./builder/WidgetPicker";
import { PageSettingsDrawer } from "./PageSettingsDrawer";
import {
  applyWizardSelection,
  createBlock,
  deleteBlockById,
  duplicateBlock,
  findBlockById,
  getFirstBlockId,
  reorderBlocksAtPath,
  shouldWarnOnNavigate,
  updateBlockById,
  type BlockPath,
} from "./builder/blockUtils";
import type { Block } from "./builder/types";
import { getWidgetRegistry } from "./builder/widgetRegistry";
import { normalizeWidgetBlock } from "../../../widgets/validator";

const heroBlockDefaults = createBlock("hero");
const defaultBlocks: Block[] = [
  applyWizardSelection({
    ...heroBlockDefaults,
    data: {
      ...(heroBlockDefaults.data ?? {}),
      headline: "Build faster with Nextless",
    },
  }),
  createBlock("compare-timeline"),
];

const resolvePageId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const pageIndex = parts.findIndex((segment) => segment === "pages");
  if (pageIndex === -1) return null;
  return parts[pageIndex + 1] ?? null;
};

const normalizeBlocks = (data?: Record<string, unknown> | null) => {
  if (!data || typeof data !== "object") return defaultBlocks;
  const blocks = (data as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return defaultBlocks;

  try {
    const normalizeTree = (block: Block): Block => {
      const normalized = normalizeWidgetBlock(block as Block);
      const base = createBlock(normalized.type);
      const slots =
        normalized.slots &&
        Object.fromEntries(
          Object.entries(normalized.slots).map(([key, value]) => [
            key,
            Array.isArray(value)
              ? value.map((child) => normalizeTree(child as Block))
              : [],
          ])
        );
      const children =
        normalized.slots || !Array.isArray(normalized.children)
          ? undefined
          : normalized.children.map((child) => normalizeTree(child as Block));
      return {
        ...base,
        ...normalized,
        slots,
        children,
        layout: normalized.layout ?? base.layout,
        visibility: normalized.visibility ?? base.visibility,
        editor: normalized.editor ?? base.editor,
      };
    };

    return blocks.map((block) => normalizeTree(block as Block));
  } catch {
    return defaultBlocks;
  }
};

export type PageEditorProps = {
  pageId?: string;
  initialPage?: PageDetail | null;
};

export function PageEditor({ pageId: initialPageId, initialPage }: PageEditorProps) {
  const [pageId, setPageId] = useState<string | null>(initialPageId ?? initialPage?.id ?? null);
  const [page, setPage] = useState<PageDetail | null>(initialPage ?? null);
  const [pageData, setPageData] = useState<Record<string, unknown>>(
    initialPage?.currentData ?? { blocks: defaultBlocks }
  );
  const [blocks, setBlocks] = useState<Block[]>(normalizeBlocks(initialPage?.currentData));
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(
    !initialPage && typeof window !== "undefined"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUpdatingMeta, setIsUpdatingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBlock = findBlockById(blocks, selectedId);
  const selectedWidget = useMemo(() => {
    if (!selectedBlock) return undefined;
    return getWidgetRegistry().find((widget) => widget.type === selectedBlock.type);
  }, [selectedBlock]);

  useEffect(() => {
    if (pageId || typeof window === "undefined") return;
    const resolved = resolvePageId(window.location.pathname);
    setPageId(resolved);
  }, [pageId]);

  useEffect(() => {
    if (!pageId) return;
    if (initialPage) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    getPage(pageId)
      .then((result) => {
        if (!active) return;
        setPage(result);
        const nextData = result.currentData ?? { blocks: defaultBlocks };
        setPageData(nextData as Record<string, unknown>);
        const nextBlocks = normalizeBlocks(result.currentData as Record<string, unknown>);
        setBlocks(nextBlocks);
        setSelectedId(nextBlocks[0]?.id ?? null);
        setHasUnsavedChanges(false);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load page.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialPage, pageId]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!shouldWarnOnNavigate(hasUnsavedChanges)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const updateBlocks = (next: Block[]) => {
    setBlocks(next);
    setPageData((prev) => ({ ...prev, blocks: next }));
    setHasUnsavedChanges(true);
  };

  const handleAddBlock = (type: string) => {
    const nextBlock = createBlock(type);
    updateBlocks([...blocks, nextBlock]);
    setSelectedId(nextBlock.id);
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

  const handleSaveDraft = async () => {
    if (!pageId) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updatePage(pageId, {
        data: pageData,
      });
      setPage(updated);
      setHasUnsavedChanges(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save draft.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!pageId) return;
    setIsPublishing(true);
    setError(null);
    try {
      await publishPage(pageId, pageData);
      const updated = await getPage(pageId);
      setPage(updated);
      setHasUnsavedChanges(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to publish page.");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePreview = async () => {
    if (!pageId) return;
    setError(null);
    try {
      const { previewUrl } = await previewPage(pageId);
      if (typeof window !== "undefined") {
        window.open(previewUrl, "_blank", "noopener");
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to generate preview.");
      }
    }
  };

  const handleSaveSettings = async (payload: { title: string; slug: string }) => {
    if (!pageId) return;
    setMetaError(null);
    setIsUpdatingMeta(true);
    try {
      const updated = await updatePage(pageId, payload);
      if (updated) {
        setPage((prev) => (prev ? { ...prev, ...updated } : updated));
      }
      setSettingsOpen(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setMetaError(err.message);
      } else {
        setMetaError("Failed to update page settings.");
      }
    } finally {
      setIsUpdatingMeta(false);
    }
  };

  const status = page?.status ?? "draft";
  const title = page?.title ?? "Homepage";

  return (
    <EditorShell
      activeHref="/admin/pages"
      leftPanel={<WidgetPicker onAdd={handleAddBlock} />}
      rightPanel={
        <BlockSettings
          block={selectedBlock}
          widget={selectedWidget}
          onChange={handleChangeBlock}
        />
      }
      rightPanelClassName="p-6"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Pages</span>
          <span>/</span>
          <span className="text-foreground">{title}</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
            {status === "published" ? "Published" : "Draft"}
          </span>
          {hasUnsavedChanges ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
              Unsaved changes
            </span>
          ) : null}
        </div>
      }
    >
      <div className="sticky top-0 z-10 w-full border-b bg-background/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DeviceSwitcher />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handlePreview}
              disabled={isLoading}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={handleSaveDraft}
              disabled={isSaving || isLoading}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save draft"}
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={handlePublish}
              disabled={isPublishing || isLoading}
            >
              <Eye className="h-4 w-4" />
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setSettingsOpen(true)}
              disabled={!page}
            >
              <Settings2 className="h-4 w-4" />
              Page settings
            </Button>
            <div className="ml-auto flex flex-wrap items-center gap-2 lg:hidden">
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
                disabled={!selectedBlock || !selectedWidget}
              >
                Details
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Page error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {isLoading ? (
          <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
            Loading page...
          </div>
        ) : (
          <BlockList
            blocks={blocks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={handleMove}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        )}
      </div>
      <PageSettingsDrawer
        key={`${page?.id ?? "page-settings"}-${settingsOpen ? "open" : "closed"}`}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        page={page}
        onSave={handleSaveSettings}
        isSubmitting={isUpdatingMeta}
        error={metaError}
      />
      <Sheet open={mobileLibraryOpen} onOpenChange={setMobileLibraryOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Components</SheetTitle>
          <SheetDescription className="sr-only">
            Browse available components and widgets.
          </SheetDescription>
          <div className="flex h-full flex-col overflow-y-auto">
            <WidgetPicker
              onAdd={(type) => {
                handleAddBlock(type);
                setMobileLibraryOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <SheetTitle className="sr-only">Block details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit settings for the selected block.
          </SheetDescription>
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <BlockSettings
              block={selectedBlock}
              widget={selectedWidget}
              onChange={handleChangeBlock}
            />
          </div>
        </SheetContent>
      </Sheet>
    </EditorShell>
  );
}
