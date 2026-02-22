import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";

import { BlockInspector } from "./inspector/BlockInspector";
import { DocumentInspector } from "./inspector/DocumentInspector";
import { PostEditorCanvas } from "./PostEditorCanvas";
import { PostEditorTopBar } from "./PostEditorTopBar";
import { PostRevisionDrawer } from "./PostRevisionDrawer";
import { usePostEditorState } from "./hooks/usePostEditorState";

export function PostBlockEditorShell() {
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [outlineVisible, setOutlineVisible] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<"document" | "block">(
    "document"
  );

  const editor = usePostEditorState();

  const inspectorPanel = (
    <div className="flex h-full flex-col">
      <Tabs
        value={inspectorTab}
        onValueChange={(value) =>
          setInspectorTab(value === "block" ? "block" : "document")
        }
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b px-4 py-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="block">Block</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="document" className="m-0 min-h-0 flex-1 overflow-auto">
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

  return (
    <EditorShell
      activeHref="/admin/posts"
      breadcrumbs={breadcrumbs}
    >
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

        <PostEditorTopBar
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
          onInsertBlock={(type) => editor.insertBlock(type)}
          onToggleOutline={() => setOutlineVisible((prev) => !prev)}
          outlineVisible={outlineVisible}
          onOpenDetails={() => {
            setInspectorTab(editor.selectedBlock ? "block" : "document");
            setDetailsPanelOpen(true);
          }}
        />

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
            onSelectBlock={(id) => editor.selectBlock(id)}
            onUpdateBlockContent={editor.updateBlockContent}
            onMoveBlock={editor.moveBlock}
            onMoveBlockToIndex={editor.moveBlockToIndex}
            onTransformBlock={editor.transformBlock}
            onDeleteBlock={editor.deleteBlock}
            onInsertBlockAfterSelected={editor.insertBlock}
            outlineVisible={outlineVisible}
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

      <Sheet open={detailsPanelOpen} onOpenChange={setDetailsPanelOpen}>
        <SheetContent side="right" className="w-full max-w-sm p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit post and selected block settings.
          </SheetDescription>
          {inspectorPanel}
        </SheetContent>
      </Sheet>
    </EditorShell>
  );
}
