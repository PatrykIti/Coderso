import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import { getCachedContentTypes, listContentTypesCached } from "@/services/contentTypesClient";
import {
  getCachedCustomScreen,
  getCustomScreenCached,
  type CustomScreenRecord,
} from "@/services/customScreensClient";
import {
  deleteEntry,
  getCachedEntries,
  listEntriesCached,
  type EntrySummary,
} from "@/services/entriesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";

import { EntryCreateDrawer } from "../entries/EntryCreateDrawer";
import { buildCustomScreenAssistantSurface } from "./assistantSurface";
import { CustomScreenEntriesTable } from "./CustomScreenEntriesTable";
import { buildCustomScreenWorkspacePath, resolveCustomScreenId } from "./routeParams";

const buildClassicEditorHref = (typeSlug: string, entryId: string) =>
  `/advanced/entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(entryId)}`;

export function CustomScreenEntriesPage() {
  const { path, navigate } = useAdminRouter();
  const screenId = useMemo(() => resolveCustomScreenId(path), [path]);
  const initialScreen = useMemo(
    () => (screenId ? (getCachedCustomScreen(screenId) ?? null) : null),
    [screenId]
  );
  const initialContentType = useMemo(
    () =>
      initialScreen
        ? (getCachedContentTypes()?.find((item) => item.id === initialScreen.contentTypeId) ?? null)
        : null,
    [initialScreen]
  );
  const initialEntries = useMemo(
    () => (initialContentType ? (getCachedEntries(initialContentType.slug) ?? []) : []),
    [initialContentType]
  );
  const hasInitialCache = Boolean(initialScreen && initialContentType);
  const [screen, setScreen] = useState<CustomScreenRecord | null>(initialScreen);
  const [entries, setEntries] = useState<EntrySummary[]>(initialEntries);
  const [contentTypeSlug, setContentTypeSlug] = useState<string | null>(
    initialContentType?.slug ?? null
  );
  const [contentTypeName, setContentTypeName] = useState<string | null>(
    initialContentType?.name ?? null
  );
  const [isLoading, setIsLoading] = useState(() => !(initialScreen && initialContentType));
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const screenCapabilities = useMemo(
    () =>
      screen?.capabilities ??
      resolveCustomScreenCapabilities({
        blocks: screen?.blocks,
        bindings: screen?.bindings,
      }),
    [screen]
  );

  useEffect(() => {
    if (!screen || !screenId) {
      clearActiveAssistantSurfaceContext();
      return undefined;
    }

    setActiveAssistantSurfaceContext(
      buildCustomScreenAssistantSurface({
        screen,
        capabilities: screenCapabilities,
      })
    );

    return () => {
      clearActiveAssistantSurfaceContext();
    };
  }, [screen, screenCapabilities, screenId]);

  const refresh = useCallback(
    async (force = false, options?: { background?: boolean }) => {
      if (!screenId) return;
      if (!options?.background) {
        setIsLoading(true);
      }
      try {
        const nextScreen = await getCustomScreenCached(screenId, { force });
        if (!nextScreen) {
          setError("Custom screen not found.");
          setEntries([]);
          return;
        }

        const contentTypes = await listContentTypesCached({ force });
        const contentType =
          contentTypes.find((item) => item.id === nextScreen.contentTypeId) ?? null;
        if (!contentType) {
          setScreen(nextScreen);
          setContentTypeSlug(null);
          setContentTypeName(null);
          setEntries([]);
          setError("Content type not found.");
          return;
        }

        const nextEntries = await listEntriesCached(contentType.slug, { force });
        setScreen(nextScreen);
        setContentTypeSlug(contentType.slug);
        setContentTypeName(contentType.name);
        setEntries(nextEntries);
        setError(null);
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load custom screen records.");
        }
      } finally {
        if (!options?.background) {
          setIsLoading(false);
        }
      }
    },
    [screenId]
  );

  useEffect(() => {
    if (!screenId) return;
    let active = true;
    getCustomScreenCached(screenId, { force: !hasInitialCache })
      .then(async (nextScreen) => {
        if (!active) return;
        if (!nextScreen) {
          setError("Custom screen not found.");
          setEntries([]);
          return;
        }
        const contentTypes = await listContentTypesCached({ force: !hasInitialCache });
        if (!active) return;
        const contentType =
          contentTypes.find((item) => item.id === nextScreen.contentTypeId) ?? null;
        if (!contentType) {
          setScreen(nextScreen);
          setContentTypeSlug(null);
          setContentTypeName(null);
          setEntries([]);
          setError("Content type not found.");
          return;
        }
        const nextEntries = await listEntriesCached(contentType.slug, { force: !hasInitialCache });
        if (!active) return;
        setScreen(nextScreen);
        setContentTypeSlug(contentType.slug);
        setContentTypeName(contentType.name);
        setEntries(nextEntries);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load custom screen records.");
        }
      })
      .finally(() => {
        if (active && !hasInitialCache) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasInitialCache, screenId]);

  useEffect(() => {
    if (!screenId) return undefined;
    return subscribeCacheEvents((event) => {
      if (
        event.key === cacheKeys.customScreensList ||
        event.key === cacheKeys.customScreenDetail(screenId) ||
        (contentTypeSlug && event.key === cacheKeys.entriesList(contentTypeSlug))
      ) {
        refresh(true, { background: true }).catch(() => undefined);
      }
    });
  }, [contentTypeSlug, refresh, screenId]);

  const handleDelete = async (entryId: string) => {
    if (!contentTypeSlug) return;
    try {
      await deleteEntry(contentTypeSlug, entryId);
      await refresh(true);
      setActionError(null);
    } catch (err) {
      if (isApiClientError(err)) {
        setActionError(err.message);
      } else {
        setActionError("Failed to delete record.");
      }
    }
  };

  const handleCreated = (entry: { id: string }, _: string, openAfterCreate: boolean) => {
    if (!screenId) return;
    if (openAfterCreate) {
      navigate(
        `/advanced/custom-screens/${encodeURIComponent(screenId)}/entries/${encodeURIComponent(entry.id)}`
      );
      return;
    }
    refresh(true).catch(() => undefined);
  };

  const handleCreate = () => {
    if (!screenId || !screen) return;
    if (screen.definition?.listView.createMode === "editor-view") {
      navigate(buildCustomScreenWorkspacePath({ screenId, entryId: "new" }));
      return;
    }
    setCreateOpen(true);
  };

  const baseHref = screenId
    ? `/advanced/custom-screens/${encodeURIComponent(screenId)}`
    : "/advanced/custom-screens";

  return (
    <AdminShell
      activeHref="/admin/advanced/custom-screens"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span>Screens</span>
          {screen?.name ? (
            <>
              <span>/</span>
              <span>{screen.name}</span>
            </>
          ) : null}
          <span>/</span>
          <span className="text-foreground">Records</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title={screen?.name ? `${screen.name} Records` : "Custom Screen Records"}
          description={
            contentTypeName
              ? screenCapabilities.mode === "collection-only"
                ? `Manage ${contentTypeName} entries through a dedicated records shortcut.`
                : screenCapabilities.mode === "dashboard"
                  ? `Manage ${contentTypeName} entries with a read-only screen preview and classic editing fallback.`
                  : `Manage ${contentTypeName} entries through the dedicated screen workflow.`
              : "Load the bound content type to start working with records."
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => navigate(baseHref)}>
                Open builder
              </Button>
              <Button className="gap-2" disabled={!contentTypeSlug} onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                New record
              </Button>
            </div>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load records</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>Record action failed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}
        {screenCapabilities.mode === "collection-only" ? (
          <Alert>
            <AlertTitle>Collection-only screen</AlertTitle>
            <AlertDescription>
              This shortcut narrows the records list for the selected content type. Add dedicated
              screen widgets and field bindings in the builder if you want a richer Editor View; the
              classic editor remains available from row actions.
            </AlertDescription>
          </Alert>
        ) : screenCapabilities.mode === "dashboard" ? (
          <Alert>
            <AlertTitle>Read-only record screen</AlertTitle>
            <AlertDescription>
              This screen can preview mapped data for each record, but edits still happen in the
              classic editor until writable bindings are added.
            </AlertDescription>
          </Alert>
        ) : null}

        <CustomScreenEntriesTable
          items={entries}
          listView={
            screen?.definition?.listView ?? {
              columns: [],
              filters: [],
              defaultSort: { field: "updatedAt", direction: "desc" },
              rowClick: "classic-editor",
              createMode: "drawer",
              bulkActions: { delete: true, publish: true, unpublish: true },
            }
          }
          buildRowHref={(entry) => {
            if (!screenId || !contentTypeSlug) return "/advanced/custom-screens";
            return screen?.definition?.listView.rowClick === "classic-editor"
              ? buildClassicEditorHref(contentTypeSlug, entry.id)
              : buildCustomScreenWorkspacePath({ screenId, entryId: entry.id });
          }}
          buildClassicHref={(entry) =>
            contentTypeSlug
              ? buildClassicEditorHref(contentTypeSlug, entry.id)
              : "/advanced/entries"
          }
          onDelete={handleDelete}
          emptyMessage={isLoading ? "Loading records..." : undefined}
        />
      </div>

      <EntryCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        types={
          contentTypeSlug && contentTypeName && screen?.contentTypeId
            ? [
                {
                  id: screen.contentTypeId,
                  slug: contentTypeSlug,
                  name: contentTypeName,
                },
              ]
            : []
        }
        defaultTypeSlug={contentTypeSlug}
        onCreated={handleCreated}
      />
    </AdminShell>
  );
}
