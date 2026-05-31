import { RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedContentTypeCollectionWorkspace,
  getContentTypeCollectionWorkspaceCached,
  type CollectionWorkspaceCandidate,
  type ContentTypeCollectionWorkspaceSummary,
} from "@/services/contentTypesClient";
import {
  createDetailPage,
  deleteDetailPage,
  type DetailPageRecord,
} from "@/services/detailPagesClient";
import {
  getSiteSettings,
  updateSiteSettings,
  type SiteContentRoute,
} from "@/services/siteSettingsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { buildDefaultRoute } from "@/ui/site/siteSettingsValidation";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { createListActionToastAdapter } from "@/ui/shared/listActionToasts";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { CollectionOverview } from "./CollectionOverview";
import { CollectionReadinessChecklist } from "./CollectionReadinessChecklist";
import {
  buildDefaultDetailTemplateDocument,
  buildDetailTemplateEditorHref,
} from "./detailTemplateEditorModel";
import { resolveContentTypeIdFromPath } from "./pathResolvers";

type WorkspaceState = {
  contentTypeId: string | null;
  summary: ContentTypeCollectionWorkspaceSummary | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  remoteUpdatePending: boolean;
};

type DetailTemplateDeleteTarget = {
  id: string;
  label: string;
};

const detailTemplateToasts = createListActionToastAdapter<"create" | "delete">({
  labels: {
    singular: "detail template",
    plural: "detail templates",
  },
  actions: {
    create: {
      pastTense: "created",
      failureVerb: "create",
      errorFallback: "Failed to create detail template.",
    },
    delete: {
      pastTense: "deleted",
      failureVerb: "delete",
      errorFallback: "Failed to delete detail template.",
    },
  },
});

const emptyWorkspaceState = (contentTypeId: string | null): WorkspaceState => ({
  contentTypeId,
  summary: contentTypeId ? getCachedContentTypeCollectionWorkspace(contentTypeId) : null,
  error: null,
  isLoading: contentTypeId
    ? getCachedContentTypeCollectionWorkspace(contentTypeId) === null
    : false,
  isRefreshing: false,
  remoteUpdatePending: false,
});

const getErrorMessage = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  return "Failed to load collection workspace.";
};

const upsertDetailTemplateRoute = (
  routes: SiteContentRoute[],
  contentTypeSlug: string,
  detailPageId: string
) => {
  const routeIndex = routes.findIndex((route) => route.type === contentTypeSlug);
  const existingRoute = routeIndex >= 0 ? routes[routeIndex] : null;
  const nextRoute: SiteContentRoute = existingRoute
    ? { ...existingRoute, enabled: true, detailPageId }
    : { ...buildDefaultRoute(contentTypeSlug), detailPageId };

  if (routeIndex < 0) return [...routes, nextRoute];
  return routes.map((route, index) => (index === routeIndex ? nextRoute : route));
};

const clearDetailTemplateRoute = (
  routes: SiteContentRoute[],
  contentTypeSlug: string,
  detailPageId: string
) => {
  let changed = false;
  const nextRoutes = routes.map((route) => {
    if (route.type !== contentTypeSlug || route.detailPageId !== detailPageId) return route;
    changed = true;
    return { ...route, detailPageId: null };
  });
  return { changed, nextRoutes };
};

export function CollectionWorkspacePage() {
  const { path, navigate } = useAdminRouter();
  const contentTypeId = useMemo(() => resolveContentTypeIdFromPath(path), [path]);
  const requestSeq = useRef(0);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(() =>
    emptyWorkspaceState(contentTypeId)
  );
  const [isCreatingDetailTemplate, setIsCreatingDetailTemplate] = useState(false);
  const [pendingDetailTemplateDelete, setPendingDetailTemplateDelete] =
    useState<DetailTemplateDeleteTarget | null>(null);
  const [deletingDetailTemplateId, setDeletingDetailTemplateId] = useState<string | null>(null);

  const visibleState =
    workspaceState.contentTypeId === contentTypeId
      ? workspaceState
      : emptyWorkspaceState(contentTypeId);
  const summary = visibleState.summary;

  const refreshWorkspace = useCallback(
    async (options?: { force?: boolean; showRefreshing?: boolean }) => {
      if (!contentTypeId) {
        setWorkspaceState({
          contentTypeId: null,
          summary: null,
          error: "Missing collection id.",
          isLoading: false,
          isRefreshing: false,
          remoteUpdatePending: false,
        });
        return;
      }

      const seq = requestSeq.current + 1;
      requestSeq.current = seq;
      const cached = getCachedContentTypeCollectionWorkspace(contentTypeId);
      setWorkspaceState((prev) => {
        const currentSummary =
          prev.contentTypeId === contentTypeId ? (prev.summary ?? cached) : cached;
        return {
          contentTypeId,
          summary: currentSummary,
          error: null,
          isLoading: !currentSummary,
          isRefreshing: Boolean(currentSummary && options?.showRefreshing),
          remoteUpdatePending:
            prev.contentTypeId === contentTypeId ? prev.remoteUpdatePending : false,
        };
      });

      try {
        const result = await getContentTypeCollectionWorkspaceCached(contentTypeId, {
          force: options?.force,
        });
        if (requestSeq.current !== seq) return;
        setWorkspaceState({
          contentTypeId,
          summary: result,
          error: null,
          isLoading: false,
          isRefreshing: false,
          remoteUpdatePending: false,
        });
      } catch (error) {
        if (requestSeq.current !== seq) return;
        setWorkspaceState((prev) => ({
          contentTypeId,
          summary: prev.contentTypeId === contentTypeId ? prev.summary : cached,
          error: getErrorMessage(error),
          isLoading: false,
          isRefreshing: false,
          remoteUpdatePending: false,
        }));
      }
    },
    [contentTypeId]
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      void refreshWorkspace({
        force: true,
        showRefreshing: Boolean(
          contentTypeId ? getCachedContentTypeCollectionWorkspace(contentTypeId) : null
        ),
      });
    });
    return () => {
      active = false;
      requestSeq.current += 1;
    };
  }, [contentTypeId, refreshWorkspace]);

  useEffect(() => {
    if (!contentTypeId) return undefined;
    const workspaceKey = cacheKeys.contentTypeCollectionWorkspace(contentTypeId);
    const detailKey = cacheKeys.contentTypeDetail(contentTypeId);
    return subscribeCacheEvents((event) => {
      if (
        event.key !== workspaceKey &&
        event.key !== detailKey &&
        event.key !== cacheKeys.contentTypesList
      ) {
        return;
      }
      setWorkspaceState((prev) => {
        if (prev.contentTypeId !== contentTypeId) return prev;
        return {
          ...prev,
          remoteUpdatePending: true,
        };
      });
    });
  }, [contentTypeId]);

  const handleCreateDetailTemplate = useCallback(async () => {
    if (!summary) return;
    setIsCreatingDetailTemplate(true);
    setWorkspaceState((prev) => ({ ...prev, error: null }));
    let created: DetailPageRecord | null = null;

    try {
      const document = buildDefaultDetailTemplateDocument({
        contentTypeId: summary.contentType.id,
        contentTypeSlug: summary.contentType.slug,
        contentTypeName: summary.contentType.name,
      });
      created = await createDetailPage(document);
      const settings = await getSiteSettings();
      const nextRoutes = upsertDetailTemplateRoute(
        settings.contentRoutes,
        summary.contentType.slug,
        created.id
      );
      await updateSiteSettings({ contentRoutes: nextRoutes });
      detailTemplateToasts.success("create", { targetLabel: created.name });
      await refreshWorkspace({ force: true, showRefreshing: true });
      navigate(buildDetailTemplateEditorHref(summary.contentType.id, created.id));
    } catch (error) {
      if (created) {
        try {
          await deleteDetailPage(created.id, { contentTypeId: created.contentTypeId });
        } catch {
          // The visible failure is the create/link operation; cleanup is best effort.
        }
      }
      const message = detailTemplateToasts.error("create", error);
      setWorkspaceState((prev) => ({
        ...prev,
        error: message,
      }));
    } finally {
      setIsCreatingDetailTemplate(false);
    }
  }, [navigate, refreshWorkspace, summary]);

  const handleRequestDetailTemplateDelete = useCallback(
    (candidate: CollectionWorkspaceCandidate) => {
      setPendingDetailTemplateDelete({
        id: candidate.id,
        label: candidate.label,
      });
    },
    []
  );

  const handleConfirmDetailTemplateDelete = useCallback(async () => {
    if (!summary || !pendingDetailTemplateDelete) return;
    setDeletingDetailTemplateId(pendingDetailTemplateDelete.id);
    setWorkspaceState((prev) => ({ ...prev, error: null }));
    let previousRoutes: SiteContentRoute[] | null = null;

    try {
      const settings = await getSiteSettings();
      const cleared = clearDetailTemplateRoute(
        settings.contentRoutes,
        summary.contentType.slug,
        pendingDetailTemplateDelete.id
      );
      if (cleared.changed) {
        previousRoutes = settings.contentRoutes;
        await updateSiteSettings({ contentRoutes: cleared.nextRoutes });
      }
      await deleteDetailPage(pendingDetailTemplateDelete.id, {
        contentTypeId: summary.contentType.id,
      });
      detailTemplateToasts.success("delete", {
        targetLabel: pendingDetailTemplateDelete.label,
      });
      setPendingDetailTemplateDelete(null);
      await refreshWorkspace({ force: true, showRefreshing: true });
    } catch (error) {
      if (previousRoutes) {
        try {
          await updateSiteSettings({ contentRoutes: previousRoutes });
        } catch {
          // Keep the original delete failure visible; restoring the link is best effort.
        }
      }
      const message = detailTemplateToasts.error("delete", error);
      setWorkspaceState((prev) => ({
        ...prev,
        error: message,
      }));
    } finally {
      setDeletingDetailTemplateId(null);
    }
  }, [pendingDetailTemplateDelete, refreshWorkspace, summary]);

  const headerTitle = summary?.contentType.name ?? "Collection workspace";
  const headerDescription = summary
    ? `/${summary.contentType.slug}`
    : contentTypeId
      ? `Collection ${contentTypeId}`
      : "Collection";

  return (
    <AdminShell
      activeHref="/admin/advanced/engine"
      breadcrumbs={["Advanced", "Engine", "Collection"]}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          title={headerTitle}
          description={headerDescription}
          actions={
            <div className="flex items-center gap-2">
              {summary ? (
                <Badge variant={summary.unresolved.length === 0 ? "default" : "outline"}>
                  {summary.unresolved.length === 0 ? "Ready" : "Open"}
                </Badge>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void refreshWorkspace({ force: true, showRefreshing: true })}
                disabled={!contentTypeId || visibleState.isLoading || visibleState.isRefreshing}
              >
                <RefreshCcw className="h-4 w-4" />
                {visibleState.isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          }
        />

        {visibleState.remoteUpdatePending ? (
          <Alert>
            <AlertTitle>Workspace changed</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>New collection links are available.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refreshWorkspace({ force: true, showRefreshing: true })}
              >
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {visibleState.error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load collection workspace</AlertTitle>
            <AlertDescription>{visibleState.error}</AlertDescription>
          </Alert>
        ) : null}

        {visibleState.isLoading ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            Loading collection workspace...
          </div>
        ) : null}

        {summary ? (
          <>
            <CollectionOverview
              summary={summary}
              isCreatingDetailTemplate={isCreatingDetailTemplate}
              deletingDetailTemplateId={deletingDetailTemplateId}
              onCreateDetailTemplate={() => void handleCreateDetailTemplate()}
              onDeleteDetailTemplate={handleRequestDetailTemplateDelete}
            />
            <CollectionReadinessChecklist summary={summary} />
          </>
        ) : null}
      </div>

      <ConfirmActionDialog
        open={Boolean(pendingDetailTemplateDelete)}
        title="Delete detail template?"
        description={
          pendingDetailTemplateDelete
            ? `This deletes "${pendingDetailTemplateDelete.label}" and clears it from the collection route.`
            : "This deletes the detail template and clears it from the collection route."
        }
        confirmLabel="Delete detail template"
        confirmingLabel="Deleting..."
        isConfirming={Boolean(deletingDetailTemplateId)}
        onOpenChange={(open) => {
          if (!open && !deletingDetailTemplateId) setPendingDetailTemplateDelete(null);
        }}
        onConfirm={() => void handleConfirmDetailTemplateDelete()}
      />
    </AdminShell>
  );
}
