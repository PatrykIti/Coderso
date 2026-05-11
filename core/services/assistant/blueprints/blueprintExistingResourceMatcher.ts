import type { AssistantPlannedAction } from "../actionPlanTypes";
import type { AssistantResourceCatalogSnapshot } from "../adminContextTypes";
import {
  normalizeBlueprintConflict,
  type BlueprintConflict,
  type BlueprintMediaResourceMetadata,
  type BlueprintResourceContribution,
} from "./blueprintCapabilityTypes";

export type BlueprintExistingResourceMatch = {
  actionId: string | null;
  actionType: AssistantPlannedAction["type"] | null;
  resourceKey: string;
  existingId: string | null;
  status: "matched" | "unresolved";
  reason: string | null;
  candidateIds: string[];
};

export type BlueprintExistingResourceMatchInput = {
  actions: AssistantPlannedAction[];
  catalog: AssistantResourceCatalogSnapshot | null | undefined;
  resources?: BlueprintResourceContribution[];
};

export type BlueprintExistingResourceMatchResult = {
  actions: AssistantPlannedAction[];
  conflicts: BlueprintConflict[];
  matches: BlueprintExistingResourceMatch[];
};

const cloneActions = (actions: AssistantPlannedAction[]) =>
  structuredClone(actions) as AssistantPlannedAction[];

const readText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const unique = <T>(items: T[]) => Array.from(new Set(items));

const buildConflict = (input: {
  code?: BlueprintConflict["code"];
  actionType?: AssistantPlannedAction["type"] | null;
  resourceKey: string;
  message: string;
}) =>
  normalizeBlueprintConflict({
    code: input.code ?? "resource_key_duplicate",
    severity: "error",
    ...(input.actionType ? { actionType: input.actionType } : {}),
    resourceKey: input.resourceKey,
    message: input.message,
  });

const addMatch = (
  matches: BlueprintExistingResourceMatch[],
  input: BlueprintExistingResourceMatch
) => {
  matches.push({
    ...input,
    candidateIds: unique(input.candidateIds).sort((left, right) => left.localeCompare(right)),
  });
};

const findContentTypeId = (
  catalog: AssistantResourceCatalogSnapshot,
  input: { contentTypeId?: string | null; contentTypeSlug?: string | null }
) => {
  if (input.contentTypeId) return input.contentTypeId;
  if (!input.contentTypeSlug) return null;
  return (
    catalog.contentTypes.find((contentType) => contentType.slug === input.contentTypeSlug)?.id ??
    null
  );
};

const findLinkedDetailPage = (
  catalog: AssistantResourceCatalogSnapshot,
  input: { contentTypeId: string; contentTypeSlug: string; preferredId?: string | null }
) => {
  const detailPages = catalog.detailPages ?? [];
  const byPreferredId = input.preferredId
    ? (detailPages.find(
        (detailPage) =>
          detailPage.id === input.preferredId && detailPage.contentTypeId === input.contentTypeId
      ) ?? null)
    : null;
  if (byPreferredId) return { detailPage: byPreferredId, ambiguous: false };

  const linked = detailPages.filter(
    (detailPage) =>
      detailPage.contentTypeId === input.contentTypeId &&
      detailPage.linkedRouteType === input.contentTypeSlug
  );
  if (linked.length === 1) return { detailPage: linked[0] ?? null, ambiguous: false };
  if (linked.length > 1) return { detailPage: null, ambiguous: true, candidates: linked };

  const sameCollection = detailPages.filter(
    (detailPage) => detailPage.contentTypeId === input.contentTypeId
  );
  if (sameCollection.length === 1 && sameCollection[0]?.linkedRouteType) {
    return { detailPage: sameCollection[0], ambiguous: false };
  }
  if (sameCollection.length > 1)
    return { detailPage: null, ambiguous: true, candidates: sameCollection };
  return { detailPage: null, ambiguous: false };
};

const applyDetailPageMatches = (
  actions: AssistantPlannedAction[],
  catalog: AssistantResourceCatalogSnapshot,
  conflicts: BlueprintConflict[],
  matches: BlueprintExistingResourceMatch[]
) => {
  const routeActions = actions.filter(
    (action): action is Extract<AssistantPlannedAction, { type: "setting.content-route.upsert" }> =>
      action.type === "setting.content-route.upsert"
  );

  for (const action of actions) {
    if (action.type !== "detail-page.upsert") continue;
    const document = action.input.document;
    const existingByDocumentId =
      catalog.detailPages?.find((detailPage) => detailPage.id === document.id) ?? null;

    if (existingByDocumentId && existingByDocumentId.contentTypeId !== document.contentTypeId) {
      conflicts.push(
        buildConflict({
          actionType: action.type,
          resourceKey: `detail-page:${document.id}`,
          message: `Existing detail page "${document.id}" belongs to a different content type and cannot be reused silently.`,
        })
      );
      addMatch(matches, {
        actionId: action.id,
        actionType: action.type,
        resourceKey: `detail-page:${document.id}`,
        existingId: existingByDocumentId.id,
        status: "unresolved",
        reason: "content_type_mismatch",
        candidateIds: [existingByDocumentId.id],
      });
      continue;
    }

    const preferredRouteDetailPageId =
      routeActions.find((route) => route.input.typeSlug === document.contentTypeSlug)?.input
        .detailPageId ?? null;
    const linked = findLinkedDetailPage(catalog, {
      contentTypeId: document.contentTypeId,
      contentTypeSlug: document.contentTypeSlug,
      preferredId: preferredRouteDetailPageId,
    });

    if (linked.ambiguous) {
      const candidateIds = (linked.candidates ?? []).map((detailPage) => detailPage.id);
      conflicts.push(
        buildConflict({
          actionType: action.type,
          resourceKey: `detail-page:${document.contentTypeId}`,
          message: `Multiple existing detail pages are linked to content type "${document.contentTypeId}"; choose one before composing an update.`,
        })
      );
      addMatch(matches, {
        actionId: action.id,
        actionType: action.type,
        resourceKey: `detail-page:${document.contentTypeId}`,
        existingId: null,
        status: "unresolved",
        reason: "ambiguous_candidates",
        candidateIds,
      });
      continue;
    }

    const matched = existingByDocumentId ?? linked.detailPage;
    if (!matched) continue;

    action.input.document = {
      ...document,
      id: matched.id,
      contentTypeId: matched.contentTypeId,
      contentTypeSlug: matched.contentTypeSlug,
    };
    action.input.expectedExistingId = matched.id;

    for (const route of routeActions) {
      if (
        route.input.detailPageId === document.id ||
        route.input.typeSlug === document.contentTypeSlug
      ) {
        route.input.detailPageId = matched.id;
      }
    }

    addMatch(matches, {
      actionId: action.id,
      actionType: action.type,
      resourceKey: `detail-page:${document.contentTypeId}`,
      existingId: matched.id,
      status: "matched",
      reason: matched.id === document.id ? "stable_id" : "canonical_link",
      candidateIds: [matched.id],
    });
  }
};

const applyPageCollectionLinkMatches = (
  actions: AssistantPlannedAction[],
  catalog: AssistantResourceCatalogSnapshot,
  conflicts: BlueprintConflict[],
  matches: BlueprintExistingResourceMatch[]
) => {
  const routeActions = actions.filter(
    (action): action is Extract<AssistantPlannedAction, { type: "setting.content-route.upsert" }> =>
      action.type === "setting.content-route.upsert"
  );

  for (const action of actions) {
    if (action.type !== "page.upsert" || !action.input.collectionLink) continue;
    const contentTypeId = findContentTypeId(catalog, action.input.collectionLink);
    if (!contentTypeId) continue;
    const compositionKey = action.input.collectionLink.compositionKey ?? null;
    const linkedPages = (catalog.pages ?? []).filter(
      (page) =>
        page.collectionLink?.contentTypeId === contentTypeId &&
        page.collectionLink.pageRole === action.input.collectionLink?.pageRole &&
        (page.collectionLink.compositionKey ?? null) === compositionKey
    );

    if (linkedPages.length > 1) {
      conflicts.push(
        buildConflict({
          actionType: action.type,
          resourceKey: `page-collection-link:${contentTypeId}:${action.input.collectionLink.pageRole}:${compositionKey ?? ""}`,
          message: `Multiple pages already claim the same collection link for content type "${contentTypeId}".`,
        })
      );
      addMatch(matches, {
        actionId: action.id,
        actionType: action.type,
        resourceKey: `page-collection-link:${contentTypeId}`,
        existingId: null,
        status: "unresolved",
        reason: "ambiguous_candidates",
        candidateIds: linkedPages.map((page) => page.id),
      });
      continue;
    }

    const linkedPage = linkedPages[0] ?? null;
    if (!linkedPage) continue;
    const previousSlug = action.input.slug;
    action.input.slug = linkedPage.slug;

    if (action.input.collectionLink.pageRole === "canonical-list-page") {
      for (const route of routeActions) {
        const routeContentTypeId = findContentTypeId(catalog, {
          contentTypeSlug: route.input.typeSlug,
        });
        if (routeContentTypeId === contentTypeId && route.input.listPath === previousSlug) {
          route.input.listPath = linkedPage.slug;
        }
      }
    }

    addMatch(matches, {
      actionId: action.id,
      actionType: action.type,
      resourceKey: `page-collection-link:${contentTypeId}`,
      existingId: linkedPage.id,
      status: "matched",
      reason: "collection_link",
      candidateIds: [linkedPage.id],
    });
  }
};

const detectNonUniqueResourceNames = (
  actions: AssistantPlannedAction[],
  catalog: AssistantResourceCatalogSnapshot,
  conflicts: BlueprintConflict[],
  matches: BlueprintExistingResourceMatch[]
) => {
  for (const action of actions) {
    if (action.type === "listing-query.upsert") {
      const candidates = catalog.listings.queries.filter(
        (query) => query.name === action.input.name
      );
      if (candidates.length > 1) {
        conflicts.push(
          buildConflict({
            actionType: action.type,
            resourceKey: `listing-query:${action.input.name}`,
            message: `Listing query name "${action.input.name}" is not unique; choose an exact query id before composing an update.`,
          })
        );
        addMatch(matches, {
          actionId: action.id,
          actionType: action.type,
          resourceKey: `listing-query:${action.input.name}`,
          existingId: null,
          status: "unresolved",
          reason: "non_unique_name",
          candidateIds: candidates.map((query) => query.id),
        });
      } else if (candidates.length === 1) {
        addMatch(matches, {
          actionId: action.id,
          actionType: action.type,
          resourceKey: `listing-query:${action.input.name}`,
          existingId: candidates[0]!.id,
          status: "matched",
          reason: "name_unique_in_catalog",
          candidateIds: [candidates[0]!.id],
        });
      }
    }

    if (action.type === "custom-screen.upsert") {
      const contentTypeId = findContentTypeId(catalog, {
        contentTypeSlug: action.input.contentTypeSlug,
      });
      if (!contentTypeId) continue;
      const compositionKey = action.input.compositionKey ?? null;
      const role = action.input.collectionRole ?? null;
      const candidates = catalog.customScreens.filter(
        (screen) =>
          screen.contentTypeId === contentTypeId &&
          ((role && screen.collectionRole === role && screen.compositionKey === compositionKey) ||
            (!role && screen.name === action.input.name))
      );
      if (candidates.length > 1) {
        conflicts.push(
          buildConflict({
            actionType: action.type,
            resourceKey: `custom-screen:${contentTypeId}:${role ?? action.input.name}:${compositionKey ?? ""}`,
            message: `Custom screen target for "${action.input.name}" is ambiguous; choose the exact collection screen before composing an update.`,
          })
        );
        addMatch(matches, {
          actionId: action.id,
          actionType: action.type,
          resourceKey: `custom-screen:${contentTypeId}`,
          existingId: null,
          status: "unresolved",
          reason: "ambiguous_candidates",
          candidateIds: candidates.map((screen) => screen.id),
        });
      } else if (candidates.length === 1) {
        addMatch(matches, {
          actionId: action.id,
          actionType: action.type,
          resourceKey: `custom-screen:${contentTypeId}`,
          existingId: candidates[0]!.id,
          status: "matched",
          reason: role ? "collection_metadata" : "name_unique_in_catalog",
          candidateIds: [candidates[0]!.id],
        });
      }
    }
  }
};

const isMediaResource = (
  resource: BlueprintResourceContribution
): resource is BlueprintResourceContribution & { metadata: BlueprintMediaResourceMetadata } =>
  resource.kind === "media";

const resolveMediaMetadataCandidateIds = (
  metadata: BlueprintMediaResourceMetadata | Record<string, unknown>,
  catalog: AssistantResourceCatalogSnapshot
) => {
  const explicitIds = [
    readText((metadata as BlueprintMediaResourceMetadata).assetId),
    ...(((metadata as BlueprintMediaResourceMetadata).candidateIds ?? []).map(readText) ?? []),
  ].filter((value): value is string => Boolean(value));
  if (explicitIds.length > 0) return unique(explicitIds);

  const fileHint =
    readText((metadata as Record<string, unknown>).originalName) ??
    readText((metadata as Record<string, unknown>).fileName) ??
    readText((metadata as Record<string, unknown>).filename);
  if (!fileHint) return [];
  return (catalog.media ?? [])
    .filter(
      (media) =>
        media.originalName === fileHint || media.title === fileHint || media.alt === fileHint
    )
    .map((media) => media.id);
};

const detectMediaResourceMatches = (
  resources: BlueprintResourceContribution[] | undefined,
  catalog: AssistantResourceCatalogSnapshot,
  conflicts: BlueprintConflict[],
  matches: BlueprintExistingResourceMatch[]
) => {
  for (const resource of resources ?? []) {
    if (!isMediaResource(resource) && resource.kind !== "media") continue;
    const metadata = resource.metadata ?? {};
    const candidateIds = resolveMediaMetadataCandidateIds(metadata, catalog);
    const exactAssetId = isMediaResource(resource) ? readText(resource.metadata.assetId) : null;
    const matchedIds = candidateIds.filter((id) =>
      (catalog.media ?? []).some((media) => media.id === id)
    );

    if (exactAssetId && matchedIds.includes(exactAssetId)) {
      addMatch(matches, {
        actionId: null,
        actionType: resource.actionTypes[0] ?? null,
        resourceKey: resource.key,
        existingId: exactAssetId,
        status: "matched",
        reason: "media_id",
        candidateIds: [exactAssetId],
      });
      continue;
    }

    if (candidateIds.length > 0 && (!exactAssetId || matchedIds.length !== 1)) {
      conflicts.push(
        buildConflict({
          code: "media_asset_ambiguous",
          actionType: resource.actionTypes[0] ?? null,
          resourceKey: resource.key,
          message: `Media resource "${resource.label}" needs an explicit media id before composition can reuse candidates (${candidateIds.join(", ")}).`,
        })
      );
      addMatch(matches, {
        actionId: null,
        actionType: resource.actionTypes[0] ?? null,
        resourceKey: resource.key,
        existingId: null,
        status: "unresolved",
        reason: "needs_explicit_media_id",
        candidateIds,
      });
      continue;
    }

    if (isMediaResource(resource) && resource.metadata.required === true && !exactAssetId) {
      conflicts.push(
        buildConflict({
          code: "media_asset_missing",
          actionType: resource.actionTypes[0] ?? null,
          resourceKey: resource.key,
          message: `Media resource "${resource.label}" requires a trusted existing media id before composition can proceed.`,
        })
      );
    }
  }
};

export const matchExistingCompositionResources = (
  input: BlueprintExistingResourceMatchInput
): BlueprintExistingResourceMatchResult => {
  const actions = cloneActions(input.actions);
  const conflicts: BlueprintConflict[] = [];
  const matches: BlueprintExistingResourceMatch[] = [];
  if (!input.catalog) return { actions, conflicts, matches };

  applyPageCollectionLinkMatches(actions, input.catalog, conflicts, matches);
  applyDetailPageMatches(actions, input.catalog, conflicts, matches);
  detectNonUniqueResourceNames(actions, input.catalog, conflicts, matches);
  detectMediaResourceMatches(input.resources, input.catalog, conflicts, matches);

  return {
    actions,
    conflicts,
    matches,
  };
};
