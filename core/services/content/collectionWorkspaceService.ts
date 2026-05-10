import { desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { customScreens, pages } from "../../db/schema";
import {
  getSetting,
  normalizeContentRoutes,
  type ContentRouteSetting,
} from "../settings/settingsService";
import { normalizePageCollectionLink } from "../pages/pageCollectionLink";
import { listDetailPageDocuments } from "./detailPageDocumentService";
import { listListingQueries } from "./listingQueriesService";
import { listListingTemplates } from "./listingTemplatesService";
import { getContentType, type ContentTypeRecord } from "./typeService";

const candidateLimit = 8;

export type CollectionWorkspaceResourceKind =
  | "contentRoute"
  | "detailPage"
  | "listPage"
  | "listingQuery"
  | "listingTemplate"
  | "adminScreen";

export type CollectionWorkspaceUnresolved = {
  resource: CollectionWorkspaceResourceKind;
  reason: "missing_content_route" | "canonical_resolution_deferred" | "explicit_link_missing";
};

export type CollectionWorkspaceRouteSummary = ContentRouteSetting;

export type CollectionWorkspaceCandidate = {
  id: string;
  label: string;
  status?: string | null;
  slug?: string | null;
  role?: string | null;
  compositionKey?: string | null;
  updatedAt?: string | null;
};

export type CollectionWorkspaceSummary = {
  contentType: {
    id: string;
    name: string;
    slug: string;
    status: string;
    fieldCount: number;
    updatedAt: string;
  };
  canonical: {
    contentRoute: CollectionWorkspaceRouteSummary | null;
    detailPage: null;
    listPage: null;
    listingQuery: null;
    listingTemplate: null;
    adminScreen: null;
  };
  linkedSecondary: {
    pages: CollectionWorkspaceCandidate[];
    adminScreens: CollectionWorkspaceCandidate[];
  };
  unresolved: CollectionWorkspaceUnresolved[];
  candidates: {
    detailPages: CollectionWorkspaceCandidate[];
    pages: CollectionWorkspaceCandidate[];
    listingQueries: CollectionWorkspaceCandidate[];
    listingTemplates: CollectionWorkspaceCandidate[];
    adminScreens: CollectionWorkspaceCandidate[];
  };
};

const toIso = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const fieldCountFor = (contentType: ContentTypeRecord) => {
  const schema = contentType.schema;
  if (!isRecord(schema)) return 0;
  const properties = schema.properties;
  if (!isRecord(properties)) return 0;
  return Object.keys(properties).length;
};

const limitCandidates = (items: CollectionWorkspaceCandidate[]) => items.slice(0, candidateLimit);

const findContentRoute = async (contentType: ContentTypeRecord) => {
  const rawRoutes = await getSetting("site.contentRoutes");
  const contentRoutes = normalizeContentRoutes(rawRoutes);
  return contentRoutes.find((route) => route.type === contentType.slug) ?? null;
};

const listPageCandidates = async (contentTypeId: string) => {
  const rows = await db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      status: pages.status,
      currentData: pages.currentData,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .orderBy(desc(pages.updatedAt));

  const candidates: CollectionWorkspaceCandidate[] = [];
  const linkedSecondary: CollectionWorkspaceCandidate[] = [];
  const listingQueryIds = new Set<string>();
  const listingTemplateIds = new Set<string>();

  for (const row of rows) {
    const data = isRecord(row.currentData) ? row.currentData : {};
    const settings = isRecord(data.settings) ? data.settings : {};
    const collectionLink = normalizePageCollectionLink(settings.collectionLink);
    if (!collectionLink || collectionLink.contentTypeId !== contentTypeId) continue;

    const candidate = {
      id: row.id,
      label: row.title,
      slug: row.slug,
      status: row.status,
      role: collectionLink.pageRole,
      compositionKey: collectionLink.compositionKey ?? null,
      updatedAt: toIso(row.updatedAt),
    };
    if (collectionLink.listingQueryId) listingQueryIds.add(collectionLink.listingQueryId);
    if (collectionLink.listingTemplateId) {
      listingTemplateIds.add(collectionLink.listingTemplateId);
    }

    if (collectionLink.pageRole === "supporting-page") {
      linkedSecondary.push(candidate);
    } else {
      candidates.push(candidate);
    }
  }

  return {
    candidates: limitCandidates(candidates),
    linkedSecondary: limitCandidates(linkedSecondary),
    listingQueryIds,
    listingTemplateIds,
  };
};

const listDetailPageCandidates = async (contentTypeId: string) =>
  limitCandidates(
    (await listDetailPageDocuments({ contentTypeId })).map((detailPage) => ({
      id: detailPage.id,
      label: detailPage.name,
      status: detailPage.status,
      updatedAt: toIso(detailPage.updatedAt),
    }))
  );

const toListingQueryCandidates = (
  queries: Awaited<ReturnType<typeof listListingQueries>>,
  contentTypeId: string,
  explicitIds: Set<string>
) =>
  limitCandidates(
    queries
      .filter(
        (query) =>
          (query.query.source === "entries" &&
            query.query.sourceConfig.contentTypeId === contentTypeId) ||
          explicitIds.has(query.id)
      )
      .map((query) => ({
        id: query.id,
        label: query.name,
        updatedAt: toIso(query.updatedAt),
      }))
  );

const listListingTemplateCandidates = async (referencedIds: Set<string>) => {
  if (referencedIds.size === 0) return [];

  return limitCandidates(
    (await listListingTemplates())
      .filter((template) => referencedIds.has(template.id))
      .map((template) => ({
        id: template.id,
        label: template.name,
        slug: template.slug,
        updatedAt: toIso(template.updatedAt),
      }))
  );
};

const listAdminScreenCandidates = async (contentTypeId: string) => {
  const rows = await db
    .select({
      id: customScreens.id,
      name: customScreens.name,
      status: customScreens.status,
      collectionRole: customScreens.collectionRole,
      compositionKey: customScreens.compositionKey,
      updatedAt: customScreens.updatedAt,
    })
    .from(customScreens)
    .where(eq(customScreens.contentTypeId, contentTypeId))
    .orderBy(desc(customScreens.updatedAt));

  const candidates: CollectionWorkspaceCandidate[] = [];
  const linkedSecondary: CollectionWorkspaceCandidate[] = [];

  for (const row of rows) {
    const candidate = {
      id: row.id,
      label: row.name,
      status: row.status,
      role: row.collectionRole ?? null,
      compositionKey: row.compositionKey ?? null,
      updatedAt: toIso(row.updatedAt),
    };

    if (row.collectionRole === "secondary-admin-screen") {
      linkedSecondary.push(candidate);
    } else {
      candidates.push(candidate);
    }
  }

  return {
    candidates: limitCandidates(candidates),
    linkedSecondary: limitCandidates(linkedSecondary),
  };
};

const buildUnresolved = (
  contentRoute: CollectionWorkspaceRouteSummary | null
): CollectionWorkspaceUnresolved[] => [
  ...(contentRoute
    ? []
    : [{ resource: "contentRoute" as const, reason: "missing_content_route" as const }]),
  { resource: "detailPage", reason: "canonical_resolution_deferred" },
  { resource: "listPage", reason: "canonical_resolution_deferred" },
  { resource: "listingQuery", reason: "canonical_resolution_deferred" },
  { resource: "listingTemplate", reason: "canonical_resolution_deferred" },
  { resource: "adminScreen", reason: "canonical_resolution_deferred" },
];

export async function getCollectionWorkspaceSummary(
  contentTypeId: string
): Promise<CollectionWorkspaceSummary> {
  const contentType = await getContentType(contentTypeId);
  if (!contentType) throw new Error("content_type_not_found");

  const [contentRoute, detailPages, pageResult, adminScreenResult, listingQueries] =
    await Promise.all([
      findContentRoute(contentType),
      listDetailPageCandidates(contentType.id),
      listPageCandidates(contentType.id),
      listAdminScreenCandidates(contentType.id),
      listListingQueries(),
    ]);
  const listingQueryCandidates = toListingQueryCandidates(
    listingQueries,
    contentType.id,
    pageResult.listingQueryIds
  );
  const listingTemplates = await listListingTemplateCandidates(pageResult.listingTemplateIds);

  return {
    contentType: {
      id: contentType.id,
      name: contentType.name,
      slug: contentType.slug,
      status: contentType.status,
      fieldCount: fieldCountFor(contentType),
      updatedAt: contentType.updatedAt.toISOString(),
    },
    canonical: {
      contentRoute,
      detailPage: null,
      listPage: null,
      listingQuery: null,
      listingTemplate: null,
      adminScreen: null,
    },
    linkedSecondary: {
      pages: pageResult.linkedSecondary,
      adminScreens: adminScreenResult.linkedSecondary,
    },
    unresolved: buildUnresolved(contentRoute),
    candidates: {
      detailPages,
      pages: pageResult.candidates,
      listingQueries: listingQueryCandidates,
      listingTemplates,
      adminScreens: adminScreenResult.candidates,
    },
  };
}
