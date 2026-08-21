import { expect, test } from "vitest";

import {
  menuCreateSchema,
  menuItemsSchema,
  menuUpdateSchema,
} from "../../../core/server/validation/menuSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

test("menuCreateSchema accepts draft and published lifecycle status", () => {
  expect(() =>
    validate(menuCreateSchema, {
      name: "Primary",
      location: "primary",
      status: "draft",
    })
  ).not.toThrow();

  expect(() =>
    validate(menuCreateSchema, {
      name: "Footer",
      location: null,
      status: "published",
    })
  ).not.toThrow();
});

test("menuCreateSchema requires explicit nullable location and rejects unknown fields", () => {
  expect(() =>
    validate(menuCreateSchema, {
      name: "Footer",
      location: null,
    })
  ).not.toThrow();

  expect(() =>
    validate(menuCreateSchema, {
      name: "Footer",
    })
  ).toThrow("Invalid payload");

  expect(() =>
    validate(menuCreateSchema, {
      name: "Footer",
      location: null,
      unsafe: true,
    })
  ).toThrow("Invalid payload");
});

test("menuUpdateSchema rejects unknown lifecycle statuses and empty payloads", () => {
  expect(() =>
    validate(menuUpdateSchema, {
      status: "archived",
    })
  ).toThrow("Invalid payload");

  expect(() => validate(menuUpdateSchema, {})).toThrow("Invalid payload");
});

test("menuUpdateSchema rejects unknown fields", () => {
  expect(() =>
    validate(menuUpdateSchema, {
      status: "draft",
      visibility: "public",
    })
  ).toThrow("Invalid payload");
});

test("menuUpdateSchema accepts a document object or null (TASK-499-02)", () => {
  // Deep validation is owned server-side by normalizeMenuDocumentV2ForWrite;
  // the route schema only gates the passthrough shape.
  expect(() =>
    validate(menuUpdateSchema, {
      document: { schemaVersion: 1, sections: [] },
    })
  ).not.toThrow();
  expect(() => validate(menuUpdateSchema, { document: null })).not.toThrow();
  // A non-object/non-null document is rejected at the schema boundary.
  expect(() => validate(menuUpdateSchema, { document: "nope" })).toThrow("Invalid payload");
  // The additionalProperties:false guard still rejects unknown sibling keys.
  expect(() =>
    validate(menuUpdateSchema, { document: { schemaVersion: 1, sections: [] }, bogus: true })
  ).toThrow("Invalid payload");
});

test("menuUpdateSchema document passthrough defers deep validation to the strict menu writer (TASK-542)", () => {
  // The route schema only gates the passthrough SHAPE. The exact-key gate that
  // rejects unknown top-level document keys (e.g. legacy flat `blocks`/`overrides`
  // topology) lives server-side in `normalizeMenuDocumentV2ForWrite`; a widened
  // `additionalProperties` here or a softened writer would silently launder it.
  expect(() =>
    validate(menuUpdateSchema, {
      document: { schemaVersion: 1, sections: [] },
    })
  ).not.toThrow();

  // A legacy flat document passes the SCHEMA boundary but must never be
  // accepted by the strict writer (TASK-542-01 exact-key gate).
  expect(() =>
    validate(menuUpdateSchema, {
      document: { blocks: [], overrides: {} },
    })
  ).not.toThrow();

  // The schema-level reject-unknown guard still rejects unknown SIBLING keys.
  expect(() =>
    validate(menuUpdateSchema, {
      document: { schemaVersion: 1, sections: [] },
      legacyAppearance: true,
    })
  ).toThrow("Invalid payload");
});

test("menuItemsSchema accepts openInNewTab/variant on per-item settings (TASK-499-01)", () => {
  expect(() =>
    validate(menuItemsSchema, {
      items: [
        {
          label: "Sign up",
          href: "/signup",
          settings: { visibility: "all", openInNewTab: true, variant: "button" },
        },
      ],
    })
  ).not.toThrow();
});

test("menuItemsSchema still rejects unknown per-item settings keys (additionalProperties:false)", () => {
  expect(() =>
    validate(menuItemsSchema, {
      items: [
        {
          label: "Sign up",
          href: "/signup",
          settings: { unknownFlag: true },
        },
      ],
    })
  ).toThrow("Invalid payload");

  // The variant enum is closed.
  expect(() =>
    validate(menuItemsSchema, {
      items: [{ label: "X", href: "/x", settings: { variant: "ghost" } }],
    })
  ).toThrow("Invalid payload");
});
