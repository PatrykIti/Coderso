import { useMemo } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { PostBlockDocument } from "../../../../../services/posts/editor/postBlockDocument";
import { buildPostDocumentOutline } from "../../../../../services/posts/editor/postDocumentOutline";
import { buildPostDocumentStats } from "../../../../../services/posts/editor/postDocumentStats";
import { PostListViewPanel } from "../blocks/PostListViewPanel";
import { PostDocumentOutline } from "../outline/PostDocumentOutline";
import { PostDocumentStats } from "../outline/PostDocumentStats";

type PostListViewSidebarProps = {
  document: PostBlockDocument;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onMoveBlockToIndex: (id: string, targetIndex: number) => void;
};

export function PostListViewSidebar({
  document,
  selectedBlockId,
  onSelectBlock,
  onMoveBlockToIndex,
}: PostListViewSidebarProps) {
  const stats = useMemo(() => buildPostDocumentStats(document), [document]);
  const outline = useMemo(() => buildPostDocumentOutline(document), [document]);

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm"
      data-post-editor-sidebar="document-overview"
    >
      <div className="border-b px-4 py-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Document overview
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Switch between block order and heading outline.
        </p>
      </div>

      <PostDocumentStats stats={stats} />

      <Tabs defaultValue="list" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-3 py-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">List view</TabsTrigger>
            <TabsTrigger value="outline">Outline</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" forceMount className="m-0 min-h-0 flex-1 p-3">
          <PostListViewPanel
            blocks={document.blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
            onMoveBlockToIndex={onMoveBlockToIndex}
          />
        </TabsContent>
        <TabsContent value="outline" forceMount className="m-0 min-h-0 flex-1 overflow-auto p-3">
          <PostDocumentOutline
            outline={outline}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
