import { expect, test } from "vitest";

import {
  customScreenDefinitionSchema,
  CustomScreenDefinitionError,
  normalizeCustomScreenDefinitionForRead,
  normalizeCustomScreenDefinitionForWrite,
  SCREEN_BLOCK_COLLECTION_MAX,
  SCREEN_DOCUMENT_SECTIONS_MAX,
  SCREEN_TAB_ID,
  SCREEN_TAB_LABEL_MAX,
  SCREEN_TABS_MAX,
  SCREEN_TABS_MIN,
  type ScreenTabItem,
} from "../../../core/services/customScreens/customScreenSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";
import {
  buildV4WithBlocks,
  fixedKindBlock,
  fixedKindDataCases,
} from "./custom-screen-schema-fixtures";

test("TASK-540-01 fixed-kind schemas and direct write normalization share one exact contract", () => {
  for (const [type, data] of Object.entries(fixedKindDataCases)) {
    const block = fixedKindBlock(type as keyof typeof fixedKindDataCases, { ...data });
    const definition = buildV4WithBlocks([block]);
    expect(() => validate(customScreenDefinitionSchema, definition), type).not.toThrow();
    expect(
      normalizeCustomScreenDefinitionForWrite({ definition }).editorView.document.sections[0]
        ?.blocks[0],
      type
    ).toEqual(block);

    const withUnknown = fixedKindBlock(type as keyof typeof fixedKindDataCases, {
      ...data,
      rejectedNestedKey: true,
    });
    expect(
      () => validate(customScreenDefinitionSchema, buildV4WithBlocks([withUnknown])),
      type
    ).toThrow("Invalid payload");
    expect(
      () =>
        normalizeCustomScreenDefinitionForWrite({
          definition: buildV4WithBlocks([withUnknown]),
        }),
      type
    ).toThrow("custom_screen_definition_invalid");
  }
  for (const data of [undefined, null, [], "not-an-object"]) {
    const block = { id: "heading-data-shape", type: "heading", data };
    expect(() => validate(customScreenDefinitionSchema, buildV4WithBlocks([block]))).toThrow(
      "Invalid payload"
    );
    expect(() =>
      normalizeCustomScreenDefinitionForWrite({ definition: buildV4WithBlocks([block]) })
    ).toThrow(CustomScreenDefinitionError);
  }
});

test("TASK-540-01 writes allow only fixed and explicit compatibility block types at every depth", () => {
  for (const type of [
    "field",
    "field-group",
    "record-header",
    "columns",
    "rich-text",
    "legacy-widget",
  ]) {
    const block = { id: `${type}-compat`, type, data: { legacyExtra: true } };
    const definition = buildV4WithBlocks([block]);
    expect(() => validate(customScreenDefinitionSchema, definition), type).not.toThrow();
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition }), type).not.toThrow();
  }

  const unsupportedDefinitions = [
    buildV4WithBlocks([{ id: "actions-root", type: "actions", data: {} }]),
    buildV4WithBlocks([
      {
        id: "compat-parent",
        type: "field-group",
        data: {},
        children: [{ id: "plugin-child", type: "plugin-card", data: {} }],
      },
    ]),
    buildV4WithBlocks([
      {
        id: "compat-slot-parent",
        type: "columns",
        data: {},
        slots: { left: [{ id: "unknown-slot", type: "unknown-block", data: {} }] },
      },
    ]),
  ];
  for (const definition of unsupportedDefinitions) {
    expect(() => validate(customScreenDefinitionSchema, definition)).toThrow("Invalid payload");
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).toThrow(
      CustomScreenDefinitionError
    );
  }
});

test("TASK-540-01 every fixed path field shares the route max-160 write boundary", () => {
  const boundary = "a".repeat(160);
  const overflow = "a".repeat(161);
  const cases: Array<{
    type: "heading" | "stat" | "image" | "related-list" | "button";
    key: string;
    base?: Record<string, unknown>;
  }> = [
    { type: "heading", key: "field" },
    { type: "stat", key: "deltaField" },
    { type: "stat", key: "field" },
    { type: "image", key: "field" },
    { type: "related-list", key: "target" },
    { type: "related-list", key: "displayField" },
    { type: "related-list", key: "field" },
    { type: "button", key: "field", base: { action: "link" } },
  ];
  for (const [index, pathCase] of cases.entries()) {
    const block = (value: string) => ({
      id: `path-${index}`,
      type: pathCase.type,
      data: { ...pathCase.base, [pathCase.key]: value },
    });
    const boundaryDefinition = buildV4WithBlocks([block(boundary)]);
    expect(() => validate(customScreenDefinitionSchema, boundaryDefinition)).not.toThrow();
    expect(() =>
      normalizeCustomScreenDefinitionForWrite({ definition: boundaryDefinition })
    ).not.toThrow();

    const overflowDefinition = buildV4WithBlocks([block(overflow)]);
    expect(() => validate(customScreenDefinitionSchema, overflowDefinition)).toThrow(
      "Invalid payload"
    );
    expect(() =>
      normalizeCustomScreenDefinitionForWrite({ definition: overflowDefinition })
    ).toThrow(CustomScreenDefinitionError);
  }
});

test("TASK-540-01 fixed data labels stay optional and clearable while image ratio stays opaque", () => {
  for (const label of [undefined, "", "   "] as const) {
    const data = {
      text: "",
      ...(label === undefined ? {} : { label }),
    };
    const definition = buildV4WithBlocks([{ id: "heading-label", type: "heading", data }]);
    expect(() => validate(customScreenDefinitionSchema, definition)).not.toThrow();
    expect(
      normalizeCustomScreenDefinitionForWrite({ definition }).editorView.document.sections[0]
        ?.blocks[0]?.data
    ).toEqual(data);
  }

  for (const ratio of ["16/9", "16:9", "", "legacy-free-text"]) {
    const block = {
      id: "image-ratio",
      type: "image",
      data: { label: "Image", ratio },
    };
    const definition = buildV4WithBlocks([block]);
    expect(() => validate(customScreenDefinitionSchema, definition)).not.toThrow();
    expect(normalizeCustomScreenDefinitionForWrite({ definition })).toEqual(definition);
    expect(normalizeCustomScreenDefinitionForRead({ definition })).toEqual(definition);
  }
});

test("TASK-540-01 recursive fixed-kind validation has no root, children, or slot bypass", () => {
  const invalidHeading = (id: string) => ({
    id,
    type: "heading",
    data: { text: "Nested", rejectedNestedKey: "must-not-pass" },
  });
  const definitions = [
    buildV4WithBlocks([invalidHeading("root-invalid")]),
    buildV4WithBlocks([
      {
        id: "child-level-1",
        type: "field-group",
        data: {},
        children: [
          {
            id: "child-level-2",
            type: "field-group",
            data: {},
            children: [invalidHeading("child-invalid")],
          },
        ],
      },
    ]),
    buildV4WithBlocks([
      {
        id: "slot-level-1",
        type: "columns",
        data: {},
        slots: {
          left: [
            {
              id: "slot-level-2",
              type: "columns",
              data: {},
              slots: { right: [invalidHeading("slot-invalid")] },
            },
          ],
        },
      },
    ]),
  ];
  for (const definition of definitions) {
    expect(() => validate(customScreenDefinitionSchema, definition)).toThrow("Invalid payload");
  }
});

test("TASK-540-01 recursive collection bounds remain sections=120 and block arrays=500", () => {
  expect(SCREEN_DOCUMENT_SECTIONS_MAX).toBe(120);
  expect(SCREEN_BLOCK_COLLECTION_MAX).toBe(500);

  const compatBlock = (id: string) => ({ id, type: "field", data: {} });
  const section = (index: number, blocks: unknown[] = []) => ({
    id: `section-${index}`,
    type: "section",
    data: {},
    blocks,
  });
  const withSections = (sections: unknown[]) => ({
    ...buildV4WithBlocks([]),
    editorView: {
      ...buildV4WithBlocks([]).editorView,
      document: { schemaVersion: 1, sections },
    },
  });
  const expectWritePass = (definition: unknown) => {
    expect(() => validate(customScreenDefinitionSchema, definition)).not.toThrow();
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).not.toThrow();
  };
  const expectWriteReject = (definition: unknown) => {
    expect(() => validate(customScreenDefinitionSchema, definition)).toThrow("Invalid payload");
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).toThrow(
      CustomScreenDefinitionError
    );
  };

  expectWritePass(
    withSections(Array.from({ length: SCREEN_DOCUMENT_SECTIONS_MAX }, (_, index) => section(index)))
  );
  expectWriteReject(
    withSections(
      Array.from({ length: SCREEN_DOCUMENT_SECTIONS_MAX + 1 }, (_, index) => section(index))
    )
  );

  const fiveHundred = Array.from({ length: SCREEN_BLOCK_COLLECTION_MAX }, (_, index) =>
    compatBlock(`block-${index}`)
  );
  expectWritePass(withSections([section(1, fiveHundred)]));
  expectWriteReject(withSections([section(1, [...fiveHundred, compatBlock("overflow")])]));
  for (const nested of [{ children: fiveHundred }, { slots: { content: fiveHundred } }]) {
    expectWritePass(
      withSections([section(1, [{ id: "container", type: "field-group", data: {}, ...nested }])])
    );
  }
  for (const nested of [
    { children: [...fiveHundred, compatBlock("child-overflow")] },
    { slots: { content: [...fiveHundred, compatBlock("slot-overflow")] } },
  ]) {
    expectWriteReject(
      withSections([
        section(1, [{ id: "overflow-container", type: "field-group", data: {}, ...nested }]),
      ])
    );
  }
});

test("TASK-540-01 Tabs enforce exact items, unique IDs, label bounds, and matching slots", () => {
  expect(SCREEN_TABS_MIN).toBe(1);
  expect(SCREEN_TABS_MAX).toBe(24);
  expect(SCREEN_TAB_LABEL_MAX).toBe(120);
  expect(SCREEN_TAB_ID.source).toBe("^[a-z][a-z0-9_-]{0,63}$");

  const invalidSchemaTabs = [
    [],
    [{ id: "", label: "Blank" }],
    [{ id: "UPPER", label: "Upper" }],
    [{ id: "valid", label: "   " }],
    [{ id: "valid", label: "x".repeat(SCREEN_TAB_LABEL_MAX + 1) }],
    [{ id: "valid", label: "Valid", extra: true }],
    Array.from({ length: SCREEN_TABS_MAX + 1 }, (_, index) => ({
      id: `tab-${index}`,
      label: `Tab ${index}`,
    })),
  ];
  for (const tabs of invalidSchemaTabs) {
    const block = { id: "tabs-invalid", type: "tabs", data: { tabs }, slots: {} };
    expect(() => validate(customScreenDefinitionSchema, buildV4WithBlocks([block]))).toThrow(
      "Invalid payload"
    );
  }

  const duplicate = {
    id: "tabs-duplicate",
    type: "tabs",
    data: {
      tabs: [
        { id: "same", label: " First " },
        { id: "same", label: "Second" },
      ],
    },
    slots: { same: [] },
  };
  expect(() =>
    normalizeCustomScreenDefinitionForWrite({ definition: buildV4WithBlocks([duplicate]) })
  ).toThrow(CustomScreenDefinitionError);

  const mismatch = {
    id: "tabs-mismatch",
    type: "tabs",
    data: { tabs: [{ id: "expected", label: "Expected" }] },
    slots: { other: [] },
  };
  try {
    normalizeCustomScreenDefinitionForWrite({ definition: buildV4WithBlocks([mismatch]) });
    throw new Error("expected tab/slot mismatch");
  } catch (error) {
    expect(error).toBeInstanceOf(CustomScreenDefinitionError);
    expect((error as CustomScreenDefinitionError).fields).toEqual([
      "definition.editorView.document.sections.0.blocks.0.data.tabs",
      "definition.editorView.document.sections.0.blocks.0.slots",
    ]);
  }

  const trimmed = {
    id: "tabs-trimmed",
    type: "tabs",
    data: { tabs: [{ id: "overview", label: "  Overview  " }] },
    slots: { overview: [] },
  };
  expect(
    normalizeCustomScreenDefinitionForWrite({
      definition: buildV4WithBlocks([trimmed]),
    }).editorView.document.sections[0]?.blocks[0]?.data.tabs
  ).toEqual([{ id: "overview", label: "Overview" }]);
});

test("TASK-540-01 Tabs label limits use Unicode code points without splitting surrogates", () => {
  const unicodeLabel = "😀".repeat(SCREEN_TAB_LABEL_MAX);
  const unicodeBlock = (label: string) => ({
    id: "unicode-tabs",
    type: "tabs",
    data: { tabs: [{ id: "unicode", label }] },
    slots: { unicode: [] },
  });
  const boundaryDefinition = buildV4WithBlocks([unicodeBlock(unicodeLabel)]);
  expect(() => validate(customScreenDefinitionSchema, boundaryDefinition)).not.toThrow();
  expect(() =>
    normalizeCustomScreenDefinitionForWrite({ definition: boundaryDefinition })
  ).not.toThrow();

  const overflowDefinition = buildV4WithBlocks([unicodeBlock(`${unicodeLabel}😀`)]);
  expect(() => validate(customScreenDefinitionSchema, overflowDefinition)).toThrow(
    "Invalid payload"
  );
  expect(() => normalizeCustomScreenDefinitionForWrite({ definition: overflowDefinition })).toThrow(
    CustomScreenDefinitionError
  );

  const repaired = normalizeCustomScreenDefinitionForRead({
    definition: overflowDefinition,
  }).editorView.document.sections[0]?.blocks[0]?.data.tabs as ScreenTabItem[];
  expect(Array.from(repaired[0]?.label ?? "")).toHaveLength(SCREEN_TAB_LABEL_MAX);
  expect(repaired[0]?.label.endsWith("😀")).toBe(true);
  expect(repaired[0]?.label).not.toContain("�");
});

test("TASK-540-01 canonical Tabs preserve tab and slot key insertion order byte-identically", () => {
  const block = {
    id: "ordered-tabs",
    type: "tabs",
    data: {
      tabs: [
        { label: "Overview", id: "overview" },
        { label: "Details", id: "details" },
      ],
    },
    slots: { details: [], overview: [] },
  };
  const definition = buildV4WithBlocks([block]);
  const before = JSON.stringify({ data: block.data, slots: block.slots });
  const writtenBlock = normalizeCustomScreenDefinitionForWrite({ definition }).editorView.document
    .sections[0]?.blocks[0];
  const readBlock = normalizeCustomScreenDefinitionForRead({ definition }).editorView.document
    .sections[0]?.blocks[0];

  expect(JSON.stringify({ data: writtenBlock?.data, slots: writtenBlock?.slots })).toBe(before);
  expect(JSON.stringify({ data: readBlock?.data, slots: readBlock?.slots })).toBe(before);
});

test("TASK-540-01 stored Tabs repair is deterministic and never duplicates slot content", () => {
  const slotContent = [{ id: "inside-first", type: "field", data: { label: "First" } }];
  const stored = {
    id: "legacy-tabs",
    type: "tabs",
    data: {
      tabs: [
        { id: "same", label: " First " },
        { id: "same", label: "Second" },
        { id: "not valid", label: "" },
      ],
    },
    slots: { same: slotContent, "not valid": [{ id: "inside-third", type: "field", data: {} }] },
  };
  const read = normalizeCustomScreenDefinitionForRead({
    definition: buildV4WithBlocks([stored]),
  });
  const repaired = read.editorView.document.sections[0]?.blocks[0];
  expect(repaired?.data.tabs).toEqual([
    { id: "same", label: "First" },
    { id: "tab-2", label: "Second" },
    { id: "tab-3", label: "Tab 3" },
  ]);
  expect(repaired?.slots?.same).toEqual(slotContent);
  expect(repaired?.slots?.["tab-2"]).toEqual([]);
  expect(repaired?.slots?.["tab-3"]?.[0]?.id).toBe("inside-third");
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
});

test("TASK-540-01 stored Tabs with non-record data repair locally without dropping sibling or slot content", () => {
  const overviewContent = [
    { id: "overview-copy", type: "text", data: { content: "Keep overview" } },
  ];
  const detailsContent = [{ id: "details-copy", type: "text", data: { content: "Keep details" } }];
  const sibling = { id: "sibling-copy", type: "text", data: { content: "Keep sibling" } };
  const storedEditor = buildV4WithBlocks([
    {
      id: "legacy-tabs-data",
      type: "tabs",
      data: "malformed-stored-data",
      slots: { overview: overviewContent, details: detailsContent },
    },
    sibling,
  ]);
  const stored = {
    ...storedEditor,
    listView: {
      ...storedEditor.listView,
      rowTemplate: {
        document: storedEditor.editorView.document,
        bindings: [],
      },
    },
  };
  const before = JSON.stringify(stored);

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });

  expect(JSON.stringify(stored)).toBe(before);
  for (const blocks of [
    read.editorView.document.sections[0]?.blocks ?? [],
    read.listView.rowTemplate?.document.sections[0]?.blocks ?? [],
  ]) {
    const repairedTabs = blocks[0];
    expect(blocks[1]).toEqual(sibling);
    expect(repairedTabs?.data.tabs).toEqual([
      { id: "details", label: "Tab 1" },
      { id: "overview", label: "Tab 2" },
    ]);
    expect(repairedTabs?.slots?.overview).toEqual(overviewContent);
    expect(repairedTabs?.slots?.details).toEqual(detailsContent);
  }
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
});
