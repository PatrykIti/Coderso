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
  type ContentTypeCollectionWorkspaceSummary,
} from "@/services/contentTypesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { CollectionOverview } from "./CollectionOverview";
import { CollectionReadinessChecklist } from "./CollectionReadinessChecklist";
import { resolveContentTypeIdFromPath } from "./pathResolvers";

type WorkspaceState = {
  contentTypeId: string | null;
  summary: ContentTypeCollectionWorkspaceSummary | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  remoteUpdatePending: boolean;
};

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

export function CollectionWorkspacePage() {
  const { path } = useAdminRouter();
  const contentTypeId = useMemo(() => resolveContentTypeIdFromPath(path), [path]);
  const requestSeq = useRef(0);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(() =>
    emptyWorkspaceState(contentTypeId)
  );

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

  const headerTitle = summary?.contentType.name ?? "Collection workspace";
  const headerDescription = summary
    ? `/${summary.contentType.slug}`
    : contentTypeId
      ? `Collection ${contentTypeId}`
      : "Collection";

  return (
    <AdminShell
      activeHref="/admin/advanced/engine"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Advanced</span>
          <span>/</span>
          <span>Engine</span>
          <span>/</span>
          <span className="text-foreground">Collection</span>
        </div>
      }
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
            <CollectionOverview summary={summary} />
            <CollectionReadinessChecklist summary={summary} />
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}
