import { useMemo, useRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";

import { useFocusReturn } from "./hooks/useFocusReturn";
import { usePostEditorLayout } from "./hooks/usePostEditorLayout";
import { BlockInspector } from "./inspector/BlockInspector";
import { DocumentInspector } from "./inspector/DocumentInspector";
import { PostEditorLayout } from "./layout/PostEditorLayout";
import { PostEditorCanvas } from "./PostEditorCanvas";
import { PostEditorTopBar } from "./PostEditorTopBar";
import { PostRevisionDrawer } from "./PostRevisionDrawer";
import { PostInserterSidebar } from "./sidebars/PostInserterSidebar";
import { PostListViewSidebar } from "./sidebars/PostListViewSidebar";
import { usePostEditorState } from "./hooks/usePostEditorState";

// TASK-061-01 UX contract anchor:
// - writing-first editing flow on a shared canvas,
// - ribbon is the primary action surface,
// - outline/list view remains informational + navigational,
// - details opens contextually without changing canvas mode.
export function PostBlockEditorShell() {
  const editor = usePostEditorState();
  const layout = usePostEditorLayout({
    initialSecondarySidebar: "list-view",
    initialDetailsTab: "document",
  });
  const addButtonRef = useRef<HTMLButtonElement | null>(null);

  useFocusReturn({
    active: layout.showInserter,
    targetRef: addButtonRef,
  });

  const detailsSidebar = (
    <div className="flex h-full flex-col">
      <Tabs
        value={layout.state.detailsTab}
        onValueChange={(value) =>
          layout.setDetailsTab(value === "block" ? "block" : "document")
        }
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b px-4 py-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="block">Block</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent
          value="document"
          className="m-0 min-h-0 flex-1 overflow-auto"
        >
          <DocumentInspector
            title={editor.title}
            status={editor.status}
            slug={editor.slug}
            excerpt={editor.state.document.meta.excerpt ?? ""}
            featuredImage={editor.featuredImage}
            tagsInput={editor.tagsInput}
            categoryId={editor.categoryId}
            seo={editor.seoDraft}
            taxonomySummary={editor.taxonomySummary}
            onTitleChange={editor.setTitle}
            onSlugChange={editor.setSlug}
            onExcerptChange={editor.setExcerpt}
            onFeaturedImageChange={editor.setFeaturedImage}
            onTagsInputChange={editor.setTagsInput}
            onCategoryIdChange={editor.setCategoryId}
            onSeoChange={editor.setSeoDraft}
          />
        </TabsContent>
        <TabsContent value="block" className="m-0 min-h-0 flex-1 overflow-auto">
          <BlockInspector
            block={editor.selectedBlock}
            onChangeAttrs={editor.updateSelectedBlockAttrs}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const secondarySidebar = layout.showInserter ? (
    <PostInserterSidebar
      open={layout.showInserter}
      onClose={layout.closeSecondarySidebar}
      onInsertBlock={(type) =>
        editor.insertBlock(type, {
          source: "sidebar",
          target: { mode: "after-selected" },
        })
      }
      disabled={editor.state.saving || editor.autosaveSaving}
      recentlyUsedTypes={["writing-canvas", "heading", "image", "button"]}
    />
  ) : (
    <PostListViewSidebar
      document={editor.state.document}
      selectedBlockId={editor.state.selectedBlockId}
      onSelectBlock={(id) => editor.selectBlock(id)}
      onMoveBlockToIndex={editor.moveBlockToIndex}
    />
  );

  const breadcrumbs = useMemo(
    () => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Content</span>
        <span>/</span>
        <span>Posts</span>
        <span>/</span>
        <span className="text-foreground">{editor.title || "Edit Post"}</span>
      </div>
    ),
    [editor.title]
  );

  const footer = (
    <div className="flex items-center justify-between gap-4 px-4 py-2 text-xs text-muted-foreground sm:px-6">
      <span>{editor.state.document.blocks.length} blocks</span>
      <span>
        {layout.showInserter
          ? "Inserter panel"
          : layout.showListView
            ? "List view panel"
            : "Panels hidden"}
      </span>
    </div>
  );

  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      {editor.error ? (
        <div className="px-4 pt-4 sm:px-6">
          <Alert variant="destructive">
            <AlertTitle>Post editor error</AlertTitle>
            <AlertDescription>{editor.error}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {editor.autosaveError ? (
        <div className="px-4 pt-4 sm:px-6">
          <Alert variant="destructive">
            <AlertTitle>Autosave paused</AlertTitle>
            <AlertDescription>{editor.autosaveError}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <PostRevisionDrawer
        open={editor.revisionsOpen}
        onOpenChange={editor.setRevisionsOpen}
        revisions={editor.revisions}
        isLoading={editor.revisionsLoading}
        error={editor.revisionsError}
        restoringId={editor.restoringRevisionId}
        onRestore={(revisionId) => {
          editor.restoreRevision(revisionId).catch(() => undefined);
        }}
      />

      {editor.loading ? (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Loading post editor...
        </div>
      ) : (
        <PostEditorCanvas
          document={editor.state.document}
          selectedBlockId={editor.state.selectedBlockId}
          insertFocusToken={editor.insertFocusToken}
          onSelectBlock={(id) => editor.selectBlock(id)}
          onUpdateBlockContent={editor.updateBlockContent}
          onUploadClipboardImage={editor.uploadClipboardImage}
          onMoveBlock={editor.moveBlock}
          onTransformBlock={editor.transformBlock}
          onDeleteBlock={editor.deleteBlock}
          onInsertBlock={editor.insertBlock}
          onEnsureDynamicTocBlock={editor.ensureDynamicTocBlock}
        />
      )}

      <RuntimePreviewDialog
        open={editor.previewOpen}
        onOpenChange={editor.setPreviewOpen}
        title="Runtime preview"
        subtitle="Rendered post view for current draft."
        canPreview={Boolean(editor.postId)}
        previewUrl={editor.previewUrl}
        isLoading={editor.previewLoading}
        error={editor.previewError}
      />
    </div>
  );

  return (
    <PostEditorLayout
      activeHref="/admin/posts"
      breadcrumbs={breadcrumbs}
      header={
        <PostEditorTopBar
          addButtonRef={addButtonRef}
          title={editor.title}
          status={editor.status}
          dirty={editor.hasUnsavedChanges}
          saving={
            editor.state.saving ||
            editor.autosaveSaving ||
            editor.restoringRevisionId !== null
          }
          lastSavedAt={editor.lastSavedAt}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onOpenRevisions={editor.openRevisions}
          onSaveDraft={() => {
            editor.saveDraft().catch(() => undefined);
          }}
          onPreview={() => {
            editor.preview().catch(() => undefined);
          }}
          onPublish={() => {
            editor.publish().catch(() => undefined);
          }}
          onToggleInserter={layout.toggleInserter}
          inserterVisible={layout.showInserter}
          onToggleOutline={layout.toggleListView}
          outlineVisible={layout.showListView}
          onOpenDetails={() =>
            layout.openDetailsForSelection(Boolean(editor.selectedBlock))
          }
        />
      }
      content={content}
      footer={footer}
      secondarySidebar={secondarySidebar}
      secondarySidebarOpen={layout.secondarySidebarOpen}
      onSecondarySidebarOpenChange={(open) => {
        if (!open) {
          layout.closeSecondarySidebar();
          return;
        }
        if (!layout.secondarySidebarOpen) {
          layout.openListView();
        }
      }}
      detailsSidebar={detailsSidebar}
      detailsSidebarOpen={layout.detailsSidebarOpen}
      onDetailsSidebarOpenChange={(open) => {
        if (!open) {
          layout.closeDetails();
        }
      }}
    />
  );
}
