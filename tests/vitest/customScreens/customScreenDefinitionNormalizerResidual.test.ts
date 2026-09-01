import { expect, test } from "vitest";

import {
  migrateV2DefinitionToV3,
  migrateV2DefinitionToV4,
  normalizeCustomScreenDefinitionForWrite,
  normalizeCustomScreenDefinitionForRead,
} from "../../../core/services/customScreens/customScreenDefinitionNormalizer";
import type { CustomScreenDefinitionV2 } from "../../../core/services/customScreens/customScreenContracts";
import type { CustomScreenDefinitionContext } from "../../../core/services/customScreens/customScreenSchemas";

const contentTypeContext = (): NonNullable<CustomScreenDefinitionContext["contentType"]> => ({
  id: "content-type-1",
  slug: "projects",
  name: "Projects",
  schema: { properties: { name: { type: "string" } } },
});

const makeV2 = (): CustomScreenDefinitionV2 => ({
  schemaVersion: 2,
  listView: {
    columns: [],
    filters: [],
    defaultSort: { field: "updatedAt", direction: "desc" },
    rowClick: "editor-view",
    createMode: "drawer",
    bulkActions: { delete: true, publish: true, unpublish: true },
  },
  editorView: {
    blocks: [
      {
        id: "block-1",
        type: "text",
        data: { content: "Hello" },
      },
    ],
    bindings: [
      {
        id: "block-1-text",
        widgetId: "block-1",
        propPath: "content",
        field: "name",
        mode: "read",
      },
    ],
    saveMode: "entry",
  },
});

test("migrateV2DefinitionToV3 strips v2 list-view keys and normalizes for read", () => {
  const result = migrateV2DefinitionToV3(makeV2(), { contentType: contentTypeContext() });

  expect(result.schemaVersion).toBe(3);
  expect(result.listView).not.toHaveProperty("rowClick");
  expect(result.listView).not.toHaveProperty("createMode");
  expect(result.editorView.blocks[0]).toMatchObject({ id: "block-1", type: "text" });
});

test("migrateV2DefinitionToV4 composes the v3 migration", () => {
  const result = migrateV2DefinitionToV4(makeV2(), { contentType: contentTypeContext() });

  expect(result.schemaVersion).toBe(4);
  expect(result.editorView.document.sections[0]?.blocks[0]).toMatchObject({
    id: "block-1",
    type: "legacy-widget",
    legacyWidgetType: "text",
  });
});

test("normalizeCustomScreenDefinitionForWrite rejects an explicit non-v4 schemaVersion", () => {
  expect(() =>
    normalizeCustomScreenDefinitionForWrite({
      schemaVersion: 3,
      listView: {},
      editorView: {},
    })
  ).toThrow("custom_screen_legacy_write_unsupported");
});

test("normalizeCustomScreenDefinitionForWrite rejects a definition carrying contentTypeId", () => {
  expect(() =>
    normalizeCustomScreenDefinitionForWrite({
      definition: {
        schemaVersion: 4,
        listView: {},
        editorView: { document: {}, bindings: [] },
        contentTypeId: "products",
      },
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenDefinitionForWrite rejects a definition carrying legacy blocks or bindings", () => {
  expect(() =>
    normalizeCustomScreenDefinitionForWrite({
      definition: {
        schemaVersion: 4,
        blocks: [],
        bindings: [],
      },
    })
  ).toThrow("custom_screen_legacy_write_unsupported");
});

test("normalizeCustomScreenDefinitionForRead repairs a v2 document without listView via defaulted v2 keys", () => {
  // A stored v2 with schemaVersion 2 but NO listView/editorView keys: the first
  // normalize pass throws (version 2 → invalid), then the read-repair dispatch defaults
  // the legacy list view with rowClick/createMode, which the v4 normalization strips.
  const result = normalizeCustomScreenDefinitionForRead({
    schemaVersion: 2,
    blocks: [{ id: "block-1", type: "text", data: { content: "Hi" } }],
    bindings: [
      {
        id: "block-1-content",
        widgetId: "block-1",
        propPath: "content",
        field: "name",
        mode: "read",
      },
    ],
  });

  expect(result.schemaVersion).toBe(4);
  expect(result.listView.defaultSort).toEqual({ field: "updatedAt", direction: "desc" });
  expect(result.editorView.document.sections[0]?.blocks[0]).toMatchObject({
    id: "block-1",
    type: "legacy-widget",
    legacyWidgetType: "text",
  });
});

test("normalizeCustomScreenDefinitionForRead rejects a v3 editor view with non-entry save mode", () => {
  expect(() =>
    normalizeCustomScreenDefinitionForRead({
      schemaVersion: 3,
      listView: {
        columns: [],
        filters: [],
        defaultSort: { field: "updatedAt", direction: "desc" },
      },
      editorView: {
        blocks: [],
        bindings: [],
        saveMode: "drawer",
        interactionMode: "inline",
      },
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("normalizeCustomScreenDefinitionForRead falls back to a v1 migration when the schema version is unsupported", () => {
  const result = normalizeCustomScreenDefinitionForRead({
    schemaVersion: 5,
    blocks: [{ id: "block-1", type: "text", data: { content: "Hi" } }],
    bindings: [
      {
        id: "block-1-content",
        widgetId: "block-1",
        propPath: "content",
        field: "name",
        mode: "read",
      },
    ],
  });

  expect(result.schemaVersion).toBe(4);
  expect(result.editorView.document.sections[0]?.blocks[0]).toMatchObject({
    id: "block-1",
    type: "legacy-widget",
    legacyWidgetType: "text",
  });
});

test("normalizeCustomScreenDefinitionForRead recovers a v2 listView whose columns getter throws", () => {
  // customScreenDefinitionNormalizer.ts:358 recovery catch: the exported read
  // normalizer accepts unknown input, and a v2 definition with a Proxy listView
  // whose columns getter throws must fall back to the default v2 list view.
  // The throwing proxy is local to this test (contract: keep it local).
  const throwingListView = new Proxy(
    {
      // Presents as a real v2 list view (hasV2ListViewKeys checks rowClick/createMode
      // via the `in` operator, which uses the has trap), but its `columns` getter
      // throws, exercising the recovery catch at customScreenDefinitionNormalizer.ts:358.
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" },
      rowClick: "editor-view",
      createMode: "drawer",
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    {
      get(target, prop) {
        if (prop === "columns") throw new Error("proxy columns getter exploded");
        return Reflect.get(target, prop);
      },
    }
  );

  const result = normalizeCustomScreenDefinitionForRead(
    {
      schemaVersion: 2,
      listView: throwingListView,
      editorView: makeV2().editorView,
    },
    { contentType: contentTypeContext() }
  );

  expect(result.schemaVersion).toBe(4);
  // The recovery returned the default v2 list view (not an empty shell):
  expect(result.listView.columns.length).toBeGreaterThan(0);
  expect(result.listView.defaultSort).toEqual({ field: "updatedAt", direction: "desc" });
  expect(result.listView.rowTemplate).toBeDefined();
});
