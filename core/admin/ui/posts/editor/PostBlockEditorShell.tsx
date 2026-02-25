import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";

import { usePostEditorLayout } from "./hooks/usePostEditorLayout";
import { BlockInspector } from "./inspector/BlockInspector";
import { DocumentInspector } from "./inspector/DocumentInspector";
import { PostEditorLayout } from "./layout/PostEditorLayout";
import { PostEditorCanvas } from "./PostEditorCanvas";
import { PostEditorTopBar } from "./PostEditorTopBar";
import { PostRevisionDrawer } from "./PostRevisionDrawer";
import { PostListViewSidebar } from "./sidebars/PostListViewSidebar";
import { usePostEditorState } from "./hooks/usePostEditorState";
import {
  PostEditorSettingsDialog,
  type PostEditorPreferences,
} from "./settings/PostEditorSettingsDialog";

const FOCUS_MODE_STORAGE_KEY = "nextless.posts.editor.focusMode";
const PREFERENCES_STORAGE_KEY = "nextless.posts.editor.preferences.v1";

const defaultPreferences: PostEditorPreferences = {
  focusModeOnOpen: false,
  compactSidePanels: false,
  showOutlineHints: true,
};

const resolveInitialPreferences = (): PostEditorPreferences => {
  if (typeof window === "undefined") return defaultPreferences;
  const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (!raw) return defaultPreferences;
  try {
    const parsed = JSON.parse(raw) as Partial<PostEditorPreferences>;
    return {
      focusModeOnOpen: parsed.focusModeOnOpen === true,
      compactSidePanels: parsed.compactSidePanels === true,
      showOutlineHints: parsed.showOutlineHints !== false,
    };
  } catch {
    return defaultPreferences;
  }
};

const resolveInitialFocusMode = (preferences: PostEditorPreferences) => {
  if (preferences.focusModeOnOpen) return true;
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(FOCUS_MODE_STORAGE_KEY) === "1";
};

// TASK-063-11 UX contract anchor:
// - strict shell parity with outline-left / article-center / details-right,
// - primary insert entrypoint in outline panel (+),
// - right panel tabs are Post/Block with selection-driven context,
// - header actions on the right: Preview, Publish, Gear.
export function PostBlockEditorShell() {
  const { navigate } = useAdminRouter();
  const editor = usePostEditorState();
  const [preferences, setPreferences] = useState(resolveInitialPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [initialFocusMode] = useState(() => resolveInitialFocusMode(preferences));

  const layout = usePostEditorLayout({
    initialSecondarySidebar: "list-view",
    initialDetailsOpen: true,
    initialDetailsTab: "document",
    initialFocusMode,
    initialLeftRailMode: "outline",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    );
  }, [preferences]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      FOCUS_MODE_STORAGE_KEY,
      layout.focusMode ? "1" : "0"
    );
  }, [layout.focusMode]);

  const handleSelectBlock = useCallback(
    (id: string | null) => {
      editor.selectBlock(id);
      if (id) {
        layout.openDetails("block");
        return;
      }
      layout.setDetailsTab("document");
    },
    [editor, layout]
  );

  const handleOpenBlockDetails = useCallback(
    (blockId: string) => {
      editor.selectBlock(blockId);
      layout.openDetails("block");
    },
    [editor, layout]
  );

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
            <TabsTrigger value="document">Post</TabsTrigger>
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

  const secondarySidebar = (
    <PostListViewSidebar
      document={editor.state.document}
      selectedBlockId={editor.state.selectedBlockId}
      onSelectBlock={(id) => handleSelectBlock(id)}
      onMoveBlockToIndex={editor.moveBlockToIndex}
      onInsertBlock={(type) =>
        editor.insertBlock(type, {
          source: "outline-plus",
          target: { mode: "after-selected" },
        })
      }
      leftRailMode={layout.leftRailMode}
      onLeftRailModeChange={layout.setLeftRailMode}
      showHints={preferences.showOutlineHints}
    />
  );

  const shellBreadcrumbs = (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Content</span>
      <span>/</span>
      <span className="text-foreground">Posts</span>
    </div>
  );

  const editorBreadcrumbs = useMemo(
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
          title={editor.title}
          onTitleChange={editor.setTitle}
          selectedBlockId={editor.state.selectedBlockId}
          insertFocusToken={editor.insertFocusToken}
          onSelectBlock={handleSelectBlock}
          onUpdateBlockContent={editor.updateBlockContent}
          onUploadClipboardImage={editor.uploadClipboardImage}
          onInsertBlock={editor.insertBlock}
          onEnsureDynamicTocBlock={editor.ensureDynamicTocBlock}
          onOpenBlockDetails={handleOpenBlockDetails}
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
    <>
      <PostEditorLayout
        activeHref="/admin/posts"
        breadcrumbs={shellBreadcrumbs}
        header={
          <PostEditorTopBar
            title={editor.title}
            status={editor.status}
            dirty={editor.hasUnsavedChanges}
            saving={
              editor.state.saving ||
              editor.autosaveSaving ||
              editor.restoringRevisionId !== null
            }
            lastSavedAt={editor.lastSavedAt}
            breadcrumbs={editorBreadcrumbs}
            onClose={() => navigate("/admin/posts", { replace: true })}
            onOpenRevisions={editor.openRevisions}
            onPreview={() => {
              editor.preview().catch(() => undefined);
            }}
            onPublish={() => {
              editor.publish().catch(() => undefined);
            }}
            onToggleFocusMode={layout.toggleFocusMode}
            focusMode={layout.focusMode}
            onToggleOutline={() => {
              if (layout.secondarySidebarOpen && layout.leftRailMode === "outline") {
                layout.closeSecondarySidebar();
                return;
              }
              layout.setLeftRailMode("outline");
              layout.openListView();
            }}
            outlineVisible={layout.secondarySidebarOpen && layout.leftRailMode === "outline"}
            onOpenDetails={() =>
              layout.openDetailsForSelection(Boolean(editor.selectedBlock))
            }
            onOpenSettings={() => setSettingsOpen(true)}
          />
        }
        content={content}
        secondarySidebar={secondarySidebar}
        secondarySidebarOpen={layout.secondarySidebarOpen}
        onSecondarySidebarOpenChange={(open) => {
          if (!open) {
            layout.closeSecondarySidebar();
            return;
          }
          if (!layout.secondarySidebarOpen) {
            layout.setLeftRailMode("outline");
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
        focusMode={layout.focusMode}
        compactSidePanels={preferences.compactSidePanels}
      />

      <PostEditorSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        preferences={preferences}
        onChange={setPreferences}
        onReset={() => setPreferences(defaultPreferences)}
      />
    </>
  );
}
