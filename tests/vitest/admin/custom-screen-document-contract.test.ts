import { expect, test } from "vitest";

import {
  buildDefaultListViewDefinition,
  customScreenCreateSchema,
  customScreenDefinitionSchema,
  normalizeCustomScreenDefinition,
  normalizeCustomScreenDefinitionForRead,
  normalizeCustomScreenDefinitionForWrite,
} from "../../../core/services/customScreens/customScreenSchemas";
import { createScreenBlock } from "../../../core/services/customScreens/screenDocumentOps";
import { validate } from "../../../core/server/validation/schemaValidator";
import { buildV4WithBlocks } from "./custom-screen-schema-fixtures";

test("custom screen schemas accept v4 screen documents without definition-owned contentTypeId", () => {
  const definition = {
    schemaVersion: 4,
    listView: {
      columns: [],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      document: {
        schemaVersion: 1,
        sections: [
          {
            id: "section-default",
            type: "section",
            data: { title: "Details" },
            blocks: [
              {
                id: "field-title",
                type: "field",
                data: { label: "Title" },
              },
            ],
          },
        ],
      },
      bindings: [
        {
          id: "field-title-value",
          blockId: "field-title",
          propPath: "value",
          source: "entry",
          field: "title",
          mode: "readwrite",
        },
      ],
      saveMode: "entry",
      interactionMode: "inline",
    },
  };

  expect(() =>
    validate(customScreenCreateSchema, {
      name: "Catalog",
      contentTypeId: "type-1",
      schemaVersion: 4,
      definition,
    })
  ).not.toThrow();

  expect(normalizeCustomScreenDefinition({ definition })).toMatchObject({
    schemaVersion: 4,
    editorView: {
      document: {
        sections: [
          {
            id: "section-default",
            type: "section",
            blocks: [{ id: "field-title", type: "field" }],
          },
        ],
      },
      bindings: [
        {
          blockId: "field-title",
          source: "entry",
          field: "title",
        },
      ],
    },
  });

  expect(() =>
    normalizeCustomScreenDefinition({
      definition: {
        ...definition,
        contentTypeId: "type-1",
      },
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("custom screen schemas accept strict v4 row templates and reject unknown rowTemplate keys", () => {
  const definition = {
    schemaVersion: 4,
    listView: {
      columns: [
        {
          id: "field-headline",
          source: "field",
          field: "headline",
          label: "Headline",
          formatter: "text",
          visible: true,
        },
      ],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" },
      bulkActions: { delete: true, publish: true, unpublish: true },
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "row-template",
              type: "section",
              data: { title: "Row" },
              blocks: [{ id: "row-headline", type: "field", data: { label: "Headline" } }],
            },
          ],
        },
        bindings: [
          {
            id: "row-headline-value",
            blockId: "row-headline",
            propPath: "value",
            source: "entry",
            field: "headline",
            mode: "readwrite",
          },
        ],
      },
    },
    editorView: {
      document: { schemaVersion: 1, sections: [] },
      bindings: [],
      saveMode: "entry",
      interactionMode: "inline",
    },
  };

  expect(() =>
    validate(customScreenCreateSchema, {
      name: "Catalog",
      contentTypeId: "type-1",
      schemaVersion: 4,
      definition,
    })
  ).not.toThrow();

  expect(normalizeCustomScreenDefinitionForWrite({ definition })).toMatchObject({
    listView: {
      rowTemplate: {
        bindings: [expect.objectContaining({ field: "headline", mode: "readwrite" })],
      },
    },
  });

  expect(() =>
    normalizeCustomScreenDefinitionForWrite({
      definition: {
        ...definition,
        listView: {
          ...definition.listView,
          rowTemplate: {
            ...definition.listView.rowTemplate,
            unsafe: true,
          },
        },
      },
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenDefinition rejects flat v4 screen document writes", () => {
  expect(() =>
    normalizeCustomScreenDefinition({
      definition: {
        schemaVersion: 4,
        listView: {
          columns: [],
          filters: [],
          defaultSort: { field: "updatedAt", direction: "desc" },
          bulkActions: { delete: true, publish: true, unpublish: true },
        },
        editorView: {
          document: {
            schemaVersion: 1,
            sections: [{ id: "field-title", type: "field", data: { label: "Title" } }],
          },
          bindings: [
            {
              id: "field-title-value",
              blockId: "field-title",
              propPath: "value",
              source: "entry",
              field: "title",
              mode: "readwrite",
            },
          ],
          saveMode: "entry",
          interactionMode: "inline",
        },
      },
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenDefinitionForRead wraps legacy flat v4 screen documents", () => {
  const definition = normalizeCustomScreenDefinitionForRead({
    definition: {
      schemaVersion: 4,
      listView: {
        columns: [],
        filters: [],
        defaultSort: { field: "updatedAt", direction: "desc" },
        bulkActions: { delete: true, publish: true, unpublish: true },
      },
      editorView: {
        document: {
          schemaVersion: 1,
          sections: [{ id: "field-title", type: "field", data: { label: "Title" } }],
        },
        bindings: [
          {
            id: "field-title-value",
            blockId: "field-title",
            propPath: "value",
            source: "entry",
            field: "title",
            mode: "readwrite",
          },
        ],
        saveMode: "entry",
        interactionMode: "inline",
      },
    },
  });

  expect(definition.editorView.document.sections).toHaveLength(1);
  expect(definition.editorView.document.sections[0]).toMatchObject({
    id: "section-default",
    type: "section",
  });
  expect(definition.editorView.document.sections[0]?.blocks[0]).toMatchObject({
    id: "field-title",
    type: "field",
  });
});

test("buildDefaultListViewDefinition derives columns from the selected content type", () => {
  const listView = buildDefaultListViewDefinition({
    id: "house-projects",
    slug: "house-projects",
    name: "House Projects",
    schema: {
      properties: {
        name: { type: "string", title: "Project name" },
        summary: { type: "string", title: "Summary" },
        projectStatus: {
          type: "string",
          enum: ["planned", "active"],
          title: "Project status",
        },
      },
    },
  });

  expect(listView.columns.map((column) => column.field)).toEqual([
    "title",
    "name",
    "summary",
    "projectStatus",
    "updatedAt",
  ]);
  expect(listView.filters[0]).toMatchObject({
    field: "projectStatus",
    label: "Project status",
    operator: "equals",
  });
});

test("normalizeScreenBlockData validates every new data-oriented kind byte-stable", () => {
  const kinds = [
    "heading",
    "text",
    "stat",
    "divider",
    "image",
    "related-list",
    "tabs",
    "button",
  ] as const;
  const blocks = kinds.map((kind) => createScreenBlock({ type: kind }).block);

  const definition = normalizeCustomScreenDefinition({ definition: buildV4WithBlocks(blocks) });
  expect(definition.schemaVersion).toBe(4);
  expect(definition.editorView.document.schemaVersion).toBe(1);
  // Every allow-listed new kind round-trips byte-stable (no key dropped, no throw).
  expect(definition.editorView.document.sections[0]?.blocks).toEqual(blocks);
});

test("normalizeScreenBlockData rejects unknown keys on new kinds but stays permissive on legacy kinds", () => {
  const headingWithUnknown = {
    id: "heading-1",
    type: "heading",
    data: { label: "H", text: "", level: 2, align: "left", bogus: true },
  };
  expect(() =>
    normalizeCustomScreenDefinition({ definition: buildV4WithBlocks([headingWithUnknown]) })
  ).toThrow("custom_screen_definition_invalid");

  // Legacy `field` keeps its permissive normalization (backward-compat).
  const fieldWithExtra = {
    id: "field-1",
    type: "field",
    data: { label: "F", legacyExtra: true },
  };
  expect(() =>
    normalizeCustomScreenDefinition({ definition: buildV4WithBlocks([fieldWithExtra]) })
  ).not.toThrow();
});

test("normalizeCustomScreenDefinitionForRead keeps chip-inserted heading + tabs (base label allow-listed)", () => {
  const heading = createScreenBlock({ type: "heading" }).block;
  const tabs = createScreenBlock({ type: "tabs" }).block;
  const definition = normalizeCustomScreenDefinitionForRead({
    definition: buildV4WithBlocks([heading, tabs]),
  });
  const outBlocks = definition.editorView.document.sections[0]?.blocks ?? [];
  // If "label" were omitted from the heading/tabs allow-list, save-time reject-unknown
  // would throw and ...ForRead would silently drop the block — assert survival.
  expect(outBlocks.map((block) => block.type)).toEqual(["heading", "tabs"]);
  expect(outBlocks[0]?.data.label).toBe(heading.data.label);
  expect(outBlocks[1]?.data.label).toBe(tabs.data.label);
});

test("normalizeCustomScreenDefinitionForRead repairs a stored `actions` block into a usable button", () => {
  // Disjoint fixture from the byte-stable / legacy-widget round-trip cases above:
  // a screen persisted before TASK-498-02 promoted `actions` → `button`.
  const storedActions = {
    id: "cta-1",
    type: "actions",
    data: {
      label: "Publish",
      action: "publish",
      variant: "primary",
      href: "/go",
      legacyOnly: "drop-me", // stray legacy key not in the button allow-list
    },
  };

  const readDefinition = normalizeCustomScreenDefinitionForRead({
    definition: buildV4WithBlocks([storedActions]),
  });
  const readBlock = readDefinition.editorView.document.sections[0]?.blocks[0];
  // READ-PATH repair remaps the placeholder to the typed `button` kind (visual upgrade)…
  expect(readBlock?.type).toBe("button");
  // …and maps an unsupported legacy action to the reserved safe-disabled pair.
  expect(readBlock?.data).toEqual({
    label: "Publish",
    action: "link",
    variant: "primary",
  });

  // `actions` is stored-read compatibility only; every new direct or route write rejects it.
  expect(() =>
    normalizeCustomScreenDefinition({ definition: buildV4WithBlocks([storedActions]) })
  ).toThrow("custom_screen_definition_invalid");
  expect(() => validate(customScreenDefinitionSchema, buildV4WithBlocks([storedActions]))).toThrow(
    "Invalid payload"
  );
});
