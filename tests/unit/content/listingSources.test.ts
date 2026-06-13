import { expect, test } from "bun:test";

import {
  LISTING_SOURCE_DEFINITIONS,
  getListingSourceDefinition,
  isListingFieldAllowed,
} from "../../../core/services/content/listingSources";
import {
  LISTING_SOURCE_DEFINITIONS as PURE_LISTING_SOURCE_DEFINITIONS,
  getListingSourceDefinition as getPureListingSourceDefinition,
  isListingFieldAllowed as isPureListingFieldAllowed,
} from "../../../core/services/content/listingSourceDefinitions";

test("listing source definitions expose all supported sources", () => {
  expect(Object.keys(LISTING_SOURCE_DEFINITIONS).sort()).toEqual([
    "entries",
    "posts",
    "taxonomies",
    "users",
  ]);
});

test("entries source allows data.* dynamic fields", () => {
  const source = getListingSourceDefinition("entries");
  expect(isListingFieldAllowed(source, "data.hero.title")).toBe(true);
  expect(isListingFieldAllowed(source, "passwordHash")).toBe(false);
});

test("posts source keeps the same safe allowlist contract", () => {
  const source = getListingSourceDefinition("posts");
  expect(isListingFieldAllowed(source, "data.document.blocks")).toBe(true);
  expect(isListingFieldAllowed(source, "author.email")).toBe(true);
  expect(isListingFieldAllowed(source, "metadata.secret")).toBe(false);
});

test("users source blocks non-allowlisted fields", () => {
  const source = getListingSourceDefinition("users");
  expect(isListingFieldAllowed(source, "email")).toBe(true);
  expect(isListingFieldAllowed(source, "data.bio")).toBe(false);
});

test("pure listing source definitions match runtime allowlists", () => {
  expect(Object.keys(PURE_LISTING_SOURCE_DEFINITIONS).sort()).toEqual(
    Object.keys(LISTING_SOURCE_DEFINITIONS).sort()
  );
  const source = getPureListingSourceDefinition("entries");
  expect(isPureListingFieldAllowed(source, "data.hero.title")).toBe(true);
  expect(isPureListingFieldAllowed(source, "passwordHash")).toBe(false);
});
