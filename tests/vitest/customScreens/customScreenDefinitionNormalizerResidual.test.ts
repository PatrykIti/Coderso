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
