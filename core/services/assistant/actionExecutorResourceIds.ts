// Action-executor resource-id locator resolution (TASK-569-01). Bodies are byte-identical to the legacy monolith.

import { normalizeSitePath } from "../../site/cache/siteCache";
import type {
  AssistantPlannedAction,
  AssistantResourceIdInput,
  AssistantSamePlanLocator,
} from "./actionPlanTypes";
import type { ActionExecutorDeps, ActionHandlerContext } from "./actionExecutorTypes";

const resolveActionResultPreviewResourceId = async (
  locator: Extract<AssistantSamePlanLocator, { kind: "action-result" }>,
  planned: AssistantPlannedAction | null,
  deps: ActionExecutorDeps
) => {
  if (locator.resourceType === "menu" && planned?.type === "menu.upsert") {
    return (await findMenuByLocation(planned.input.location, deps))?.id ?? null;
  }
  return null;
};

export const normalizeSeoSlugForAction = (value: string | null | undefined) => {
  if (!value) return null;
  return value.startsWith("/") ? value : `/${value}`;
};

export const normalizePageActionSlug = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  return normalizeSitePath(trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
};

const isSamePlanLocator = (value: AssistantResourceIdInput): value is AssistantSamePlanLocator =>
  typeof value !== "string";

export const resourceIdInputKey = (value: AssistantResourceIdInput) => {
  if (!isSamePlanLocator(value)) return value;
  if (value.kind === "action-result") {
    return `${value.resourceType}:${value.actionId}:${value.field}`;
  }
  if (value.kind === "stable-location") return `menu:${value.location}`;
  if (value.resourceType === "content-type") return `content-type:${value.slug}`;
  if (value.resourceType === "page") return `page:${value.slug}`;
  return `entry:${value.contentTypeSlug}/${value.slug}`;
};

const findPriorPlannedStableSlugAction = (
  locator: Extract<AssistantSamePlanLocator, { kind: "stable-slug" }>,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const actions = ctx.planActions?.slice(0, ctx.actionIndex ?? 0) ?? [];
  return (
    actions.find((action) => {
      if (locator.resourceType === "content-type") {
        return action.type === "content-type.upsert" && action.input.slug === locator.slug;
      }
      if (locator.resourceType === "page") {
        return action.type === "page.upsert" && action.input.slug === locator.slug;
      }
      if (locator.resourceType !== "entry") return false;
      return (
        (action.type === "entry.sample.create" || action.type === "entry.upsert-draft") &&
        action.input.contentTypeSlug === locator.contentTypeSlug &&
        action.input.slug === locator.slug
      );
    }) ?? null
  );
};

const findPriorActionResultDependency = (
  locator: Extract<AssistantSamePlanLocator, { kind: "action-result" }>,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const actions = ctx.planActions?.slice(0, ctx.actionIndex ?? 0) ?? [];
  return actions.find((action) => action.id === locator.actionId) ?? null;
};

export const findPriorPlannedListingQueryAction = (
  name: string | null | undefined,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const normalizedName = name?.trim();
  if (!normalizedName) return null;
  const actions = ctx.planActions?.slice(0, ctx.actionIndex ?? 0) ?? [];
  return (
    actions.find(
      (action) => action.type === "listing-query.upsert" && action.input.name === normalizedName
    ) ?? null
  );
};

export const findPriorPlannedListingTemplateAction = (
  slug: string | null | undefined,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const normalizedSlug = slug?.trim();
  if (!normalizedSlug) return null;
  const actions = ctx.planActions?.slice(0, ctx.actionIndex ?? 0) ?? [];
  return (
    actions.find(
      (action) => action.type === "listing-template.upsert" && action.input.slug === normalizedSlug
    ) ?? null
  );
};

export const findPriorPlannedFormAction = (
  name: string | null | undefined,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  const normalizedName = name?.trim();
  if (!normalizedName) return null;
  const actions = ctx.planActions?.slice(0, ctx.actionIndex ?? 0) ?? [];
  return (
    actions.find(
      (action) => action.type === "form.upsert" && action.input.name === normalizedName
    ) ?? null
  );
};

const resolveStableSlugResourceId = async (
  locator: Extract<AssistantSamePlanLocator, { kind: "stable-slug" }>,
  deps: ActionExecutorDeps
) => {
  if (locator.resourceType === "content-type") {
    const contentType = await deps.getContentTypeBySlug(locator.slug);
    return contentType?.id ?? null;
  }
  if (locator.resourceType === "page") {
    const page = await deps.getPageBySlug(locator.slug);
    return page?.id ?? null;
  }
  if (locator.resourceType !== "entry") return null;
  const contentType = await deps.getContentTypeBySlug(locator.contentTypeSlug);
  if (!contentType) return null;
  const entry = await deps.getEntryBySlug(contentType.id, locator.slug);
  return entry?.id ?? null;
};

export const findMenuByLocation = async (location: string, deps: ActionExecutorDeps) =>
  (await deps.listMenus()).find((menu) => menu.location === location) ?? null;

export const resolveResourceIdInput = async (
  targetId: AssistantResourceIdInput,
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "priorResults">
) => {
  if (!isSamePlanLocator(targetId)) return targetId;
  if (targetId.kind === "stable-slug") {
    const resolved = await resolveStableSlugResourceId(targetId, deps);
    if (resolved) return resolved;
    throw new Error("assistant_action_locator_unresolved");
  }
  if (targetId.kind === "stable-location") {
    const resolved = await findMenuByLocation(targetId.location, deps);
    if (resolved) return resolved.id;
    throw new Error("assistant_action_locator_unresolved");
  }
  const result = ctx.priorResults?.get(targetId.actionId) ?? null;
  if (
    result?.status === "success" &&
    result.targetType === targetId.resourceType &&
    result.resourceId
  ) {
    return result.resourceId;
  }
  throw new Error("assistant_action_locator_unresolved");
};

export const buildLocatorPreviewDependency = async (
  targetId: AssistantResourceIdInput,
  targetType: "content-type" | "page" | "entry" | "menu" | "detail-page",
  deps: ActionExecutorDeps,
  ctx: Pick<ActionHandlerContext, "planActions" | "actionIndex">
) => {
  if (!isSamePlanLocator(targetId)) {
    return {
      resolvedId: targetId,
      pending: false,
      dependency: {
        actionId: null,
        targetType,
        targetKey: targetId,
        optional: false,
      },
    };
  }

  if (targetId.kind === "stable-slug") {
    if (targetId.resourceType !== targetType) {
      return {
        resolvedId: null,
        pending: false,
        dependency: {
          actionId: null,
          targetType: targetId.resourceType,
          targetKey: resourceIdInputKey(targetId),
          optional: false,
        },
      };
    }
    const resolvedId = await resolveStableSlugResourceId(targetId, deps);
    const planned = resolvedId ? null : findPriorPlannedStableSlugAction(targetId, ctx);
    return {
      resolvedId,
      pending: Boolean(planned),
      dependency: {
        actionId: planned?.id ?? null,
        targetType: targetId.resourceType,
        targetKey: resourceIdInputKey(targetId),
        optional: false,
      },
    };
  }

  if (targetId.kind === "stable-location") {
    const resolved = await findMenuByLocation(targetId.location, deps);
    return {
      resolvedId: resolved?.id ?? null,
      pending: false,
      dependency: {
        actionId: null,
        targetType: targetId.resourceType,
        targetKey: resourceIdInputKey(targetId),
        optional: false,
      },
    };
  }

  const planned = findPriorActionResultDependency(targetId, ctx);
  const resolvedId = await resolveActionResultPreviewResourceId(targetId, planned, deps);
  return {
    resolvedId,
    pending: Boolean(planned && targetId.resourceType === targetType && !resolvedId),
    dependency: {
      actionId: targetId.actionId,
      targetType: targetId.resourceType,
      targetKey: resourceIdInputKey(targetId),
      optional: false,
    },
  };
};
