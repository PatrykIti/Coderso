// Action-executor execution cache and launch-readiness reconciliation (TASK-569-01). Bodies are byte-identical to the legacy monolith.

import { isCuratedMediaUrl } from "../media/curatedMediaProfiles";
import type {
  AssistantActionExecutionItem,
  AssistantActionPlan,
  AssistantPlannedAction,
} from "./actionPlanTypes";
import type { ExecutionCacheEntry } from "./actionExecutorTypes";

export const executionCache = new Map<string, ExecutionCacheEntry>();

const executionCacheTtlMs = 15 * 60 * 1000;

export const cleanupExecutionCache = (now = Date.now()) => {
  for (const [key, value] of executionCache.entries()) {
    if (now - value.savedAt > executionCacheTtlMs) {
      executionCache.delete(key);
    }
  }
};

export const readMemoryExecutionResult = (input: {
  idempotencyKey: string;
  actorId: string;
  planId: string;
  planHash: string;
}) => {
  const cached = executionCache.get(input.idempotencyKey);
  if (!cached) return null;
  if (
    cached.actorId !== input.actorId ||
    cached.planId !== input.planId ||
    cached.planHash !== input.planHash
  ) {
    throw new Error("assistant_action_idempotency_conflict");
  }
  return cached.result;
};

export const countExecutionOperations = (items: AssistantActionExecutionItem[]) =>
  items.reduce(
    (summary, item) => {
      if (item.status === "failed") {
        summary.failed += 1;
        return summary;
      }
      if (item.operation === "create") summary.create += 1;
      if (item.operation === "update") summary.update += 1;
      if (item.operation === "delete") summary.delete += 1;
      if (item.operation === "noop") summary.noop += 1;
      return summary;
    },
    {
      create: 0,
      update: 0,
      delete: 0,
      noop: 0,
      failed: 0,
    }
  );

const hasCuratedMediaUrl = (value: unknown): boolean => {
  if (isCuratedMediaUrl(value)) return true;
  if (Array.isArray(value)) return value.some((item) => hasCuratedMediaUrl(item));
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some((item) => hasCuratedMediaUrl(item));
};

export const reconcileLaunchReadinessAfterExecution = (
  plan: AssistantActionPlan,
  results: AssistantActionExecutionItem[]
): AssistantActionPlan => {
  const metadata = plan.metadata;
  const launchReadiness = metadata?.launchReadiness;
  if (!launchReadiness) return plan;

  const successfulActionIds = new Set(
    results.filter((result) => result.status === "success").map((result) => result.actionId)
  );
  const successfulActions = plan.actions.filter((action) => successfulActionIds.has(action.id));
  const successfulSiteKitInstall = results.some(
    (result) =>
      result.type === "site-kit.install" &&
      result.status === "success" &&
      result.details?.siteKit?.validation?.status === "ok"
  );
  const successfulTypeCount = (type: AssistantPlannedAction["type"]) =>
    successfulActions.filter((action) => action.type === type).length;
  const successfulPages = new Set(
    successfulActions
      .filter((action) => action.type === "page.upsert")
      .map((action) => (action.type === "page.upsert" ? action.input.slug : null))
      .filter((slug): slug is string => Boolean(slug))
  );
  const successfulSampleCounts = successfulActions.reduce<Record<string, number>>((acc, action) => {
    if (action.type !== "entry.sample.create") return acc;
    acc[action.input.contentTypeSlug] = (acc[action.input.contentTypeSlug] ?? 0) + 1;
    return acc;
  }, {});
  const successfulPageSeoCount = successfulActions.filter(
    (action) => action.type === "seo.document.upsert" && action.input.targetType === "page"
  ).length;
  const successfulEntrySamplesWithSeo = successfulActions.filter(
    (action) => action.type === "entry.sample.create" && action.input.seo
  ).length;
  const successfulPagesWithCuratedMedia = successfulActions.filter(
    (action) => action.type === "page.upsert" && hasCuratedMediaUrl(action.input.sections)
  );
  const successfulCuratedMediaPageSlugs = new Set(
    successfulPagesWithCuratedMedia
      .map((action) => (action.type === "page.upsert" ? action.input.slug : null))
      .filter((slug): slug is string => Boolean(slug))
  );
  const plannedPagesWithCuratedMedia = plan.actions.filter(
    (action) => action.type === "page.upsert" && hasCuratedMediaUrl(action.input.sections)
  );
  const successfulEntrySamplesWithCuratedMedia = successfulActions.filter(
    (action) =>
      action.type === "entry.sample.create" && hasCuratedMediaUrl(action.input.values.coverImageUrl)
  );
  const successfulCuratedSampleCounts = successfulEntrySamplesWithCuratedMedia.reduce<
    Record<string, number>
  >((acc, action) => {
    if (action.type !== "entry.sample.create") return acc;
    acc[action.input.contentTypeSlug] = (acc[action.input.contentTypeSlug] ?? 0) + 1;
    return acc;
  }, {});
  const plannedEntrySamplesWithCuratedMedia = plan.actions.filter(
    (action) =>
      action.type === "entry.sample.create" && hasCuratedMediaUrl(action.input.values.coverImageUrl)
  );
  const plannedCuratedSampleCounts = plannedEntrySamplesWithCuratedMedia.reduce<
    Record<string, number>
  >((acc, action) => {
    if (action.type !== "entry.sample.create") return acc;
    acc[action.input.contentTypeSlug] = (acc[action.input.contentTypeSlug] ?? 0) + 1;
    return acc;
  }, {});
  const allRequiredPagesSatisfied = launchReadiness.requiredPages.every((slug) =>
    successfulPages.has(slug)
  );
  const allSampleMinimumsSatisfied = Object.entries(launchReadiness.minimumPublishedEntries).every(
    ([contentTypeSlug, minimum]) => (successfulSampleCounts[contentTypeSlug] ?? 0) >= minimum
  );
  const catalogCount = launchReadiness.requiredCatalogs.length;
  const allCatalogResourcesSatisfied =
    successfulTypeCount("content-type.upsert") >= catalogCount &&
    successfulTypeCount("detail-page.upsert") >= catalogCount &&
    successfulTypeCount("setting.content-route.upsert") >= catalogCount &&
    successfulTypeCount("listing-query.upsert") >= catalogCount &&
    successfulTypeCount("listing-template.upsert") >= catalogCount;
  const navigationSatisfied =
    successfulTypeCount("menu.upsert") >= 2 &&
    successfulTypeCount("menu.item.upsert") >= launchReadiness.requiredPages.length * 2;
  const seoSatisfied =
    successfulPageSeoCount >= launchReadiness.requiredPages.length &&
    successfulEntrySamplesWithSeo >=
      Object.values(launchReadiness.minimumPublishedEntries).reduce(
        (sum, minimum) => sum + minimum,
        0
      );
  const requiredMediaPages = launchReadiness.requiredMediaPages ?? [];
  const requiredMediaPagesSatisfied =
    requiredMediaPages.length > 0 &&
    requiredMediaPages.every((slug) => successfulCuratedMediaPageSlugs.has(slug));
  const allCuratedMediaPagesSatisfied =
    requiredMediaPagesSatisfied &&
    plannedPagesWithCuratedMedia.every((action) => successfulActionIds.has(action.id));
  const allCuratedMediaSamplesSatisfied =
    Object.entries(launchReadiness.minimumPublishedEntries).every(
      ([contentTypeSlug, minimum]) =>
        (plannedCuratedSampleCounts[contentTypeSlug] ?? 0) >= minimum &&
        (successfulCuratedSampleCounts[contentTypeSlug] ?? 0) >= minimum
    ) && plannedEntrySamplesWithCuratedMedia.every((action) => successfulActionIds.has(action.id));
  const mediaSatisfied =
    allCuratedMediaPagesSatisfied &&
    allCuratedMediaSamplesSatisfied &&
    successfulPagesWithCuratedMedia.length === plannedPagesWithCuratedMedia.length;

  const checks = launchReadiness.checks.map((check) => {
    if (check.status === "gated") return check;
    const satisfied = successfulSiteKitInstall
      ? check.id !== "media"
      : check.id === "pages"
        ? allRequiredPagesSatisfied
        : check.id === "catalogs"
          ? allCatalogResourcesSatisfied
          : check.id === "public-content"
            ? allSampleMinimumsSatisfied
            : check.id === "navigation-footer"
              ? navigationSatisfied
              : check.id === "seo"
                ? seoSatisfied
                : check.id === "media"
                  ? mediaSatisfied
                  : false;
    return {
      ...check,
      status: satisfied ? ("satisfied" as const) : ("pending_execute" as const),
    };
  });

  return {
    ...plan,
    metadata: {
      ...metadata,
      launchReadiness: {
        ...launchReadiness,
        checks,
      },
    },
  };
};
