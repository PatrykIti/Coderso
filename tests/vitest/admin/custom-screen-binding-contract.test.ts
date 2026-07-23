import { expect, test } from "vitest";

import {
  buildScreenFieldBindingId,
  customScreenDefinitionSchema,
  normalizeCustomScreenDefinitionForRead,
  normalizeCustomScreenDefinitionForWrite,
  normalizeScreenFieldBindings,
} from "../../../core/services/customScreens/customScreenSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";
import { buildV4WithBlocks } from "./custom-screen-schema-fixtures";

test("TASK-540-01 strict V4 ID and path writes reject the same non-canonical values in Ajv and the normalizer", () => {
  const invalidDefinitions = [
    buildV4WithBlocks([{ id: " padded-block ", type: "heading", data: { text: "Title" } }]),
    buildV4WithBlocks([{ id: "__proto__.polluted", type: "heading", data: { text: "Title" } }]),
    buildV4WithBlocks([{ id: "b".repeat(161), type: "heading", data: { text: "Title" } }]),
    ...[".leading", "trailing.", "a..b"].map((id) =>
      buildV4WithBlocks([{ id, type: "heading", data: { text: "Title" } }])
    ),
    {
      ...buildV4WithBlocks([]),
      editorView: {
        ...buildV4WithBlocks([]).editorView,
        document: {
          schemaVersion: 1,
          sections: [{ id: " padded-section ", type: "section", data: {}, blocks: [] }],
        },
      },
    },
    ...[".leading", "trailing.", "a..b"].map((id) => {
      const definition = buildV4WithBlocks([]);
      return {
        ...definition,
        editorView: {
          ...definition.editorView,
          document: {
            schemaVersion: 1,
            sections: [{ id, type: "section", data: {}, blocks: [] }],
          },
        },
      };
    }),
    buildV4WithBlocks([{ id: "path-whitespace", type: "heading", data: { field: " title " } }]),
    buildV4WithBlocks([
      { id: "path-unsafe", type: "heading", data: { field: "constructor.value" } },
    ]),
    buildV4WithBlocks([{ id: "path-overflow", type: "heading", data: { field: "f".repeat(161) } }]),
    buildV4WithBlocks([
      { id: "path-empty-segment", type: "heading", data: { field: "content..title" } },
    ]),
  ];

  for (const definition of invalidDefinitions) {
    expect(() => validate(customScreenDefinitionSchema, definition)).toThrow("Invalid payload");
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).toThrow(
      "custom_screen_definition_invalid"
    );
  }

  const definitionWithBinding = (overrides: Record<string, unknown>) => {
    const definition = buildV4WithBlocks([
      { id: "binding-target", type: "field", data: { label: "Title" } },
    ]);
    return {
      ...definition,
      editorView: {
        ...definition.editorView,
        bindings: [
          {
            id: "binding-1",
            blockId: "binding-target",
            propPath: "value",
            source: "entry",
            field: "title",
            mode: "read",
            ...overrides,
          },
        ],
      },
    };
  };
  for (const key of ["blockId", "propPath", "field"] as const) {
    for (const value of [
      " padded ",
      "constructor.value",
      "x".repeat(161),
      ".leading",
      "trailing.",
      "a..b",
    ]) {
      const definition = definitionWithBinding({ [key]: value });
      expect(
        () => validate(customScreenDefinitionSchema, definition),
        `${key}:${value.length}`
      ).toThrow("Invalid payload");
      expect(
        () => normalizeCustomScreenDefinitionForWrite({ definition }),
        `${key}:${value.length}`
      ).toThrow("custom_screen_definition_invalid");
    }
  }

  const dottedBase = buildV4WithBlocks([
    { id: "binding.target", type: "heading", data: { field: "content.title" } },
  ]);
  const validDottedDefinition = {
    ...dottedBase,
    editorView: {
      ...dottedBase.editorView,
      document: {
        ...dottedBase.editorView.document,
        sections: dottedBase.editorView.document.sections.map((section) => ({
          ...section,
          id: "section.details",
        })),
      },
      bindings: [
        {
          id: "binding-dotted",
          blockId: "binding.target",
          propPath: "content.value",
          source: "entry",
          field: "content.title",
          mode: "read",
        },
      ],
    },
  };
  expect(() => validate(customScreenDefinitionSchema, validDottedDefinition)).not.toThrow();
  expect(() =>
    normalizeCustomScreenDefinitionForWrite({ definition: validDottedDefinition })
  ).not.toThrow();

  const missingSource = definitionWithBinding({});
  Reflect.deleteProperty(missingSource.editorView.bindings[0]!, "source");
  const invalidSourceAndModeDefinitions = [
    missingSource,
    definitionWithBinding({ source: " entry " }),
    definitionWithBinding({ source: 42 }),
    definitionWithBinding({ mode: "invalid" }),
    definitionWithBinding({ mode: null }),
    definitionWithBinding({ mode: " read " }),
  ];
  for (const definition of invalidSourceAndModeDefinitions) {
    expect(() => validate(customScreenDefinitionSchema, definition)).toThrow("Invalid payload");
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).toThrow(
      "custom_screen_definition_invalid"
    );
  }

  const missingMode = definitionWithBinding({});
  Reflect.deleteProperty(missingMode.editorView.bindings[0]!, "mode");
  expect(() => validate(customScreenDefinitionSchema, missingMode)).not.toThrow();
  expect(
    normalizeCustomScreenDefinitionForWrite({ definition: missingMode }).editorView.bindings[0]
      ?.mode
  ).toBe("readwrite");

  const stored = buildV4WithBlocks([
    { id: " repaired-block ", type: "heading", data: { field: " title " } },
  ]);
  const repaired = normalizeCustomScreenDefinitionForRead({ definition: stored });
  expect(repaired.editorView.document.sections[0]?.blocks[0]).toMatchObject({
    id: "repaired-block",
    data: { field: "title" },
  });
  expect(normalizeCustomScreenDefinitionForWrite({ definition: repaired })).toEqual(repaired);

  const storedBinding = definitionWithBinding({
    blockId: " binding-target ",
    propPath: " value ",
    field: " title ",
  });
  const repairedBinding = normalizeCustomScreenDefinitionForRead({ definition: storedBinding });
  expect(repairedBinding.editorView.bindings).toEqual([
    {
      id: "binding-1",
      blockId: "binding-target",
      propPath: "value",
      source: "entry",
      field: "title",
      mode: "read",
    },
  ]);
  expect(normalizeCustomScreenDefinitionForWrite({ definition: repairedBinding })).toEqual(
    repairedBinding
  );
});

test("TASK-540-01 widgetId is compatibility-only and canonicalizes to blockId in editor and row bindings", () => {
  const target = { id: "legacy-binding-target", type: "field", data: { label: "Title" } };
  const aliasBinding = {
    id: "legacy-binding",
    widgetId: target.id,
    propPath: "value",
    field: "title",
  };
  const storedEditor = buildV4WithBlocks([target]);
  const stored = {
    ...storedEditor,
    listView: {
      ...storedEditor.listView,
      rowTemplate: {
        document: storedEditor.editorView.document,
        bindings: [aliasBinding],
      },
    },
    editorView: {
      ...storedEditor.editorView,
      bindings: [aliasBinding],
    },
  };
  const before = JSON.stringify(stored);

  expect(normalizeScreenFieldBindings([aliasBinding])).toEqual([
    {
      id: "legacy-binding",
      blockId: target.id,
      propPath: "value",
      source: "entry",
      field: "title",
      mode: "readwrite",
    },
  ]);

  expect(() => validate(customScreenDefinitionSchema, stored)).toThrow("Invalid payload");
  expect(() => normalizeCustomScreenDefinitionForWrite({ definition: stored })).toThrow(
    "custom_screen_definition_invalid"
  );

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });
  expect(JSON.stringify(stored)).toBe(before);
  for (const bindings of [read.editorView.bindings, read.listView.rowTemplate?.bindings ?? []]) {
    expect(bindings).toEqual([
      {
        id: "legacy-binding",
        blockId: target.id,
        propPath: "value",
        source: "entry",
        field: "title",
        mode: "readwrite",
      },
    ]);
  }
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);

  const withBothIds = {
    ...storedEditor,
    editorView: {
      ...storedEditor.editorView,
      bindings: [{ ...aliasBinding, blockId: target.id }],
    },
  };
  expect(() => validate(customScreenDefinitionSchema, withBothIds)).toThrow("Invalid payload");
  expect(() => normalizeCustomScreenDefinitionForWrite({ definition: withBothIds })).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(
    normalizeCustomScreenDefinitionForRead({ definition: withBothIds }).editorView.bindings
  ).toEqual([
    {
      id: "legacy-binding",
      blockId: target.id,
      propPath: "value",
      source: "entry",
      field: "title",
      mode: "readwrite",
    },
  ]);

  const storedPrimary = {
    id: "stored-primary-target",
    type: "heading",
    data: { text: "Primary" },
  };
  const storedAlias = {
    id: "stored-alias-target",
    type: "text",
    data: { content: "Alias" },
  };
  const storedTabs = {
    id: "stored-tabs",
    type: "tabs",
    data: { tabs: [{ id: "tab-one", label: "One" }] },
    slots: {
      "tab-one": [
        {
          id: "stored-tab-heading",
          type: "heading",
          data: { text: "Nested tab content" },
        },
      ],
    },
  };
  const storedModeBase = buildV4WithBlocks([storedPrimary, storedAlias, storedTabs]);
  const storedModeBinding: Record<string, unknown> = {
    id: "stored-mode-binding",
    blockId: storedPrimary.id,
    widgetId: storedAlias.id,
    propPath: "text",
    source: "entry",
    field: "title",
    mode: "read",
  };
  const storedSiblingBinding = {
    id: "stored-sibling-binding",
    blockId: storedAlias.id,
    propPath: "content",
    source: "entry",
    field: "summary",
    mode: "readwrite",
  };
  const readStoredDefinition = (binding: Record<string, unknown>) =>
    normalizeCustomScreenDefinitionForRead({
      definition: {
        ...storedModeBase,
        editorView: {
          ...storedModeBase.editorView,
          bindings: [binding, storedSiblingBinding],
        },
      },
    });
  const readStoredBindings = (binding: Record<string, unknown>) =>
    readStoredDefinition(binding).editorView.bindings;
  const expectStoredBindingRejectedWithoutDocumentLoss = (binding: Record<string, unknown>) => {
    const read = readStoredDefinition(binding);
    expect(read.editorView.bindings).toEqual([storedSiblingBinding]);
    expect(read.editorView.document).toEqual(storedModeBase.editorView.document);
    expect(read.editorView.document.sections[0]?.blocks).toHaveLength(3);
    expect(read.editorView.document.sections[0]?.blocks[2]).toMatchObject({
      id: storedTabs.id,
      data: storedTabs.data,
      slots: storedTabs.slots,
    });
    expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
    expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
    expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
  };

  expect(readStoredBindings(storedModeBinding)[0]?.blockId).toBe(storedPrimary.id);
  for (const blockId of [null, undefined]) {
    expect(readStoredBindings({ ...storedModeBinding, blockId })[0]?.blockId).toBe(storedAlias.id);
  }
  for (const blockId of [" ", 42]) {
    expectStoredBindingRejectedWithoutDocumentLoss({ ...storedModeBinding, blockId });
  }

  const withoutStoredSource = { ...storedModeBinding };
  Reflect.deleteProperty(withoutStoredSource, "source");
  expect(readStoredBindings(withoutStoredSource)[0]?.source).toBe("entry");
  for (const source of [null, "", "   ", 42]) {
    expect(readStoredBindings({ ...storedModeBinding, source })[0]?.source).toBe("entry");
  }
  expect(readStoredBindings({ ...storedModeBinding, source: " entry " })[0]?.source).toBe("entry");
  expectStoredBindingRejectedWithoutDocumentLoss({ ...storedModeBinding, source: "external" });

  const withoutStoredMode = { ...storedModeBinding };
  Reflect.deleteProperty(withoutStoredMode, "mode");
  expect(readStoredBindings(withoutStoredMode)[0]?.mode).toBe("readwrite");
  for (const mode of [null, "", "   ", 42]) {
    expect(readStoredBindings({ ...storedModeBinding, mode })[0]?.mode).toBe("readwrite");
  }
  expect(readStoredBindings({ ...storedModeBinding, mode: " read " })[0]?.mode).toBe("read");
  expectStoredBindingRejectedWithoutDocumentLoss({ ...storedModeBinding, mode: "invalid" });

  const malformedAcrossScopes = {
    ...storedModeBase,
    listView: {
      ...storedModeBase.listView,
      rowTemplate: {
        document: storedModeBase.editorView.document,
        bindings: [{ ...storedModeBinding, source: "external" }, storedSiblingBinding],
      },
    },
    editorView: {
      ...storedModeBase.editorView,
      bindings: [{ ...storedModeBinding, source: "external" }, storedSiblingBinding],
    },
  };
  const malformedAcrossScopesBefore = JSON.stringify(malformedAcrossScopes);
  const repairedAcrossScopes = normalizeCustomScreenDefinitionForRead({
    definition: malformedAcrossScopes,
  });
  expect(JSON.stringify(malformedAcrossScopes)).toBe(malformedAcrossScopesBefore);
  for (const scope of [
    {
      document: repairedAcrossScopes.editorView.document,
      bindings: repairedAcrossScopes.editorView.bindings,
    },
    {
      document: repairedAcrossScopes.listView.rowTemplate?.document,
      bindings: repairedAcrossScopes.listView.rowTemplate?.bindings,
    },
  ]) {
    expect(scope.document).toEqual(storedModeBase.editorView.document);
    expect(scope.bindings).toEqual([storedSiblingBinding]);
  }
  expect(normalizeCustomScreenDefinitionForRead({ definition: repairedAcrossScopes })).toEqual(
    repairedAcrossScopes
  );
  expect(normalizeCustomScreenDefinitionForWrite({ definition: repairedAcrossScopes })).toEqual(
    repairedAcrossScopes
  );

  expect(() => normalizeScreenFieldBindings([{ ...aliasBinding, blockId: target.id }])).toThrow(
    "custom_screen_definition_invalid"
  );
  const missingCompatibilityTarget = { ...aliasBinding };
  Reflect.deleteProperty(missingCompatibilityTarget, "widgetId");
  expect(() => normalizeScreenFieldBindings([missingCompatibilityTarget])).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(() => normalizeScreenFieldBindings([{ ...aliasBinding, widgetId: undefined }])).toThrow(
    "custom_screen_definition_invalid"
  );

  const compatibilityInvalidBindings = [
    { ...aliasBinding, widgetId: " legacy-binding-target " },
    { ...aliasBinding, propPath: " value " },
    { ...aliasBinding, field: "f".repeat(161) },
    { ...aliasBinding, id: " Non Canonical " },
    { ...aliasBinding, id: "x".repeat(121) },
    { ...aliasBinding, source: " entry " },
    { ...aliasBinding, source: null },
    { ...aliasBinding, mode: "invalid" },
    { ...aliasBinding, mode: null },
    { ...aliasBinding, mode: " read " },
  ];
  for (const binding of compatibilityInvalidBindings) {
    expect(() => normalizeScreenFieldBindings([binding])).toThrow(
      "custom_screen_definition_invalid"
    );
  }

  expect(
    normalizeScreenFieldBindings([{ ...aliasBinding, source: "entry", mode: "read" }])[0]
  ).toMatchObject({ blockId: target.id, source: "entry", mode: "read" });
});

test("TASK-540-01 duplicate stored binding IDs retain the outer empty-editor fallback", () => {
  const base = buildV4WithBlocks([
    {
      id: "duplicate-binding-target",
      type: "heading",
      data: { text: "Must fail closed" },
    },
  ]);
  const definition = {
    ...base,
    listView: {
      ...base.listView,
      bulkActions: { ...base.listView.bulkActions, delete: false },
    },
    editorView: {
      ...base.editorView,
      bindings: [
        {
          id: "duplicate-binding",
          blockId: "duplicate-binding-target",
          propPath: "text",
          source: "entry",
          field: "title",
          mode: "read",
        },
        {
          id: "duplicate-binding",
          blockId: "duplicate-binding-target",
          propPath: "text",
          source: "entry",
          field: "summary",
          mode: "read",
        },
      ],
    },
  };
  const before = JSON.stringify(definition);

  const read = normalizeCustomScreenDefinitionForRead({ definition });

  expect(JSON.stringify(definition)).toBe(before);
  expect(read.editorView).toEqual({
    document: { schemaVersion: 1, sections: [] },
    bindings: [],
    saveMode: "entry",
    interactionMode: "inline",
  });
  expect(read.listView).toEqual(definition.listView);
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
});

test("TASK-540-01 binding IDs stay canonical and bounded across strict writes and stored reads", () => {
  const shortSeparatorTupleIds = [
    buildScreenFieldBindingId("a-b", "c"),
    buildScreenFieldBindingId("a", "b-c"),
  ];
  const shortCaseTupleIds = [
    buildScreenFieldBindingId("A", "value"),
    buildScreenFieldBindingId("a", "value"),
  ];
  for (const id of [...shortSeparatorTupleIds, ...shortCaseTupleIds]) {
    expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{13}$/);
    expect(id.length).toBeLessThanOrEqual(120);
  }
  expect(shortSeparatorTupleIds[0]).not.toBe(shortSeparatorTupleIds[1]);
  expect(shortCaseTupleIds[0]).not.toBe(shortCaseTupleIds[1]);
  expect(buildScreenFieldBindingId("a-b", "c")).toBe(shortSeparatorTupleIds[0]);
  expect(buildScreenFieldBindingId("___", "___")).toMatch(/^binding-[a-z0-9]{13}$/);

  const ambiguousBase = buildV4WithBlocks([
    { id: "a-b", type: "field", data: { label: "First" } },
    { id: "a", type: "field", data: { label: "Second" } },
    { id: "A", type: "field", data: { label: "Upper case" } },
  ]);
  const ambiguousDefinition = {
    ...ambiguousBase,
    editorView: {
      ...ambiguousBase.editorView,
      bindings: [
        {
          blockId: "a-b",
          propPath: "c",
          source: "entry",
          field: "firstField",
          mode: "read",
        },
        {
          blockId: "a",
          propPath: "b-c",
          source: "entry",
          field: "secondField",
          mode: "read",
        },
        {
          blockId: "A",
          propPath: "value",
          source: "entry",
          field: "upperCaseField",
          mode: "read",
        },
        {
          blockId: "a",
          propPath: "value",
          source: "entry",
          field: "lowerCaseField",
          mode: "read",
        },
      ],
    },
  };
  expect(() => validate(customScreenDefinitionSchema, ambiguousDefinition)).not.toThrow();
  const normalizedAmbiguous = normalizeCustomScreenDefinitionForWrite({
    definition: ambiguousDefinition,
  });
  expect(normalizedAmbiguous.editorView.bindings.map(({ id }) => id)).toEqual([
    ...shortSeparatorTupleIds,
    ...shortCaseTupleIds,
  ]);
  expect(() => validate(customScreenDefinitionSchema, normalizedAmbiguous)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: normalizedAmbiguous })).toEqual(
    normalizedAmbiguous
  );

  const blockId = "b".repeat(160);
  const propPaths = [`${"p".repeat(159)}1`, `${"p".repeat(159)}2`];
  const base = buildV4WithBlocks([{ id: blockId, type: "field", data: { label: "Title" } }]);
  const definitionWithBindings = (bindings: Array<Record<string, unknown>>) => ({
    ...base,
    editorView: {
      ...base.editorView,
      bindings,
    },
  });
  const binding = (overrides: Record<string, unknown> = {}) => ({
    blockId,
    propPath: propPaths[0],
    source: "entry",
    field: "title",
    mode: "read",
    ...overrides,
  });

  for (const id of [" Non Canonical ", "x".repeat(121)]) {
    const invalidDefinition = definitionWithBindings([binding({ id })]);
    expect(() => validate(customScreenDefinitionSchema, invalidDefinition)).toThrow(
      "Invalid payload"
    );
    expect(() =>
      normalizeCustomScreenDefinitionForWrite({ definition: invalidDefinition })
    ).toThrow("custom_screen_definition_invalid");
  }

  const generatedDefinition = definitionWithBindings([
    binding(),
    binding({ propPath: propPaths[1] }),
  ]);
  const generated = normalizeCustomScreenDefinitionForWrite({ definition: generatedDefinition });
  expect(generated.editorView.bindings).toHaveLength(2);
  expect(new Set(generated.editorView.bindings.map(({ id }) => id)).size).toBe(2);
  for (const { id } of generated.editorView.bindings) {
    expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(id.length).toBeLessThanOrEqual(120);
  }
  expect(() => validate(customScreenDefinitionSchema, generated)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: generated })).toEqual(generated);

  const stored = definitionWithBindings([binding({ id: ` Legacy ${"I".repeat(121)} ` })]);
  const repaired = normalizeCustomScreenDefinitionForRead({ definition: stored });
  expect(repaired.editorView.bindings[0]?.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(repaired.editorView.bindings[0]?.id.length).toBeLessThanOrEqual(120);
  expect(normalizeCustomScreenDefinitionForRead({ definition: repaired })).toEqual(repaired);
  expect(normalizeCustomScreenDefinitionForWrite({ definition: repaired })).toEqual(repaired);

  const tuplePrefix = "a".repeat(140);
  const separatorTupleIds = [
    buildScreenFieldBindingId(`${tuplePrefix}-b`, "c"),
    buildScreenFieldBindingId(tuplePrefix, "b-c"),
  ];
  expect(separatorTupleIds[0]).not.toBe(separatorTupleIds[1]);
  expect(separatorTupleIds.every((id) => id.length <= 120)).toBe(true);

  const caseTupleIds = [
    buildScreenFieldBindingId("A".repeat(140), "value"),
    buildScreenFieldBindingId("a".repeat(140), "value"),
  ];
  expect(caseTupleIds[0]).not.toBe(caseTupleIds[1]);
  expect(buildScreenFieldBindingId(blockId, propPaths[0])).toBe(
    buildScreenFieldBindingId(blockId, propPaths[0])
  );

  expect(() =>
    normalizeCustomScreenDefinitionForWrite({
      definition: definitionWithBindings([binding(), binding()]),
    })
  ).toThrow("custom_screen_definition_invalid");
});

test("TASK-540-01 stored-read canonicalizes overlong IDs and paths without losing binding identity", () => {
  const longSectionId = `section-${"s".repeat(170)}`;
  const longBlockPrefix = `block-${"b".repeat(170)}`;
  const longBlockIds = [`${longBlockPrefix}-first`, `${longBlockPrefix}-second`];
  const longPropPaths = [`value.${"p".repeat(170)}.first`, `value.${"p".repeat(170)}.second`];
  const longFields = [`field.${"f".repeat(170)}.first`, `field.${"f".repeat(170)}.second`];
  const blocks = longBlockIds.map((id, index) => ({
    id,
    type: "field",
    data: { label: `Field ${index + 1}` },
  }));
  const bindings = longBlockIds.map((blockId, index) => ({
    id: `long-binding-${index + 1}`,
    blockId,
    propPath: longPropPaths[index],
    source: "entry",
    field: longFields[index],
    mode: "read",
  }));
  const document = {
    schemaVersion: 1,
    sections: [{ id: longSectionId, type: "section", data: {}, blocks }],
  };
  const base = buildV4WithBlocks([]);
  const stored = {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: { document, bindings },
    },
    editorView: {
      ...base.editorView,
      document,
      bindings,
    },
  };
  const before = JSON.stringify(stored);

  expect(() => validate(customScreenDefinitionSchema, stored)).toThrow("Invalid payload");
  expect(() => normalizeCustomScreenDefinitionForWrite({ definition: stored })).toThrow(
    "custom_screen_definition_invalid"
  );

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });
  expect(JSON.stringify(stored)).toBe(before);
  const scopes = [
    {
      document: read.editorView.document,
      bindings: read.editorView.bindings,
    },
    {
      document: read.listView.rowTemplate!.document,
      bindings: read.listView.rowTemplate!.bindings,
    },
  ];
  for (const scope of scopes) {
    const section = scope.document.sections[0]!;
    expect(section.id).toMatch(/^[a-zA-Z0-9_.-]+$/);
    expect(section.id.length).toBeLessThanOrEqual(160);
    expect(section.blocks).toHaveLength(2);
    expect(section.blocks[0]?.id).not.toBe(section.blocks[1]?.id);
    for (const [index, block] of section.blocks.entries()) {
      expect(block.id).toMatch(/^[a-zA-Z0-9_.-]+$/);
      expect(block.id.length).toBeLessThanOrEqual(160);
      expect(scope.bindings[index]?.blockId).toBe(block.id);
      expect(scope.bindings[index]?.propPath.length).toBeLessThanOrEqual(160);
      expect(scope.bindings[index]?.field.length).toBeLessThanOrEqual(160);
    }
  }
  expect(scopes[0]?.document).toEqual(scopes[1]?.document);
  expect(scopes[0]?.bindings).toEqual(scopes[1]?.bindings);
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);

  const fixedDataRead = normalizeCustomScreenDefinitionForRead({
    definition: buildV4WithBlocks([
      { id: "fixed-data-path", type: "heading", data: { field: "f".repeat(161) } },
    ]),
  });
  expect(fixedDataRead.editorView.document.sections[0]?.blocks[0]?.data).not.toHaveProperty(
    "field"
  );
});
