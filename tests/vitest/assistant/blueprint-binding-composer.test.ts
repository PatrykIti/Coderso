import { expect, test } from "vitest";

import { composeBindings } from "../../../core/services/assistant/blueprints/blueprintBindingComposer";
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

test("composeBindings rejects missing and secret-like field references", () => {
  expect(() =>
    composeBindings({
      contentSchema,
      bindings: [
        {
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
  expect(action?.input.bindings).toContainEqual({
    id: "binding-house-projects-catalog-header-title",
    widgetId: "house-projects-catalog-header",
    propPath: "title",
    field: "title",
    mode: "read",
  });
});
