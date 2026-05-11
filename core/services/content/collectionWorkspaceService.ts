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
import { listListingQueries, type ListingQueryRecord } from "./listingQueriesService";
import { listListingTemplates, type ListingTemplateRecord } from "./listingTemplatesService";
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
  reason:
    | "missing_content_route"
    | "canonical_resolution_deferred"
    | "explicit_link_missing"
    | "ambiguous_candidates"
    | "permission_missing";
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
    detailPage: CollectionWorkspaceCandidate | null;
    listPage: CollectionWorkspaceCandidate | null;
    listingQuery: CollectionWorkspaceCandidate | null;
    listingTemplate: CollectionWorkspaceCandidate | null;
    adminScreen: CollectionWorkspaceCandidate | null;
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

export type CollectionWorkspaceSummaryOptions = {
  permissions?: readonly string[];
};

type PageWorkspaceCandidate = CollectionWorkspaceCandidate & {
  listingQueryId: string | null;
  listingTemplateId: string | null;
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

const hasPermission = (permissions: readonly string[], permission: string) =>
  permissions.includes("*") || permissions.includes(permission);

const toPublicPageCandidate = ({
  listingQueryId: _listingQueryId,
  listingTemplateId: _listingTemplateId,
  ...candidate
}: PageWorkspaceCandidate): CollectionWorkspaceCandidate => candidate;

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

  const canonicalCandidates: PageWorkspaceCandidate[] = [];
  const linkedSecondary: PageWorkspaceCandidate[] = [];
  const listingQueryIds = new Set<string>();
  const listingTemplateIds = new Set<string>();

  for (const row of rows) {
    const data = isRecord(row.currentData) ? row.currentData : {};
    const settings = isRecord(data.settings) ? data.settings : {};
    const collectionLink = normalizePageCollectionLink(settings.collectionLink);
    if (!collectionLink || collectionLink.contentTypeId !== contentTypeId) continue;

    const candidate: PageWorkspaceCandidate = {
      id: row.id,
      label: row.title,
      slug: row.slug,
      status: row.status,
      role: collectionLink.pageRole,
      compositionKey: collectionLink.compositionKey ?? null,
      listingQueryId: collectionLink.listingQueryId ?? null,
      listingTemplateId: collectionLink.listingTemplateId ?? null,
      updatedAt: toIso(row.updatedAt),
    };
    if (collectionLink.listingQueryId) listingQueryIds.add(collectionLink.listingQueryId);
    if (collectionLink.listingTemplateId) {
      listingTemplateIds.add(collectionLink.listingTemplateId);
    }

    if (collectionLink.pageRole === "supporting-page") {
      linkedSecondary.push(candidate);
    } else {
      canonicalCandidates.push(candidate);
    }
  }

  return {
    canonicalCandidates,
    candidates: limitCandidates(canonicalCandidates.map(toPublicPageCandidate)),
    linkedSecondary: limitCandidates(linkedSecondary.map(toPublicPageCandidate)),
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

const toListingQueryCandidate = (query: ListingQueryRecord): CollectionWorkspaceCandidate => ({
  id: query.id,
  label: query.name,
  updatedAt: toIso(query.updatedAt),
});

const toListingQueryCandidates = (
  queries: ListingQueryRecord[],
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
      .map(toListingQueryCandidate)
  );

const toListingTemplateCandidate = (
  template: ListingTemplateRecord
): CollectionWorkspaceCandidate => ({
  id: template.id,
  label: template.name,
  slug: template.slug,
  updatedAt: toIso(template.updatedAt),
});

const toListingTemplateCandidates = (
  templates: ListingTemplateRecord[],
  referencedIds: Set<string>
) => {
  if (referencedIds.size === 0) return [];

  return limitCandidates(
    templates.filter((template) => referencedIds.has(template.id)).map(toListingTemplateCandidate)
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
  const canonicalCandidates: CollectionWorkspaceCandidate[] = [];

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
      if (row.collectionRole === "canonical-admin-screen") {
        canonicalCandidates.push(candidate);
      }
    }
  }

  return {
    canonicalCandidates,
    candidates: limitCandidates(candidates),
    linkedSecondary: limitCandidates(linkedSecondary),
  };
};

const emptyPageResult = {
  canonicalCandidates: [] as PageWorkspaceCandidate[],
  candidates: [] as CollectionWorkspaceCandidate[],
  linkedSecondary: [] as CollectionWorkspaceCandidate[],
  listingQueryIds: new Set<string>(),
  listingTemplateIds: new Set<string>(),
};

const emptyAdminScreenResult = {
  canonicalCandidates: [] as CollectionWorkspaceCandidate[],
  candidates: [] as CollectionWorkspaceCandidate[],
  linkedSecondary: [] as CollectionWorkspaceCandidate[],
};

const addUnresolved = (
  unresolved: CollectionWorkspaceUnresolved[],
  resource: CollectionWorkspaceResourceKind,
  reason: CollectionWorkspaceUnresolved["reason"]
) => {
  unresolved.push({ resource, reason });
};

export async function getCollectionWorkspaceSummary(
  contentTypeId: string,
  options: CollectionWorkspaceSummaryOptions = {}
): Promise<CollectionWorkspaceSummary> {
  const contentType = await getContentType(contentTypeId);
  if (!contentType) throw new Error("content_type_not_found");

  const permissions = options.permissions ?? ["content:read"];
  const canReadContent = hasPermission(permissions, "content:read");
  const canReadSettings = hasPermission(permissions, "settings:read");

  const [contentRoute, detailPages, pageResult, adminScreenResult, listingQueries, templates] =
    await Promise.all([
      canReadSettings ? findContentRoute(contentType) : Promise.resolve(null),
      canReadContent ? listDetailPageCandidates(contentType.id) : Promise.resolve([]),
      canReadContent ? listPageCandidates(contentType.id) : Promise.resolve(emptyPageResult),
      canReadContent
        ? listAdminScreenCandidates(contentType.id)
        : Promise.resolve(emptyAdminScreenResult),
      canReadContent ? listListingQueries() : Promise.resolve([]),
      canReadContent ? listListingTemplates() : Promise.resolve([]),
    ]);
  const listingQueryCandidates = toListingQueryCandidates(
    listingQueries,
    contentType.id,
    pageResult.listingQueryIds
  );
  const listingTemplates = toListingTemplateCandidates(templates, pageResult.listingTemplateIds);

  const unresolved: CollectionWorkspaceUnresolved[] = [];
  if (!canReadSettings) {
    addUnresolved(unresolved, "contentRoute", "permission_missing");
  } else if (!contentRoute) {
    addUnresolved(unresolved, "contentRoute", "missing_content_route");
  }

  let canonicalDetailPage: CollectionWorkspaceCandidate | null = null;
  if (!canReadContent || !canReadSettings) {
    addUnresolved(unresolved, "detailPage", "permission_missing");
  } else if (!contentRoute?.detailPageId) {
    addUnresolved(unresolved, "detailPage", "explicit_link_missing");
  } else {
    canonicalDetailPage =
      detailPages.find((detailPage) => detailPage.id === contentRoute.detailPageId) ?? null;
    if (!canonicalDetailPage) {
      addUnresolved(unresolved, "detailPage", "explicit_link_missing");
    }
  }

  let canonicalListPage: PageWorkspaceCandidate | null = null;
  if (!canReadContent) {
    addUnresolved(unresolved, "listPage", "permission_missing");
  } else if (pageResult.canonicalCandidates.length === 1) {
    canonicalListPage = pageResult.canonicalCandidates[0] ?? null;
  } else {
    addUnresolved(
      unresolved,
      "listPage",
      pageResult.canonicalCandidates.length > 1 ? "ambiguous_candidates" : "explicit_link_missing"
    );
  }

  let canonicalListingQuery: CollectionWorkspaceCandidate | null = null;
  if (!canReadContent) {
    addUnresolved(unresolved, "listingQuery", "permission_missing");
  } else if (!canonicalListPage) {
    addUnresolved(unresolved, "listingQuery", "canonical_resolution_deferred");
  } else if (!canonicalListPage.listingQueryId) {
    addUnresolved(unresolved, "listingQuery", "explicit_link_missing");
  } else {
    const query = listingQueries.find((item) => item.id === canonicalListPage?.listingQueryId);
    canonicalListingQuery = query ? toListingQueryCandidate(query) : null;
    if (!canonicalListingQuery) {
      addUnresolved(unresolved, "listingQuery", "explicit_link_missing");
    }
  }

  let canonicalListingTemplate: CollectionWorkspaceCandidate | null = null;
  if (!canReadContent) {
    addUnresolved(unresolved, "listingTemplate", "permission_missing");
  } else if (!canonicalListPage) {
    addUnresolved(unresolved, "listingTemplate", "canonical_resolution_deferred");
  } else if (!canonicalListPage.listingTemplateId) {
    addUnresolved(unresolved, "listingTemplate", "explicit_link_missing");
  } else {
    const template = templates.find((item) => item.id === canonicalListPage?.listingTemplateId);
    canonicalListingTemplate = template ? toListingTemplateCandidate(template) : null;
    if (!canonicalListingTemplate) {
      addUnresolved(unresolved, "listingTemplate", "explicit_link_missing");
    }
  }

  let canonicalAdminScreen: CollectionWorkspaceCandidate | null = null;
  if (!canReadContent) {
    addUnresolved(unresolved, "adminScreen", "permission_missing");
  } else if (adminScreenResult.canonicalCandidates.length === 1) {
    canonicalAdminScreen = adminScreenResult.canonicalCandidates[0] ?? null;
  } else {
    addUnresolved(
      unresolved,
      "adminScreen",
      adminScreenResult.canonicalCandidates.length > 1
        ? "ambiguous_candidates"
        : "explicit_link_missing"
    );
  }

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
      detailPage: canonicalDetailPage,
      listPage: canonicalListPage ? toPublicPageCandidate(canonicalListPage) : null,
      listingQuery: canonicalListingQuery,
      listingTemplate: canonicalListingTemplate,
      adminScreen: canonicalAdminScreen,
    },
    linkedSecondary: {
      pages: pageResult.linkedSecondary,
      adminScreens: adminScreenResult.linkedSecondary,
    },
    unresolved,
    candidates: {
      detailPages,
      pages: pageResult.candidates,
      listingQueries: listingQueryCandidates,
      listingTemplates,
      adminScreens: adminScreenResult.candidates,
    },
  };
}
