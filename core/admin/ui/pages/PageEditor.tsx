import { useMemo, useState, useEffect } from "react";
import { Eye, Save } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import {
  createBlock,
  duplicateBlock,
  reorderBlocks,
  shouldWarnOnNavigate,
} from "./builder/blockUtils";
import type { Block } from "./builder/types";
import { widgetRegistry } from "./builder/widgetRegistry";

const defaultBlocks: Block[] = [
  {
    ...createBlock("hero"),
    variant: "centered",
    editor: { mode: "visual", wizardCompleted: true },
    data: {
      headline: "Build faster with Nextless",
    },
  },
  {
    ...createBlock("compare-timeline"),
    variant: "dual-track-highlight",
    editor: { mode: "wizard", wizardCompleted: false },
  },
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
  return Array.isArray(blocks) ? (blocks as Block[]) : defaultBlocks;
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
  const [isLoading, setIsLoading] = useState(!initialPage);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? null;
  const selectedWidget = useMemo(
    () =>
      selectedBlock
        ? widgetRegistry.find((widget) => widget.type === selectedBlock.type)
        : undefined,
    [selectedBlock]
  );

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

  const handleMove = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    updateBlocks(reorderBlocks(blocks, from, to));
  };

  const handleDuplicate = (id: string) => {
    updateBlocks(duplicateBlock(blocks, id));
  };

  const handleDelete = (id: string) => {
    const next = blocks.filter((block) => block.id !== id);
    updateBlocks(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
    }
  };

  const handleChangeBlock = (next: Block) => {
    updateBlocks(blocks.map((block) => (block.id === next.id ? next : block)));
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
      await publishPage(pageId);
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
      topbarActions={
        <div className="flex items-center gap-3">
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
      }
    >
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
    </EditorShell>
  );
}
