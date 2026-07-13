import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { createAdminActionToastAdapter } from "@/ui/shared/actionToasts";
import { isApiClientError } from "@/services/apiClient";
import { getTaxonomyOverview } from "@/services/taxonomyClient";
import {
  getSiteSettings,
  resolvePostSlugDisplay,
  resolvePostSlugRouteContext,
  type PostSlugRouteContext,
} from "@/services/siteSettingsClient";

import {
  usePostEditorLayout,
  type PostEditorDetailsTab,
  type PostEditorLeftRailMode,
  type PostEditorSecondarySidebar,
} from "./hooks/usePostEditorLayout";
import { PostDetailsSidebar } from "./inspector/PostDetailsSidebar";
import { PostEditorActionCluster } from "./header/PostEditorActionCluster";
import { PostEditorLayout } from "./layout/PostEditorLayout";
import { PostEditorCanvas } from "./PostEditorCanvas";
import { PostEditorTopBar } from "./PostEditorTopBar";
import { PostRevisionDrawer } from "./PostRevisionDrawer";
import { PostListViewSidebar } from "./sidebars/PostListViewSidebar";
import { usePostEditorState } from "./hooks/usePostEditorState";
import { PostEditorSettingsDialog } from "./settings/PostEditorSettingsDialog";
import { type PostEditorPreferences } from "./settings/postEditorPreferences";
import { usePostEditorPreferences } from "./hooks/usePostEditorPreferences";
import { usePostEditorShortcuts } from "./hooks/usePostEditorShortcuts";
import { useFocusReturn } from "./hooks/useFocusReturn";

const FOCUS_MODE_STORAGE_KEY = "coderso.posts.editor.focusMode";
const LEGACY_FOCUS_MODE_STORAGE_KEY = "nextless.posts.editor.focusMode";
const LAYOUT_STORAGE_KEY = "coderso.posts.editor.layout.v1";
const LEGACY_LAYOUT_STORAGE_KEY = "nextless.posts.editor.layout.v1";
const TAXONOMY_LOAD_ERROR_COPY = "Could not load categories.";

const postEditorActionToasts = createAdminActionToastAdapter({
  actions: {
    publish: {
      success: "Post published",
      errorFallback: "Failed to publish post.",
    },
    update: {
      success: "Changes saved",
      errorFallback: "Failed to save changes.",
    },
  },
});

type StoredPostEditorLayoutState = {
  secondarySidebar: PostEditorSecondarySidebar;
  detailsOpen: boolean;
  detailsTab: PostEditorDetailsTab;
  leftRailMode: PostEditorLeftRailMode;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveTaxonomyErrorCopy = (error: unknown) => {
  if (!isApiClientError(error)) return TAXONOMY_LOAD_ERROR_COPY;
  if (error.code === "taxonomy_category_disabled") {
    return "Categories are not enabled for this post type.";
  }
  return TAXONOMY_LOAD_ERROR_COPY;
};

const isEditorIdentityChangedError = (error: unknown) =>
  isRecord(error) && error.code === "editor_identity_changed";

type CloseAttemptRecord = {
  sessionKey: string;
  promise: Promise<void>;
};

const resolveInitialDetailsTab = (preferences: PostEditorPreferences): PostEditorDetailsTab =>
  preferences.defaultInspectorTab === "block" ? "block" : "document";

const resolveInitialLayoutState = (
  preferences: PostEditorPreferences
): StoredPostEditorLayoutState => {
  const fallback: StoredPostEditorLayoutState = {
    secondarySidebar: "list-view",
    detailsOpen: true,
    detailsTab: resolveInitialDetailsTab(preferences),
    leftRailMode: "blocks",
  };

  if (!preferences.restoreLastSidebarsState) return fallback;
  if (typeof window === "undefined") return fallback;

  const raw =
    window.localStorage.getItem(LAYOUT_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_LAYOUT_STORAGE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return fallback;
    // Legacy stored layouts used a mutually-exclusive secondarySidebar:"inserter"
    // for the block palette. The palette is now the "blocks" left-rail mode of the
    // single always-open rail, so map that legacy value to open + leftRailMode "blocks".
    const legacyInserter = parsed.secondarySidebar === "inserter";
    const secondarySidebar = legacyInserter
      ? "list-view"
      : parsed.secondarySidebar === "list-view"
        ? "list-view"
        : parsed.secondarySidebar === null
          ? null
          : fallback.secondarySidebar;
    const detailsOpen =
      typeof parsed.detailsOpen === "boolean" ? parsed.detailsOpen : fallback.detailsOpen;
    const leftRailMode = legacyInserter
      ? "blocks"
      : parsed.leftRailMode === "blocks" ||
          parsed.leftRailMode === "outline" ||
          parsed.leftRailMode === "list-view"
        ? parsed.leftRailMode
        : fallback.leftRailMode;

    if (!window.localStorage.getItem(LAYOUT_STORAGE_KEY)) {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, raw);
    }

    return {
      secondarySidebar,
      detailsOpen,
      detailsTab: fallback.detailsTab,
      leftRailMode,
    };
  } catch {
    window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_LAYOUT_STORAGE_KEY);
    return fallback;
  }
};

const resolveInitialFocusMode = (preferences: PostEditorPreferences) => {
  if (preferences.focusModeOnOpen) return true;
  if (typeof window === "undefined") return false;
  return (
    (window.localStorage.getItem(FOCUS_MODE_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_FOCUS_MODE_STORAGE_KEY)) === "1"
  );
};

// TASK-063-11 UX contract anchor:
// - strict shell parity with outline-left / article-center / details-right,
// - primary insert entrypoint in outline panel (+),
// - right panel tabs are Post/Block with selection-driven context,
// - header actions on the right: Preview, Publish, Gear.
export function PostBlockEditorShell() {
  const { navigate } = useAdminRouter();
  const editor = usePostEditorState();
  const editorPostId = editor.postId;
  const editorSessionKey = editor.editorSessionKey;
  const editorCanonicalUrl = editor.seoDraft.canonicalUrl;
  const setEditorSeoDraft = editor.setSeoDraft;
  const flushLatestAutosave = editor.flushLatestAutosave;
  const publishEditorPost = editor.publish;
  const editorStatus = editor.status;
  const focusReturn = useFocusReturn();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const outlineButtonRef = useRef<HTMLButtonElement>(null);
  const detailsButtonRef = useRef<HTMLButtonElement>(null);
  const retryAutosaveButtonRef = useRef<HTMLButtonElement>(null);
  const closeAttemptRef = useRef<CloseAttemptRecord | null>(null);
  const editorSessionKeyRef = useRef(editorSessionKey);
  const shellMountedRef = useRef(true);
  const focusRetryAfterCloseFailureRef = useRef<string | null>(null);
  const canonicalAutoFillRef = useRef<{ postId: string; value: string } | null>(null);
  const { preferences, initialPreferences, setPreferences, resetPreferences } =
    usePostEditorPreferences();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewportMode, setViewportMode] = useState<"auto" | "desktop" | "mobile">("auto");
  const [slugRouteContext, setSlugRouteContext] = useState<PostSlugRouteContext>(() =>
    resolvePostSlugRouteContext(null)
  );
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [taxonomyRetryToken, setTaxonomyRetryToken] = useState(0);
  const [closePendingSessionKey, setClosePendingSessionKey] = useState<string | null>(null);
  const closePending = closePendingSessionKey === editorSessionKey;
  const [initialFocusMode] = useState(() => resolveInitialFocusMode(initialPreferences));
  const [initialLayoutState] = useState(() => resolveInitialLayoutState(initialPreferences));

  const layout = usePostEditorLayout({
    initialSecondarySidebar: initialLayoutState.secondarySidebar,
    initialDetailsOpen: initialLayoutState.detailsOpen,
    initialDetailsTab: initialLayoutState.detailsTab,
    initialFocusMode,
    initialLeftRailMode: initialLayoutState.leftRailMode,
  });

  useEffect(() => {
    shellMountedRef.current = true;
    return () => {
      shellMountedRef.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    editorSessionKeyRef.current = editorSessionKey;
  }, [editorSessionKey]);

  useEffect(() => {
    const sessionKey = editorSessionKey;
    if (
      closePending ||
      !editor.autosaveError ||
      focusRetryAfterCloseFailureRef.current !== sessionKey
    ) {
      return;
    }
    focusRetryAfterCloseFailureRef.current = null;
    retryAutosaveButtonRef.current?.focus();
  }, [closePending, editor.autosaveError, editorSessionKey]);

  const handleClose = useCallback(() => {
    const sessionKey = editorSessionKey;
    if (closeAttemptRef.current?.sessionKey === sessionKey) return;
    setClosePendingSessionKey(sessionKey);
    const closeRecord: CloseAttemptRecord = {
      sessionKey,
      promise: Promise.resolve(),
    };
    closeAttemptRef.current = closeRecord;
    const closePromise = flushLatestAutosave()
      .then(() => {
        if (
          !shellMountedRef.current ||
          closeAttemptRef.current !== closeRecord ||
          editorSessionKeyRef.current !== sessionKey
        ) {
          return;
        }
        navigate("/admin/posts", { replace: true });
      })
      .catch(() => {
        if (
          !shellMountedRef.current ||
          closeAttemptRef.current !== closeRecord ||
          editorSessionKeyRef.current !== sessionKey
        ) {
          return;
        }
        focusRetryAfterCloseFailureRef.current = sessionKey;
      })
      .finally(() => {
        if (closeAttemptRef.current !== closeRecord) return;
        closeAttemptRef.current = null;
        if (shellMountedRef.current && editorSessionKeyRef.current === sessionKey) {
          setClosePendingSessionKey((current) => (current === sessionKey ? null : current));
        }
      });
    closeRecord.promise = closePromise;
  }, [editorSessionKey, flushLatestAutosave, navigate]);

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
      window.localStorage.removeItem(LEGACY_LAYOUT_STORAGE_KEY);
      return;
    }

    const secondarySidebar = layout.state.focusMode
      ? (layout.state.focusRestore?.secondarySidebar ?? layout.state.secondarySidebar)
      : layout.state.secondarySidebar;
    const detailsOpen = layout.state.focusMode
      ? (layout.state.focusRestore?.detailsOpen ?? layout.state.detailsOpen)
      : layout.state.detailsOpen;

    const serialized = JSON.stringify({
      secondarySidebar,
      detailsOpen,
      detailsTab: layout.state.detailsTab,
      leftRailMode: layout.state.leftRailMode,
    });
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, serialized);
    window.localStorage.setItem(LEGACY_LAYOUT_STORAGE_KEY, serialized);
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
    const serialized = layout.focusMode ? "1" : "0";
    window.localStorage.setItem(FOCUS_MODE_STORAGE_KEY, serialized);
    window.localStorage.setItem(LEGACY_FOCUS_MODE_STORAGE_KEY, serialized);
  }, [layout.focusMode]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const settings = await getSiteSettings();
        if (!active) return;
        setSlugRouteContext(resolvePostSlugRouteContext(settings));
      } catch {
        if (!active) return;
        setSlugRouteContext(resolvePostSlugRouteContext(null));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const editorTypeId = editor.post?.typeId ?? null;

  const retryTaxonomyOverview = useCallback(() => {
    setTaxonomyLoading(Boolean(editorTypeId));
    setTaxonomyError(null);
    setTaxonomyRetryToken((current) => current + 1);
  }, [editorTypeId]);

  useEffect(() => {
    if (!editorTypeId) return;

    let active = true;

    (async () => {
      try {
        const overview = await getTaxonomyOverview(editorTypeId);
        if (!active) return;
        setCategoryOptions(
          overview.terms.categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))
        );
      } catch (error) {
        if (!active) return;
        setTaxonomyError(resolveTaxonomyErrorCopy(error));
      } finally {
        if (active) {
          setTaxonomyLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [editorTypeId, taxonomyRetryToken]);

  const slugDisplay = useMemo(
    () => resolvePostSlugDisplay(slugRouteContext, editor.slug),
    [editor.slug, slugRouteContext]
  );

  useEffect(() => {
    if (!editorPostId) {
      canonicalAutoFillRef.current = null;
      return;
    }

    if (canonicalAutoFillRef.current?.postId !== editorPostId) {
      canonicalAutoFillRef.current = null;
    }

    const fallbackCanonicalUrl = slugDisplay.concrete ? slugDisplay.value.trim() : "";
    if (!fallbackCanonicalUrl) return;

    const autoFilled = canonicalAutoFillRef.current;
    const currentCanonicalUrl = editorCanonicalUrl.trim();
    if (!currentCanonicalUrl && autoFilled === null) {
      canonicalAutoFillRef.current = {
        postId: editorPostId,
        value: fallbackCanonicalUrl,
      };
      setEditorSeoDraft({ canonicalUrl: fallbackCanonicalUrl });
      return;
    }

    if (
      autoFilled?.postId === editorPostId &&
      currentCanonicalUrl === autoFilled.value &&
      currentCanonicalUrl !== fallbackCanonicalUrl
    ) {
      canonicalAutoFillRef.current = {
        postId: editorPostId,
        value: fallbackCanonicalUrl,
      };
      setEditorSeoDraft({ canonicalUrl: fallbackCanonicalUrl });
    }
  }, [
    editorCanonicalUrl,
    editorPostId,
    setEditorSeoDraft,
    slugDisplay.concrete,
    slugDisplay.value,
  ]);

  const handleCloseSecondarySidebar = useCallback(
    (target: "inserter" | "outline") => {
      layout.closeSecondarySidebar();
      focusReturn.returnFocus(target);
    },
    [focusReturn, layout]
  );

  const handleToggleInserter = useCallback(() => {
    if (layout.showInserter) {
      handleCloseSecondarySidebar("inserter");
      return;
    }
    focusReturn.capture("inserter", addButtonRef);
    layout.openInserter();
  }, [addButtonRef, focusReturn, handleCloseSecondarySidebar, layout]);

  const handleToggleOutline = useCallback(() => {
    const isOutlineOpen =
      layout.secondarySidebarOpen && !layout.showInserter && layout.leftRailMode === "outline";
    if (isOutlineOpen) {
      handleCloseSecondarySidebar("outline");
      return;
    }
    focusReturn.capture("outline", outlineButtonRef);
    layout.setLeftRailMode("outline");
    layout.openListView();
  }, [focusReturn, handleCloseSecondarySidebar, layout, outlineButtonRef]);

  const handleToggleDetails = useCallback(() => {
    if (layout.detailsSidebarOpen) {
      layout.closeDetails();
      focusReturn.returnFocus("details");
      return;
    }
    focusReturn.capture("details", detailsButtonRef);
    layout.openDetailsForSelection(Boolean(editor.selectedBlock));
  }, [detailsButtonRef, editor.selectedBlock, focusReturn, layout]);

  const handleEscapePanels = useCallback(() => {
    if (layout.showInserter) {
      handleCloseSecondarySidebar("inserter");
      return;
    }
    if (layout.secondarySidebarOpen) {
      handleCloseSecondarySidebar("outline");
      return;
    }
    if (layout.detailsSidebarOpen) {
      layout.closeDetails();
      focusReturn.returnFocus("details");
    }
  }, [focusReturn, handleCloseSecondarySidebar, layout]);

  usePostEditorShortcuts(
    {
      onToggleInserter: handleToggleInserter,
      onToggleOutline: handleToggleOutline,
      onToggleDetails: handleToggleDetails,
      onEscape: handleEscapePanels,
    },
    { enabled: editor.canMutatePost }
  );

  const handleSelectBlock = useCallback(
    (id: string | null) => {
      editor.selectBlock(id);
      if (id) {
        focusReturn.capture("details", detailsButtonRef);
        layout.openDetails("block");
        return;
      }
      layout.setDetailsTab("document");
    },
    [detailsButtonRef, editor, focusReturn, layout]
  );

  const handleOpenBlockDetails = useCallback(
    (blockId: string) => {
      editor.selectBlock(blockId);
      focusReturn.capture("details", detailsButtonRef);
      layout.openDetails("block");
    },
    [detailsButtonRef, editor, focusReturn, layout]
  );

  const detailsSidebar = (
    <PostDetailsSidebar
      activeTab={layout.state.detailsTab}
      onTabChange={layout.setDetailsTab}
      document={{
        title: editor.title,
        status: editor.status,
        slug: editor.slug,
        excerpt: editor.state.document.meta.excerpt ?? "",
        featuredImage: editor.featuredImage,
        tagsInput: editor.tagsInput,
        categoryId: editor.categoryId,
        seo: editor.seoDraft,
        taxonomySummary: editor.taxonomySummary,
        categoryOptions,
        taxonomyLoading,
        taxonomyError,
        onTaxonomyRetry: retryTaxonomyOverview,
        slugDisplay,
        updatedAt: editor.post?.updatedAt ?? null,
        scheduledAt: editor.post?.scheduledAt ?? null,
        publishedAt: editor.post?.publishedAt ?? null,
        moveToTrashPending: editor.deletingPost,
        onMoveToTrash: editor.canMutatePost ? handleMoveToTrash : undefined,
        onTitleChange: editor.setTitle,
        onSlugChange: editor.setSlug,
        onExcerptChange: editor.setExcerpt,
        onFeaturedImageChange: editor.setFeaturedImage,
        onTagsInputChange: editor.setTagsInput,
        onCategoryIdChange: editor.setCategoryId,
        onSeoChange: editor.setSeoDraft,
      }}
      block={editor.selectedBlock}
      onChangeBlockAttrs={editor.updateSelectedBlockAttrs}
    />
  );

  const recentlyUsedBlockTypes = useMemo(() => {
    const seen = new Set<string>();
    return editor.state.document.blocks
      .map((block) => block.type)
      .filter((type) => {
        if (seen.has(type)) return false;
        seen.add(type);
        return true;
      });
  }, [editor.state.document.blocks]);

  // The left rail is one always-open panel with a segmented Blocks | Outline | List
  // control (leftRailMode). The Blocks tab hosts the real BlockInserter palette.
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
      recentlyUsedTypes={recentlyUsedBlockTypes}
    />
  );

  const shellBreadcrumbs = ["Content", "Posts", editor.title || "Edit Post"];

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
            <AlertDescription>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{editor.autosaveError}</span>
                <Button
                  ref={retryAutosaveButtonRef}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    editor.saveDraft().catch(() => undefined);
                  }}
                >
                  Retry now
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {editor.canMutatePost ? (
        <PostRevisionDrawer
          key={editor.editorSessionKey}
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
      ) : null}

      {editor.loading ? (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Loading post editor...
        </div>
      ) : editor.canMutatePost ? (
        <PostEditorCanvas
          document={editor.state.document}
          title={editor.title}
          onTitleChange={editor.setTitle}
          selectedBlockId={editor.state.selectedBlockId}
          insertFocusToken={editor.insertFocusToken}
          onSelectBlock={handleSelectBlock}
          onUpdateBlockContent={editor.updateBlockContent}
          onUpdateBlockAttrs={editor.updateBlockAttrs}
          onTransformBlock={editor.transformBlock}
          onUpdateDocumentTypography={editor.updateDocumentTypography}
          onUploadClipboardImage={editor.uploadClipboardImage}
          onInsertBlock={editor.insertBlock}
          onDeleteBlock={editor.deleteBlock}
          onEnsureDynamicTocBlock={editor.ensureDynamicTocBlock}
          onOpenBlockDetails={handleOpenBlockDetails}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Post editor is unavailable.
        </div>
      )}

      <RuntimePreviewDialog
        open={editor.previewOpen}
        onOpenChange={editor.setPreviewOpen}
        title="Runtime preview"
        subtitle="Rendered post view for current draft."
        canPreview={editor.canMutatePost}
        previewUrl={editor.previewUrl}
        isLoading={editor.previewLoading}
        error={editor.previewError}
      />
    </div>
  );

  const handlePublish = useCallback(() => {
    const sessionKey = editorSessionKey;
    const wasPublished = editorStatus === "published";
    const action = wasPublished ? "update" : "publish";
    publishEditorPost()
      .then(() => {
        if (!shellMountedRef.current || editorSessionKeyRef.current !== sessionKey) {
          return;
        }
        postEditorActionToasts.success(action);
      })
      .catch((error) => {
        if (
          !shellMountedRef.current ||
          editorSessionKeyRef.current !== sessionKey ||
          isEditorIdentityChangedError(error)
        ) {
          return;
        }
        postEditorActionToasts.error(action, error);
      });
  }, [editorSessionKey, editorStatus, publishEditorPost]);

  const pageActions = (
    <PostEditorActionCluster
      status={editor.status}
      saving={
        !editor.canMutatePost ||
        editor.state.saving ||
        editor.autosaveSaving ||
        editor.restoringRevisionId !== null
      }
      onPreview={() => {
        editor.preview().catch(() => undefined);
      }}
      onSaveDraft={() => {
        editor.saveDraft().catch(() => undefined);
      }}
      onPublish={handlePublish}
    />
  );

  return (
    <>
      <PostEditorLayout
        activeHref="/admin/posts"
        breadcrumbs={shellBreadcrumbs}
        pageTitle={editor.title || "Edit Post"}
        pageDescription="Write, format, and publish your story."
        pageActions={pageActions}
        header={
          <PostEditorTopBar
            status={editor.status}
            dirty={editor.hasUnsavedChanges}
            saving={
              editor.state.saving || editor.autosaveSaving || editor.restoringRevisionId !== null
            }
            lastSavedAt={editor.lastSavedAt}
            onClose={handleClose}
            closePending={closePending}
            actionsDisabled={!editor.canMutatePost}
            onOpenRevisions={editor.openRevisions}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            onUndo={editor.undo}
            onRedo={editor.redo}
            viewportMode={viewportMode}
            onSetViewportMode={setViewportMode}
            onToggleInserter={handleToggleInserter}
            inserterVisible={layout.showInserter}
            onToggleFocusMode={layout.toggleFocusMode}
            focusMode={layout.focusMode}
            onToggleOutline={handleToggleOutline}
            outlineVisible={
              !layout.focusMode && layout.secondarySidebarOpen && layout.leftRailMode === "outline"
            }
            onToggleDetails={handleToggleDetails}
            detailsOpen={!layout.focusMode && layout.detailsSidebarOpen}
            onOpenSettings={() => setSettingsOpen(true)}
            addButtonRef={addButtonRef}
            outlineButtonRef={outlineButtonRef}
            detailsButtonRef={detailsButtonRef}
          />
        }
        content={content}
        secondarySidebar={editor.canMutatePost ? secondarySidebar : null}
        secondarySidebarOpen={layout.secondarySidebarOpen}
        onSecondarySidebarOpenChange={(open) => {
          if (!editor.canMutatePost) return;
          if (!open) {
            handleCloseSecondarySidebar(layout.showInserter ? "inserter" : "outline");
            return;
          }
          if (!layout.secondarySidebarOpen) {
            layout.setLeftRailMode("blocks");
            layout.openListView();
          }
        }}
        detailsSidebar={editor.canMutatePost ? detailsSidebar : null}
        detailsSidebarOpen={layout.detailsSidebarOpen}
        onDetailsSidebarOpenChange={(open) => {
          if (!editor.canMutatePost) return;
          if (!open) {
            layout.closeDetails();
            focusReturn.returnFocus("details");
          }
        }}
        focusMode={layout.focusMode}
        viewportMode={viewportMode}
        compactSidePanels={preferences.compactSidePanels}
        editorDensity={preferences.editorDensity}
      />

      <PostEditorSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        preferences={preferences}
        onChange={setPreferences}
        onReset={resetPreferences}
      />
    </>
  );
}
