import { expect, test } from "vitest";

import { createPreviewChange } from "../../../core/services/assistant/actionDiffService";

const action = {
  id: "content-type-products",
  type: "content-type.upsert",
  title: "Create products",
  description: "Create products content model",
  input: {
    slug: "products",
    name: "Products",
    schema: { type: "object" },
  },
} as const;

test("createPreviewChange emits create/update/noop operations", () => {
  expect(
    createPreviewChange({
      action,
      targetType: "content-type",
      targetKey: "products",
      summary: "Create products",
      beforeValue: null,
      nextValue: { slug: "products" },
    }).operation
  ).toBe("create");

  expect(
    createPreviewChange({
      action,
      targetType: "content-type",
      targetKey: "products",
      summary: "No change",
      beforeValue: { slug: "products" },
      nextValue: { slug: "products" },
    }).operation
  ).toBe("noop");

  expect(
    createPreviewChange({
      action,
      targetType: "content-type",
      targetKey: "products",
      summary: "Update products",
      beforeValue: { slug: "old" },
      nextValue: { slug: "products" },
    }).operation
  ).toBe("update");
});

test("createPreviewChange includes conflict and dependency arrays", () => {
  const change = createPreviewChange({
    action,
    targetType: "content-type",
    targetKey: "products",
    summary: "Update products",
    warnings: ["Check schema"],
    conflicts: [
      {
        code: "schema_conflict",
        severity: "warning",
        message: "Schema differs.",
      },
    ],
    dependencies: [
      {
        actionId: null,
        targetType: "listing-query",
        targetKey: "Products Query",
        optional: false,
      },
    ],
    beforeValue: { slug: "old" },
    nextValue: { slug: "products" },
  });

  expect(change.warnings).toEqual(["Check schema"]);
  expect(change.conflicts).toEqual([
    {
      code: "schema_conflict",
      severity: "warning",
      message: "Schema differs.",
    },
  ]);
  expect(change.dependencies).toEqual([
    {
      actionId: null,
      targetType: "listing-query",
      targetKey: "Products Query",
      optional: false,
    },
  ]);
});
