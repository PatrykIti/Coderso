import { and, asc, eq, sql } from "drizzle-orm";

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
import type {
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
  ManagedResourceEvidence,
} from "../fullSiteInstallTypes";
import { PACKAGE_LIMITS, type JsonObject, type ResourceSeed } from "../fullSitePackage/types";
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

const CONTENT_TYPE_PLANNER_EQUALITY_SELECTION = {
  name: contentTypes.name,
  slug: contentTypes.slug,
  schema: contentTypes.schema,
  status: contentTypes.status,
  config: contentTypes.config,
} as const;

const FORM_PLANNER_EQUALITY_SELECTION = {
  name: forms.name,
  slug: forms.slug,
  status: forms.status,
  description: forms.description,
  successMessage: forms.successMessage,
  successRedirectUrl: forms.successRedirectUrl,
  submissionAccess: forms.submissionAccess,
  settings: forms.settings,
} as const;

const FORM_FIELD_PLANNER_EQUALITY_SELECTION = {
  id: formFields.id,
  type: formFields.type,
  label: formFields.label,
  name: formFields.name,
  required: formFields.required,
  settings: formFields.settings,
  orderIndex: formFields.orderIndex,
} as const;

const FORM_ACTION_PLANNER_EQUALITY_SELECTION = {
  id: formActions.id,
  type: formActions.type,
  label: formActions.label,
  enabled: formActions.enabled,
  continueOnError: formActions.continueOnError,
  condition: formActions.condition,
  config: formActions.config,
  orderIndex: formActions.orderIndex,
} as const;

const PAGE_TEMPLATE_PLANNER_EQUALITY_SELECTION = {
  name: pageTemplates.name,
  slug: pageTemplates.slug,
  description: pageTemplates.description,
  category: pageTemplates.category,
  status: pageTemplates.status,
  document: pageTemplates.document,
} as const;

const LISTING_TEMPLATE_PLANNER_EQUALITY_SELECTION = {
  name: listingTemplates.name,
  slug: listingTemplates.slug,
  description: listingTemplates.description,
  layout: listingTemplates.layout,
  config: listingTemplates.config,
} as const;

const CONTENT_ENTRY_ID_SELECTION = {
  id: contentEntries.id,
} as const;

const CONTENT_ENTRY_PLANNER_EQUALITY_SELECTION = {
  contentTypeId: contentEntries.typeId,
  title: contentEntries.title,
  slug: contentEntries.slug,
  status: contentEntries.status,
  data: contentEntries.data,
} as const;

const LISTING_QUERY_PLANNER_EQUALITY_SELECTION = {
  name: listingQueries.name,
  description: listingQueries.description,
  query: listingQueries.query,
} as const;

const DETAIL_PAGE_PLANNER_EQUALITY_SELECTION = {
  name: detailPageDocuments.name,
  contentTypeId: detailPageDocuments.contentTypeId,
  currentDocument: detailPageDocuments.currentDocument,
} as const;

const PAGE_PLANNER_EQUALITY_SELECTION = {
  slug: pages.slug,
  title: pages.title,
  status: pages.status,
  currentData: pages.currentData,
} as const;

const MENU_PLANNER_EQUALITY_SELECTION = {
  name: menus.name,
  location: menus.location,
  status: menus.status,
  settings: menus.settings,
} as const;

const MENU_ITEM_PLANNER_EQUALITY_SELECTION = {
  id: menuItems.id,
  label: menuItems.label,
  href: menuItems.href,
  pageId: menuItems.pageId,
  parentId: menuItems.parentId,
  orderIndex: menuItems.orderIndex,
  settings: menuItems.settings,
} as const;

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

const readNativeDesired = async (
  kind: FullSiteInstallResourceKind,
  id: string,
  template: JsonObject
): Promise<JsonObject | null> => {
  if (kind === "setting") {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, id))
      .orderBy(asc(settings.key))
      .limit(1);
    return row ? ({ value: row.value } as JsonObject) : null;
  }
  if (kind === "content_type") {
    const [row] = await db
      .select(CONTENT_TYPE_PLANNER_EQUALITY_SELECTION)
      .from(contentTypes)
      .where(eq(contentTypes.id, id))
      .orderBy(asc(contentTypes.id))
      .limit(1);
    return row ? projectDesired(template, row) : null;
  }
  if (kind === "form") {
    const [row, fields, actions] = await Promise.all([
      db
        .select(FORM_PLANNER_EQUALITY_SELECTION)
        .from(forms)
        .where(eq(forms.id, id))
        .orderBy(asc(forms.id))
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select(FORM_FIELD_PLANNER_EQUALITY_SELECTION)
        .from(formFields)
        .where(eq(formFields.formId, id))
        .orderBy(asc(formFields.orderIndex), asc(formFields.id))
        .limit(FORM_FIELD_READ_CAP + 1),
      db
        .select(FORM_ACTION_PLANNER_EQUALITY_SELECTION)
        .from(formActions)
        .where(eq(formActions.formId, id))
        .orderBy(asc(formActions.orderIndex), asc(formActions.id))
        .limit(RESOURCE_CHILD_READ_CAP + 1),
    ]);
    if (fields.length > FORM_FIELD_READ_CAP || actions.length > RESOURCE_CHILD_READ_CAP) {
      throw new Error("site_package_too_large");
    }
    if (!row) return null;
    const normalizedFields = normalizeFormFields(
      snapshotFormFieldsWriteShape(
        fields.map((field) => ({
          id: field.id,
          type: field.type,
          label: field.label,
          name: field.name,
          required: field.required,
          settings: field.settings,
          orderIndex: field.orderIndex,
        }))
      )
    ).sort((left, right) => left.orderIndex - right.orderIndex || left.id.localeCompare(right.id));
    return projectDesired(template, {
      ...row,
      fields: normalizedFields,
      actions: projectPersistedFormActions(actions),
    });
  }
  if (kind === "page_template") {
    const [row] = await db
      .select(PAGE_TEMPLATE_PLANNER_EQUALITY_SELECTION)
      .from(pageTemplates)
      .where(eq(pageTemplates.id, id))
      .orderBy(asc(pageTemplates.id))
      .limit(1);
    return row ? projectDesired(template, row) : null;
  }
  if (kind === "listing_template") {
    const [row] = await db
      .select(LISTING_TEMPLATE_PLANNER_EQUALITY_SELECTION)
      .from(listingTemplates)
      .where(eq(listingTemplates.id, id))
      .orderBy(asc(listingTemplates.id))
      .limit(1);
    return row ? projectDesired(template, row) : null;
  }
  if (kind === "content_entry") {
    const [row] = await db
      .select(CONTENT_ENTRY_PLANNER_EQUALITY_SELECTION)
      .from(contentEntries)
      .where(eq(contentEntries.id, id))
      .orderBy(asc(contentEntries.id))
      .limit(1);
    return row ? projectDesired(template, row) : null;
  }
  if (kind === "listing_query") {
    const [row] = await db
      .select(LISTING_QUERY_PLANNER_EQUALITY_SELECTION)
      .from(listingQueries)
      .where(eq(listingQueries.id, id))
      .orderBy(asc(listingQueries.id))
      .limit(1);
    return row ? projectDesired(template, row) : null;
  }
  if (kind === "detail_page") {
    const [row] = await db
      .select(DETAIL_PAGE_PLANNER_EQUALITY_SELECTION)
      .from(detailPageDocuments)
      .where(eq(detailPageDocuments.id, id))
      .orderBy(asc(detailPageDocuments.id))
      .limit(1);
    return row
      ? projectDesired(template, {
          ...(row.currentDocument as Record<string, unknown>),
          name: row.name,
          contentTypeId: row.contentTypeId,
        })
      : null;
  }
  if (kind === "page") {
    const [row] = await db
      .select(PAGE_PLANNER_EQUALITY_SELECTION)
      .from(pages)
      .where(eq(pages.id, id))
      .orderBy(asc(pages.id))
      .limit(1);
    return row
      ? projectDesired(template, {
          slug: row.slug,
          title: row.title,
          status: row.status,
          document: row.currentData,
        })
      : null;
  }
  if (kind === "menu") {
    const [row, itemRows] = await Promise.all([
      db
        .select(MENU_PLANNER_EQUALITY_SELECTION)
        .from(menus)
        .where(eq(menus.id, id))
        .orderBy(asc(menus.id))
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select(MENU_ITEM_PLANNER_EQUALITY_SELECTION)
        .from(menuItems)
        .where(eq(menuItems.menuId, id))
        .orderBy(asc(menuItems.orderIndex), asc(menuItems.id))
        .limit(RESOURCE_CHILD_READ_CAP + 1),
    ]);
    if (itemRows.length > RESOURCE_CHILD_READ_CAP) {
      throw new Error("site_package_too_large");
    }
    if (!row) return null;
    const envelope =
      row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
        ? (row.settings as Record<string, unknown>)
        : {};
    return projectDesired(template, {
      ...row,
      items: itemRows.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        pageId: item.pageId,
        parentId: item.parentId,
        orderIndex: item.orderIndex,
        settings: normalizeMenuItemSettings(item.settings),
      })),
      document: envelope.document,
      appearance: envelope.appearance,
      extras: envelope.extras,
    });
  }
  throw new Error("site_package_resource_kind_invalid");
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const resolveEntryParentTypeId = async (
  seed: ResourceSeed,
  ledger: FullSiteInstallLedgerPort,
  packageKey: string,
  allowLedgerLookup: boolean
): Promise<string | null> => {
  const reference = seed.desired.contentTypeId;
  if (typeof reference === "string") {
    const id = reference.trim();
    return UUID_PATTERN.test(id) ? id : null;
  }
  if (
    !reference ||
    Array.isArray(reference) ||
    typeof reference !== "object" ||
    Object.keys(reference).length !== 2 ||
    reference.ref !== "content_type" ||
    typeof reference.key !== "string"
  ) {
    return null;
  }
  if (!allowLedgerLookup) return null;
  const evidence = await ledger.findManagedResourceEvidence({
    packageKey,
    kind: "content_type",
    key: reference.key,
  });
  return evidence?.successful === true &&
    evidence.rolledBack === false &&
    UUID_PATTERN.test(evidence.resourceId)
    ? evidence.resourceId
    : null;
};

const resolveExpectedResourceIdStrict = async (
  kind: FullSiteInstallResourceKind,
  seed: ResourceSeed,
  expectedId: string,
  ledger: FullSiteInstallLedgerPort,
  packageKey: string,
  allowLedgerLookup: boolean
): Promise<string | null> => {
  if (kind === "setting") {
    const [row] = await db
      .select({ id: settings.key })
      .from(settings)
      .where(and(eq(settings.key, expectedId), eq(settings.key, seed.key)))
      .orderBy(asc(settings.key))
      .limit(1);
    return row?.id ?? null;
  }
  if (!UUID_PATTERN.test(expectedId)) return null;
  const slug = text(seed.desired.slug);
  const name = text(seed.desired.name);
  if (kind === "content_type" && slug) {
    const [row] = await db
      .select({ id: contentTypes.id })
      .from(contentTypes)
      .where(and(eq(contentTypes.id, expectedId), eq(contentTypes.slug, slug)))
      .orderBy(asc(contentTypes.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "form" && slug) {
    const [row] = await db
      .select({ id: forms.id })
      .from(forms)
      .where(and(eq(forms.id, expectedId), eq(forms.slug, slug)))
      .orderBy(asc(forms.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "page_template" && slug) {
    const [row] = await db
      .select({ id: pageTemplates.id })
      .from(pageTemplates)
      .where(and(eq(pageTemplates.id, expectedId), eq(pageTemplates.slug, slug)))
      .orderBy(asc(pageTemplates.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "listing_template" && slug) {
    const [row] = await db
      .select({ id: listingTemplates.id })
      .from(listingTemplates)
      .where(and(eq(listingTemplates.id, expectedId), eq(listingTemplates.slug, slug)))
      .orderBy(asc(listingTemplates.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "content_entry" && slug) {
    const contentTypeId = await resolveEntryParentTypeId(
      seed,
      ledger,
      packageKey,
      allowLedgerLookup
    );
    if (!contentTypeId) return null;
    const [row] = await db
      .select(CONTENT_ENTRY_ID_SELECTION)
      .from(contentEntries)
      .where(
        and(
          eq(contentEntries.id, expectedId),
          eq(contentEntries.typeId, contentTypeId),
          eq(contentEntries.slug, slug)
        )
      )
      .orderBy(asc(contentEntries.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "listing_query" && name) {
    const [row] = await db
      .select({ id: listingQueries.id })
      .from(listingQueries)
      .where(and(eq(listingQueries.id, expectedId), eq(listingQueries.name, name)))
      .orderBy(asc(listingQueries.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "detail_page" && name) {
    const [row] = await db
      .select({ id: detailPageDocuments.id })
      .from(detailPageDocuments)
      .where(
        and(
          eq(detailPageDocuments.id, expectedId),
          sql`${detailPageDocuments.currentDocument}->>'name' = ${name}`
        )
      )
      .orderBy(asc(detailPageDocuments.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "page" && slug) {
    const [row] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.id, expectedId), eq(pages.slug, slug)))
      .orderBy(asc(pages.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "menu" && name) {
    const [row] = await db
      .select({ id: menus.id })
      .from(menus)
      .where(and(eq(menus.id, expectedId), eq(menus.name, name)))
      .orderBy(asc(menus.id))
      .limit(1);
    return row?.id ?? null;
  }
  return null;
};

const resolveNaturalResourceIdDeterministically = async (
  kind: FullSiteInstallResourceKind,
  seed: ResourceSeed,
  ledger: FullSiteInstallLedgerPort,
  packageKey: string,
  allowLedgerLookup: boolean
): Promise<string | null> => {
  if (kind === "setting") {
    const [row] = await db
      .select({ id: settings.key })
      .from(settings)
      .where(eq(settings.key, seed.key))
      .orderBy(asc(settings.key))
      .limit(1);
    return row?.id ?? null;
  }
  const slug = text(seed.desired.slug);
  const name = text(seed.desired.name);
  if (kind === "content_type" && slug) {
    const [row] = await db
      .select({ id: contentTypes.id })
      .from(contentTypes)
      .where(eq(contentTypes.slug, slug))
      .orderBy(asc(contentTypes.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "form" && slug) {
    const [row] = await db
      .select({ id: forms.id })
      .from(forms)
      .where(eq(forms.slug, slug))
      .orderBy(asc(forms.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "page_template" && slug) {
    const [row] = await db
      .select({ id: pageTemplates.id })
      .from(pageTemplates)
      .where(eq(pageTemplates.slug, slug))
      .orderBy(asc(pageTemplates.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "listing_template" && slug) {
    const [row] = await db
      .select({ id: listingTemplates.id })
      .from(listingTemplates)
      .where(eq(listingTemplates.slug, slug))
      .orderBy(asc(listingTemplates.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "content_entry" && slug) {
    const contentTypeId = await resolveEntryParentTypeId(
      seed,
      ledger,
      packageKey,
      allowLedgerLookup
    );
    if (!contentTypeId) return null;
    const [row] = await db
      .select(CONTENT_ENTRY_ID_SELECTION)
      .from(contentEntries)
      .where(and(eq(contentEntries.typeId, contentTypeId), eq(contentEntries.slug, slug)))
      .orderBy(asc(contentEntries.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "listing_query" && name) {
    const [row] = await db
      .select({ id: listingQueries.id })
      .from(listingQueries)
      .where(eq(listingQueries.name, name))
      .orderBy(asc(listingQueries.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "detail_page" && name) {
    const [row] = await db
      .select({ id: detailPageDocuments.id })
      .from(detailPageDocuments)
      .where(sql`${detailPageDocuments.currentDocument}->>'name' = ${name}`)
      .orderBy(asc(detailPageDocuments.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "page" && slug) {
    const [row] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, slug))
      .orderBy(asc(pages.id))
      .limit(1);
    return row?.id ?? null;
  }
  if (kind === "menu" && name) {
    const [row] = await db
      .select({ id: menus.id })
      .from(menus)
      .where(eq(menus.name, name))
      .orderBy(asc(menus.id))
      .limit(1);
    return row?.id ?? null;
  }
  return null;
};

export const createFullSiteCurrentResourceResolver =
  (packageKey: string, ledger: FullSiteInstallLedgerPort): FullSiteCurrentResourceResolver =>
  async (kind, seed, expectedId, managedEvidence) => {
    const allowLedgerLookup = managedEvidence === undefined;
    if (expectedId !== undefined) {
      const id = await resolveExpectedResourceIdStrict(
        kind,
        seed,
        expectedId,
        ledger,
        packageKey,
        allowLedgerLookup
      );
      if (!id) return null;
      const desired = await readNativeDesired(kind, id, seed.desired);
      return desired ? { id, desired } : null;
    }

    const evidence: ManagedResourceEvidence | null = allowLedgerLookup
      ? await ledger.findManagedResourceEvidence({ packageKey, kind, key: seed.key })
      : managedEvidence;
    const evidenceId =
      evidence?.successful === true && evidence.rolledBack === false
        ? await resolveExpectedResourceIdStrict(
            kind,
            seed,
            evidence.resourceId,
            ledger,
            packageKey,
            allowLedgerLookup
          )
        : null;
    const id =
      evidenceId ??
      (await resolveNaturalResourceIdDeterministically(
        kind,
        seed,
        ledger,
        packageKey,
        allowLedgerLookup
      ));
    if (!id) return null;
    const desired = await readNativeDesired(kind, id, seed.desired);
    return desired ? { id, desired } : null;
  };
