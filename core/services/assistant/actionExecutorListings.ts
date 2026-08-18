// Action-executor listing query + template previews and handlers (TASK-569-01). Bodies are byte-identical to the legacy monolith.

import type {
  AssistantActionExecutionItem,
  AssistantActionPreviewChange,
  AssistantListingQueryFiltersPatchAction,
  AssistantListingQueryDeleteAction,
  AssistantListingQueryUpdateAction,
  AssistantListingQueryUpsertAction,
  AssistantListingTemplateCardPatchAction,
  AssistantListingTemplateDeleteAction,
  AssistantListingTemplateUpdateAction,
  AssistantListingTemplateUpsertAction,
} from "./actionPlanTypes";
import { createPreviewChange } from "./actionDiffService";
import type { ActionExecutorDeps, ListingQueryRecord } from "./actionExecutorTypes";
import {
  isRecord,
  collectListingResourceReferences,
  formatListingReferenceSummary,
} from "./actionExecutorCatalogReads";

const findListingQueryNameMatches = async (
  name: string,
  deps: ActionExecutorDeps
): Promise<ListingQueryRecord[]> =>
  (await deps.listListingQueries()).filter((entry) => entry.name === name);

const listingQueryNameConflict = (
  name: string
): AssistantActionPreviewChange["conflicts"][number] => ({
  code: "assistant_action_dependency_conflict",
  severity: "error",
  message: `Listing query name "${name}" is not unique. Re-run planning with an exact listing query id before updating it.`,
});

export const buildListingQueryPreview = async (
  action: AssistantListingQueryUpsertAction,
  deps: ActionExecutorDeps
) => {
  const matches = await findListingQueryNameMatches(action.input.name, deps);
  const existing = matches.length === 1 ? matches[0] : null;
  const ambiguousMatches = matches.length > 1;
  return createPreviewChange({
    action,
    targetType: "listing-query",
    targetKey: action.input.name,
    summary: `${matches.length > 0 ? "Update" : "Create"} listing query "${action.input.name}"`,
    conflicts: ambiguousMatches ? [listingQueryNameConflict(action.input.name)] : [],
    beforeValue: ambiguousMatches ? matches : existing,
    nextValue: action.input,
  });
};

export const buildListingQueryDeletePreview = async (
  action: AssistantListingQueryDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingQueries()).find((entry) => entry.id === action.input.id) ?? null;
  const matches = existing?.name === action.input.name;
  const references = existing
    ? await collectListingResourceReferences({ listingQueryId: existing.id }, deps)
    : [];
  const referenceSummary = formatListingReferenceSummary(references);

  return createPreviewChange({
    action,
    targetType: "listing-query",
    targetKey: action.input.name,
    operation: "delete",
    summary: `Delete listing query "${action.input.name}"`,
    warnings:
      references.length > 0
        ? [`This listing query is still referenced by ${referenceSummary}.`]
        : [],
    conflicts:
      existing && matches && references.length === 0
        ? []
        : [
            {
              code:
                references.length > 0
                  ? "assistant_action_dependency_conflict"
                  : "assistant_action_dependency_missing",
              severity: "error",
              message:
                references.length > 0
                  ? "Listing query is still referenced by reviewed page or widget template data."
                  : existing
                    ? "Listing query no longer matches the planned delete target."
                    : "Listing query was not found.",
            },
          ],
    beforeValue: existing
      ? { id: existing.id, name: existing.name, description: existing.description }
      : null,
    nextValue: null,
  });
};

export const buildListingQueryFiltersPatchPreview = async (
  action: AssistantListingQueryFiltersPatchAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingQueries()).find(
      (entry) => entry.name === action.input.listingQueryName
    ) ?? null;
  const nextQuery = existing
    ? {
        ...existing.query,
        filters: action.input.filters,
      }
    : null;

  return createPreviewChange({
    action,
    targetType: "listing-query",
    targetKey: action.input.listingQueryName,
    summary: `Patch filters for listing query "${action.input.listingQueryName}"`,
    warnings: existing ? [] : ["The listing query does not exist."],
    conflicts: existing
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error",
            message: "Listing query is required before filters can be patched.",
          },
        ],
    beforeValue: existing?.query ?? null,
    nextValue: nextQuery,
  });
};

export const buildListingQueryUpdatePreview = async (
  action: AssistantListingQueryUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingQueries()).find((entry) => entry.id === action.input.id) ?? null;
  const nextQuery = existing
    ? {
        ...existing.query,
        sourceConfig: {
          ...(isRecord(existing.query.sourceConfig) ? existing.query.sourceConfig : {}),
          ...(action.input.patch.includeDrafts !== undefined
            ? { includeDrafts: action.input.patch.includeDrafts }
            : {}),
        },
        pagination: {
          ...(isRecord(existing.query.pagination) ? existing.query.pagination : {}),
          ...(action.input.patch.limit !== undefined ? { limit: action.input.patch.limit } : {}),
        },
      }
    : null;
  const nextValue = existing
    ? {
        name: action.input.patch.name ?? existing.name,
        description:
          action.input.patch.description !== undefined
            ? action.input.patch.description
            : existing.description,
        query: nextQuery,
      }
    : null;

  return createPreviewChange({
    action,
    targetType: "listing-query",
    targetKey: action.input.name,
    summary: `Update listing query "${action.input.name}"`,
    conflicts:
      existing && existing.name === action.input.name
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Listing query no longer matches the planned update target."
                : "Listing query was not found.",
            },
          ],
    beforeValue: existing
      ? { name: existing.name, description: existing.description, query: existing.query }
      : null,
    nextValue,
  });
};

export const buildListingTemplatePreview = async (
  action: AssistantListingTemplateUpsertAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.slug === action.input.slug) ?? null;
  return createPreviewChange({
    action,
    targetType: "listing-template",
    targetKey: action.input.slug,
    summary: `${existing ? "Update" : "Create"} listing template "${action.input.name}"`,
    beforeValue: existing,
    nextValue: action.input,
  });
};

export const buildListingTemplateDeletePreview = async (
  action: AssistantListingTemplateDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.id === action.input.id) ?? null;
  const expectedLayout = action.input.expectedLayout?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    existing.slug === action.input.slug &&
    (!expectedLayout || existing.layout === expectedLayout);
  const references = existing
    ? await collectListingResourceReferences({ listingTemplateId: existing.id }, deps)
    : [];
  const referenceSummary = formatListingReferenceSummary(references);

  return createPreviewChange({
    action,
    targetType: "listing-template",
    targetKey: action.input.slug,
    operation: "delete",
    summary: `Delete listing template "${action.input.name}"`,
    warnings:
      references.length > 0
        ? [`This listing template is still referenced by ${referenceSummary}.`]
        : [],
    conflicts:
      existing && matches && references.length === 0
        ? []
        : [
            {
              code:
                references.length > 0
                  ? "assistant_action_dependency_conflict"
                  : "assistant_action_dependency_missing",
              severity: "error",
              message:
                references.length > 0
                  ? "Listing template is still referenced by reviewed page or widget template data."
                  : existing
                    ? "Listing template no longer matches the planned delete target."
                    : "Listing template was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
          layout: existing.layout,
        }
      : null,
    nextValue: null,
  });
};

export const buildListingTemplateCardPatchPreview = async (
  action: AssistantListingTemplateCardPatchAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find(
      (entry) => entry.slug === action.input.listingTemplateSlug
    ) ?? null;
  const nextConfig = existing
    ? {
        ...existing.config,
        card: action.input.card,
      }
    : null;

  return createPreviewChange({
    action,
    targetType: "listing-template",
    targetKey: action.input.listingTemplateSlug,
    summary: `Patch card config for listing template "${action.input.listingTemplateSlug}"`,
    warnings: existing ? [] : ["The listing template does not exist."],
    conflicts: existing
      ? []
      : [
          {
            code: "assistant_action_dependency_missing",
            severity: "error",
            message: "Listing template is required before card config can be patched.",
          },
        ],
    beforeValue: existing?.config ?? null,
    nextValue: nextConfig,
  });
};

export const buildListingTemplateUpdatePreview = async (
  action: AssistantListingTemplateUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.id === action.input.id) ?? null;
  const expectedLayout = action.input.expectedLayout?.trim() ?? "";
  const matches =
    existing?.name === action.input.name &&
    existing.slug === action.input.slug &&
    (!expectedLayout || existing.layout === expectedLayout);
  const nextConfig =
    existing && action.input.patch.card
      ? {
          ...existing.config,
          card: action.input.patch.card,
        }
      : (existing?.config ?? null);

  return createPreviewChange({
    action,
    targetType: "listing-template",
    targetKey: action.input.slug,
    summary: `Update listing template "${action.input.name}"`,
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Listing template no longer matches the planned update target."
                : "Listing template was not found.",
            },
          ],
    beforeValue: existing,
    nextValue: existing
      ? {
          name: action.input.patch.name ?? existing.name,
          slug: action.input.patch.slug ?? existing.slug,
          description:
            action.input.patch.description !== undefined
              ? action.input.patch.description
              : existing.description,
          layout: action.input.patch.layout ?? existing.layout,
          config: nextConfig,
        }
      : null,
  });
};

export const executeListingQueryAction = async (
  action: AssistantListingQueryUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const contentType = await deps.getContentTypeBySlug(action.input.contentTypeSlug);
  if (!contentType) {
    throw new Error("assistant_action_dependency_missing");
  }

  const matches = await findListingQueryNameMatches(action.input.name, deps);
  if (matches.length > 1) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const existing = matches[0] ?? null;
  const payload = {
    name: action.input.name,
    description: action.input.description,
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: contentType.id,
        includeDrafts: action.input.includeDrafts,
      },
      filters: [],
      sort: action.input.sort,
      pagination: {
        limit: action.input.limit,
        offset: 0,
      },
      fields: action.input.fields,
    },
  };

  const record =
    preview.operation === "create"
      ? await deps.createListingQuery(payload)
      : preview.operation === "update" && existing
        ? await deps.updateListingQuery(existing.id, payload)
        : existing;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-query",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing query already matched the plan."
        : "Catalog listing query is ready for the public page.",
  };
};

export const executeListingQueryDeleteAction = async (
  action: AssistantListingQueryDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing =
    (await deps.listListingQueries()).find((entry) => entry.id === action.input.id) ?? null;
  if (!existing || existing.name !== action.input.name) {
    throw new Error("assistant_action_dependency_missing");
  }
  const references = await collectListingResourceReferences({ listingQueryId: existing.id }, deps);
  if (references.length > 0) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const deleted = await deps.deleteListingQuery(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-query",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message: `Deleted listing query "${existing.name}".`,
  };
};

export const executeListingQueryFiltersPatchAction = async (
  action: AssistantListingQueryFiltersPatchAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingQueries()).find(
      (entry) => entry.name === action.input.listingQueryName
    ) ?? null;
  if (!existing) {
    throw new Error("assistant_action_dependency_missing");
  }

  const nextQuery = {
    ...existing.query,
    filters: action.input.filters,
  };
  const record =
    preview.operation === "noop"
      ? existing
      : await deps.updateListingQuery(existing.id, {
          query: nextQuery,
        });

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-query",
    targetKey: action.input.listingQueryName,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing query filters already matched the planned patch."
        : "Listing query filters are updated.",
  };
};

export const executeListingQueryUpdateAction = async (
  action: AssistantListingQueryUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing =
    (await deps.listListingQueries()).find((entry) => entry.id === action.input.id) ?? null;
  if (!existing || existing.name !== action.input.name) {
    throw new Error("assistant_action_dependency_missing");
  }
  const nextQuery = {
    ...existing.query,
    sourceConfig: {
      ...(isRecord(existing.query.sourceConfig) ? existing.query.sourceConfig : {}),
      ...(action.input.patch.includeDrafts !== undefined
        ? { includeDrafts: action.input.patch.includeDrafts }
        : {}),
    },
    pagination: {
      ...(isRecord(existing.query.pagination) ? existing.query.pagination : {}),
      ...(action.input.patch.limit !== undefined ? { limit: action.input.patch.limit } : {}),
    },
  };
  const record =
    preview.operation === "noop"
      ? existing
      : await deps.updateListingQuery(existing.id, {
          name: action.input.patch.name ?? existing.name,
          description:
            action.input.patch.description !== undefined
              ? action.input.patch.description
              : existing.description,
          query: nextQuery,
        });
  if (!record) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-query",
    targetKey: action.input.name,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing query already matched the planned patch."
        : `Updated listing query "${record.name}".`,
  };
};

export const executeListingTemplateAction = async (
  action: AssistantListingTemplateUpsertAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.slug === action.input.slug) ?? null;
  const payload = {
    name: action.input.name,
    slug: action.input.slug,
    description: action.input.description,
    layout: action.input.layout,
    config: action.input.config,
  };
  const record =
    preview.operation === "create"
      ? await deps.createListingTemplate(payload)
      : preview.operation === "update" && existing
        ? await deps.updateListingTemplate(existing.id, payload)
        : existing;

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-template",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing template already matched the plan."
        : "Grid template is ready for house project cards.",
  };
};

export const executeListingTemplateDeleteAction = async (
  action: AssistantListingTemplateDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.id === action.input.id) ?? null;
  const expectedLayout = action.input.expectedLayout?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    existing.slug !== action.input.slug ||
    (expectedLayout && existing.layout !== expectedLayout)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const references = await collectListingResourceReferences(
    {
      listingTemplateId: existing.id,
    },
    deps
  );
  if (references.length > 0) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const deleted = await deps.deleteListingTemplate(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-template",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message: `Deleted listing template "${deleted.name}".`,
  };
};

export const executeListingTemplateCardPatchAction = async (
  action: AssistantListingTemplateCardPatchAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
) => {
  const existing =
    (await deps.listListingTemplates()).find(
      (entry) => entry.slug === action.input.listingTemplateSlug
    ) ?? null;
  if (!existing) {
    throw new Error("assistant_action_dependency_missing");
  }

  const nextConfig = {
    ...existing.config,
    card: action.input.card,
  };
  const record =
    preview.operation === "noop"
      ? existing
      : await deps.updateListingTemplate(existing.id, {
          config: nextConfig,
        });

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-template",
    targetKey: action.input.listingTemplateSlug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record?.id ?? null,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing template card config already matched the planned patch."
        : "Listing template card config is updated.",
  };
};

export const executeListingTemplateUpdateAction = async (
  action: AssistantListingTemplateUpdateAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing =
    (await deps.listListingTemplates()).find((entry) => entry.id === action.input.id) ?? null;
  const expectedLayout = action.input.expectedLayout?.trim() ?? "";
  if (
    !existing ||
    existing.name !== action.input.name ||
    existing.slug !== action.input.slug ||
    (expectedLayout && existing.layout !== expectedLayout)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }
  const config = action.input.patch.card
    ? { ...existing.config, card: action.input.patch.card }
    : existing.config;
  const record =
    preview.operation === "noop"
      ? existing
      : await deps.updateListingTemplate(existing.id, {
          name: action.input.patch.name ?? existing.name,
          slug: action.input.patch.slug ?? existing.slug,
          description:
            action.input.patch.description !== undefined
              ? action.input.patch.description
              : existing.description,
          layout: action.input.patch.layout ?? existing.layout,
          config,
        });
  if (!record) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "listing-template",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: "/admin/advanced/listings",
    publicHref: null,
    message:
      preview.operation === "noop"
        ? "Listing template already matched the planned patch."
        : `Updated listing template "${record.name}".`,
  };
};
