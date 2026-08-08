import { and, asc, inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "../../../db/client";
import {
  contentEntries,
  contentTypes,
  detailPageDocuments,
  formActions,
  formFields,
  forms,
  listingQueries,
  listingTemplates,
  menuItems,
  menus,
  pages,
  pageTemplates,
  settings,
} from "../../../db/schema";
import {
  normalizeFormActionsInput,
  type NormalizedFormAction,
} from "../../forms/formActionsContract";
import {
  FORM_FIELD_SCHEMA_LIMITS,
  normalizeFormFields,
  snapshotFormFieldsWriteShape,
} from "../../forms/validation";
import { normalizeMenuItemSettings } from "../../menus/menuItemSettings";
import type {
  CurrentResourceState,
  FullSiteInstallResourceKind,
  FullSitePlanningResourceBatchReader,
  FullSiteResourceIdentity,
} from "../fullSiteInstallTypes";
import { PACKAGE_LIMITS, type JsonObject } from "../fullSitePackage/types";
import type { PlannedPackageResource } from "../fullSitePackage/referenceGraph";
import {
  CONTENT_ENTRY_PLANNER_EQUALITY_SELECTION,
  CONTENT_TYPE_PLANNER_EQUALITY_SELECTION,
  DETAIL_PAGE_PLANNER_EQUALITY_SELECTION,
  FORM_ACTION_PLANNER_EQUALITY_SELECTION,
  FORM_FIELD_PLANNER_EQUALITY_SELECTION,
  FORM_PLANNER_EQUALITY_SELECTION,
  LISTING_QUERY_PLANNER_EQUALITY_SELECTION,
  LISTING_TEMPLATE_PLANNER_EQUALITY_SELECTION,
  MENU_ITEM_PLANNER_EQUALITY_SELECTION,
  MENU_PLANNER_EQUALITY_SELECTION,
  PAGE_PLANNER_EQUALITY_SELECTION,
  PAGE_TEMPLATE_PLANNER_EQUALITY_SELECTION,
  SETTING_PLANNER_EQUALITY_SELECTION,
} from "./plannerEqualitySelections";

type PlanningDatabase = Pick<typeof db, "select">;
type Evidence = Readonly<{ runId: string; resourceId: string }> | null;
type Request = Readonly<{ resource: PlannedPackageResource; evidence: Evidence }>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORM_FIELD_READ_CAP = FORM_FIELD_SCHEMA_LIMITS.fields;
const RESOURCE_CHILD_READ_CAP = PACKAGE_LIMITS.resourcesPerCollection;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const projectDesired = (template: JsonObject, source: Record<string, unknown>): JsonObject =>
  Object.fromEntries(Object.keys(template).map((key) => [key, source[key] ?? null])) as JsonObject;

const projectPersistedFormActions = (input: unknown): NormalizedFormAction[] =>
  normalizeFormActionsInput(input)
    .sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id))
    .map((action, orderIndex) => ({ ...action, orderIndex }));

const conditionOrFalse = (conditions: SQL[]): SQL =>
  conditions.length === 0 ? sql`false` : (or(...conditions) ?? sql`false`);

const requestByKind = (requests: readonly Request[], kind: FullSiteInstallResourceKind) =>
  requests.filter(({ resource }) => resource.kind === kind);

const candidateIds = (requests: readonly Request[]): string[] =>
  requests.flatMap(({ evidence }) =>
    evidence && UUID_PATTERN.test(evidence.resourceId) ? [evidence.resourceId] : []
  );

const selectRow = <T extends { id: string }>(
  request: Request,
  rows: readonly T[],
  naturalMatch: (row: T) => boolean
): T | null => {
  if (request.evidence) {
    const exact = rows.find((row) => row.id === request.evidence!.resourceId && naturalMatch(row));
    if (exact) return exact;
  }
  return rows.find(naturalMatch) ?? null;
};

const buildContentTypesQuery = (database: PlanningDatabase, requests: readonly Request[]) => {
  const group = requestByKind(requests, "content_type");
  if (group.length === 0) return null;
  const slugs = group.flatMap(({ resource }) => text(resource.seed.desired.slug) ?? []);
  return database
    .select({ id: contentTypes.id, desired: CONTENT_TYPE_PLANNER_EQUALITY_SELECTION })
    .from(contentTypes)
    .where(
      conditionOrFalse([
        ...(candidateIds(group).length ? [inArray(contentTypes.id, candidateIds(group))] : []),
        ...(slugs.length ? [inArray(contentTypes.slug, slugs)] : []),
      ])
    )
    .orderBy(asc(contentTypes.id))
    .limit(group.length * 2 + 1);
};

const readContentTypes = async (database: PlanningDatabase, requests: readonly Request[]) => {
  const query = buildContentTypesQuery(database, requests);
  return query === null ? [] : query;
};

const buildFormsQuery = (database: PlanningDatabase, requests: readonly Request[]) => {
  const group = requestByKind(requests, "form");
  if (group.length === 0) return null;
  const slugs = group.flatMap(({ resource }) => text(resource.seed.desired.slug) ?? []);
  return database
    .select({ id: forms.id, desired: FORM_PLANNER_EQUALITY_SELECTION })
    .from(forms)
    .where(
      conditionOrFalse([
        ...(candidateIds(group).length ? [inArray(forms.id, candidateIds(group))] : []),
        ...(slugs.length ? [inArray(forms.slug, slugs)] : []),
      ])
    )
    .orderBy(asc(forms.id))
    .limit(group.length * 2 + 1);
};

const readForms = async (database: PlanningDatabase, requests: readonly Request[]) => {
  const query = buildFormsQuery(database, requests);
  return query === null ? [] : query;
};

const buildPageTemplatesQuery = (database: PlanningDatabase, requests: readonly Request[]) => {
  const group = requestByKind(requests, "page_template");
  if (group.length === 0) return null;
  const slugs = group.flatMap(({ resource }) => text(resource.seed.desired.slug) ?? []);
  return database
    .select({ id: pageTemplates.id, desired: PAGE_TEMPLATE_PLANNER_EQUALITY_SELECTION })
    .from(pageTemplates)
    .where(
      conditionOrFalse([
        ...(candidateIds(group).length ? [inArray(pageTemplates.id, candidateIds(group))] : []),
        ...(slugs.length ? [inArray(pageTemplates.slug, slugs)] : []),
      ])
    )
    .orderBy(asc(pageTemplates.id))
    .limit(group.length * 2 + 1);
};

const readPageTemplates = async (database: PlanningDatabase, requests: readonly Request[]) => {
  const query = buildPageTemplatesQuery(database, requests);
  return query === null ? [] : query;
};

const buildListingTemplatesQuery = (database: PlanningDatabase, requests: readonly Request[]) => {
  const group = requestByKind(requests, "listing_template");
  if (group.length === 0) return null;
  const slugs = group.flatMap(({ resource }) => text(resource.seed.desired.slug) ?? []);
  return database
    .select({ id: listingTemplates.id, desired: LISTING_TEMPLATE_PLANNER_EQUALITY_SELECTION })
    .from(listingTemplates)
    .where(
      conditionOrFalse([
        ...(candidateIds(group).length ? [inArray(listingTemplates.id, candidateIds(group))] : []),
        ...(slugs.length ? [inArray(listingTemplates.slug, slugs)] : []),
      ])
    )
    .orderBy(asc(listingTemplates.id))
    .limit(group.length * 2 + 1);
};

const readListingTemplates = async (database: PlanningDatabase, requests: readonly Request[]) => {
  const query = buildListingTemplatesQuery(database, requests);
  return query === null ? [] : query;
};

const buildListingQueriesQuery = (database: PlanningDatabase, requests: readonly Request[]) => {
  const group = requestByKind(requests, "listing_query");
  if (group.length === 0) return null;
  const names = group.flatMap(({ resource }) => text(resource.seed.desired.name) ?? []);
  return database
    .select({ id: listingQueries.id, desired: LISTING_QUERY_PLANNER_EQUALITY_SELECTION })
    .from(listingQueries)
    .where(
      conditionOrFalse([
        ...(candidateIds(group).length ? [inArray(listingQueries.id, candidateIds(group))] : []),
        ...(names.length ? [inArray(listingQueries.name, names)] : []),
      ])
    )
    .orderBy(asc(listingQueries.id))
    .limit(group.length * 2 + 1);
};

const readListingQueries = async (database: PlanningDatabase, requests: readonly Request[]) => {
  const query = buildListingQueriesQuery(database, requests);
  return query === null ? [] : query;
};

const buildDetailPagesQuery = (database: PlanningDatabase, requests: readonly Request[]) => {
  const group = requestByKind(requests, "detail_page");
  if (group.length === 0) return null;
  const names = group.flatMap(({ resource }) => text(resource.seed.desired.name) ?? []);
  return database
    .select({ id: detailPageDocuments.id, desired: DETAIL_PAGE_PLANNER_EQUALITY_SELECTION })
    .from(detailPageDocuments)
    .where(
      conditionOrFalse([
        ...(candidateIds(group).length
          ? [inArray(detailPageDocuments.id, candidateIds(group))]
          : []),
        ...(names.length
          ? [inArray(sql<string>`${detailPageDocuments.currentDocument}->>'name'`, names)]
          : []),
      ])
    )
    .orderBy(asc(detailPageDocuments.id))
    .limit(group.length * 2 + 1);
};

const readDetailPages = async (database: PlanningDatabase, requests: readonly Request[]) => {
  const query = buildDetailPagesQuery(database, requests);
  return query === null ? [] : query;
};

const buildPagesQuery = (database: PlanningDatabase, requests: readonly Request[]) => {
  const group = requestByKind(requests, "page");
  if (group.length === 0) return null;
  const slugs = group.flatMap(({ resource }) => text(resource.seed.desired.slug) ?? []);
  return database
    .select({ id: pages.id, desired: PAGE_PLANNER_EQUALITY_SELECTION })
    .from(pages)
    .where(
      conditionOrFalse([
        ...(candidateIds(group).length ? [inArray(pages.id, candidateIds(group))] : []),
        ...(slugs.length ? [inArray(pages.slug, slugs)] : []),
      ])
    )
    .orderBy(asc(pages.id))
    .limit(group.length * 2 + 1);
};

const readPages = async (database: PlanningDatabase, requests: readonly Request[]) => {
  const query = buildPagesQuery(database, requests);
  return query === null ? [] : query;
};

const buildMenusQuery = (database: PlanningDatabase, requests: readonly Request[]) => {
  const group = requestByKind(requests, "menu");
  if (group.length === 0) return null;
  const names = group.flatMap(({ resource }) => text(resource.seed.desired.name) ?? []);
  return database
    .select({ id: menus.id, desired: MENU_PLANNER_EQUALITY_SELECTION })
    .from(menus)
    .where(
      conditionOrFalse([
        ...(candidateIds(group).length ? [inArray(menus.id, candidateIds(group))] : []),
        ...(names.length ? [inArray(menus.name, names)] : []),
      ])
    )
    .orderBy(asc(menus.id))
    .limit(group.length * 2 + 1);
};

const readMenus = async (database: PlanningDatabase, requests: readonly Request[]) => {
  const query = buildMenusQuery(database, requests);
  return query === null ? [] : query;
};

const buildSettingsQuery = (database: PlanningDatabase, requests: readonly Request[]) => {
  const group = requestByKind(requests, "setting");
  if (group.length === 0) return null;
  const keys = group.map(({ resource }) => resource.key);
  return database
    .select({ id: settings.key, desired: SETTING_PLANNER_EQUALITY_SELECTION })
    .from(settings)
    .where(inArray(settings.key, keys))
    .orderBy(asc(settings.key))
    .limit(group.length + 1);
};

const readSettings = async (database: PlanningDatabase, requests: readonly Request[]) => {
  const query = buildSettingsQuery(database, requests);
  return query === null ? [] : query;
};

const resolveContentTypeId = (
  request: Request,
  requests: readonly Request[],
  selectedIds: ReadonlyMap<FullSiteResourceIdentity, string>
): string | null => {
  const value = request.resource.seed.desired.contentTypeId;
  if (typeof value === "string" && UUID_PATTERN.test(value)) return value;
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const reference = value as Readonly<Record<string, unknown>>;
  if (reference.ref !== "content_type" || typeof reference.key !== "string") return null;
  const target = requests.find(
    ({ resource }) => resource.kind === "content_type" && resource.key === reference.key
  );
  return target ? (selectedIds.get(target.resource.identity) ?? null) : null;
};

const buildEntriesQuery = (
  database: PlanningDatabase,
  requests: readonly Request[],
  selectedIds: ReadonlyMap<FullSiteResourceIdentity, string>
) => {
  const group = requestByKind(requests, "content_entry");
  if (group.length === 0) return null;
  const parentIds = group.flatMap(
    (request) => resolveContentTypeId(request, requests, selectedIds) ?? []
  );
  const slugs = group.flatMap(({ resource }) => text(resource.seed.desired.slug) ?? []);
  return database
    .select({ id: contentEntries.id, desired: CONTENT_ENTRY_PLANNER_EQUALITY_SELECTION })
    .from(contentEntries)
    .where(
      conditionOrFalse([
        ...(candidateIds(group).length ? [inArray(contentEntries.id, candidateIds(group))] : []),
        ...(parentIds.length && slugs.length
          ? [and(inArray(contentEntries.typeId, parentIds), inArray(contentEntries.slug, slugs))!]
          : []),
      ])
    )
    .orderBy(asc(contentEntries.id))
    .limit(group.length * 2 + 1);
};

const readEntries = async (
  database: PlanningDatabase,
  requests: readonly Request[],
  selectedIds: ReadonlyMap<FullSiteResourceIdentity, string>
) => {
  const query = buildEntriesQuery(database, requests, selectedIds);
  return query === null ? [] : query;
};

const selectBaseRows = (
  requests: readonly Request[],
  rowsByKind: ReadonlyMap<
    FullSiteInstallResourceKind,
    readonly { id: string; desired: Record<string, unknown> }[]
  >,
  contentTypeIds: ReadonlyMap<FullSiteResourceIdentity, string>
): Map<FullSiteResourceIdentity, { id: string; desired: Record<string, unknown> }> => {
  const selected = new Map<
    FullSiteResourceIdentity,
    { id: string; desired: Record<string, unknown> }
  >();
  for (const request of requests) {
    const rows = rowsByKind.get(request.resource.kind) ?? [];
    const desired = request.resource.seed.desired;
    const row = selectRow(request, rows, (candidate) => {
      if (request.resource.kind === "setting") return candidate.id === request.resource.key;
      if (
        ["content_type", "form", "page_template", "listing_template", "page"].includes(
          request.resource.kind
        )
      ) {
        return text(candidate.desired.slug) === text(desired.slug);
      }
      if (["listing_query", "menu"].includes(request.resource.kind)) {
        return text(candidate.desired.name) === text(desired.name);
      }
      if (request.resource.kind === "detail_page") {
        const document = candidate.desired.currentDocument;
        const record =
          document && !Array.isArray(document) && typeof document === "object"
            ? (document as Record<string, unknown>)
            : null;
        return Boolean(record && text(record.name) === text(desired.name));
      }
      if (request.resource.kind === "content_entry") {
        return (
          text(candidate.desired.slug) === text(desired.slug) &&
          candidate.desired.contentTypeId ===
            resolveContentTypeId(request, requests, contentTypeIds)
        );
      }
      return false;
    });
    if (row) selected.set(request.resource.identity, row);
  }
  return selected;
};

const buildFormFieldsQuery = (database: PlanningDatabase, ids: readonly string[]) =>
  ids.length === 0
    ? null
    : database
        .select({ formId: formFields.formId, desired: FORM_FIELD_PLANNER_EQUALITY_SELECTION })
        .from(formFields)
        .where(inArray(formFields.formId, [...ids]))
        .orderBy(asc(formFields.formId), asc(formFields.orderIndex), asc(formFields.id))
        .limit(ids.length * (FORM_FIELD_READ_CAP + 1));

const buildFormActionsQuery = (database: PlanningDatabase, ids: readonly string[]) =>
  ids.length === 0
    ? null
    : database
        .select({ formId: formActions.formId, desired: FORM_ACTION_PLANNER_EQUALITY_SELECTION })
        .from(formActions)
        .where(inArray(formActions.formId, [...ids]))
        .orderBy(asc(formActions.formId), asc(formActions.orderIndex), asc(formActions.id))
        .limit(ids.length * (RESOURCE_CHILD_READ_CAP + 1));

const readFormChildren = async (database: PlanningDatabase, ids: readonly string[]) => {
  if (ids.length === 0) return { fields: [], actions: [] };
  const fieldsQuery = buildFormFieldsQuery(database, ids);
  const actionsQuery = buildFormActionsQuery(database, ids);
  if (fieldsQuery === null || actionsQuery === null) throw new Error("site_package_invalid");
  const [fields, actions] = await Promise.all([fieldsQuery, actionsQuery]);
  return { fields, actions };
};

const buildMenuItemsQuery = (database: PlanningDatabase, ids: readonly string[]) =>
  ids.length === 0
    ? null
    : database
        .select({ menuId: menuItems.menuId, desired: MENU_ITEM_PLANNER_EQUALITY_SELECTION })
        .from(menuItems)
        .where(inArray(menuItems.menuId, [...ids]))
        .orderBy(asc(menuItems.menuId), asc(menuItems.orderIndex), asc(menuItems.id))
        .limit(ids.length * (RESOURCE_CHILD_READ_CAP + 1));

const readMenuChildren = async (database: PlanningDatabase, ids: readonly string[]) => {
  const query = buildMenuItemsQuery(database, ids);
  return query === null ? [] : query;
};

const assertChildCaps = (
  parentIds: readonly string[],
  fields: readonly { formId: string }[],
  actions: readonly { formId: string }[],
  items: readonly { menuId: string }[]
): void => {
  for (const id of parentIds) {
    if (
      fields.filter((row) => row.formId === id).length > FORM_FIELD_READ_CAP ||
      actions.filter((row) => row.formId === id).length > RESOURCE_CHILD_READ_CAP ||
      items.filter((row) => row.menuId === id).length > RESOURCE_CHILD_READ_CAP
    ) {
      throw new Error("site_package_too_large");
    }
  }
};

const projectCurrent = (
  request: Request,
  row: { id: string; desired: Record<string, unknown> },
  children: Readonly<{
    fields: readonly { formId: string; desired: Record<string, unknown> }[];
    actions: readonly { formId: string; desired: Record<string, unknown> }[];
    menuItems: readonly { menuId: string; desired: Record<string, unknown> }[];
  }>
): CurrentResourceState => {
  const template = request.resource.seed.desired as unknown as JsonObject;
  if (request.resource.kind === "form") {
    const normalizedFields = normalizeFormFields(
      snapshotFormFieldsWriteShape(
        children.fields.filter((child) => child.formId === row.id).map((child) => child.desired)
      )
    ).sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id));
    return {
      id: row.id,
      desired: projectDesired(template, {
        ...row.desired,
        fields: normalizedFields,
        actions: projectPersistedFormActions(
          children.actions.filter((child) => child.formId === row.id).map((child) => child.desired)
        ),
      }),
    };
  }
  if (request.resource.kind === "menu") {
    const envelope =
      row.desired.settings &&
      !Array.isArray(row.desired.settings) &&
      typeof row.desired.settings === "object"
        ? (row.desired.settings as Record<string, unknown>)
        : {};
    return {
      id: row.id,
      desired: projectDesired(template, {
        ...row.desired,
        items: children.menuItems
          .filter((child) => child.menuId === row.id)
          .map(({ desired }) => ({
            ...desired,
            settings: normalizeMenuItemSettings(desired.settings),
          })),
        document: envelope.document,
        appearance: envelope.appearance,
        extras: envelope.extras,
      }),
    };
  }
  if (request.resource.kind === "page") {
    return {
      id: row.id,
      desired: projectDesired(template, {
        slug: row.desired.slug,
        title: row.desired.title,
        status: row.desired.status,
        data: row.desired.currentData,
      }),
    };
  }
  if (request.resource.kind === "detail_page") {
    const document =
      row.desired.currentDocument &&
      !Array.isArray(row.desired.currentDocument) &&
      typeof row.desired.currentDocument === "object"
        ? (row.desired.currentDocument as Record<string, unknown>)
        : {};
    return {
      id: row.id,
      desired: projectDesired(template, {
        ...document,
        name: row.desired.name,
        contentTypeId: row.desired.contentTypeId,
      }),
    };
  }
  return { id: row.id, desired: projectDesired(template, row.desired) };
};

const readPlanningRequests = (
  input: Parameters<FullSitePlanningResourceBatchReader>[0]
): readonly Request[] => {
  if (!Array.isArray(input.resources) || !Array.isArray(input.evidence)) {
    throw new Error("site_package_invalid");
  }
  if (input.resources.length > PACKAGE_LIMITS.resourcesTotal) {
    throw new Error("site_package_too_large");
  }
  if (input.resources.length !== input.evidence.length) throw new Error("site_package_invalid");
  const identities = new Set<FullSiteResourceIdentity>();
  return input.resources.map((resource, index) => {
    const evidence = input.evidence[index];
    if (
      !resource ||
      identities.has(resource.identity) ||
      evidence?.identity !== resource.identity
    ) {
      throw new Error("site_package_invalid");
    }
    identities.add(resource.identity);
    return { resource, evidence: evidence.evidence };
  });
};

type CompilablePlanningQuery = Readonly<{
  toSQL(): Readonly<{ sql: string; params: unknown[] }>;
}>;

export type FullSitePlanningNativeBatchQuery = Readonly<{
  label: string;
  maximumRows: number;
  query: CompilablePlanningQuery;
}>;

const describeQuery = (
  label: string,
  maximumRows: number,
  query: CompilablePlanningQuery | null
): FullSitePlanningNativeBatchQuery[] =>
  query === null ? [] : [Object.freeze({ label, maximumRows, query })];

export const buildFullSitePlanningNativeBatchQueries = (
  database: PlanningDatabase,
  input: Parameters<FullSitePlanningResourceBatchReader>[0],
  parentIds: Readonly<{
    contentTypes?: ReadonlyMap<FullSiteResourceIdentity, string>;
    forms?: readonly string[];
    menus?: readonly string[];
  }> = {}
): readonly FullSitePlanningNativeBatchQuery[] => {
  const requests = readPlanningRequests(input);
  const count = (kind: FullSiteInstallResourceKind) => requestByKind(requests, kind).length;
  const formIds = parentIds.forms ?? [];
  const menuIds = parentIds.menus ?? [];
  return Object.freeze([
    ...describeQuery(
      "content_type",
      count("content_type") * 2 + 1,
      buildContentTypesQuery(database, requests)
    ),
    ...describeQuery("form", count("form") * 2 + 1, buildFormsQuery(database, requests)),
    ...describeQuery(
      "page_template",
      count("page_template") * 2 + 1,
      buildPageTemplatesQuery(database, requests)
    ),
    ...describeQuery(
      "listing_template",
      count("listing_template") * 2 + 1,
      buildListingTemplatesQuery(database, requests)
    ),
    ...describeQuery(
      "listing_query",
      count("listing_query") * 2 + 1,
      buildListingQueriesQuery(database, requests)
    ),
    ...describeQuery(
      "detail_page",
      count("detail_page") * 2 + 1,
      buildDetailPagesQuery(database, requests)
    ),
    ...describeQuery("page", count("page") * 2 + 1, buildPagesQuery(database, requests)),
    ...describeQuery("menu", count("menu") * 2 + 1, buildMenusQuery(database, requests)),
    ...describeQuery("setting", count("setting") + 1, buildSettingsQuery(database, requests)),
    ...describeQuery(
      "content_entry",
      count("content_entry") * 2 + 1,
      buildEntriesQuery(database, requests, parentIds.contentTypes ?? new Map())
    ),
    ...describeQuery(
      "form_field",
      formIds.length * (FORM_FIELD_READ_CAP + 1),
      buildFormFieldsQuery(database, formIds)
    ),
    ...describeQuery(
      "form_action",
      formIds.length * (RESOURCE_CHILD_READ_CAP + 1),
      buildFormActionsQuery(database, formIds)
    ),
    ...describeQuery(
      "menu_item",
      menuIds.length * (RESOURCE_CHILD_READ_CAP + 1),
      buildMenuItemsQuery(database, menuIds)
    ),
  ]);
};

export const readFullSitePlanningResourcesBatch = async (
  database: PlanningDatabase,
  input: Parameters<FullSitePlanningResourceBatchReader>[0]
) => {
  const requests = readPlanningRequests(input);

  const [
    contentTypeRows,
    formRows,
    pageTemplateRows,
    listingTemplateRows,
    listingQueryRows,
    detailRows,
    pageRows,
    menuRows,
    settingRows,
  ] = await Promise.all([
    readContentTypes(database, requests),
    readForms(database, requests),
    readPageTemplates(database, requests),
    readListingTemplates(database, requests),
    readListingQueries(database, requests),
    readDetailPages(database, requests),
    readPages(database, requests),
    readMenus(database, requests),
    readSettings(database, requests),
  ]);
  const initialRows = new Map<
    FullSiteInstallResourceKind,
    readonly { id: string; desired: Record<string, unknown> }[]
  >([
    ["content_type", contentTypeRows],
    ["form", formRows],
    ["page_template", pageTemplateRows],
    ["listing_template", listingTemplateRows],
    ["listing_query", listingQueryRows],
    ["detail_page", detailRows],
    ["page", pageRows],
    ["menu", menuRows],
    ["setting", settingRows],
  ]);
  const contentTypeSelected = selectBaseRows(requests, initialRows, new Map());
  const entryRows = await readEntries(
    database,
    requests,
    new Map(
      [...contentTypeSelected]
        .filter(([identity]) => identity.startsWith("content_type:"))
        .map(([identity, row]) => [identity, row.id])
    )
  );
  const rowsByKind = new Map(initialRows);
  rowsByKind.set("content_entry", entryRows);
  const selected = selectBaseRows(
    requests,
    rowsByKind,
    new Map([...contentTypeSelected].map(([identity, row]) => [identity, row.id]))
  );
  const formIds = [...selected]
    .filter(([identity]) => identity.startsWith("form:"))
    .map(([, row]) => row.id);
  const menuIds = [...selected]
    .filter(([identity]) => identity.startsWith("menu:"))
    .map(([, row]) => row.id);
  const [{ fields, actions }, menuChildren] = await Promise.all([
    readFormChildren(database, formIds),
    readMenuChildren(database, menuIds),
  ]);
  assertChildCaps([...formIds, ...menuIds], fields, actions, menuChildren);

  return Object.freeze(
    requests.map((request) => {
      const row = selected.get(request.resource.identity);
      return Object.freeze({
        identity: request.resource.identity,
        current: row
          ? projectCurrent(request, row, { fields, actions, menuItems: menuChildren })
          : null,
      });
    })
  );
};
