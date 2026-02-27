import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getUserSettings, setUserSetting } from "@/services/userSettingsClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";

import {
  usePostEditorLayout,
  type PostEditorDetailsTab,
  type PostEditorLeftRailMode,
  type PostEditorSecondarySidebar,
} from "./hooks/usePostEditorLayout";
import { BlockInspector } from "./inspector/BlockInspector";
import { DocumentInspector } from "./inspector/DocumentInspector";
import { PostEditorLayout } from "./layout/PostEditorLayout";
import { PostEditorCanvas } from "./PostEditorCanvas";
import { PostEditorTopBar } from "./PostEditorTopBar";
import { PostRevisionDrawer } from "./PostRevisionDrawer";
import { PostListViewSidebar } from "./sidebars/PostListViewSidebar";
import { usePostEditorState } from "./hooks/usePostEditorState";
import { PostEditorSettingsDialog } from "./settings/PostEditorSettingsDialog";
import {
  DEFAULT_POST_EDITOR_PREFERENCES,
  normalizePostEditorPreferences,
  toStoredPostEditorPreferences,
  type PostEditorPreferences,
} from "./settings/postEditorPreferences";

const FOCUS_MODE_STORAGE_KEY = "nextless.posts.editor.focusMode";
const LEGACY_PREFERENCES_STORAGE_KEY = "nextless.posts.editor.preferences.v1";
const PREFERENCES_STORAGE_KEY = "nextless.posts.editor.preferences.v2";
const LAYOUT_STORAGE_KEY = "nextless.posts.editor.layout.v1";

type StoredPostEditorLayoutState = {
  secondarySidebar: PostEditorSecondarySidebar;
  detailsOpen: boolean;
  detailsTab: PostEditorDetailsTab;
  leftRailMode: PostEditorLeftRailMode;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveInitialPreferences = (): {
  preferences: PostEditorPreferences;
  hasStoredValue: boolean;
} => {
  if (typeof window === "undefined") {
    return {
      preferences: DEFAULT_POST_EDITOR_PREFERENCES,
      hasStoredValue: false,
    };
  }

  const parseFromStorage = (raw: string | null) => {
    if (!raw) return null;
    try {
      return normalizePostEditorPreferences(JSON.parse(raw));
    } catch {
      return null;
    }
  };

  const v2 = parseFromStorage(window.localStorage.getItem(PREFERENCES_STORAGE_KEY));
  if (v2) return { preferences: v2, hasStoredValue: true };

  const v1 = parseFromStorage(window.localStorage.getItem(LEGACY_PREFERENCES_STORAGE_KEY));
  if (v1) return { preferences: v1, hasStoredValue: true };

  return {
    preferences: DEFAULT_POST_EDITOR_PREFERENCES,
    hasStoredValue: false,
  };
};

const resolveInitialDetailsTab = (
  preferences: PostEditorPreferences
): PostEditorDetailsTab =>
  preferences.defaultInspectorTab === "block" ? "block" : "document";

const resolveInitialLayoutState = (
  preferences: PostEditorPreferences
): StoredPostEditorLayoutState => {
  const fallback: StoredPostEditorLayoutState = {
    secondarySidebar: "list-view",
    detailsOpen: true,
    detailsTab: resolveInitialDetailsTab(preferences),
    leftRailMode: "outline",
  };

  if (!preferences.restoreLastSidebarsState) return fallback;
  if (typeof window === "undefined") return fallback;

  const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return fallback;
    const secondarySidebar =
      parsed.secondarySidebar === "list-view" || parsed.secondarySidebar === "inserter"
        ? parsed.secondarySidebar
        : parsed.secondarySidebar === null
          ? null
          : fallback.secondarySidebar;
    const detailsOpen =
      typeof parsed.detailsOpen === "boolean"
        ? parsed.detailsOpen
        : fallback.detailsOpen;
    const detailsTab =
      parsed.detailsTab === "block" || parsed.detailsTab === "document"
        ? parsed.detailsTab
        : fallback.detailsTab;
    const leftRailMode =
      parsed.leftRailMode === "list-view" || parsed.leftRailMode === "outline"
        ? parsed.leftRailMode
        : fallback.leftRailMode;

    return {
      secondarySidebar,
      detailsOpen,
      detailsTab,
      leftRailMode,
    };
  } catch {
    return fallback;
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
  const [initialPreferencesState] = useState(resolveInitialPreferences);
  const [preferences, setPreferencesState] = useState<PostEditorPreferences>(
    () => initialPreferencesState.preferences
  );
  const [hasStoredPreferences] = useState(initialPreferencesState.hasStoredValue);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [initialFocusMode] = useState(() =>
    resolveInitialFocusMode(initialPreferencesState.preferences)
  );
  const [initialLayoutState] = useState(() =>
    resolveInitialLayoutState(initialPreferencesState.preferences)
  );
  const skipNextPreferenceSyncRef = useRef(false);
  const didMountPreferencesRef = useRef(false);
  const preferencesTouchedRef = useRef(false);

  const setPreferences = useCallback((next: PostEditorPreferences) => {
    preferencesTouchedRef.current = true;
    setPreferencesState(next);
  }, []);

  const layout = usePostEditorLayout({
    initialSecondarySidebar: initialLayoutState.secondarySidebar,
    initialDetailsOpen: initialLayoutState.detailsOpen,
    initialDetailsTab: initialLayoutState.detailsTab,
    initialFocusMode,
    initialLeftRailMode: initialLayoutState.leftRailMode,
  });

  useEffect(() => {
    let active = true;
    if (hasStoredPreferences) return;
    (async () => {
      try {
        const userSettings = await getUserSettings();
        if (!active || preferencesTouchedRef.current) return;
        skipNextPreferenceSyncRef.current = true;
        setPreferencesState(
          normalizePostEditorPreferences(userSettings["posts.editor.preferences"])
        );
      } catch {
        // Keep local defaults when user setting sync is unavailable.
      }
    })();
    return () => {
      active = false;
    };
  }, [hasStoredPreferences]);

  const handleMoveToTrash = () => {
    if (editor.deletingPost) return;
    if (typeof window !== "undefined") {
      const shouldDelete = window.confirm(
        "Move this post to trash? This action cannot be undone from the editor."
      );
      if (!shouldDelete) return;
    }
    editor
      .moveToTrash()
      .then((deleted) => {
        if (deleted) {
          navigate("/admin/posts", { replace: true });
        }
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!preferences.restoreLastSidebarsState) {
      window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
      return;
    }

    const secondarySidebar =
      layout.state.focusMode
        ? layout.state.focusRestore?.secondarySidebar ?? layout.state.secondarySidebar
        : layout.state.secondarySidebar;
    const detailsOpen =
      layout.state.focusMode
        ? layout.state.focusRestore?.detailsOpen ?? layout.state.detailsOpen
        : layout.state.detailsOpen;

    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        secondarySidebar,
        detailsOpen,
        detailsTab: layout.state.detailsTab,
        leftRailMode: layout.state.leftRailMode,
      })
    );
  }, [
    layout.state.detailsOpen,
    layout.state.detailsTab,
    layout.state.focusMode,
    layout.state.focusRestore,
    layout.state.leftRailMode,
    layout.state.secondarySidebar,
    preferences.restoreLastSidebarsState,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(toStoredPostEditorPreferences(preferences))
    );
    window.localStorage.setItem(
      LEGACY_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    );
    if (!didMountPreferencesRef.current) {
      didMountPreferencesRef.current = true;
      return;
    }
    if (skipNextPreferenceSyncRef.current) {
      skipNextPreferenceSyncRef.current = false;
      return;
    }
    void setUserSetting(
      "posts.editor.preferences",
      toStoredPostEditorPreferences(preferences)
    ).catch(() => undefined);
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
            updatedAt={editor.post?.updatedAt ?? null}
            scheduledAt={editor.post?.scheduledAt ?? null}
            publishedAt={editor.post?.publishedAt ?? null}
            moveToTrashPending={editor.deletingPost}
            onMoveToTrash={handleMoveToTrash}
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
      onDeleteBlock={editor.deleteBlock}
      onMoveBlockToIndex={editor.moveBlockToIndex}
      onInsertBlock={(type) =>
        editor.insertBlock(type, {
          source: "outline-plus",
          target: { mode: "after-selected" },
        })
      }
      leftRailMode={layout.leftRailMode}
      onLeftRailModeChange={layout.setLeftRailMode}
      showOutlineHints={preferences.showOutlineHints}
      showKeyboardHints={preferences.showKeyboardHints}
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
          onDeleteBlock={editor.deleteBlock}
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
        editorDensity={preferences.editorDensity}
      />

      <PostEditorSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        preferences={preferences}
        onChange={setPreferences}
        onReset={() => setPreferences(DEFAULT_POST_EDITOR_PREFERENCES)}
      />
    </>
  );
}
