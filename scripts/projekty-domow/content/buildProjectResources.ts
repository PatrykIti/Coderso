import { validateEntryData } from "../../../core/services/content/validation";
import type {
  JsonObject,
  PackageRef,
  ResourceSeed,
} from "../../../core/services/kits/fullSitePackage/types";
import {
  HOUSE_PROJECT_CATEGORIES,
  HOUSE_PROJECT_ENERGY_CLASSES,
  HOUSE_PROJECT_RESOURCE_KEY,
} from "./constants";
import { PROJECT_FIXTURES, type ProjectFixture } from "./projectFixtures";
import { buildHouseProjectTypeDesired, HOUSE_PROJECT_SCHEMA } from "./projectSchema";
import { cleanJsonObject } from "../json";

const PROJECT_REF: PackageRef = {
  ref: "content_type",
  key: HOUSE_PROJECT_RESOURCE_KEY,
};

const assertProjectRef: (value: unknown) => asserts value is PackageRef = (value) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (value as { ref?: unknown }).ref !== PROJECT_REF.ref ||
    (value as { key?: unknown }).key !== PROJECT_REF.key ||
    Object.keys(value).length !== 2
  ) {
    throw new Error("house_project_content_type_ref_invalid");
  }
};

const assertNoMediaReference = (value: unknown): void => {
  if (Array.isArray(value)) return value.forEach(assertNoMediaReference);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:asset|media)(?:id|ref)?$/i.test(key)) {
      throw new Error("house_project_media_ref_forbidden");
    }
    assertNoMediaReference(child);
  }
};

const fixtureData = (fixture: ProjectFixture): JsonObject => ({
  summary: fixture.summary,
  area: fixture.area,
  style: fixture.style,
  storeys: fixture.storeys,
  rooms: fixture.rooms,
  energyClass: fixture.energyClass,
  category: fixture.category,
  assumptions: [...fixture.assumptions],
  zones: [...fixture.zones],
  visualLabel: fixture.visualLabel,
});

export const normalizeProjectEntryDesired = (value: {
  fixture: ProjectFixture;
  contentTypeId: unknown;
  status: unknown;
}): JsonObject => {
  assertProjectRef(value.contentTypeId);
  if (value.status !== "published") throw new Error("house_project_status_invalid");
  if (!HOUSE_PROJECT_CATEGORIES.includes(value.fixture.category)) {
    throw new Error("house_project_category_invalid");
  }
  if (!HOUSE_PROJECT_ENERGY_CLASSES.includes(value.fixture.energyClass)) {
    throw new Error("house_project_energy_class_invalid");
  }
  if (!value.fixture.key || !value.fixture.slug || !value.fixture.title) {
    throw new Error("house_project_required_value_missing");
  }
  const data = fixtureData(value.fixture);
  assertNoMediaReference(data);
  validateEntryData(HOUSE_PROJECT_RESOURCE_KEY, HOUSE_PROJECT_SCHEMA, data);
  return {
    contentTypeId: { ...PROJECT_REF },
    title: value.fixture.title,
    slug: value.fixture.slug,
    status: "published",
    data,
  };
};

export const buildProjectResources = (): {
  contentTypes: ResourceSeed[];
  entries: ResourceSeed[];
} => {
  const keys = new Set<string>();
  const slugs = new Set<string>();
  for (const fixture of PROJECT_FIXTURES) {
    if (keys.has(fixture.key)) throw new Error("house_project_key_duplicate");
    if (slugs.has(fixture.slug)) throw new Error("house_project_slug_duplicate");
    keys.add(fixture.key);
    slugs.add(fixture.slug);
  }
  return {
    contentTypes: [
      {
        key: HOUSE_PROJECT_RESOURCE_KEY,
        desired: cleanJsonObject(buildHouseProjectTypeDesired()),
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
