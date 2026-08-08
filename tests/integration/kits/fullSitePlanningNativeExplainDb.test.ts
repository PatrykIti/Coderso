import { test } from "bun:test";
import { randomUUID } from "node:crypto";

import { db } from "../../../core/db/client";
import {
  buildFullSitePlanningNativeBatchQueries,
  type FullSitePlanningNativeBatchQuery,
} from "../../../core/services/kits/fullSiteInstall/planningResourceBatchReader";
import type { PlannedPackageResource } from "../../../core/services/kits/fullSitePackage/referenceGraph";
import type {
  FullSiteInstallResourceKind,
  FullSiteResourceIdentity,
} from "../../../core/services/kits/fullSiteInstallTypes";
import type {
  JsonObject,
  PackageResourceCollection,
} from "../../../core/services/kits/fullSitePackage/types";
import { parseManagedEvidenceExplainMetrics } from "../../utils/fullSiteExplainMetrics";

const ALL_QUERY_LABELS = [
  "content_type",
  "form",
  "page_template",
  "listing_template",
  "listing_query",
  "detail_page",
  "page",
  "menu",
  "setting",
  "content_entry",
  "form_field",
  "form_action",
  "menu_item",
] as const;

const COLLECTION_BY_KIND: Readonly<Record<FullSiteInstallResourceKind, PackageResourceCollection>> =
  {
    content_type: "contentTypes",
    form: "forms",
    page_template: "pageTemplates",
    listing_template: "listingTemplates",
    content_entry: "entries",
    listing_query: "listingQueries",
    detail_page: "detailPages",
    page: "pages",
    menu: "menus",
    setting: "settings",
  };

const makeResource = (
  kind: FullSiteInstallResourceKind,
  key: string,
  desired: JsonObject,
  ordinal: number
): PlannedPackageResource =>
  Object.freeze({
    identity: `${kind}:${key}` as FullSiteResourceIdentity,
    kind,
    collection: COLLECTION_BY_KIND[kind],
    key,
    ordinal,
    collectionIndex: ordinal,
    seed: Object.freeze({ key, desired: Object.freeze(desired) }),
    dependencies: Object.freeze([]),
    references: Object.freeze([]),
  });

const noEvidence = (resources: readonly PlannedPackageResource[]) =>
  resources.map((resource) => Object.freeze({ identity: resource.identity, evidence: null }));

const assertBudget = (condition: boolean): void => {
  if (!condition) throw new Error("planning_native_explain_budget_failed");
};

const explainQuery = async (
  profile: "single" | "batch-width",
  requestCount: number,
  descriptor: FullSitePlanningNativeBatchQuery
): Promise<void> => {
  const compiled = descriptor.query.toSQL();
  const parameters = compiled.params.map((value) => {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }
    throw new Error("planning_native_explain_parameter_invalid");
  });
  const rows = await db.$client.unsafe(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${compiled.sql}`,
    parameters
  );
  const metrics = parseManagedEvidenceExplainMetrics(rows[0]?.["QUERY PLAN"]);
  console.info(
    "planning native EXPLAIN profile",
    JSON.stringify({
      profile,
      label: descriptor.label,
      requestCount,
      ...metrics,
    })
  );
  assertBudget(metrics.executionMs <= 1_000);
  assertBudget(metrics.emittedRows <= descriptor.maximumRows);
  assertBudget(metrics.scannedRows <= 100_000);
  assertBudget(metrics.sharedBuffers <= 100_000);
};

const makeSingleResources = (scope: string): readonly PlannedPackageResource[] => {
  const contentTypeId = randomUUID();
  return Object.freeze([
    makeResource("content_type", "type", { slug: `type-${scope}` }, 0),
    makeResource("form", "form", { slug: `form-${scope}` }, 1),
    makeResource("page_template", "page-template", { slug: `page-template-${scope}` }, 2),
    makeResource(
      "listing_template",
      "listing-template",
      {
        slug: `listing-template-${scope}`,
      },
      3
    ),
    makeResource(
      "content_entry",
      "entry",
      {
        contentTypeId,
        slug: `entry-${scope}`,
      },
      4
    ),
    makeResource("listing_query", "listing-query", { name: `Query ${scope}` }, 5),
    makeResource("detail_page", "detail-page", { name: `Detail ${scope}` }, 6),
    makeResource("page", "page", { slug: `page-${scope}` }, 7),
    makeResource("menu", "menu", { name: `Menu ${scope}` }, 8),
    makeResource("setting", `setting-${scope}`, { value: scope }, 9),
  ]);
};

test("planning native SELECTs satisfy compiled-shape and no-migration EXPLAIN budgets", async () => {
  const scope = randomUUID();
  const resources = makeSingleResources(scope);
  const singleQueries = buildFullSitePlanningNativeBatchQueries(
    db,
    { resources, evidence: noEvidence(resources) },
    { forms: [randomUUID()], menus: [randomUUID()] }
  );
  const labels = singleQueries.map(({ label }) => label);
  if (
    labels.length !== ALL_QUERY_LABELS.length ||
    labels.some((label, index) => label !== ALL_QUERY_LABELS[index])
  ) {
    throw new Error("planning_native_explain_shape_invalid");
  }
  const detailQuery = singleQueries.find(({ label }) => label === "detail_page");
  if (!detailQuery) throw new Error("planning_native_explain_shape_invalid");
  const detailSql = detailQuery.query.toSQL().sql;
  if (!detailSql.includes("current_document") || !detailSql.includes("->>'name'")) {
    throw new Error("planning_native_explain_shape_invalid");
  }
  for (const descriptor of singleQueries) {
    await explainQuery("single", 1, descriptor);
  }

  const widthResources = Array.from({ length: 512 }, (_, index) =>
    makeResource("setting", `width-${scope}-${index}`, { value: index }, index)
  );
  const widthBaseQueries = buildFullSitePlanningNativeBatchQueries(db, {
    resources: widthResources,
    evidence: noEvidence(widthResources),
  });
  if (widthBaseQueries.length !== 1 || widthBaseQueries[0]?.label !== "setting") {
    throw new Error("planning_native_explain_shape_invalid");
  }
  await explainQuery("batch-width", 512, widthBaseQueries[0]);

  const parentIds = Array.from({ length: 512 }, () => randomUUID());
  const widthChildQueries = buildFullSitePlanningNativeBatchQueries(
    db,
    { resources: [], evidence: [] },
    { forms: parentIds, menus: parentIds }
  );
  if (
    widthChildQueries.length !== 3 ||
    widthChildQueries.some(({ label }, index) => label !== ALL_QUERY_LABELS[index + 10])
  ) {
    throw new Error("planning_native_explain_shape_invalid");
  }
  for (const descriptor of widthChildQueries) {
    await explainQuery("batch-width", 512, descriptor);
  }
}, 360_000);
