import { listContentTypesCached } from "@/services/contentTypesClient";
import { getEntryCached, listEntriesCached } from "@/services/entriesClient";
import { resolveCustomScreenWorkspacePrefetchTarget } from "@/ui/custom-screens/routeParams";

type PrefetchWarmupOptions = {
  force?: boolean;
};

const loadCustomScreensClient = () => import("@/services/customScreensClient");

export async function prefetchCustomScreenWorkspaceData(
  path: string,
  prefetchWarmupOptions: PrefetchWarmupOptions
) {
  const target = resolveCustomScreenWorkspacePrefetchTarget(path);
  if (!target) return false;

  const { getCustomScreenRawCached, listCustomScreensCached } = await loadCustomScreensClient();
  await listCustomScreensCached(prefetchWarmupOptions);
  const screen = await getCustomScreenRawCached(target.screenId).catch(() => null);
  if (!screen) return true;

  const contentTypes = await listContentTypesCached(prefetchWarmupOptions);
  const contentType = contentTypes.find((item) => item.id === screen.contentTypeId);
  if (!contentType) return true;

  await listEntriesCached(contentType.slug, prefetchWarmupOptions);
  if (target.entryId && target.entryId !== "new") {
    await getEntryCached(contentType.slug, target.entryId).catch(() => null);
  }

  return true;
}

export async function prefetchCustomScreenListData(prefetchWarmupOptions: PrefetchWarmupOptions) {
  const { listCustomScreensCached } = await loadCustomScreensClient();
  return Promise.all([
    listCustomScreensCached(prefetchWarmupOptions),
    listContentTypesCached(prefetchWarmupOptions),
  ]);
}
