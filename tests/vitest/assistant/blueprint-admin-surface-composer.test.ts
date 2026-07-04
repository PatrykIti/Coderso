import { expect, test } from "vitest";

import {
  composeAdminSurface,
  type BlueprintAdminSurfaceCompositionInput,
} from "../../../core/services/assistant/blueprints/blueprintAdminSurfaceComposer";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { HOUSE_PROJECTS_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import type { AssistantCustomScreenUpsertAction } from "../../../core/services/assistant/actionPlanTypes";
import type { ScreenBlockV1 } from "../../../core/services/customScreens/customScreenSchemas";

const contentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    areaM2: { type: "number" },
    rooms: { type: "number" },
    projectStatus: { type: "string" },
  },
} satisfies Record<string, unknown>;

const baseInput = {
  key: "projects",
  contentSchema,
  header: {
    eyebrow: "Projects",
    subtitle: "Review project fields.",
    description: "Use this surface for catalog review.",
    badge: "active",
  },
  columns: {
    leftTitle: "Project facts",
    rightTitle: "Status",
  },
  groups: [],
} satisfies BlueprintAdminSurfaceCompositionInput;

const collectBlocks = (blocks: ScreenBlockV1[]) => {
  const collected: ScreenBlockV1[] = [];
  const visit = (items: ScreenBlockV1[]) => {
    items.forEach((block) => {
      collected.push(block);
      if (block.slots) {
        Object.values(block.slots).forEach(visit);
      }
      if (block.children) {
        visit(block.children);
      }
    });
  };
  visit(blocks);
  return collected;
};

test("composeAdminSurface merges admin groups into deterministic screen blocks", () => {
  const surface = composeAdminSurface({
    ...baseInput,
    groups: [
      {
        key: "facts",
        title: "Facts",
        description: "Primary project facts.",
        column: "left",
        fields: [
          {
            key: "area",
            label: "Area",
            helper: "Built area.",
            field: "areaM2",
            tone: "strong",
          },
        ],
      },
      {
        key: "facts",
        title: "Facts",
        description: "Primary project facts.",
        column: "left",
        fields: [
          {
            key: "rooms",
            label: "Rooms",
            helper: "Room count.",
            field: "rooms",
          },
        ],
      },
      {
        key: "workflow",
        title: "Workflow",
        description: "Operational state.",
        column: "right",
        fields: [
          {
            key: "status",
            label: "Status",
            helper: "Publication state.",
            field: "projectStatus",
            tone: "muted",
            placeholderValue: "status",
          },
        ],
      },
    ],
  });

  expect(surface.bindings).toEqual([]);
  expect(surface.blocks.map((block) => block.id)).toEqual(["projects-header", "projects-columns"]);
  const columns = surface.blocks[1];
  expect(columns?.type).toBe("columns");
  expect(columns?.slots?.left?.map((block) => block.id)).toEqual(["projects-facts-group"]);
  expect(columns?.slots?.right?.map((block) => block.id)).toEqual(["projects-workflow-group"]);
  expect(columns?.slots?.left?.[0]?.slots?.content?.map((block) => block.id)).toEqual([
    "projects-area",
    "projects-rooms",
  ]);
  expect(columns?.slots?.right?.[0]?.slots?.content?.[0]?.data.value).toBe("status");
});

test("composeAdminSurface preserves the current catalog screen block shape", () => {
  const plan = buildCatalogFamilyPlan(HOUSE_PROJECTS_CATALOG_PRESET);
  const action = plan.actions.find(
    (entry): entry is AssistantCustomScreenUpsertAction => entry.type === "custom-screen.upsert"
  );
  const blocks = action?.input.definition.editorView.document.sections[0]?.blocks;

  expect(blocks?.map((block) => block.type)).toEqual(["record-header", "columns"]);
  expect(blocks?.[0]).toMatchObject({
    id: "house-projects-catalog-header",
    data: {
      eyebrow: "House projects",
      title: "Record overview",
      badge: "available",
    },
  });
  expect(blocks?.[1]?.slots?.left?.[0]?.slots?.content?.map((block) => block.id)).toEqual([
    "house-projects-catalog-area",
    "house-projects-catalog-rooms",
    "house-projects-catalog-bathrooms",
    "house-projects-catalog-floors",
  ]);
  expect(blocks?.[1]?.slots?.right?.[0]?.slots?.content?.[2]?.data.value).toBe("status");
});

test("composeAdminSurface rejects missing schema field references", () => {
  expect(() =>
    composeAdminSurface({
      ...baseInput,
      groups: [
        {
          key: "facts",
          title: "Facts",
          description: "Primary facts.",
          column: "left",
          fields: [
            {
              key: "missing",
              label: "Missing",
              helper: "Missing field.",
              field: "doesNotExist",
            },
          ],
        },
      ],
    })
  ).toThrow("assistant_blueprint_admin_surface_field_missing");
});

test("composeAdminSurface rejects conflicting duplicate field keys", () => {
  expect(() =>
    composeAdminSurface({
      ...baseInput,
      groups: [
        {
          key: "facts",
          title: "Facts",
          description: "Primary facts.",
          column: "left",
          fields: [
            {
              key: "metric",
              label: "Area",
              helper: "Built area.",
              field: "areaM2",
            },
          ],
        },
        {
          key: "facts",
          title: "Facts",
          description: "Primary facts.",
          column: "left",
          fields: [
            {
              key: "metric",
              label: "Rooms",
              helper: "Room count.",
              field: "rooms",
            },
          ],
        },
      ],
    })
  ).toThrow("assistant_blueprint_admin_surface_duplicate_field");
});

test("composeAdminSurface rejects secret-like field references", () => {
  expect(() =>
    composeAdminSurface({
      ...baseInput,
      allowedFields: ["apiToken"],
      groups: [
        {
          key: "secrets",
          title: "Secrets",
          description: "Unsafe fields.",
          column: "left",
          fields: [
            {
              key: "api-token",
              label: "API token",
              helper: "Should never render.",
              field: "apiToken",
            },
          ],
        },
      ],
    })
  ).toThrow("assistant_blueprint_admin_surface_secret_field");
});

test("composeAdminSurface keeps generated blocks inside the custom-screen-builder widget surface", () => {
  const surface = composeAdminSurface({
    ...baseInput,
    groups: [
      {
        key: "facts",
        title: "Facts",
        description: "Primary project facts.",
        column: "left",
        fields: [
          {
            key: "area",
            label: "Area",
            helper: "Built area.",
            field: "areaM2",
          },
        ],
      },
    ],
  });

  const generatedTypes = collectBlocks(surface.blocks).map((block) => block.type);
  expect(generatedTypes).toEqual(["record-header", "field-group", "field"]);
  expect(generatedTypes).not.toEqual(
    expect.arrayContaining(["screen-record-header", "screen-field-group", "screen-field-value"])
  );
});
