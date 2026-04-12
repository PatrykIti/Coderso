import { expect, test } from "vitest";

import {
  createContractOnlyActionPreviewMetadata,
  createPreviewChange,
  redactAssistantPreviewText,
} from "../../../core/services/assistant/actionDiffService";
import { getAssistantActionFamilyContract } from "../../../core/services/assistant/actionFamilyContracts";

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

test("createPreviewChange redacts secret-like preview metadata", () => {
  const change = createPreviewChange({
    action,
    targetType: "content-type",
    targetKey: "products apiKey=sk-test",
    summary: "Update products password=secret",
    warnings: ["Do not expose csrfToken=abc"],
    conflicts: [
      {
        code: "secret_conflict",
        severity: "error",
        message: "Found credential=hidden",
      },
    ],
    dependencies: [
      {
        actionId: "action session=abc",
        targetType: "permission",
        targetKey: "content:write token=abc",
        optional: false,
      },
    ],
    beforeValue: { slug: "old" },
    nextValue: { slug: "products" },
  });

  expect(change.targetKey).toBe("products apiKey=[redacted]");
  expect(change.summary).toBe("Update products password=[redacted]");
  expect(change.warnings).toEqual(["Do not expose csrfToken=[redacted]"]);
  expect(change.conflicts[0]?.message).toBe("Found credential=[redacted]");
  expect(change.dependencies[0]?.actionId).toBe("action session=[redacted]");
  expect(change.dependencies[0]?.targetKey).toBe("content:write token=[redacted]");
});

test("createContractOnlyActionPreviewMetadata emits non-executable conflict metadata", () => {
  const metadata = createContractOnlyActionPreviewMetadata(
    getAssistantActionFamilyContract("entry.upsert-draft")
  );

  expect(metadata.warnings).toEqual([
    "entry.upsert-draft is contract-only until preview and execute adapters land.",
  ]);
  expect(metadata.conflicts).toEqual([
    {
      code: "assistant_action_contract_only",
      severity: "error",
      message: "entry.upsert-draft is documented but not executable yet.",
    },
  ]);
  expect(metadata.dependencies).toEqual([
    {
      actionId: null,
      targetType: "permission",
      targetKey: "content:write",
      optional: false,
    },
  ]);
});

test("redactAssistantPreviewText preserves ordinary copy", () => {
  expect(redactAssistantPreviewText("Update products catalog")).toBe(
    "Update products catalog"
  );
});
