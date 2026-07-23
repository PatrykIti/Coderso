import { expect, test } from "vitest";

import {
  composeBindings,
  type BlueprintBindingContribution,
} from "../../../core/services/assistant/blueprints/blueprintBindingComposer";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { HOUSE_PROJECTS_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import type { AssistantCustomScreenUpsertAction } from "../../../core/services/assistant/actionPlanTypes";

const contentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    projectStatus: { type: "string" },
  },
} satisfies Record<string, unknown>;

test("composeBindings returns current custom-screen binding contracts", () => {
  const bindings = composeBindings({
    contentSchema,
    bindings: [
      {
        id: "binding-header-title",
        widgetId: "header-1",
        propPath: "title",
        field: "title",
        mode: "read",
      },
      {
        id: "binding-header-summary",
        widgetId: "header-1",
        propPath: "subtitle",
        field: "summary",
        mode: "read",
      },
    ],
  });

  expect(bindings).toEqual([
    {
      id: "binding-header-title",
      widgetId: "header-1",
      propPath: "title",
      field: "title",
      mode: "read",
    },
    {
      id: "binding-header-summary",
      widgetId: "header-1",
      propPath: "subtitle",
      field: "summary",
      mode: "read",
    },
  ]);
});

test("composeBindings dedupes identical binding ids", () => {
  const bindings = composeBindings({
    contentSchema,
    bindings: [
      {
        id: "binding-header-title",
        widgetId: "header-1",
        propPath: "title",
        field: "title",
        mode: "read",
      },
      {
        id: "binding-header-title",
        widgetId: "header-1",
        propPath: "title",
        field: "title",
        mode: "read",
      },
    ],
  });

  expect(bindings).toHaveLength(1);
  expect(bindings[0]?.id).toBe("binding-header-title");
});

test("composeBindings rejects conflicting contributions with the same normalized id", () => {
  expect(() =>
    composeBindings({
      contentSchema,
      bindings: [
        {
          id: "Binding Header Title",
          widgetId: "header-1",
          propPath: "title",
          field: "title",
          mode: "read",
        },
        {
          id: "binding-header-title",
          widgetId: "header-1",
          propPath: "subtitle",
          field: "summary",
          mode: "read",
        },
      ],
    })
  ).toThrow("assistant_blueprint_binding_duplicate_id");
});

test("composeBindings rejects missing, null, and blank runtime binding ids", () => {
  const invalidRuntimeBindings = [
    {
      label: "missing",
      value: {
        widgetId: "header-1",
        propPath: "title",
        field: "title",
      },
    },
    {
      label: "null",
      value: {
        id: null,
        widgetId: "header-1",
        propPath: "title",
        field: "title",
      },
    },
    {
      label: "blank",
      value: {
        id: "   ",
        widgetId: "header-1",
        propPath: "title",
        field: "title",
      },
    },
  ] as const;

  for (const { label, value } of invalidRuntimeBindings) {
    const binding = value as unknown as BlueprintBindingContribution;
    expect(() => composeBindings({ contentSchema, bindings: [binding] }), label).toThrow(
      "assistant_blueprint_binding_invalid"
    );
  }
});

test("composeBindings rejects missing and secret-like field references", () => {
  expect(() =>
    composeBindings({
      contentSchema,
      bindings: [
        {
          id: "binding-missing-field",
          widgetId: "header-1",
          propPath: "title",
          field: "missing",
        },
      ],
    })
  ).toThrow("assistant_blueprint_binding_field_missing");

  expect(() =>
    composeBindings({
      contentSchema,
      allowedFields: ["apiToken"],
      bindings: [
        {
          id: "binding-secret-field",
          widgetId: "header-1",
          propPath: "title",
          field: "apiToken",
        },
      ],
    })
  ).toThrow("assistant_blueprint_binding_secret_field");
});

test("catalog family custom-screen actions carry binding and canonical metadata", () => {
  const plan = buildCatalogFamilyPlan(HOUSE_PROJECTS_CATALOG_PRESET);
  const action = plan.actions.find(
    (entry): entry is AssistantCustomScreenUpsertAction => entry.type === "custom-screen.upsert"
  );

  expect(action?.input.collectionRole).toBe("canonical-admin-screen");
  expect(action?.input.compositionKey).toBe(HOUSE_PROJECTS_CATALOG_PRESET.key);
  expect(action?.input.definition.editorView.bindings).toContainEqual({
    id: "binding-house-projects-catalog-header-title",
    blockId: "house-projects-catalog-header",
    propPath: "title",
    field: "title",
    mode: "read",
    source: "entry",
  });
});
