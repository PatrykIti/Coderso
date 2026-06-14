import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedMenuDetail,
  getMenuWithItemsCached,
  publishMenu,
  updateMenu,
  type MenuSummary,
} from "@/services/menusClient";
import { listPagesCached, type PageDetail } from "@/services/pagesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";

import {
  buildMenuDesignDocument,
  collectMenuDesignExtras,
  menuDesignEditorPalette,
  resolveMenuDesignDraft,
} from "../../../services/menus/menuDesignDocument";
import { mapMenuNodesToNavigationItems } from "../../../services/navigation/navigationMenuMapping";
import type { PageBreakpoint, PageDocumentV2 } from "../../../services/pages/pageDocumentV2";
import { SiteHeaderNav, type SiteShellNavigation } from "../../../site/siteShell";
import { buildSiteShellPreviewCss } from "../../../site/siteShellCss";
import { PageEditor } from "../pages/PageEditor";
import type {
  PageEditorHost,
  PageEditorHostSettingsRenderProps,
} from "../pages/editor/pageEditorHostContract";
import { MenuAppearancePanel } from "./MenuAppearancePanel";
import { resolveMenuId } from "./routeParams";

/**
 * Menu DESIGN editor (TASK-458-03): the shared Page Editor v2 surface bound
 * to a menu through the editor host seam. The canvas chrome renders the
 * LIVE public `SiteHeaderNav` for this menu's items styled by the current
 * appearance draft, the floating panel exposes the `MenuAppearance` fields
 * through the shared control primitives, and the restricted palette allows
 * only the nav extras blocks (CTA button, logo image) in the dedicated
 * extras section. Save/publish ride the existing menu routes; menus issue
 * no preview tokens — the live canvas IS the preview, so the host omits
 * `preview` and the toolbar affordance stays hidden. Item structure is
 * read-only here: the menu structure editor owns it.
 */

const toMenuDesignEditorDetail = (menu: MenuSummary): PageDetail => ({
  id: menu.id,
  title: menu.name,
  slug: menu.location ?? "",
  status: menu.status,
  currentData: buildMenuDesignDocument(menu.settings) as unknown as Record<string, unknown>,
  updatedAt: menu.createdAt,
  publishedAt: menu.publishedAt,
});

/**
 * `/menus/:id/design` shares the `/menus/:id` id segment, so the structure
 * editor's param resolver applies unchanged.
 */
const resolveDesignMenuId = (pathname: string) => resolveMenuId(pathname);

type CanvasNavigationState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; navigation: SiteShellNavigation };

/**
 * Live shell preview above the extras section. Self-contained: loads the
 * menu items (cache-first; the host load already primed the cache) plus the
 * page slugs backing `pageId` links, and restyles live from the document
 * draft via `buildSiteShellPreviewCss` (the device switcher flattens the
 * matching breakpoint branch, so the CSS-only mobile disclosure is
 * exercisable inside the canvas).
 */
function MenuDesignCanvasChrome({
  menuId,
  document,
  device,
}: {
  menuId: string | null;
  document: PageDocumentV2;
  device: PageBreakpoint;
}) {
  const [navigationState, setNavigationState] = useState<CanvasNavigationState>({
    kind: "loading",
  });

  useEffect(() => {
    if (!menuId) return undefined;
    let cancelled = false;
    Promise.all([getMenuWithItemsCached(menuId), listPagesCached()])
      .then(([detail, pages]) => {
        if (cancelled) return;
        if (!detail) {
          setNavigationState({ kind: "error" });
          return;
        }
        const pagePathById = new Map(pages.map((page) => [page.id, page.slug] as const));
        setNavigationState({
          kind: "ready",
          navigation: {
            label: detail.menu.name,
            items: mapMenuNodesToNavigationItems(detail.items, pagePathById, {
              includeDefaultTarget: true,
            }),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setNavigationState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [menuId]);

  const appearance = document.settings.menuAppearance ?? null;
  const extras = collectMenuDesignExtras(document);
  const shellCss = useMemo(
    () => buildSiteShellPreviewCss(appearance, device),
    [appearance, device]
  );

  return (
    <div
      data-menu-design-canvas-chrome="true"
      // Keep the extras-section selection (and its floating panel) alive
      // while interacting with the preview, e.g. toggling the disclosure.
      onClick={(event) => event.stopPropagation()}
      // The preview renders real shell anchors; never navigate the admin.
      onClickCapture={(event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("a")) event.preventDefault();
      }}
    >
      <style>{shellCss}</style>
      {navigationState.kind === "ready" ? (
        <SiteHeaderNav navigation={navigationState.navigation} extras={extras} />
      ) : (
        <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
          {navigationState.kind === "loading"
            ? "Loading menu preview..."
            : "Failed to load the menu preview."}
        </div>
      )}
    </div>
  );
}

const resolveSheetError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to save menu settings.";
};

/**
 * Minimal menu-chrome settings form: the design view owns appearance only,
 * so the sheet edits the menu name and points at the structure editor for
 * items, location, and status. Remounted per open (key on the sheet) so the
 * draft name initializes lazily without effect-driven setState.
 */
function MenuDesignSettingsForm({
  detail,
  onOpenChange,
  onSaved,
}: {
  detail: PageDetail;
  onOpenChange: (open: boolean) => void;
  onSaved: (detail: PageDetail) => void;
}) {
  const { navigate } = useAdminRouter();
  const [name, setName] = useState(detail.title);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateMenu(detail.id, { name: name.trim() });
      if (updated) onSaved(toMenuDesignEditorDetail(updated));
      onOpenChange(false);
    } catch (saveError) {
      setError(resolveSheetError(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
        Name
        <input
          className="rounded border px-2 py-2 text-sm font-normal normal-case text-foreground"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={isSaving || !name.trim()} onClick={handleSave}>
          {isSaving ? "Saving..." : "Save settings"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(`/menus/${detail.id}`)}>
          Open structure editor
        </Button>
      </div>
    </div>
  );
}

function MenuDesignSettingsSheet({
  open,
  onOpenChange,
  detail,
  onSaved,
}: PageEditorHostSettingsRenderProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="space-y-6 p-6">
        <div>
          <SheetTitle>Menu settings</SheetTitle>
          <SheetDescription>
            The design view styles this menu. Items, location, and publishing metadata live in the
            structure editor.
          </SheetDescription>
        </div>
        {detail ? (
          <MenuDesignSettingsForm
            key={`${detail.id}:${open ? "open" : "closed"}`}
            detail={detail}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function MenuDesignEditorPage({ menuId }: { menuId?: string }) {
  const [resolvedMenuId] = useState<string | null>(() => {
    if (menuId) return menuId;
    if (typeof window === "undefined") return null;
    return resolveDesignMenuId(window.location.pathname);
  });

  const host = useMemo<PageEditorHost>(
    () => ({
      mode: "menu",
      resourceLabel: "Menus",
      settingsLabel: "Menu settings",
      previewTitle: "Menu preview",
      loadFailedMessage: "Failed to load menu.",
      assistantSurface: false,
      // Restricted palette: nav extras blocks only, no insertable sections.
      palette: menuDesignEditorPalette,
      detailCacheKey: (id) => cacheKeys.menuDetail(id),
      getCachedDetail: (id) => {
        const cached = getCachedMenuDetail(id);
        return cached ? toMenuDesignEditorDetail(cached.menu) : null;
      },
      loadDetail: async (id) => {
        const detail = await getMenuWithItemsCached(id);
        return detail ? toMenuDesignEditorDetail(detail.menu) : null;
      },
      saveDocument: async (id, document) => {
        const draft = resolveMenuDesignDraft(document);
        const updated = await updateMenu(id, {
          appearance: draft.appearance,
          extras: draft.extras,
        });
        if (!updated) throw new Error("Failed to save menu design.");
        return toMenuDesignEditorDetail(updated);
      },
      // Publish/draft coherence is owned by the editor: it persists the
      // draft through `saveDocument` first, then this flips the status.
      publish: async (id) => {
        const updated = await publishMenu(id);
        return updated ? { ok: true, page: toMenuDesignEditorDetail(updated) } : { ok: true };
      },
      appearancePanel: {
        label: "Menu appearance",
        description: "Colors, layout, typography, and behavior of the site navigation.",
        render: (props) => <MenuAppearancePanel {...props} />,
      },
      canvasChrome: ({ document, device }) => (
        <MenuDesignCanvasChrome menuId={resolvedMenuId} document={document} device={device} />
      ),
      renderSettings: (props) => <MenuDesignSettingsSheet {...props} />,
    }),
    [resolvedMenuId]
  );

  return (
    <PageEditor
      key={resolvedMenuId ?? "missing"}
      pageId={resolvedMenuId ?? undefined}
      host={host}
    />
  );
}
