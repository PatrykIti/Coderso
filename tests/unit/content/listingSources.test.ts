import { expect, test } from "bun:test";

import {
  LISTING_SOURCE_DEFINITIONS,
  getListingSourceDefinition,
  isListingFieldAllowed,
} from "../../../core/services/content/listingSources";

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
