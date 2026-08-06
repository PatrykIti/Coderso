import { expect, test } from "vitest";

import {
  buildDefaultListViewDefinition,
  customScreenDefinitionSchema,
  normalizeCustomScreenDefinition,
  normalizeCustomScreenDefinitionForRead,
  normalizeCustomScreenDefinitionForWrite,
  normalizeScreenDocumentV1,
  normalizeScreenDocumentV1ForRead,
  SCREEN_SECTION_COLUMN_GAP_CLAMP,
  screenSectionColumnPresets,
  screenSectionColumnTemplate,
  type ScreenBindingWarningSink,
} from "../../../core/services/customScreens/customScreenSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

const sectionWithStyle = (style: unknown) => ({
  schemaVersion: 1 as const,
  sections: [
    {
      id: "section-default",
      type: "section" as const,
      data: { title: "Details" },
      ...(style !== undefined ? { style } : {}),
      blocks: [] as unknown[],
    },
  ],
});

const normalizedSection = (style: unknown) =>
  normalizeScreenDocumentV1(sectionWithStyle(style)).sections[0] as Record<string, unknown>;

test("TASK-505-01 valid section style round-trips byte-stable + idempotent (write + read)", () => {
  const doc = sectionWithStyle({ columns: "3-1", columnGap: 24 });
  const once = normalizeScreenDocumentV1(doc);
  expect(once).toEqual(doc);
  expect(normalizeScreenDocumentV1(once)).toEqual(once);
  expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
  expect(JSON.stringify(normalizeScreenDocumentV1(once))).toBe(JSON.stringify(once));
});

test("TASK-505-01 absent section style stays absent (byte-stable, no grid — vertical stack)", () => {
  const doc = sectionWithStyle(undefined);
  expect("style" in normalizedSection(undefined)).toBe(false);
  expect(normalizeScreenDocumentV1(doc)).toEqual(doc);
  expect(normalizeScreenDocumentV1ForRead(doc)).toEqual(doc);
});

test("TASK-505-01 unknown section-style KEY throws (write + read)", () => {
  const bad = sectionWithStyle({ columns: "2", rows: 3 });
  expect(() => normalizeScreenDocumentV1(bad)).toThrow("custom_screen_definition_invalid");
  expect(() => normalizeScreenDocumentV1ForRead(bad)).toThrow("custom_screen_definition_invalid");
});

test("TASK-505-01 section-style values coerce / clamp (never throw)", () => {
  const junkColumns = normalizedSection({ columns: "9-9" }).style as Record<string, unknown>;
  expect(junkColumns.columns).toBe("1"); // not-in-enum → single column (stack, harmless)
  const nonString = normalizedSection({ columns: 4 }).style as Record<string, unknown>;
  expect(nonString.columns).toBe("1");
  const overMax = normalizedSection({ columnGap: 9999 }).style as Record<string, unknown>;
  expect(overMax.columnGap).toBe(SCREEN_SECTION_COLUMN_GAP_CLAMP.max); // 64
  const under = normalizedSection({ columnGap: -10 }).style as Record<string, unknown>;
  expect(under.columnGap).toBe(0);
  const floored = normalizedSection({ columnGap: 12.9 }).style as Record<string, unknown>;
  expect(floored.columnGap).toBe(12);
  const junkGap = normalizedSection({ columnGap: "wide" }).style as Record<string, unknown>;
  expect(junkGap.columnGap).toBe(0); // junk → min
});

test("TASK-505-01 empty / junk section style prunes to an absent style key (no throw)", () => {
  expect("style" in normalizedSection({})).toBe(false);
  expect(() => normalizedSection("junk")).not.toThrow();
  expect("style" in normalizedSection("junk")).toBe(false);
});

test("TASK-505-01 screenSectionColumnTemplate exports all 13 presets → correct fr strings", () => {
  expect(screenSectionColumnPresets).toEqual([
    "1",
    "2",
    "3",
    "4",
    "1-1",
    "1-2",
    "2-1",
    "1-3",
    "3-1",
    "2-3",
    "3-2",
    "1-1-1",
    "1-1-1-1",
  ]);
  expect(screenSectionColumnTemplate["3-1"]).toBe("3fr 1fr");
  expect(screenSectionColumnTemplate["1-3"]).toBe("1fr 3fr");
  expect(screenSectionColumnTemplate["2"]).toBe("1fr 1fr");
  expect(screenSectionColumnTemplate["1-1-1-1"]).toBe("1fr 1fr 1fr 1fr");
  // Every preset has a template (no drift).
  for (const preset of screenSectionColumnPresets) {
    expect(typeof screenSectionColumnTemplate[preset]).toBe("string");
  }
});

test("TASK-505-01 Ajv screenSectionV1Schema accepts valid style, rejects unknown key + out-of-range gap", () => {
  const withStyle = (style: unknown) => ({
    schemaVersion: 4,
    listView: buildDefaultListViewDefinition(),
    editorView: {
      document: {
        schemaVersion: 1,
        sections: [{ id: "s1", type: "section", data: { title: "D" }, style, blocks: [] }],
      },
      bindings: [],
      saveMode: "entry",
      interactionMode: "inline",
    },
  });
  expect(() =>
    validate(customScreenDefinitionSchema, withStyle({ columns: "3-1", columnGap: 24 }))
  ).not.toThrow();
  expect(() => validate(customScreenDefinitionSchema, withStyle({ rows: 3 }))).toThrow();
  expect(() => validate(customScreenDefinitionSchema, withStyle({ columnGap: 999 }))).toThrow();
  expect(() => validate(customScreenDefinitionSchema, withStyle({ columns: "5-5" }))).toThrow();
});

// ---------------------------------------------------------------------------
// TASK-505-01 Item B: binding-integrity GC (field-orphan prune-with-warning)
// ---------------------------------------------------------------------------

const houseProjectsContext = {
  contentType: {
    id: "house-projects",
    slug: "house-projects",
    name: "House Projects",
    schema: {
      properties: {
        projectStatus: { type: "string", enum: ["planned", "active"] },
      },
    },
  },
};

const editorDefWithBindings = (bindings: unknown[], blocks: unknown[]) => ({
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
        sections: [{ id: "section-1", type: "section", data: {}, blocks }],
      },
      bindings,
      saveMode: "entry",
      interactionMode: "inline",
    },
  },
});

const definitionWithScopedBindings = (
  scope: "editor" | "row-template",
  bindings: unknown[],
  blocks: unknown[]
) => {
  const base = editorDefWithBindings(scope === "editor" ? bindings : [], blocks);
  return {
    definition: {
      ...base.definition,
      listView: {
        ...base.definition.listView,
        ...(scope === "row-template"
          ? {
              rowTemplate: {
                document: {
                  schemaVersion: 1,
                  sections: [{ id: "row-section-1", type: "section", data: {}, blocks }],
                },
                bindings,
              },
            }
          : {}),
      },
    },
  };
};

test("TASK-505-01 field-orphan binding is pruned + recorded in the sink (write path, recoverable)", () => {
  for (const scope of ["editor", "row-template"] as const) {
    const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
    const definition = normalizeCustomScreenDefinitionForWrite(
      definitionWithScopedBindings(
        scope,
        [
          {
            id: "binding-1",
            blockId: "header-1",
            propPath: "title",
            source: "entry",
            field: "projectStatus",
            mode: "readwrite",
          },
          {
            id: "binding-2",
            blockId: "header-1",
            propPath: "sub",
            source: "entry",
            field: "bathrooms",
            mode: "readwrite",
          },
        ],
        [{ id: "header-1", type: "record-header", data: {} }]
      ),
      houseProjectsContext,
      sink
    );
    const bindings =
      scope === "editor"
        ? definition.editorView.bindings
        : (definition.listView.rowTemplate?.bindings ?? []);
    expect(bindings.map((binding) => binding.field)).toEqual(["projectStatus"]);
    expect(sink.removedFieldOrphans).toEqual(["bathrooms"]);
    expect(sink.removedBlockOrphans).toEqual([]);
  }
});

test("TASK-505-01 block-orphan binding is pruned inline (not hard-throw) when a sink is threaded", () => {
  const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
  const definition = normalizeCustomScreenDefinitionForWrite(
    editorDefWithBindings(
      [
        {
          id: "binding-1",
          blockId: "ghost-block",
          propPath: "title",
          source: "entry",
          field: "projectStatus",
          mode: "readwrite",
        },
      ],
      [{ id: "header-1", type: "record-header", data: {} }]
    ),
    houseProjectsContext,
    sink
  );
  expect(definition.editorView.bindings).toEqual([]);
  expect(sink.removedBlockOrphans).toEqual(["projectStatus"]);
});

test("TASK-505-01 without a sink the field-orphan case STILL hard-throws (read/fallback path preserved)", () => {
  expect(() =>
    normalizeCustomScreenDefinition(
      editorDefWithBindings(
        [
          {
            id: "binding-1",
            blockId: "header-1",
            propPath: "title",
            source: "entry",
            field: "bathrooms",
            mode: "readwrite",
          },
        ],
        [{ id: "header-1", type: "record-header", data: {} }]
      ),
      houseProjectsContext
    )
  ).toThrow("custom_screen_definition_invalid");
});

test("TASK-505-01 a fully-valid binding set is byte-identical with OR without a sink (non-destructive)", () => {
  const validDef = editorDefWithBindings(
    [
      {
        id: "binding-1",
        blockId: "header-1",
        propPath: "title",
        source: "entry",
        field: "projectStatus",
        mode: "readwrite",
      },
    ],
    [{ id: "header-1", type: "record-header", data: {} }]
  );
  const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
  const withSink = normalizeCustomScreenDefinitionForWrite(validDef, houseProjectsContext, sink);
  const noSink = normalizeCustomScreenDefinition(validDef, houseProjectsContext);
  expect(withSink.editorView.bindings).toEqual(noSink.editorView.bindings);
  expect(sink.removedFieldOrphans).toEqual([]);
  expect(sink.removedBlockOrphans).toEqual([]);
});

test("TASK-505-01 malformed binding (non-record / missing blockId) still throws even with a sink", () => {
  const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
  expect(() =>
    normalizeCustomScreenDefinitionForWrite(
      editorDefWithBindings(["junk"], [{ id: "header-1", type: "record-header", data: {} }]),
      houseProjectsContext,
      sink
    )
  ).toThrow("custom_screen_definition_invalid");
  expect(() =>
    normalizeCustomScreenDefinitionForWrite(
      editorDefWithBindings(
        [{ id: "b", propPath: "x", source: "entry", field: "projectStatus", mode: "read" }],
        [{ id: "header-1", type: "record-header", data: {} }]
      ),
      houseProjectsContext,
      sink
    )
  ).toThrow("custom_screen_definition_invalid");

  const malformedOrphans = [
    {
      id: "binding-orphan",
      blockId: "header-1",
      propPath: "title",
      source: "external",
      field: "bathrooms",
      mode: "readwrite",
    },
    {
      id: " Non Canonical ",
      blockId: "header-1",
      propPath: "title",
      source: "entry",
      field: "bathrooms",
      mode: "readwrite",
    },
    {
      id: "binding-orphan",
      blockId: "header-1",
      propPath: "title",
      source: "entry",
      field: "bathrooms",
      mode: "invalid",
    },
  ];
  for (const scope of ["editor", "row-template"] as const) {
    for (const malformedOrphan of malformedOrphans) {
      const orphanSink: ScreenBindingWarningSink = {
        removedFieldOrphans: [],
        removedBlockOrphans: [],
      };
      expect(() =>
        normalizeCustomScreenDefinitionForWrite(
          definitionWithScopedBindings(
            scope,
            [malformedOrphan],
            [{ id: "header-1", type: "record-header", data: {} }]
          ),
          houseProjectsContext,
          orphanSink
        )
      ).toThrow("custom_screen_definition_invalid");
      expect(orphanSink).toEqual({ removedFieldOrphans: [], removedBlockOrphans: [] });
    }
  }
});

test("TASK-505-01 stored field-orphan doc READS non-fatally and RETAINS the orphan for reopen recovery", () => {
  const stored = editorDefWithBindings(
    [
      {
        id: "binding-1",
        blockId: "header-1",
        propPath: "title",
        source: "entry",
        field: "bathrooms",
        mode: "readwrite",
      },
    ],
    [{ id: "header-1", type: "record-header", data: {} }]
  );
  const read = normalizeCustomScreenDefinitionForRead(stored, houseProjectsContext);
  expect(read.schemaVersion).toBe(4);
  // TASK-505-03: the editor-view read RETAINS the field-orphan (binding → LIVE block, dead
  // content-type field) so the reopen recovery UX (detectScreenBindingOrphans → amber notice)
  // can NAME the deleted field. The read is non-fatal (screen still opens); the WRITE path
  // prunes it on Save. Pruning on read would make the reopen notice unreachable (505-03 #5/#6).
  expect(read.editorView.bindings.map((b) => b.field)).toContain("bathrooms");
});

// ---------------------------------------------------------------------------
// TASK-540-01-L01: exact fixed-kind schemas, Tabs identity, and binding GC
// ---------------------------------------------------------------------------
