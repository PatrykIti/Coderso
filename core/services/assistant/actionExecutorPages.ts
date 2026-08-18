// Action-executor page previews and handlers (TASK-569-01, module-11 contingency split). Bodies are byte-identical to the legacy monolith.

import type {
  AssistantActionExecutionItem,
  AssistantActionPreviewChange,
  AssistantPageUpdateAction,
  AssistantPageUpsertAction,
  AssistantPageDeleteAction,
} from "./actionPlanTypes";
import { createPreviewChange } from "./actionDiffService";
import type { ActionExecutorDeps, ActionHandlerContext } from "./actionExecutorTypes";
import {
  isRecord,
  readStoredPageCollectionLink,
  readPageCatalogSource,
  readFormEmbedSource,
  buildCatalogPageData,
  buildSimplePageData,
  resolveAssistantPageCollectionLink,
} from "./actionExecutorCatalogReads";
import {
  normalizePageActionSlug,
  findPriorPlannedListingQueryAction,
  findPriorPlannedListingTemplateAction,
  findPriorPlannedFormAction,
} from "./actionExecutorResourceIds";

export const buildPagePreview = async (
  action: AssistantPageUpsertAction,
  ctx: ActionHandlerContext
) => {
  const deps = ctx.deps;
  const existing = await deps.getPageBySlug(action.input.slug);
  const simplePageMode =
    Boolean(action.input.sections) ||
    !action.input.listingQueryName ||
    !action.input.listingTemplateSlug;
  const existingData = isRecord(existing?.currentData) ? existing.currentData : {};
  const existingCollectionLink = readStoredPageCollectionLink(existing);
  const currentCatalogSource = readPageCatalogSource(existing);
  const listingQueries = await deps.listListingQueries();
  const listingTemplates = await deps.listListingTemplates();
  const requestedListingQueryName =
    action.input.listingQueryName ?? action.input.collectionLink?.listingQueryName ?? null;
  const requestedListingTemplateSlug =
    action.input.listingTemplateSlug ?? action.input.collectionLink?.listingTemplateSlug ?? null;
  const requestedListingQueryId = action.input.collectionLink?.listingQueryId ?? null;
  const requestedListingTemplateId = action.input.collectionLink?.listingTemplateId ?? null;
  const listingQueryById = requestedListingQueryId
    ? (listingQueries.find((entry) => entry.id === requestedListingQueryId) ?? null)
    : null;
  const listingQueryByName = requestedListingQueryName
    ? (listingQueries.find((entry) => entry.name === requestedListingQueryName) ?? null)
    : null;
  const plannedListingQuery = listingQueryByName
    ? null
    : findPriorPlannedListingQueryAction(requestedListingQueryName, ctx);
  if (
    requestedListingQueryId &&
    listingQueryByName &&
    listingQueryByName.id !== requestedListingQueryId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const listingQueryFromCurrent = currentCatalogSource?.listingQueryId
    ? (listingQueries.find((entry) => entry.id === currentCatalogSource.listingQueryId) ?? null)
    : null;
  const listingQuery = listingQueryById ?? listingQueryByName ?? listingQueryFromCurrent;
  const listingTemplateById = requestedListingTemplateId
    ? (listingTemplates.find((entry) => entry.id === requestedListingTemplateId) ?? null)
    : null;
  const listingTemplateBySlug = requestedListingTemplateSlug
    ? (listingTemplates.find((entry) => entry.slug === requestedListingTemplateSlug) ?? null)
    : null;
  const plannedListingTemplate = listingTemplateBySlug
    ? null
    : findPriorPlannedListingTemplateAction(requestedListingTemplateSlug, ctx);
  if (
    requestedListingTemplateId &&
    listingTemplateBySlug &&
    listingTemplateBySlug.id !== requestedListingTemplateId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const listingTemplateFromCurrent = currentCatalogSource?.listingTemplateId
    ? (listingTemplates.find((entry) => entry.id === currentCatalogSource.listingTemplateId) ??
      null)
    : null;
  const listingTemplate =
    listingTemplateById ?? listingTemplateBySlug ?? listingTemplateFromCurrent;
  const forms = action.input.formEmbed ? await deps.listForms() : [];
  const form = action.input.formEmbed
    ? (forms.find((entry) => entry.name === action.input.formEmbed?.formName) ??
      (readFormEmbedSource(existing)?.formId
        ? forms.find((entry) => entry.id === readFormEmbedSource(existing)?.formId)
        : null) ??
      null)
    : null;
  const plannedForm = form
    ? null
    : findPriorPlannedFormAction(action.input.formEmbed?.formName, ctx);
  const dependencies: AssistantActionPreviewChange["dependencies"] = [
    ...(requestedListingQueryName
      ? [
          {
            actionId: plannedListingQuery?.id ?? null,
            targetType: "listing-query",
            targetKey: requestedListingQueryName,
            optional: false,
          },
        ]
      : []),
    ...(requestedListingTemplateSlug
      ? [
          {
            actionId: plannedListingTemplate?.id ?? null,
            targetType: "listing-template",
            targetKey: requestedListingTemplateSlug,
            optional: false,
          },
        ]
      : []),
    ...(action.input.formEmbed
      ? [
          {
            actionId: plannedForm?.id ?? null,
            targetType: "form",
            targetKey: action.input.formEmbed.formName,
            optional: false,
          },
        ]
      : []),
  ];
  const hasPendingDependencies = Boolean(
    plannedListingQuery || plannedListingTemplate || plannedForm
  );
  const dependencyConflicts =
    (!simplePageMode &&
      ((!listingQuery && !plannedListingQuery) || (!listingTemplate && !plannedListingTemplate))) ||
    (action.input.formEmbed && !form && !plannedForm)
      ? [
          {
            code: "assistant_action_dependency_missing" as const,
            severity: "error" as const,
            message:
              "Page dependencies could not be resolved for this preview. Re-run planning after the linked resources exist.",
          },
        ]
      : [];
  let resolvedCollectionLink = existingCollectionLink;
  if (dependencyConflicts.length === 0 && !hasPendingDependencies) {
    try {
      resolvedCollectionLink = await resolveAssistantPageCollectionLink({
        action,
        existing,
        simplePageMode,
        listingQuery,
        listingTemplate,
        deps,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "assistant_action_dependency_missing") {
          return createPreviewChange({
            action,
            targetType: "page",
            targetKey: action.input.slug,
            summary: `${existing ? "Update" : "Create"} catalog page ${action.input.slug}`,
            conflicts: [
              {
                code: "assistant_action_dependency_missing",
                severity: "error",
                message:
                  "Page dependencies could not be resolved for this preview. Re-run planning after the linked resources exist.",
              },
            ],
            beforeValue: existing
              ? {
                  title: existing.title,
                  slug: existing.slug,
                  status: existing.status,
                  ...(simplePageMode
                    ? {
                        sections: Array.isArray(existingData.sections) ? existingData.sections : [],
                        formEmbed: action.input.formEmbed ?? null,
                        collectionLink: existingCollectionLink,
                      }
                    : {}),
                }
              : null,
            nextValue: null,
          });
        }
        if (error.message === "assistant_action_dependency_conflict") {
          return createPreviewChange({
            action,
            targetType: "page",
            targetKey: action.input.slug,
            summary: `${existing ? "Update" : "Create"} catalog page ${action.input.slug}`,
            conflicts: [
              {
                code: "assistant_action_dependency_conflict",
                severity: "error",
                message:
                  "Collection-link locators disagree with the linked listing resources and must be reconciled before execution.",
              },
            ],
            beforeValue: existing
              ? {
                  title: existing.title,
                  slug: existing.slug,
                  status: existing.status,
                  ...(simplePageMode
                    ? {
                        sections: Array.isArray(existingData.sections) ? existingData.sections : [],
                        formEmbed: action.input.formEmbed ?? null,
                        collectionLink: existingCollectionLink,
                      }
                    : {}),
                }
              : null,
            nextValue: null,
          });
        }
      }
      throw error;
    }
  }
  const nextValue = simplePageMode
    ? {
        title: action.input.title,
        slug: action.input.slug,
        status: action.input.status,
        sections: action.input.sections ?? [],
        formEmbed: action.input.formEmbed ?? null,
        collectionLink: resolvedCollectionLink,
      }
    : {
        title: action.input.title,
        slug: action.input.slug,
        status: action.input.status,
        listingQueryName: action.input.listingQueryName,
        listingTemplateSlug: action.input.listingTemplateSlug,
        contentListStyle: action.input.contentListStyle,
        listingFilters: action.input.listingFilters,
        formEmbed: action.input.formEmbed,
        collectionLink: resolvedCollectionLink,
      };
  return createPreviewChange({
    action,
    targetType: "page",
    targetKey: action.input.slug,
    summary: `${existing ? "Update" : "Create"} catalog page ${action.input.slug}`,
    conflicts: dependencyConflicts,
    dependencies,
    beforeValue: existing
      ? {
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
          ...(simplePageMode
            ? {
                sections: Array.isArray(existingData.sections) ? existingData.sections : [],
                formEmbed: action.input.formEmbed ?? null,
                collectionLink: existingCollectionLink,
              }
            : {}),
        }
      : null,
    nextValue,
  });
};

const applyPageUpdatePatch = (
  currentData: Record<string, unknown>,
  patch: AssistantPageUpdateAction["input"]["patch"]
) => {
  const currentSettings = isRecord(currentData.settings) ? currentData.settings : {};
  const settingsPatch = patch.settings;
  if (!settingsPatch) return currentData;
  const nextSettings = { ...currentSettings };
  if (settingsPatch.template !== undefined) nextSettings.template = settingsPatch.template;
  if (settingsPatch.showInNav !== undefined) nextSettings.showInNav = settingsPatch.showInNav;
  if (settingsPatch.revisionRetention !== undefined) {
    nextSettings.revisionRetention = settingsPatch.revisionRetention;
  }
  if (settingsPatch.seo !== undefined) {
    const currentSeo = isRecord(nextSettings.seo) ? nextSettings.seo : {};
    nextSettings.seo = {
      ...currentSeo,
      ...settingsPatch.seo,
    };
  }
  return {
    ...currentData,
    settings: nextSettings,
  };
};

export const buildPageUpdatePreview = async (
  action: AssistantPageUpdateAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getPage(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const existingSlug = normalizePageActionSlug(existing?.slug);
  const expectedSlug = normalizePageActionSlug(action.input.slug);
  const currentData = isRecord(existing?.currentData) ? existing.currentData : {};
  const nextData = existing ? applyPageUpdatePatch(currentData, action.input.patch) : null;
  const nextValue = existing
    ? {
        title: action.input.patch.title ?? existing.title,
        slug: action.input.patch.slug ?? existing.slug,
        status: action.input.patch.status ?? existing.status,
        settings: isRecord(nextData?.settings) ? nextData.settings : {},
      }
    : null;
  const matches =
    existing?.title === action.input.title &&
    existingSlug === expectedSlug &&
    (!expectedStatus || existing.status === expectedStatus);

  return createPreviewChange({
    action,
    targetType: "page",
    targetKey: action.input.slug,
    summary: `Update page "${action.input.title}"`,
    warnings:
      action.input.patch.status === "published"
        ? ["Publishing this page may make the latest page data visible on the public site."]
        : [],
    conflicts:
      existing && matches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Page no longer matches the planned update target."
                : "Page was not found.",
            },
          ],
    beforeValue: existing
      ? {
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
          settings: currentData.settings ?? null,
        }
      : null,
    nextValue,
  });
};

export const buildPageDeletePreview = async (
  action: AssistantPageDeleteAction,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getPage(action.input.id);
  const existingSlug = normalizePageActionSlug(existing?.slug);
  const expectedSlug = normalizePageActionSlug(action.input.slug);
  const matches = existing?.title === action.input.title && existingSlug === expectedSlug;
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const statusMatches = !expectedStatus || existing?.status === expectedStatus;

  return createPreviewChange({
    action,
    targetType: "page",
    targetKey: action.input.slug,
    operation: "delete",
    summary: `Delete page "${action.input.title}"`,
    warnings:
      existing?.status === "published"
        ? ["This page is published and may be visible on the public site."]
        : [],
    conflicts:
      existing && matches && statusMatches
        ? []
        : [
            {
              code: "assistant_action_dependency_missing",
              severity: "error",
              message: existing
                ? "Page no longer matches the planned delete target."
                : "Page was not found.",
            },
          ],
    beforeValue: existing
      ? {
          id: existing.id,
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
        }
      : null,
    nextValue: null,
  });
};

export const executePageAction = async (
  action: AssistantPageUpsertAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
) => {
  const existing = await deps.getPageBySlug(action.input.slug);
  const currentCatalogSource = readPageCatalogSource(existing);
  const currentFormSource = readFormEmbedSource(existing);
  const listingQueries = await deps.listListingQueries();
  const listingTemplates = await deps.listListingTemplates();
  const forms = action.input.formEmbed ? await deps.listForms() : [];
  const requestedListingQueryName =
    action.input.listingQueryName ?? action.input.collectionLink?.listingQueryName ?? null;
  const requestedListingTemplateSlug =
    action.input.listingTemplateSlug ?? action.input.collectionLink?.listingTemplateSlug ?? null;
  const requestedListingQueryId = action.input.collectionLink?.listingQueryId ?? null;
  const requestedListingTemplateId = action.input.collectionLink?.listingTemplateId ?? null;
  const simplePageMode =
    !requestedListingQueryName &&
    !requestedListingTemplateSlug &&
    !requestedListingQueryId &&
    !requestedListingTemplateId;
  const listingQueryById = requestedListingQueryId
    ? (listingQueries.find((entry) => entry.id === requestedListingQueryId) ?? null)
    : null;
  const listingQueryByName = requestedListingQueryName
    ? (listingQueries.find((entry) => entry.name === requestedListingQueryName) ?? null)
    : null;
  if (
    requestedListingQueryId &&
    listingQueryByName &&
    listingQueryByName.id !== requestedListingQueryId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const listingQueryFromCurrent = currentCatalogSource?.listingQueryId
    ? (listingQueries.find((entry) => entry.id === currentCatalogSource.listingQueryId) ?? null)
    : null;
  const listingQuery = listingQueryById ?? listingQueryByName ?? listingQueryFromCurrent;
  const listingTemplateById = requestedListingTemplateId
    ? (listingTemplates.find((entry) => entry.id === requestedListingTemplateId) ?? null)
    : null;
  const listingTemplateBySlug = requestedListingTemplateSlug
    ? (listingTemplates.find((entry) => entry.slug === requestedListingTemplateSlug) ?? null)
    : null;
  if (
    requestedListingTemplateId &&
    listingTemplateBySlug &&
    listingTemplateBySlug.id !== requestedListingTemplateId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const listingTemplateFromCurrent = currentCatalogSource?.listingTemplateId
    ? (listingTemplates.find((entry) => entry.id === currentCatalogSource.listingTemplateId) ??
      null)
    : null;
  const listingTemplate =
    listingTemplateById ?? listingTemplateBySlug ?? listingTemplateFromCurrent;
  const form = action.input.formEmbed
    ? (forms.find((entry) => entry.name === action.input.formEmbed?.formName) ??
      (currentFormSource?.formId
        ? forms.find((entry) => entry.id === currentFormSource.formId)
        : null) ??
      null)
    : null;

  if (
    (!simplePageMode && (!listingQuery || !listingTemplate)) ||
    (action.input.formEmbed && !form)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }

  const resolvedFormEmbed =
    form && action.input.formEmbed
      ? {
          formId: form.id,
          title: action.input.formEmbed.title,
          description: action.input.formEmbed.description,
          submitLabel: action.input.formEmbed.submitLabel,
          successMessage: action.input.formEmbed.successMessage,
        }
      : null;
  const resolvedCollectionLink = await resolveAssistantPageCollectionLink({
    action,
    existing,
    simplePageMode,
    listingQuery,
    listingTemplate,
    deps,
  });
  const data = simplePageMode
    ? buildSimplePageData({
        introTitle: action.input.introTitle,
        introBody: action.input.introBody,
        sections: action.input.sections,
        formEmbed: resolvedFormEmbed,
        collectionLink: resolvedCollectionLink,
      })
    : buildCatalogPageData({
        introTitle: action.input.introTitle,
        introBody: action.input.introBody,
        listingQueryId: listingQuery!.id,
        listingTemplateId: listingTemplate!.id,
        ctaLabel: action.input.ctaLabel ?? "Read more",
        contentListStyle: action.input.contentListStyle,
        listingFilters: action.input.listingFilters,
        sections: action.input.sections,
        formEmbed: resolvedFormEmbed,
        collectionLink: resolvedCollectionLink,
      });

  const page =
    preview.operation === "create"
      ? await deps.createPage({
          title: action.input.title,
          slug: action.input.slug,
          data,
          authorId: actorId,
        })
      : preview.operation === "update" && existing
        ? await deps.updatePage(existing.id, {
            title: action.input.title,
            slug: action.input.slug,
            data,
          })
        : existing;

  const pageId = page?.id ?? existing?.id ?? null;
  if (!pageId) {
    throw new Error("assistant_action_dependency_missing");
  }

  if (action.input.status === "published") {
    await deps.publishPage(pageId, actorId, data);
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "page",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: pageId,
    adminHref: `/admin/pages/${encodeURIComponent(pageId)}`,
    publicHref: action.input.slug,
    message:
      preview.operation === "noop"
        ? "Catalog page already matched the plan."
        : "Public catalog page is ready at /projekty-domow.",
  };
};

export const executePageUpdateAction = async (
  action: AssistantPageUpdateAction,
  preview: AssistantActionPreviewChange,
  actorId: string,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getPage(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  const existingSlug = normalizePageActionSlug(existing?.slug);
  const expectedSlug = normalizePageActionSlug(action.input.slug);
  if (
    !existing ||
    existing.title !== action.input.title ||
    existingSlug !== expectedSlug ||
    (expectedStatus && existing.status !== expectedStatus)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }

  const currentData = isRecord(existing.currentData) ? existing.currentData : {};
  const nextData = applyPageUpdatePatch(currentData, action.input.patch);
  const nextTitle = action.input.patch.title ?? existing.title;
  const nextSlug = action.input.patch.slug ?? existing.slug;
  const updated =
    preview.operation === "noop"
      ? existing
      : await deps.updatePage(existing.id, {
          title: nextTitle,
          slug: nextSlug,
          data: nextData,
        });
  if (!updated) throw new Error("assistant_action_dependency_missing");

  const statusPatch = action.input.patch.status;
  const shouldRefreshPublishedPage =
    statusPatch === "published" ||
    (!statusPatch && expectedStatus === "published" && updated.status === "published");
  const publishedSourceData = isRecord(existing.publishedData)
    ? existing.publishedData
    : currentData;
  const publishData =
    statusPatch === "published"
      ? nextData
      : applyPageUpdatePatch(publishedSourceData, action.input.patch);
  const record = shouldRefreshPublishedPage
    ? await deps.publishPage(updated.id, actorId, publishData)
    : statusPatch === "draft" && updated.status === "published"
      ? await deps.unpublishPage(updated.id)
      : updated;
  if (!record) throw new Error("assistant_action_dependency_missing");

  return {
    actionId: action.id,
    type: action.type,
    targetType: "page",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: record.id,
    adminHref: `/admin/pages/${encodeURIComponent(record.id)}`,
    publicHref: record.status === "published" ? record.slug : null,
    message:
      preview.operation === "noop"
        ? "Page metadata already matched the planned patch."
        : `Updated page "${record.title}".`,
  };
};

export const executePageDeleteAction = async (
  action: AssistantPageDeleteAction,
  preview: AssistantActionPreviewChange,
  deps: ActionExecutorDeps
): Promise<AssistantActionExecutionItem> => {
  const existing = await deps.getPage(action.input.id);
  const expectedStatus = action.input.expectedStatus?.trim() ?? "";
  if (
    !existing ||
    existing.title !== action.input.title ||
    normalizePageActionSlug(existing.slug) !== normalizePageActionSlug(action.input.slug) ||
    (expectedStatus && existing.status !== expectedStatus)
  ) {
    throw new Error("assistant_action_dependency_missing");
  }

  const deleted = await deps.deletePage(existing.id);
  if (!deleted) {
    throw new Error("assistant_action_dependency_missing");
  }

  return {
    actionId: action.id,
    type: action.type,
    targetType: "page",
    targetKey: action.input.slug,
    operation: preview.operation,
    status: "success" as const,
    resourceId: deleted.id,
    adminHref: "/admin/pages",
    publicHref: null,
    message: `Deleted page "${deleted.title}".`,
  };
};
