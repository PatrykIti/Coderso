import { PanelLeftOpen, PanelRightOpen, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";

import { BlockInserter } from "./blocks/BlockInserter";
import { BlockInspector } from "./inspector/BlockInspector";
import { DocumentInspector } from "./inspector/DocumentInspector";
import { PostEditorCanvas } from "./PostEditorCanvas";
import { PostEditorTopBar } from "./PostEditorTopBar";
import { usePostEditorState } from "./hooks/usePostEditorState";

export function PostBlockEditorShell() {
  const [mobileBlocksOpen, setMobileBlocksOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  const editor = usePostEditorState();

  const blockLibrary = (
    <BlockInserter
      onInsertBlock={(type) => {
        editor.insertBlock(type);
        setMobileBlocksOpen(false);
      }}
      disabled={editor.loading}
    />
  );

  const inspectorPanel = (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="document" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-4 py-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="block">Block</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="document" className="m-0 min-h-0 flex-1 overflow-auto">
          <DocumentInspector
            status={editor.status}
            slug={editor.slug}
            excerpt={editor.state.document.meta.excerpt ?? ""}
            featuredImage={editor.featuredImage}
            tagsInput={editor.tagsInput}
            categoryId={editor.categoryId}
            seo={editor.seoDraft}
            taxonomySummary={editor.taxonomySummary}
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
        <span>Coderso</span>
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
      activeHref="/admin/coderso/posts"
      breadcrumbs={breadcrumbs}
      leftPanel={blockLibrary}
      rightPanel={inspectorPanel}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b bg-background px-4 py-2 lg:hidden">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMobileBlocksOpen(true)}
            >
              <PanelLeftOpen className="mr-2 h-4 w-4" />
              Blocks
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMobileInspectorOpen(true)}
            >
              <PanelRightOpen className="mr-2 h-4 w-4" />
              Inspector
            </Button>
          </div>
        </div>

        {editor.error ? (
          <div className="px-4 pt-4 sm:px-6">
            <Alert variant="destructive">
              <AlertTitle>Post editor error</AlertTitle>
              <AlertDescription>{editor.error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {editor.remoteUpdatePending ? (
          <div className="px-4 pt-4 sm:px-6">
            <Alert>
              <AlertTitle>Remote update detected</AlertTitle>
              <AlertDescription>
                This post changed in the background. Reload to synchronize editor state.
              </AlertDescription>
              <div className="mt-3">
                <Button type="button" variant="outline" size="sm" onClick={editor.markReloadRemote}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reload now
                </Button>
              </div>
            </Alert>
          </div>
        ) : null}

        <PostEditorTopBar
          status={editor.status}
          dirty={editor.hasUnsavedChanges}
          saving={editor.state.saving}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onSaveDraft={() => {
            editor.saveDraft().catch(() => undefined);
          }}
          onPreview={() => {
            editor.preview().catch(() => undefined);
          }}
          onPublish={() => {
            editor.publish().catch(() => undefined);
          }}
        />

        {editor.loading ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            Loading post editor...
          </div>
        ) : (
          <PostEditorCanvas
            title={editor.title}
            slug={editor.slug}
            onTitleChange={editor.setTitle}
            onSlugChange={editor.setSlug}
            document={editor.state.document}
            selectedBlockId={editor.state.selectedBlockId}
            onSelectBlock={(id) => editor.selectBlock(id)}
            onUpdateSelectedBlockContent={editor.updateSelectedBlockContent}
            onMoveSelectedBlock={editor.moveSelectedBlock}
            onMoveBlockToIndex={editor.moveBlockToIndex}
            onTransformSelectedBlock={editor.transformSelectedBlock}
            onInsertBlock={editor.insertBlock}
            onDeleteSelectedBlock={editor.deleteSelectedBlock}
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

      <Sheet open={mobileBlocksOpen} onOpenChange={setMobileBlocksOpen}>
        <SheetContent side="left" className="w-full max-w-sm p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Blocks</SheetTitle>
          <SheetDescription className="sr-only">
            Insert blocks to post document.
          </SheetDescription>
          {blockLibrary}
        </SheetContent>
      </Sheet>

      <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
        <SheetContent side="right" className="w-full max-w-sm p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Inspector</SheetTitle>
          <SheetDescription className="sr-only">
            Edit document and selected block settings.
          </SheetDescription>
          {inspectorPanel}
        </SheetContent>
      </Sheet>
    </EditorShell>
  );
}
