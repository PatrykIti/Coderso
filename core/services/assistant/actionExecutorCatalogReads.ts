// Action-executor catalog/page read models (TASK-569-01). Bodies are byte-identical to the legacy monolith.

import { composeBlueprintPageData } from "./blueprints/blueprintPageSectionComposer";
import { normalizePageCollectionLink, type PageCollectionLink } from "../pages/pageCollectionLink";
import type { PageSectionV2 } from "../pages/pageDocumentV2";
import type { AssistantPageUpsertAction } from "./actionPlanTypes";
import type {
  ListingResourceReferenceTarget,
  ListingResourceReference,
  ActionExecutorDeps,
} from "./actionExecutorTypes";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readCatalogBlockSource = (page: unknown) => {
  if (!isRecord(page)) return null;
  const sourceData = isRecord(page.currentData)
    ? page.currentData
    : isRecord(page.publishedData)
      ? page.publishedData
      : null;
  if (!sourceData) return null;
  const sections = Array.isArray(sourceData.sections) ? sourceData.sections : [];
  const blocks = sections.flatMap((section) =>
    isRecord(section) && Array.isArray(section.blocks) ? section.blocks : []
  );

  for (const block of blocks) {
    if (!isRecord(block)) continue;
    const props = isRecord(block.props) ? block.props : {};
    const listingQueryId = readString(props.queryId) ?? readString(props.listingQueryId);
    const listingTemplateId = readString(props.templateId) ?? readString(props.listingTemplateId);
    if (!listingQueryId && !listingTemplateId) continue;
    return { listingQueryId, listingTemplateId };
  }

  return null;
};

export const readStoredPageCollectionLink = (page: unknown) => {
  if (!isRecord(page)) return null;
  const sourceData = isRecord(page.currentData)
    ? page.currentData
    : isRecord(page.publishedData)
      ? page.publishedData
      : null;
  if (!sourceData) return null;
  const settings = isRecord(sourceData.settings) ? sourceData.settings : {};
  return normalizePageCollectionLink(settings.collectionLink) ?? null;
};

export const readPageCatalogSource = (page: unknown) => {
  const stored = readStoredPageCollectionLink(page);
  const blocks = readCatalogBlockSource(page);
  if (!stored && !blocks) return null;
  return {
    listingQueryId: stored?.listingQueryId ?? blocks?.listingQueryId ?? null,
    listingTemplateId: stored?.listingTemplateId ?? blocks?.listingTemplateId ?? null,
    contentTypeId: stored?.contentTypeId ?? null,
  };
};

export const readFormEmbedSource = (page: unknown) => {
  if (!isRecord(page)) return null;
  const sourceData = isRecord(page.currentData)
    ? page.currentData
    : isRecord(page.publishedData)
      ? page.publishedData
      : null;
  if (!sourceData) return null;
  const sections = Array.isArray(sourceData.sections) ? sourceData.sections : [];
  const blocks = sections.flatMap((section) =>
    isRecord(section) && Array.isArray(section.blocks) ? section.blocks : []
  );

  for (const block of blocks) {
    if (!isRecord(block)) continue;
    if (block.type !== "form") continue;
    const props = isRecord(block.props) ? block.props : {};
    const formId = readString(props.formId);
    if (formId) return { formId };
  }

  return null;
};

const valueReferencesListingResource = (value: unknown, target: ListingResourceReferenceTarget) => {
  const visited = new WeakSet<object>();
  let inspected = 0;
  const maxInspected = 5_000;

  const walk = (node: unknown): boolean => {
    inspected += 1;
    if (inspected > maxInspected) return false;
    if (!node || typeof node !== "object") return false;
    if (visited.has(node)) return false;
    visited.add(node);

    if (Array.isArray(node)) {
      return node.some(walk);
    }

    const record = node as Record<string, unknown>;
    const listingQueryId = readString(record.listingQueryId);
    const listingTemplateId = readString(record.listingTemplateId);
    if (target.listingQueryId && listingQueryId === target.listingQueryId) return true;
    if (target.listingTemplateId && listingTemplateId === target.listingTemplateId) return true;

    return Object.values(record).some(walk);
  };

  return walk(value);
};

export const collectListingResourceReferences = async (
  target: ListingResourceReferenceTarget,
  deps: ActionExecutorDeps
) => {
  const references: ListingResourceReference[] = [];
  const pages = await deps.listPages();
  const pageRecords = await Promise.all(pages.map((page) => deps.getPage(page.id)));
  for (const page of pageRecords) {
    if (!page) continue;
    const currentData = isRecord(page.currentData) ? page.currentData : null;
    const publishedData = isRecord(page.publishedData) ? page.publishedData : null;
    if (
      valueReferencesListingResource(currentData, target) ||
      valueReferencesListingResource(publishedData, target)
    ) {
      references.push({
        containerType: "page",
        containerId: page.id,
        containerName: page.title,
        adminHref: `/admin/pages/${encodeURIComponent(page.id)}`,
      });
    }
  }

  const widgetTemplates = await deps.listWidgetTemplates();
  for (const template of widgetTemplates) {
    if (
      valueReferencesListingResource(template.blocks, target) ||
      valueReferencesListingResource(template.settings, target)
    ) {
      references.push({
        containerType: "widget-template",
        containerId: template.id,
        containerName: template.name,
        adminHref: `/admin/advanced/widgets/templates/${encodeURIComponent(template.id)}`,
      });
    }
  }

  return references;
};

export const formatListingReferenceSummary = (references: ListingResourceReference[]) => {
  const pageCount = references.filter((entry) => entry.containerType === "page").length;
  const templateCount = references.filter(
    (entry) => entry.containerType === "widget-template"
  ).length;
  return [
    pageCount > 0 ? `${pageCount} page${pageCount === 1 ? "" : "s"}` : null,
    templateCount > 0 ? `${templateCount} widget template${templateCount === 1 ? "" : "s"}` : null,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" and ");
};

export const buildCatalogPageData = (input: {
  introTitle: string;
  introBody: string;
  sections?: PageSectionV2[];
  listingQueryId: string;
  listingTemplateId: string;
  ctaLabel: string;
  contentListStyle?: {
    columns?: "1" | "2" | "3";
    cardStyle?: "outlined" | "elevated" | "minimal";
  };
  listingFilters?: {
    title: string;
    description: string;
    autoApply: boolean;
    showSearch: boolean;
    searchPlaceholder: string;
    searchLabel: string;
    applyLabel: string;
    facets: Array<Record<string, unknown>>;
  } | null;
  formEmbed?: {
    formId: string;
    title: string;
    description: string;
    submitLabel: string;
    successMessage: string;
  } | null;
  collectionLink?: PageCollectionLink | null;
}) =>
  composeBlueprintPageData({
    introTitle: input.introTitle,
    introBody: input.introBody,
    sections: input.sections,
    listingQueryId: input.listingQueryId,
    listingTemplateId: input.listingTemplateId,
    ctaLabel: input.ctaLabel,
    contentListStyle: input.contentListStyle,
    listingFilters: input.listingFilters,
    formEmbed: input.formEmbed,
    collectionLink: input.collectionLink,
  });

export const buildSimplePageData = (input: {
  introTitle: string;
  introBody: string;
  sections?: PageSectionV2[];
  formEmbed?: {
    formId: string;
    title: string;
    description: string;
    submitLabel: string;
    successMessage: string;
  } | null;
  collectionLink?: PageCollectionLink | null;
}) =>
  composeBlueprintPageData({
    introTitle: input.introTitle,
    introBody: input.introBody,
    sections: input.sections,
    formEmbed: input.formEmbed,
    collectionLink: input.collectionLink,
  });

const readListingQueryContentTypeId = (listingQuery: unknown) => {
  if (!isRecord(listingQuery)) return null;
  const query = isRecord(listingQuery.query) ? listingQuery.query : {};
  const sourceConfig = isRecord(query.sourceConfig) ? query.sourceConfig : {};
  return readString(sourceConfig.contentTypeId);
};

export const resolveAssistantPageCollectionLink = async (input: {
  action: AssistantPageUpsertAction;
  existing: unknown;
  simplePageMode: boolean;
  listingQuery: unknown;
  listingTemplate: unknown;
  deps: Pick<ActionExecutorDeps, "getContentTypeBySlug">;
}): Promise<PageCollectionLink | null> => {
  const existingCollectionLink = readStoredPageCollectionLink(input.existing);
  const requested = input.action.input.collectionLink;

  if (!requested) {
    if (existingCollectionLink) return existingCollectionLink;
    if (input.simplePageMode) return null;

    const contentTypeId = readListingQueryContentTypeId(input.listingQuery);
    if (!contentTypeId) return null;

    return {
      contentTypeId,
      pageRole: "canonical-list-page",
      ...(isRecord(input.listingQuery) && typeof input.listingQuery.id === "string"
        ? { listingQueryId: input.listingQuery.id }
        : {}),
      ...(isRecord(input.listingTemplate) && typeof input.listingTemplate.id === "string"
        ? { listingTemplateId: input.listingTemplate.id }
        : {}),
    };
  }

  const requestedContentTypeId = readString(requested.contentTypeId);
  const requestedContentTypeSlug = readString(requested.contentTypeSlug);
  const requestedListingQueryId = readString(requested.listingQueryId);
  const requestedListingTemplateId = readString(requested.listingTemplateId);
  const requestedListingQueryName = readString(requested.listingQueryName);
  const requestedListingTemplateSlug = readString(requested.listingTemplateSlug);
  const resolvedListingQueryId =
    isRecord(input.listingQuery) && typeof input.listingQuery.id === "string"
      ? input.listingQuery.id
      : null;
  const resolvedListingTemplateId =
    isRecord(input.listingTemplate) && typeof input.listingTemplate.id === "string"
      ? input.listingTemplate.id
      : null;
  if (requestedListingQueryId && !input.listingQuery) {
    throw new Error("assistant_action_dependency_missing");
  }
  if (requestedListingTemplateId && !input.listingTemplate) {
    throw new Error("assistant_action_dependency_missing");
  }
  if (requestedListingQueryName && !input.listingQuery) {
    throw new Error("assistant_action_dependency_missing");
  }
  if (requestedListingTemplateSlug && !input.listingTemplate) {
    throw new Error("assistant_action_dependency_missing");
  }
  if (
    requestedListingQueryId &&
    resolvedListingQueryId &&
    requestedListingQueryId !== resolvedListingQueryId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  if (
    requestedListingTemplateId &&
    resolvedListingTemplateId &&
    requestedListingTemplateId !== resolvedListingTemplateId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const requestedContentType =
    !requestedContentTypeId && requestedContentTypeSlug
      ? await input.deps.getContentTypeBySlug(requestedContentTypeSlug)
      : null;
  const requestedResolvedContentTypeId = requestedContentTypeId ?? requestedContentType?.id ?? null;
  const listingQueryContentTypeId = readListingQueryContentTypeId(input.listingQuery);
  if (
    requestedResolvedContentTypeId &&
    listingQueryContentTypeId &&
    requestedResolvedContentTypeId !== listingQueryContentTypeId
  ) {
    throw new Error("assistant_action_dependency_conflict");
  }
  const contentTypeId =
    requestedResolvedContentTypeId ??
    listingQueryContentTypeId ??
    existingCollectionLink?.contentTypeId ??
    null;
  if (!contentTypeId) {
    throw new Error("assistant_action_dependency_missing");
  }

  const compositionKey = requested.compositionKey ?? existingCollectionLink?.compositionKey ?? null;

  return {
    contentTypeId,
    pageRole: requested.pageRole,
    ...(compositionKey ? { compositionKey } : {}),
    ...(requestedListingQueryId
      ? { listingQueryId: requestedListingQueryId }
      : resolvedListingQueryId
        ? { listingQueryId: resolvedListingQueryId }
        : existingCollectionLink?.listingQueryId
          ? { listingQueryId: existingCollectionLink.listingQueryId }
          : {}),
    ...(requestedListingTemplateId
      ? { listingTemplateId: requestedListingTemplateId }
      : resolvedListingTemplateId
        ? { listingTemplateId: resolvedListingTemplateId }
        : existingCollectionLink?.listingTemplateId
          ? { listingTemplateId: existingCollectionLink.listingTemplateId }
          : {}),
  };
};
