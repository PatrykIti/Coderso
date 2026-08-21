import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { PanelRight, Redo2, Rocket, Save, SlidersHorizontal, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  getCachedMenuDetail,
  getMenuWithItemsCached,
  publishMenu,
  updateMenu,
} from "@/services/menusClient";
import { listPagesCached } from "@/services/pagesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import {
  createDefaultMenuBlock,
  deleteMenuBlock,
  findMenuBlock,
  insertMenuBlock,
  reorderMenuBlock,
  type MenuBlockType,
  type NavLevelStyleLevel,
} from "../../../services/menus/menuDocumentV2";
import { mapMenuNodesToNavigationItems } from "../../../services/navigation/navigationMenuMapping";
import type { PageBreakpoint } from "../../../services/pages/pageDocumentV2";
import { getPageEditorColorPalette } from "../../../services/pages/pageEditorControlUiModel";
import { toMenuCanvasColorCssVariableMap } from "../../../ui/theme/tokenCss";
import type { NavigationItem } from "../../../services/renderContracts/navigationRenderer";
import { DeviceSwitcher } from "../pages/DeviceSwitcher";
import { EditorControlToneContext } from "../pages/editorControls/controlChrome";
import { CanvasEditor } from "../shared/CanvasEditor";
import { useCanvasSiteName, useCanvasSiteTokens } from "../shared/useCanvasSiteTokens";

import {
  historyReducer,
  seedMenuDocument,
  DEVICE_LABELS,
  isMenuOverrideDevice,
  type HistoryState,
} from "./MenuDesignEditorControls";
import { MenuDocumentCanvas } from "./MenuDesignEditorCanvas";
import { MenuBarPanel, type UpdateDoc } from "./MenuDesignEditorBarPanel";
import { MenuBlockPanel } from "./MenuDesignEditorBlockPanel";
import { projectPublicNavigationItems } from "../../../services/navigation/publicNavigationProjection";
import { cacheKeys } from "@/services/cachePolicy";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { useAdminDirtyNavigationGuard } from "@/ui/shared/AdminDirtyNavigationGuard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- editor -----------------------------------------------------------------

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export function MenuDesignEditor({ menuId }: { menuId: string }) {
  const { navigate } = useAdminRouter();
  const initial = useMemo(() => getCachedMenuDetail(menuId), [menuId]);
  const [history, dispatch] = useReducer(
    historyReducer,
    initial?.menu.settings,
    (settings): HistoryState => ({
      doc: seedMenuDocument(settings),
      past: [],
      future: [],
      dirty: false,
    })
  );
  const doc = history.doc;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<PageBreakpoint>("desktop");
  // TASK-504-04 §1: the nesting level being styled (0 = nav base; 1/2 =
  // levelStyles). Lives here (beside device/selectedId) so BOTH the panel (sets
  // it) and the canvas (force-open consumes it) stay in sync.
  const [navLevel, setNavLevel] = useState<0 | 1 | 2>(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [menuName, setMenuName] = useState(initial?.menu.name ?? "Menu design");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TASK-542-03-L03 revalidation contract: the synchronous cache paints the
  // initial document, but the editor ALWAYS force-revalidates in the background
  // and NEVER hydrates a remote payload over a local draft.
  const dirtyRef = useRef(history.dirty);
  useEffect(() => {
    dirtyRef.current = history.dirty;
  }, [history.dirty]);
  const mutationInFlightRef = useRef(false);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);

  const updateDoc = useCallback<UpdateDoc>((updater) => dispatch({ type: "update", updater }), []);

  // Canvas WYSIWYG (TASK-502-04): the SAME live site-token payload the Pages
  // canvas uses (shared hook). The seven-var map is painted inline on the canvas
  // frame ROOT so the doc CSS resolves the SITE theme (not the admin beige); the
  // palette makes preset swatches preview their REAL site colors; siteName feeds
  // the brand fallback chain (per-menu text → site name → placeholder).
  const siteTokens = useCanvasSiteTokens();
  const siteName = useCanvasSiteName();
  const canvasSiteTokenVariables = useMemo(
    () => toMenuCanvasColorCssVariableMap(siteTokens) as CSSProperties,
    [siteTokens]
  );
  const sitePalette = useMemo(() => getPageEditorColorPalette(siteTokens), [siteTokens]);

  // Load the published item tree (force-revalidated) + page slugs to BIND
  // nav-items. The synchronous `getCachedMenuDetail` above already painted the
  // initial document; this background fetch replaces any TTL-stale snapshot with
  // the authoritative payload (never clobbering a local draft).
  const applyAuthoritative = useCallback(
    (
      detail: NonNullable<Awaited<ReturnType<typeof getMenuWithItemsCached>>>,
      pages: Awaited<ReturnType<typeof listPagesCached>>,
      forceHydrate = false
    ) => {
      const pagePathById = new Map(pages.map((page) => [page.id, page.slug] as const));
      setItems(
        projectPublicNavigationItems(
          mapMenuNodesToNavigationItems(detail.items, pagePathById, {
            includeDefaultTarget: true,
          })
        )
      );
      setMenuName(detail.menu.name);
      if (dirtyRef.current && !forceHydrate) {
        setRemoteUpdatePending(true);
        return;
      }
      // `forceHydrate` (Reload) discards the draft via `reset`; a clean editor
      // adopts the authoritative document via the guarded `hydrate`.
      dispatch({
        type: forceHydrate ? "reset" : "hydrate",
        doc: seedMenuDocument(detail.menu.settings),
      });
      if (forceHydrate) setSelectedId(null);
      setRemoteUpdatePending(false);
    },
    []
  );

  const showNonDestructiveLoadError = (loadError: unknown) => {
    // Background failure shows a retryable message WITHOUT clearing the cache
    // or the local draft.
    setError(resolveErrorMessage(loadError, "Failed to refresh menu."));
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      getMenuWithItemsCached(menuId, { force: true }),
      listPagesCached({ force: true }),
    ])
      .then(([detail, pages]) => {
        if (active && detail) applyAuthoritative(detail, pages);
      })
      .catch((loadError) => {
        if (active) showNonDestructiveLoadError(loadError);
      });
    return () => {
      active = false;
    };
  }, [menuId, applyAuthoritative]);

  const revalidateInBackground = useCallback(
    async (options?: { allowUnsaved?: boolean }) => {
      try {
        const [detail, pages] = await Promise.all([
          getMenuWithItemsCached(menuId, { force: true }),
          listPagesCached({ force: true }),
        ]);
        if (!detail) return;
        applyAuthoritative(detail, pages, options?.allowUnsaved);
      } catch (loadError) {
        showNonDestructiveLoadError(loadError);
      }
    },
    [applyAuthoritative, menuId]
  );

  useEffect(
    () =>
      subscribeCacheEvents((event) => {
        if (event.key !== cacheKeys.menuDetail(menuId) && event.key !== cacheKeys.pagesList) {
          return;
        }
        // Skip the cache event OUR OWN save/publish broadcast synchronously
        // (the server result was already applied) — never a redundant loop.
        if (mutationInFlightRef.current) return;
        void revalidateInBackground();
      }),
    [menuId, revalidateInBackground]
  );

  const selectedBlock = findMenuBlock(doc, selectedId);
  const navLabel = menuName;

  // TASK-504-04 §1: neutralize a stale level for a non-nav selection as a PURE
  // derivation (no setState-in-effect) — the raw `navLevel` persists so
  // re-selecting nav-items restores the author's last level.
  // TASK-508 §2b: for a nav-items selection, `forceOpenLevel` sim-opens the canvas
  // at the SELECTED depth for levels 1/2, and — since Level 0 has no sublist of its
  // own — previews the FIRST dropdown (depth 1) on the Level-0 tab too, so the
  // nav-global submenuDirection/submenuMode/animation effects are VISIBLE while the
  // author edits those very level-0 controls (else the reposition / accordion
  // push-down / flyout motion are all invisible). Non-nav selections force nothing.
  const navLevelActive: 0 | 1 | 2 = selectedBlock?.type === "nav-items" ? navLevel : 0;
  const forceOpenLevel: NavLevelStyleLevel | undefined =
    selectedBlock?.type === "nav-items"
      ? ((navLevelActive >= 1 ? navLevelActive : 1) as NavLevelStyleLevel)
      : undefined;

  const addMenuBlock = (type: MenuBlockType) =>
    updateDoc((current) => insertMenuBlock(current, createDefaultMenuBlock(type)));
  const removeMenuBlock = (id: string) => {
    updateDoc((current) => deleteMenuBlock(current, id));
    setSelectedId((current) => (current === id ? null : current));
  };
  const moveMenuBlock = (id: string, dir: "up" | "down") =>
    updateDoc((current) => reorderMenuBlock(current, id, dir));

  const save = async () => {
    setIsSaving(true);
    setError(null);
    mutationInFlightRef.current = true;
    try {
      const updated = await updateMenu(menuId, { document: doc });
      if (updated?.name) setMenuName(updated.name);
      // Authoritative server result applied: clear dirty; failure keeps dirty.
      dispatch({ type: "markSaved" });
      setRemoteUpdatePending(false);
    } catch (saveError) {
      setError(resolveErrorMessage(saveError, "Failed to save menu design."));
    } finally {
      mutationInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const publish = async () => {
    setIsPublishing(true);
    setError(null);
    mutationInFlightRef.current = true;
    try {
      await updateMenu(menuId, { document: doc });
      await publishMenu(menuId);
      dispatch({ type: "markSaved" });
      setRemoteUpdatePending(false);
    } catch (publishError) {
      setError(resolveErrorMessage(publishError, "Failed to publish menu design."));
    } finally {
      mutationInFlightRef.current = false;
      setIsPublishing(false);
    }
  };

  const discard = () => {
    dispatch({ type: "reset", doc: seedMenuDocument(getCachedMenuDetail(menuId)?.menu.settings) });
    setSelectedId(null);
    setRemoteUpdatePending(false);
  };

  const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
    blocked: history.dirty,
    title: "Discard unsaved menu design?",
    description:
      "You have unsaved design changes. If you leave now, your local edits are lost. Cancel to keep editing, or discard to leave without saving.",
    confirmLabel: "Discard",
    onConfirmDiscard: discard,
  });

  return (
    <EditorShell
      breadcrumbs={
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Menus</span>
          <span className="text-sm font-semibold">{menuName}</span>
        </div>
      }
      centerScroll={false}
      contentClassName="h-full"
    >
      <div className="relative flex h-full min-h-0 flex-col bg-background">
        <CanvasEditor
          header={
            <PageHeader
              className="mb-0 shrink-0 px-6 pb-3 pt-4"
              title={menuName}
              breadcrumbs={[
                { label: "Content" },
                { label: "Menus", href: "/menus" },
                { label: menuName },
                { label: "Design" },
              ]}
              actions={
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/menus/${menuId}`)}
                  >
                    Structure
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!history.dirty}
                    onClick={discard}
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => void save()}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPublishing}
                    onClick={() => void publish()}
                  >
                    <Rocket className="h-4 w-4" />
                    {isPublishing ? "Publishing..." : "Publish"}
                  </Button>
                </>
              }
            />
          }
          title="Menu builder"
          badge={
            history.dirty ? (
              <Badge variant="warning" className="text-[10px] font-semibold uppercase">
                Unsaved
              </Badge>
            ) : null
          }
          toolbar={
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Undo"
                disabled={history.past.length === 0}
                onClick={() => dispatch({ type: "undo" })}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Redo"
                disabled={history.future.length === 0}
                onClick={() => dispatch({ type: "redo" })}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <div className="mx-1 h-5 w-px bg-border" />
              <DeviceSwitcher value={device} onChange={setDevice} />
              <Button
                type="button"
                variant={panelOpen ? "soft" : "ghost"}
                size="sm"
                onClick={() => setPanelOpen((open) => !open)}
                aria-label={panelOpen ? "Hide panel" : "Show panel"}
                aria-pressed={panelOpen}
              >
                <PanelRight className="h-4 w-4" />
                {panelOpen ? "Hide panel" : "Show panel"}
              </Button>
            </>
          }
          deviceContext={{
            value: device,
            // Scope cue: Mobile edits write sparse overrides; Desktop/Tablet
            // edit the base (tablet deferred — base-mapped, TASK-501).
            label: isMenuOverrideDevice(device)
              ? `${DEVICE_LABELS[device]} (overrides)`
              : `${DEVICE_LABELS[device]} (base)`,
          }}
          panelOpen={panelOpen}
          onPanelOpenChange={setPanelOpen}
          panelPosition="right"
          panelAriaLabel="Menu design tools"
          panelDataProps={{ "data-menu-design-panel": "true" }}
          canvas={
            <div
              data-menu-design-canvas-scroller="true"
              className={cn(
                "min-h-0 flex-1 overflow-auto overscroll-contain bg-dotted p-6 lg:p-8",
                // TASK-542-03-L03: wide-screen clearance is conditional so a
                // narrow canvas keeps usable width; the panel stays in viewport.
                panelOpen && "lg:pr-[300px]"
              )}
              onClick={() => setSelectedId(null)}
            >
              {remoteUpdatePending ? (
                <Alert className="mb-4">
                  <AlertTitle>Menu design changed</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>New menu design is available.</span>
                    <span className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRemoteUpdatePending(false)}
                      >
                        Keep editing
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void revalidateInBackground({ allowUnsaved: true })}
                      >
                        Reload
                      </Button>
                    </span>
                  </AlertDescription>
                </Alert>
              ) : null}
              {error ? (
                <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <div
                className="mx-auto min-h-full w-full max-w-4xl rounded-2xl bg-card p-4 shadow-soft"
                onClick={(event) => event.stopPropagation()}
              >
                <MenuDocumentCanvas
                  doc={doc}
                  device={device}
                  items={items}
                  navLabel={navLabel}
                  siteName={siteName}
                  tokenVariables={canvasSiteTokenVariables}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  forceOpenLevel={forceOpenLevel}
                />
              </div>
            </div>
          }
          panel={
            <EditorControlToneContext.Provider value="light">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {selectedBlock ? (
                  <MenuBlockPanel
                    block={selectedBlock}
                    doc={doc}
                    device={device}
                    palette={sitePalette}
                    siteName={siteName}
                    updateDoc={updateDoc}
                    onRemove={() => removeMenuBlock(selectedBlock.id)}
                    onMove={(dir) => moveMenuBlock(selectedBlock.id, dir)}
                    navLevel={navLevel}
                    onNavLevelChange={setNavLevel}
                  />
                ) : (
                  <MenuBarPanel
                    doc={doc}
                    device={device}
                    palette={sitePalette}
                    updateDoc={updateDoc}
                    onSelectBlock={setSelectedId}
                    onAddBlock={addMenuBlock}
                    onRemoveBlock={removeMenuBlock}
                    onMoveBlock={moveMenuBlock}
                  />
                )}
              </div>
            </EditorControlToneContext.Provider>
          }
          reopenAffordance={
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop transition-colors hover:text-primary"
              aria-label="Show panel"
            >
              <SlidersHorizontal className="size-3.5" /> Show panel
            </button>
          }
        />
      </div>
      {dirtyNavigationDialog}
    </EditorShell>
  );
}

export { seedMenuDocument };
