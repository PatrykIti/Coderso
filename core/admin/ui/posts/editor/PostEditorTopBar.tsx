import { Eye, History, Plus, Redo2, Save, Send, Undo2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { PostBlockType } from "../../../../services/posts/editor/postBlockDocument";
import { BlockInserter } from "./blocks/BlockInserter";
import { BLOCK_CATEGORY_LABELS, POST_BLOCK_CATALOG } from "./blocks/blockCatalog";

type PostEditorTopBarProps = {
  status: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenRevisions: () => void;
  onSaveDraft: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onInsertBlock: (type: PostBlockType) => void;
  onToggleOutline: () => void;
  outlineVisible: boolean;
  onOpenDetails: () => void;
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
  archived: "Archived",
};

const statusStyle: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  archived: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const formatSavedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

type RibbonGroupProps = {
  title: string;
  children: React.ReactNode;
};

function RibbonGroup({ title, children }: RibbonGroupProps) {
  return (
    <section className="min-w-[180px] border-r pr-3 last:border-r-0 last:pr-0">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </section>
  );
}

export function PostEditorTopBar({
  status,
  dirty,
  saving,
  lastSavedAt,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenRevisions,
  onSaveDraft,
  onPreview,
  onPublish,
  onInsertBlock,
  onToggleOutline,
  outlineVisible,
  onOpenDetails,
}: PostEditorTopBarProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  const syncLabel = saving
    ? "Saving..."
    : dirty
      ? "Unsaved changes"
      : status === "published"
        ? "Published"
        : lastSavedAt
          ? `Autosaved at ${formatSavedAt(lastSavedAt)}`
          : "Synced";

  const syncBadgeClass = saving
    ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
    : dirty
      ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600";

  const groupedCatalog = Object.entries(
    POST_BLOCK_CATALOG.reduce<Record<string, typeof POST_BLOCK_CATALOG>>((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {})
  );

  const quickInsertActions: Array<{ type: PostBlockType; label: string }> = [
    { type: "writing-canvas", label: "Add writing section" },
    { type: "toc", label: "Add table of contents" },
    { type: "button", label: "Add CTA block" },
    { type: "embed", label: "Add embed block" },
    { type: "image", label: "Add image block" },
  ];

  return (
    <div className="border-y bg-background">
      <Tabs defaultValue="home" className="gap-0">
        <div className="border-b px-4 py-2 sm:px-6">
          <TabsList variant="line" className="h-auto gap-2 p-0">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="insert">Insert</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="view">View</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="home" forceMount className="m-0 border-b px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-start gap-3">
            <RibbonGroup title="Publish">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onSaveDraft}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save draft"}
              </Button>
              <Button type="button" size="sm" onClick={onPublish}>
                <Send className="h-4 w-4" />
                Publish
              </Button>
            </RibbonGroup>

            <RibbonGroup title="Edit">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4" />
                Redo
              </Button>
            </RibbonGroup>

            <RibbonGroup title="Status">
              <Badge
                variant="outline"
                className={statusStyle[status] ?? statusStyle.draft}
              >
                {statusLabel[status] ?? status}
              </Badge>
              <Badge variant="outline" className={syncBadgeClass}>
                {syncLabel}
              </Badge>
            </RibbonGroup>
          </div>
        </TabsContent>

        <TabsContent value="insert" forceMount className="m-0 border-b px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-start gap-3">
            <RibbonGroup title="Writing flow">
              {quickInsertActions.map(({ type, label }) => {
                const item = POST_BLOCK_CATALOG.find((entry) => entry.type === type);
                if (!item) return null;
                return (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onInsertBlock(type)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                );
              })}
            </RibbonGroup>

            <RibbonGroup title="Library">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    Add block
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {groupedCatalog.map(([category, items], index) => (
                    <div key={category}>
                      <DropdownMenuLabel>
                        {BLOCK_CATEGORY_LABELS[category as keyof typeof BLOCK_CATEGORY_LABELS]}
                      </DropdownMenuLabel>
                      {items.map((item) => (
                        <DropdownMenuItem
                          key={item.type}
                          onSelect={() => onInsertBlock(item.type)}
                        >
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                      {index < groupedCatalog.length - 1 ? <DropdownMenuSeparator /> : null}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLibraryOpen(true)}
              >
                Block library
              </Button>
            </RibbonGroup>
          </div>
        </TabsContent>

        <TabsContent value="review" forceMount className="m-0 border-b px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-start gap-3">
            <RibbonGroup title="History">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenRevisions}
              >
                <History className="h-4 w-4" />
                Revisions
              </Button>
            </RibbonGroup>
            <RibbonGroup title="Runtime">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPreview}
              >
                <Eye className="h-4 w-4" />
                Runtime preview
              </Button>
            </RibbonGroup>
          </div>
        </TabsContent>

        <TabsContent value="view" forceMount className="m-0 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-start gap-3">
            <RibbonGroup title="Panels">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onToggleOutline}
              >
                Blocks
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenDetails}
              >
                Details
              </Button>
            </RibbonGroup>
            <RibbonGroup title="Layout state">
              <Badge variant="outline">
                {outlineVisible ? "Outline visible" : "Outline hidden"}
              </Badge>
            </RibbonGroup>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Block library</DialogTitle>
            <DialogDescription>
              Search all blocks and insert them into the document.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[70vh] min-h-0 border-t">
            <BlockInserter
              onInsertBlock={(type) => {
                onInsertBlock(type);
                setLibraryOpen(false);
              }}
              disabled={saving}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
