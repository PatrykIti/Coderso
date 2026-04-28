import { Plus } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { PostBlockDocument } from "../../../../../services/posts/editor/postBlockDocument";
import { buildPostDocumentOutline } from "../../../../../services/posts/editor/postDocumentOutline";
import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import {
  BLOCK_CATEGORY_LABELS,
  groupPostBlockCatalogByCategory,
  POST_BLOCK_CATALOG,
} from "../blocks/blockCatalog";
import { PostListViewPanel } from "../blocks/PostListViewPanel";
import { PostDocumentOutline } from "../outline/PostDocumentOutline";
import type { PostEditorLeftRailMode } from "../hooks/usePostEditorLayout";

type PostListViewSidebarProps = {
  document: PostBlockDocument;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onDeleteBlock?: (id: string) => void;
  onMoveBlockToIndex: (id: string, targetIndex: number) => void;
  onInsertBlock: (type: PostBlockType) => void;
  leftRailMode?: PostEditorLeftRailMode;
  onLeftRailModeChange?: (mode: PostEditorLeftRailMode) => void;
  showOutlineHints?: boolean;
  showKeyboardHints?: boolean;
};

const catalogGroups = groupPostBlockCatalogByCategory(POST_BLOCK_CATALOG);

export function PostListViewSidebar({
  document,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onMoveBlockToIndex,
  onInsertBlock,
  leftRailMode = "outline",
  onLeftRailModeChange,
  showOutlineHints = true,
  showKeyboardHints = true,
}: PostListViewSidebarProps) {
  const outline = useMemo(() => buildPostDocumentOutline(document), [document]);

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-background"
      data-post-editor-sidebar="document-overview"
      data-post-editor-left-rail-mode={leftRailMode}
      role="region"
      aria-label="Document overview sidebar"
      id="post-editor-document-overview"
    >
      <div className="flex items-center justify-between border-b px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Document Outline
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Insert block from outline"
              data-post-editor-outline-insert="true"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {catalogGroups.map((group, index) => (
              <div key={group.category}>
                {index > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                  {BLOCK_CATEGORY_LABELS[group.category]}
                </DropdownMenuLabel>
                {group.items.map((item) => (
                  <DropdownMenuItem
                    key={item.type}
                    onClick={() => onInsertBlock(item.type)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs
        value={leftRailMode}
        onValueChange={(value) =>
          onLeftRailModeChange?.(value === "list-view" ? "list-view" : "outline")
        }
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b px-3 py-2">
          <TabsList
            className="grid w-full grid-cols-2 bg-muted/40"
            aria-label="Document overview tabs"
          >
            <TabsTrigger value="outline" data-post-editor-left-rail-tab="outline">
              Outline
            </TabsTrigger>
            <TabsTrigger value="list-view" data-post-editor-left-rail-tab="list-view">
              List view
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="outline" forceMount className="m-0 min-h-0 flex-1 overflow-auto p-3">
          <PostDocumentOutline
            outline={outline}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
            showHints={showOutlineHints}
          />
        </TabsContent>
        <TabsContent value="list-view" forceMount className="m-0 min-h-0 flex-1 p-3">
          <PostListViewPanel
            blocks={document.blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
            onDeleteBlock={onDeleteBlock}
            onMoveBlockToIndex={onMoveBlockToIndex}
            showKeyboardHints={showKeyboardHints}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
