import { describe, expect, test } from "vitest";

import {
  mediaFolderCreateSchema,
  mediaFolderReorderSchema,
  mediaFolderUpdateSchema,
  mediaUpdateSchema,
} from "../../../core/server/validation/mediaSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

describe("mediaUpdateSchema", () => {
  test("accepts all new metadata keys", () => {
    expect(() =>
      validate(mediaUpdateSchema, {
        alt: "a",
        title: "t",
        caption: null,
        folderId: "00000000-0000-0000-0000-000000000000",
        tags: ["one", "two"],
        focalX: 0.5,
        focalY: null,
        description: "desc",
        credit: "credit",
      })
    ).not.toThrow();
  });

  test("accepts a null folderId", () => {
    expect(() => validate(mediaUpdateSchema, { folderId: null })).not.toThrow();
  });

  test("rejects an unknown key", () => {
    expect(() => validate(mediaUpdateSchema, { bogus: 1 })).toThrow("Invalid payload");
  });

  test("rejects a non-array tags value", () => {
    expect(() => validate(mediaUpdateSchema, { tags: "nope" })).toThrow("Invalid payload");
  });
});

describe("mediaFolderCreateSchema", () => {
  test("requires name", () => {
    expect(() => validate(mediaFolderCreateSchema, {})).toThrow("Invalid payload");
  });

  test("accepts a valid create shape", () => {
    expect(() =>
      validate(mediaFolderCreateSchema, {
        name: "Photos",
        slug: "photos",
        parentId: null,
        orderIndex: 2,
      })
    ).not.toThrow();
  });

  test("rejects an unknown key", () => {
    expect(() => validate(mediaFolderCreateSchema, { name: "x", bogus: true })).toThrow(
      "Invalid payload"
    );
  });
});

describe("mediaFolderUpdateSchema", () => {
  test("accepts an empty (all-optional) patch", () => {
    expect(() => validate(mediaFolderUpdateSchema, {})).not.toThrow();
  });

  test("rejects an unknown key", () => {
    expect(() => validate(mediaFolderUpdateSchema, { bogus: 1 })).toThrow("Invalid payload");
  });
});

describe("mediaFolderReorderSchema", () => {
  test("requires orders", () => {
    expect(() => validate(mediaFolderReorderSchema, {})).toThrow("Invalid payload");
  });

  test("accepts orders with optional parentId", () => {
    expect(() =>
      validate(mediaFolderReorderSchema, {
        orders: [
          { id: "a", orderIndex: 0 },
          { id: "b", orderIndex: 1, parentId: null },
          { id: "c", orderIndex: 2, parentId: "a" },
        ],
      })
    ).not.toThrow();
  });

  test("rejects an unknown key inside an order item", () => {
    expect(() =>
      validate(mediaFolderReorderSchema, {
        orders: [{ id: "a", orderIndex: 0, bogus: 1 }],
      })
    ).toThrow("Invalid payload");
  });
});
