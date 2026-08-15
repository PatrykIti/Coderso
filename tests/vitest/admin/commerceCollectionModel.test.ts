import { describe, expect, test } from "vitest";

import type { CommerceCollectionRecord } from "../../../core/admin/services/commerceClient";
import {
  draftFromCollection,
  emptyCollectionDraft,
  isCollectionDraftValid,
  toCollectionInput,
} from "../../../core/admin/ui/commerce/commerceCollectionModel";

const collection = (
  overrides: Partial<CommerceCollectionRecord> = {}
): CommerceCollectionRecord => ({
  id: "collection-1",
  name: "Premium",
  slug: "premium",
  description: "Best sellers",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-02T00:00:00.000Z",
  ...overrides,
});

describe("emptyCollectionDraft", () => {
  test("returns a blank draft with no id", () => {
    expect(emptyCollectionDraft()).toEqual({
      id: null,
      name: "",
      slug: "",
      description: "",
    });
  });
});

describe("draftFromCollection", () => {
  test("round-trips a record into a draft", () => {
    expect(draftFromCollection(collection())).toEqual({
      id: "collection-1",
      name: "Premium",
      slug: "premium",
      description: "Best sellers",
    });
  });

  test("normalizes a null description to an empty string", () => {
    expect(draftFromCollection(collection({ description: null })).description).toBe("");
  });
});

describe("toCollectionInput", () => {
  test("trims fields and nullifies blank slug/description", () => {
    const input = toCollectionInput({
      id: "collection-1",
      name: "  Premium  ",
      slug: "  ",
      description: "   ",
    });
    expect(input).toEqual({ name: "Premium", slug: null, description: null });
  });

  test("keeps non-blank slug and description trimmed", () => {
    const input = toCollectionInput({
      id: null,
      name: "Premium",
      slug: " premium-plus ",
      description: " Best sellers ",
    });
    expect(input).toEqual({
      name: "Premium",
      slug: "premium-plus",
      description: "Best sellers",
    });
  });
});

describe("isCollectionDraftValid", () => {
  test("requires a non-blank name", () => {
    expect(isCollectionDraftValid({ id: null, name: "", slug: "", description: "" })).toBe(false);
    expect(isCollectionDraftValid({ id: null, name: "   ", slug: "", description: "" })).toBe(
      false
    );
    expect(isCollectionDraftValid({ id: null, name: "Premium", slug: "", description: "" })).toBe(
      true
    );
  });
});
