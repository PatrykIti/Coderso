import { validateEntryData } from "../../../core/services/content/validation";
import type {
  JsonObject,
  PackageRef,
  ResourceSeed,
} from "../../../core/services/kits/fullSitePackage/types";
import { HOUSE_PROJECT_CATEGORIES, HOUSE_PROJECT_RESOURCE_KEY } from "./constants";
import {
  PROJECT_FIXTURES,
  type ProjectAssumption,
  type ProjectDetailStat,
  type ProjectFixture,
} from "./projectFixtures";
import {
  buildHouseProjectTypeDesired,
  HOUSE_PROJECT_SCHEMA,
  HOUSE_PROJECT_SCHEMA_LIMITS,
} from "./projectSchema";
import { cleanJsonObject } from "../json";

const PROJECT_REF: PackageRef = {
  ref: "content_type",
  key: HOUSE_PROJECT_RESOURCE_KEY,
};

const EXPECTED_PROJECT_KEYS = ["aurora", "linea", "nova", "mono", "vista", "calm"];
const DETAIL_KEYS = [
  "detailEyebrow",
  "detailLead",
  "detailStats",
  "assumptionsEyebrow",
  "assumptionsTitle",
  "assumptionsLead",
  "assumptions",
] as const;
const FIXTURE_KEYS = new Set([
  "key",
  "title",
  "slug",
  "cardDescription",
  "cardHref",
  "area",
  "categories",
  "referenceOrder",
  "seoDescription",
  ...DETAIL_KEYS,
]);
const DETAIL_STAT_IDS = ["area", "bedrooms", "bathrooms", "energy"];
const ASSUMPTION_IDS = ["living-zone", "private-zone", "facade"];
const CATEGORY_SET = new Set<string>(HOUSE_PROJECT_CATEGORIES);

const fail = (code: string): never => {
  throw new Error(code);
};

const isBoundedString = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= maxLength &&
  value === value.trim();

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const assertProjectRef: (value: unknown) => asserts value is PackageRef = (value) => {
  if (
    !isPlainRecord(value) ||
    value.ref !== PROJECT_REF.ref ||
    value.key !== PROJECT_REF.key ||
    Object.keys(value).length !== 2
  ) {
    fail("house_project_content_type_ref_invalid");
  }
};

const assertNoMediaReference = (value: unknown): void => {
  if (Array.isArray(value)) return value.forEach(assertNoMediaReference);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:asset|media)(?:id|ref)?$/i.test(key)) {
      fail("house_project_media_ref_forbidden");
    }
    assertNoMediaReference(child);
  }
};

const assertCommonFixture = (fixture: ProjectFixture): void => {
  if (
    !isPlainRecord(fixture) ||
    Object.keys(fixture).some((key) => !FIXTURE_KEYS.has(key)) ||
    !isBoundedString(fixture.key, HOUSE_PROJECT_SCHEMA_LIMITS.key) ||
    !isBoundedString(fixture.slug, HOUSE_PROJECT_SCHEMA_LIMITS.slug) ||
    !isBoundedString(fixture.title, HOUSE_PROJECT_SCHEMA_LIMITS.title) ||
    !isBoundedString(fixture.cardDescription, HOUSE_PROJECT_SCHEMA_LIMITS.cardDescription) ||
    !isBoundedString(fixture.seoDescription, HOUSE_PROJECT_SCHEMA_LIMITS.seoDescription) ||
    typeof fixture.area !== "number" ||
    !Number.isFinite(fixture.area) ||
    fixture.area < HOUSE_PROJECT_SCHEMA_LIMITS.area.min ||
    fixture.area > HOUSE_PROJECT_SCHEMA_LIMITS.area.max
  ) {
    fail("house_project_fixture_bounds_invalid");
  }

  if (!Array.isArray(fixture.categories)) fail("house_project_category_invalid");
  if (
    fixture.categories.length < HOUSE_PROJECT_SCHEMA_LIMITS.categories.min ||
    fixture.categories.length > HOUSE_PROJECT_SCHEMA_LIMITS.categories.max ||
    fixture.categories.some((category) => !CATEGORY_SET.has(category))
  ) {
    fail("house_project_category_invalid");
  }
  if (new Set(fixture.categories).size !== fixture.categories.length) {
    fail("house_project_category_duplicate");
  }

  const expectedHref = fixture.key === "aurora" ? "/projekty/aurora" : "/projekty";
  if (fixture.cardHref !== expectedHref) fail("house_project_card_href_invalid");
};

const assertDetailStat = (value: unknown): value is ProjectDetailStat => {
  if (
    !isPlainRecord(value) ||
    Object.keys(value).length !== 3 ||
    !Object.hasOwn(value, "id") ||
    !Object.hasOwn(value, "value") ||
    !Object.hasOwn(value, "label") ||
    !isBoundedString(value.id, HOUSE_PROJECT_SCHEMA_LIMITS.detailStats.id) ||
    !isBoundedString(value.value, HOUSE_PROJECT_SCHEMA_LIMITS.detailStats.value) ||
    !isBoundedString(value.label, HOUSE_PROJECT_SCHEMA_LIMITS.detailStats.label)
  ) {
    fail("house_project_detail_group_invalid");
  }
  return true;
};

const assertAssumption = (value: unknown): value is ProjectAssumption => {
  if (
    !isPlainRecord(value) ||
    Object.keys(value).length !== 3 ||
    !Object.hasOwn(value, "id") ||
    !Object.hasOwn(value, "title") ||
    !Object.hasOwn(value, "description") ||
    !isBoundedString(value.id, HOUSE_PROJECT_SCHEMA_LIMITS.assumptions.id) ||
    !isBoundedString(value.title, HOUSE_PROJECT_SCHEMA_LIMITS.assumptions.title) ||
    !isBoundedString(value.description, HOUSE_PROJECT_SCHEMA_LIMITS.assumptions.description)
  ) {
    fail("house_project_detail_group_invalid");
  }
  return true;
};

const assertDetailGroup = (fixture: ProjectFixture): void => {
  const present = DETAIL_KEYS.filter((key) => Object.hasOwn(fixture, key));
  if (fixture.key !== "aurora") {
    if (present.length > 0) fail("house_project_detail_owner_invalid");
    return;
  }
  if (present.length === 0) fail("house_project_detail_owner_invalid");
  if (present.length !== DETAIL_KEYS.length) fail("house_project_detail_group_invalid");
  const detailStats = fixture.detailStats;
  const assumptions = fixture.assumptions;
  if (
    !isBoundedString(fixture.detailEyebrow, HOUSE_PROJECT_SCHEMA_LIMITS.detailEyebrow) ||
    !isBoundedString(fixture.detailLead, HOUSE_PROJECT_SCHEMA_LIMITS.detailLead) ||
    !isBoundedString(fixture.assumptionsEyebrow, HOUSE_PROJECT_SCHEMA_LIMITS.assumptionsEyebrow) ||
    !isBoundedString(fixture.assumptionsTitle, HOUSE_PROJECT_SCHEMA_LIMITS.assumptionsTitle) ||
    !isBoundedString(fixture.assumptionsLead, HOUSE_PROJECT_SCHEMA_LIMITS.assumptionsLead) ||
    !Array.isArray(detailStats) ||
    detailStats.length !== HOUSE_PROJECT_SCHEMA_LIMITS.detailStats.count ||
    !Array.isArray(assumptions) ||
    assumptions.length !== HOUSE_PROJECT_SCHEMA_LIMITS.assumptions.count
  ) {
    fail("house_project_detail_group_invalid");
  }
  const validDetailStats = detailStats as readonly ProjectDetailStat[];
  const validAssumptions = assumptions as readonly ProjectAssumption[];
  validDetailStats.forEach(assertDetailStat);
  validAssumptions.forEach(assertAssumption);
  if (
    validDetailStats.some((stat, index) => stat.id !== DETAIL_STAT_IDS[index]) ||
    validAssumptions.some((assumption, index) => assumption.id !== ASSUMPTION_IDS[index])
  ) {
    fail("house_project_detail_group_invalid");
  }
};

const assertDeepFrozen = (value: unknown): void => {
  if (!value || typeof value !== "object") return;
  if (!Object.isFrozen(value)) fail("house_project_fixture_not_frozen");
  Object.values(value).forEach(assertDeepFrozen);
};

export const validateProjectFixtures = (fixtures: readonly ProjectFixture[]): void => {
  const keys = new Set<string>();
  const slugs = new Set<string>();
  const orders = new Set<number>();
  for (const fixture of fixtures) {
    if (keys.has(fixture.key)) fail("house_project_key_duplicate");
    if (slugs.has(fixture.slug)) fail("house_project_slug_duplicate");
    if (orders.has(fixture.referenceOrder)) {
      fail("house_project_reference_order_invalid");
    }
    keys.add(fixture.key);
    slugs.add(fixture.slug);
    orders.add(fixture.referenceOrder);
  }
  if (
    fixtures.length !== EXPECTED_PROJECT_KEYS.length ||
    fixtures.some(
      (fixture, index) =>
        fixture.key !== EXPECTED_PROJECT_KEYS[index] ||
        fixture.slug !== EXPECTED_PROJECT_KEYS[index] ||
        !Number.isInteger(fixture.referenceOrder) ||
        fixture.referenceOrder !== index
    )
  ) {
    fail("house_project_reference_order_invalid");
  }
  fixtures.forEach((fixture) => {
    assertCommonFixture(fixture);
    assertDetailGroup(fixture);
  });
};

const fixtureData = (fixture: ProjectFixture): object => ({
  cardDescription: fixture.cardDescription,
  cardHref: fixture.cardHref,
  area: fixture.area,
  categories: [...fixture.categories],
  referenceOrder: fixture.referenceOrder,
  seoDescription: fixture.seoDescription,
  ...(fixture.detailEyebrow === undefined ? {} : { detailEyebrow: fixture.detailEyebrow }),
  ...(fixture.detailLead === undefined ? {} : { detailLead: fixture.detailLead }),
  ...(fixture.detailStats === undefined
    ? {}
    : { detailStats: fixture.detailStats.map((stat) => ({ ...stat })) }),
  ...(fixture.assumptionsEyebrow === undefined
    ? {}
    : { assumptionsEyebrow: fixture.assumptionsEyebrow }),
  ...(fixture.assumptionsTitle === undefined ? {} : { assumptionsTitle: fixture.assumptionsTitle }),
  ...(fixture.assumptionsLead === undefined ? {} : { assumptionsLead: fixture.assumptionsLead }),
  ...(fixture.assumptions === undefined
    ? {}
    : { assumptions: fixture.assumptions.map((assumption) => ({ ...assumption })) }),
});

export const normalizeProjectEntryDesired = (value: {
  fixture: ProjectFixture;
  contentTypeId: unknown;
  status: unknown;
}): JsonObject => {
  assertProjectRef(value.contentTypeId);
  if (value.status !== "published") fail("house_project_status_invalid");
  assertCommonFixture(value.fixture);
  assertDetailGroup(value.fixture);
  const data = fixtureData(value.fixture);
  assertNoMediaReference(data);
  validateEntryData(HOUSE_PROJECT_RESOURCE_KEY, HOUSE_PROJECT_SCHEMA, data);
  return cleanJsonObject({
    contentTypeId: { ...PROJECT_REF },
    title: value.fixture.title,
    slug: value.fixture.slug,
    status: "published",
    data,
  });
};

export const buildProjectResources = (): {
  contentTypes: ResourceSeed[];
  entries: ResourceSeed[];
} => {
  assertDeepFrozen(PROJECT_FIXTURES);
  validateProjectFixtures(PROJECT_FIXTURES);
  return {
    contentTypes: [
      {
        key: HOUSE_PROJECT_RESOURCE_KEY,
        desired: cleanJsonObject(buildHouseProjectTypeDesired("published")),
      },
    ],
    entries: PROJECT_FIXTURES.map((fixture) => ({
      key: fixture.key,
      desired: normalizeProjectEntryDesired({
        fixture,
        contentTypeId: PROJECT_REF,
        status: "published",
      }),
    })),
  };
};
