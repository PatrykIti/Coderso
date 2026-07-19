import { expect, test, vi } from "vitest";

import {
  customScreenCreateSchema,
  customScreenDefinitionSchema,
  customScreenUpdateSchema,
  isScreenMediaAssetUuid,
  normalizeCustomScreenDefinitionForRead,
  normalizeCustomScreenDefinitionForWrite,
  type CustomScreenListRowTemplate,
  type ScreenBindingWarningSink,
  type ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";
import {
  buildV4WithBlocks,
  fixedKindBlock,
  fixedKindDataCases,
} from "./custom-screen-schema-fixtures";
import { READ_REPAIR_BLOCK_TYPE } from "../../../core/services/customScreens/screenDocumentReadNormalizer";

test("TASK-540-01 legacy unsupported Buttons are independently disabled in editor and row documents", () => {
  const unsupportedBlock = (type: "button" | "actions") => ({
    id: "same-legacy-id",
    type,
    data: {
      label: "Legacy",
      action: type === "actions" ? "publish" : "custom",
      href: "/must-not-survive",
      ...(type === "actions" ? { legacyOnly: true } : {}),
    },
  });
  const bindings = [
    {
      id: "legacy-href",
      blockId: "same-legacy-id",
      propPath: "href",
      source: "entry",
      field: "targetUrl",
      mode: "read",
    },
    {
      id: "legacy-label",
      blockId: "same-legacy-id",
      propPath: "label",
      source: "entry",
      field: "title",
      mode: "read",
    },
  ] satisfies ScreenFieldBinding[];
  const base = buildV4WithBlocks([unsupportedBlock("actions")]);
  const rowTemplate = {
    document: {
      schemaVersion: 1,
      sections: [{ id: "row", type: "section", data: {}, blocks: [unsupportedBlock("button")] }],
    },
    bindings,
  } satisfies CustomScreenListRowTemplate;
  const stored = {
    ...base,
    listView: { ...base.listView, rowTemplate },
    editorView: { ...base.editorView, bindings },
  };
  const before = JSON.stringify(stored);
  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });
  expect(JSON.stringify(stored)).toBe(before);

  const editorButton = read.editorView.document.sections[0]?.blocks[0];
  const rowButton = read.listView.rowTemplate?.document.sections[0]?.blocks[0];
  for (const button of [editorButton, rowButton]) {
    expect(button?.type).toBe("button");
    expect(button?.data).toMatchObject({ action: "link", label: "Legacy" });
    expect(button?.data.href).toBeUndefined();
    expect(button?.data.disabled).toBeUndefined();
  }
  expect(read.editorView.bindings.map((binding) => binding.propPath)).toEqual(["label"]);
  expect(read.listView.rowTemplate?.bindings.map((binding) => binding.propPath)).toEqual(["label"]);
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
});

test("TASK-540-01 every present non-link Button action prunes href bindings on stored read", () => {
  const unsupportedButtons = (scope: "editor" | "row") => [
    {
      id: `${scope}-unknown-action`,
      type: "button",
      data: {
        label: "Unknown action",
        action: "unexpected-action",
        href: "/must-not-survive",
      },
    },
    {
      id: `${scope}-non-string-action`,
      type: "button",
      data: {
        label: "Non-string action",
        action: { legacy: true },
        href: "/must-not-survive-either",
      },
    },
  ];
  const bindingsFor = (scope: "editor" | "row") =>
    unsupportedButtons(scope).flatMap((block, index) => [
      {
        id: `${scope}-href-${index}`,
        blockId: block.id,
        propPath: "href",
        source: "entry" as const,
        field: "targetUrl",
        mode: "read" as const,
      },
      {
        id: `${scope}-label-${index}`,
        blockId: block.id,
        propPath: "label",
        source: "entry" as const,
        field: "title",
        mode: "read" as const,
      },
    ]);
  const base = buildV4WithBlocks(unsupportedButtons("editor"));
  const stored = {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "row",
              type: "section",
              data: {},
              blocks: unsupportedButtons("row"),
            },
          ],
        },
        bindings: bindingsFor("row"),
      },
    },
    editorView: { ...base.editorView, bindings: bindingsFor("editor") },
  };
  const before = JSON.stringify(stored);

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });

  expect(JSON.stringify(stored)).toBe(before);
  const editorButtons = read.editorView.document.sections[0]?.blocks ?? [];
  const rowButtons = read.listView.rowTemplate?.document.sections[0]?.blocks ?? [];
  for (const button of [...editorButtons, ...rowButtons]) {
    expect(button.data).toMatchObject({ action: "link" });
    expect(button.data.href).toBeUndefined();
  }
  expect(read.editorView.bindings.map((binding) => binding.propPath)).toEqual(["label", "label"]);
  expect(read.listView.rowTemplate?.bindings.map((binding) => binding.propPath)).toEqual([
    "label",
    "label",
  ]);
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
});

test("TASK-540-01 generated stored-read Button IDs cannot retain unsupported href bindings", () => {
  const unsupportedButtons = [
    {
      type: "actions",
      data: { label: "Missing ID", action: "publish", href: "/must-not-survive" },
    },
    {
      id: null,
      type: "button",
      data: { label: "Null ID", action: { legacy: true }, href: "/must-not-survive-either" },
    },
    {
      id: "safe-button",
      type: "button",
      data: { label: "Safe", action: "link" },
    },
  ];
  const bindings = (scope: "editor" | "row") => [
    ...["block-1", "block-2"].map((blockId, index) => ({
      id: `${scope}-unsafe-${index}`,
      blockId,
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    })),
    {
      id: `${scope}-safe`,
      blockId: "safe-button",
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    },
  ];
  const base = buildV4WithBlocks(unsupportedButtons);
  const stored = {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "row",
              type: "section",
              data: {},
              blocks: unsupportedButtons,
            },
          ],
        },
        bindings: bindings("row"),
      },
    },
    editorView: { ...base.editorView, bindings: bindings("editor") },
  };
  const before = JSON.stringify(stored);

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });

  expect(JSON.stringify(stored)).toBe(before);
  const editorButtons = read.editorView.document.sections[0]?.blocks ?? [];
  const rowButtons = read.listView.rowTemplate?.document.sections[0]?.blocks ?? [];
  for (const button of [...editorButtons, ...rowButtons].slice(0, 2)) {
    expect(button.data).toMatchObject({ action: "link" });
    expect(button.data.href).toBeUndefined();
  }
  expect(read.editorView.bindings).toEqual([expect.objectContaining({ blockId: "safe-button" })]);
  expect(read.listView.rowTemplate?.bindings).toEqual([
    expect.objectContaining({ blockId: "safe-button" }),
  ]);
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
});

test("TASK-540-01 Object.prototype type names never become stored-read aliases", () => {
  const inheritedTypeNames = [
    "__defineGetter__",
    "__defineSetter__",
    "__lookupGetter__",
    "__lookupSetter__",
    "__proto__",
    "constructor",
    "hasOwnProperty",
    "isPrototypeOf",
    "propertyIsEnumerable",
    "toLocaleString",
    "toString",
    "valueOf",
  ] as const;
  const blocksFor = (scope: "editor" | "row") => [
    ...inheritedTypeNames.map((type, index) => ({
      id: `${scope}-prototype-${index + 1}`,
      type,
      data: { legacyLabel: type },
    })),
    {
      id: `${scope}-legacy-actions`,
      type: "actions",
      data: { label: "Legacy", action: "link", href: "/safe", legacyOnly: true },
    },
  ];
  const bindingsFor = (scope: "editor" | "row") =>
    [
      {
        id: `${scope}-prototype-binding`,
        blockId: `${scope}-prototype-1`,
        propPath: "legacyLabel",
        source: "entry",
        field: "title",
        mode: "read",
      },
    ] satisfies ScreenFieldBinding[];
  const editorBlocks = blocksFor("editor");
  const rowBlocks = blocksFor("row");
  const base = buildV4WithBlocks(editorBlocks);
  const definition = {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [{ id: "row", type: "section", data: {}, blocks: rowBlocks }],
        },
        bindings: bindingsFor("row"),
      },
    },
    editorView: { ...base.editorView, bindings: bindingsFor("editor") },
  };
  const before = JSON.stringify(definition);

  const read = normalizeCustomScreenDefinitionForRead({ definition });

  expect(Object.getOwnPropertyNames(Object.prototype).sort()).toEqual(
    [...inheritedTypeNames].sort()
  );
  expect(Object.isFrozen(READ_REPAIR_BLOCK_TYPE)).toBe(true);
  expect(Object.isExtensible(READ_REPAIR_BLOCK_TYPE)).toBe(false);
  expect(READ_REPAIR_BLOCK_TYPE).toEqual({ actions: "button" });
  expect(
    Reflect.set(
      READ_REPAIR_BLOCK_TYPE as unknown as Record<string, string>,
      "constructor",
      "button"
    )
  ).toBe(false);
  expect(JSON.stringify(definition)).toBe(before);

  const repairedViews = [
    {
      blocks: read.editorView.document.sections[0]?.blocks ?? [],
      bindings: read.editorView.bindings,
      sourceBlocks: editorBlocks,
      expectedBindings: bindingsFor("editor"),
    },
    {
      blocks: read.listView.rowTemplate?.document.sections[0]?.blocks ?? [],
      bindings: read.listView.rowTemplate?.bindings ?? [],
      sourceBlocks: rowBlocks,
      expectedBindings: bindingsFor("row"),
    },
  ];
  for (const { blocks, bindings, sourceBlocks, expectedBindings } of repairedViews) {
    expect(blocks.map((block) => block.type)).toEqual([...inheritedTypeNames, "button"]);
    expect(
      blocks.slice(0, inheritedTypeNames.length).map((block) => JSON.stringify(block.data))
    ).toEqual(
      sourceBlocks.slice(0, inheritedTypeNames.length).map((block) => JSON.stringify(block.data))
    );
    expect(blocks.at(-1)?.data).toEqual({ label: "Legacy", action: "link", href: "/safe" });
    expect(bindings).toEqual(expectedBindings);
  }
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
  expect(() => normalizeCustomScreenDefinitionForWrite({ definition: read })).toThrow(
    "custom_screen_definition_invalid"
  );
  expect(() => validate(customScreenDefinitionSchema, read)).toThrow();
});

test("TASK-540-01 removed orphan Tabs slots preserve both stored-read documents", () => {
  const tabsWithOrphanSlot = (scope: "editor" | "row", nullId: boolean) => ({
    id: `${scope}-tabs`,
    type: "tabs",
    data: {
      tabs: [
        { id: "kept", label: "Kept" },
        { id: "kept", label: "Duplicate" },
      ],
    },
    slots: {
      kept: [
        {
          id: `${scope}-survivor`,
          type: "button",
          data: { label: "Survivor", action: "link", href: "/safe" },
        },
      ],
      orphan: [
        {
          ...(nullId ? { id: null } : {}),
          type: "button",
          data: { label: "Removed", action: "unsupported", href: "/must-not-survive" },
        },
      ],
    },
  });
  const bindingsFor = (scope: "editor" | "row") => [
    {
      id: `${scope}-removed-href`,
      blockId: "block-1",
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    },
    {
      id: `${scope}-survivor-href`,
      blockId: `${scope}-survivor`,
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    },
  ];
  const editorTabs = tabsWithOrphanSlot("editor", false);
  const rowTabs = tabsWithOrphanSlot("row", true);
  const base = buildV4WithBlocks([editorTabs]);
  const stored = {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [{ id: "row", type: "section", data: {}, blocks: [rowTabs] }],
        },
        bindings: bindingsFor("row"),
      },
    },
    editorView: { ...base.editorView, bindings: bindingsFor("editor") },
  };
  const before = JSON.stringify(stored);

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });

  expect(JSON.stringify(stored)).toBe(before);
  const repairedViews = [
    {
      scope: "editor",
      tabs: read.editorView.document.sections[0]?.blocks[0],
      bindings: read.editorView.bindings,
    },
    {
      scope: "row",
      tabs: read.listView.rowTemplate?.document.sections[0]?.blocks[0],
      bindings: read.listView.rowTemplate?.bindings ?? [],
    },
  ] as const;
  for (const { scope, tabs, bindings } of repairedViews) {
    expect(tabs?.type).toBe("tabs");
    expect(Object.keys(tabs?.slots ?? {})).toEqual(["kept", "tab-2"]);
    expect(tabs?.slots?.kept?.map((block) => block.id)).toEqual([`${scope}-survivor`]);
    expect(tabs?.slots?.["tab-2"]).toEqual([]);
    expect(bindings.map((binding) => binding.id)).toEqual([`${scope}-survivor-href`]);
  }
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
});

test("TASK-540-01 reordered Tabs slots keep Button action provenance structural", () => {
  const tabsWithReorderedSlots = (scope: "editor" | "row", nullId: boolean) => ({
    id: `${scope}-tabs`,
    type: "tabs",
    data: {
      tabs: [
        { id: "first", label: " First " },
        { id: "second", label: "Second" },
      ],
    },
    slots: {
      second: [
        {
          id: `${scope}-safe`,
          type: "button",
          data: { label: "Safe", action: "link", href: "/safe" },
        },
      ],
      first: [
        {
          ...(nullId ? { id: null } : {}),
          type: "button",
          data: {
            label: "Unsupported",
            action: nullId ? { legacy: true } : "unexpected-action",
            href: "/must-not-survive",
          },
        },
      ],
    },
  });
  const bindingsFor = (scope: "editor" | "row") => [
    {
      id: `${scope}-unsupported-href`,
      blockId: "block-1",
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    },
    {
      id: `${scope}-unsupported-label`,
      blockId: "block-1",
      propPath: "label",
      source: "entry" as const,
      field: "title",
      mode: "read" as const,
    },
    {
      id: `${scope}-safe-href`,
      blockId: `${scope}-safe`,
      propPath: "href",
      source: "entry" as const,
      field: "targetUrl",
      mode: "read" as const,
    },
  ];
  const editorTabs = tabsWithReorderedSlots("editor", false);
  const rowTabs = tabsWithReorderedSlots("row", true);
  const base = buildV4WithBlocks([editorTabs]);
  const stored = {
    ...base,
    listView: {
      ...base.listView,
      rowTemplate: {
        document: {
          schemaVersion: 1,
          sections: [{ id: "row", type: "section", data: {}, blocks: [rowTabs] }],
        },
        bindings: bindingsFor("row"),
      },
    },
    editorView: { ...base.editorView, bindings: bindingsFor("editor") },
  };
  const before = JSON.stringify(stored);

  const read = normalizeCustomScreenDefinitionForRead({ definition: stored });

  expect(JSON.stringify(stored)).toBe(before);
  const repairedViews = [
    {
      scope: "editor",
      tabs: read.editorView.document.sections[0]?.blocks[0],
      bindings: read.editorView.bindings,
    },
    {
      scope: "row",
      tabs: read.listView.rowTemplate?.document.sections[0]?.blocks[0],
      bindings: read.listView.rowTemplate?.bindings ?? [],
    },
  ] as const;
  for (const { scope, tabs, bindings } of repairedViews) {
    expect(Object.keys(tabs?.slots ?? {})).toEqual(["first", "second"]);
    const unsupported = tabs?.slots?.first?.[0];
    const safe = tabs?.slots?.second?.[0];
    expect(unsupported).toMatchObject({ id: "block-1", data: { action: "link" } });
    expect(unsupported?.data.href).toBeUndefined();
    expect(safe).toMatchObject({
      id: `${scope}-safe`,
      data: { action: "link", href: "/safe" },
    });
    expect(bindings.map((binding) => binding.id)).toEqual([
      `${scope}-unsupported-label`,
      `${scope}-safe-href`,
    ]);
  }
  expect(() => validate(customScreenDefinitionSchema, read)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForRead({ definition: read })).toEqual(read);
  expect(normalizeCustomScreenDefinitionForWrite({ definition: read })).toEqual(read);
});

test("TASK-540-01 empty editor and row documents prune every block ghost into one sink", () => {
  const ghostBinding = (id: string, field: string): ScreenFieldBinding => ({
    id,
    blockId: "missing-block",
    propPath: "value",
    source: "entry",
    field,
    mode: "read",
  });
  const base = buildV4WithBlocks([]);
  const editorBindings = [ghostBinding("editor-a", "title"), ghostBinding("editor-b", "title")];
  const rowTemplate = {
    document: { schemaVersion: 1, sections: [] },
    bindings: [ghostBinding("row-a", "slug")],
  } satisfies CustomScreenListRowTemplate;
  const definition = {
    ...base,
    listView: { ...base.listView, rowTemplate },
    editorView: { ...base.editorView, bindings: editorBindings },
  };
  const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
  const normalized = normalizeCustomScreenDefinitionForWrite({ definition }, undefined, sink);
  expect(normalized.editorView.bindings).toEqual([]);
  expect(normalized.listView.rowTemplate?.bindings).toEqual([]);
  expect(sink.removedBlockOrphans).toEqual(["slug", "title", "title"]);

  const storedRead = normalizeCustomScreenDefinitionForRead({ definition });
  expect(storedRead.editorView.bindings).toEqual([]);
  expect(storedRead.listView.rowTemplate?.bindings).toEqual([]);
});

test("TASK-540-01 valid V4 input is byte-stable through write and stored-read", () => {
  const definition = buildV4WithBlocks(
    Object.keys(fixedKindDataCases).map((type) =>
      fixedKindBlock(type as keyof typeof fixedKindDataCases, {
        ...fixedKindDataCases[type as keyof typeof fixedKindDataCases],
      })
    )
  );
  expect(normalizeCustomScreenDefinitionForWrite({ definition })).toEqual(definition);
  expect(normalizeCustomScreenDefinitionForRead({ definition })).toEqual(definition);
  expect(JSON.stringify(normalizeCustomScreenDefinitionForWrite({ definition }))).toBe(
    JSON.stringify(definition)
  );
});

test("TASK-540-01 shared Ajv compiles create/update in both orders without schema-ID collisions", async () => {
  const definition = buildV4WithBlocks([fixedKindBlock("tabs")]);
  const createPayload = { name: "Catalog", contentTypeId: "type-1", definition };
  const updatePayload = { definition };

  vi.resetModules();
  const createFirst = await import("../../../core/server/validation/schemaValidator");
  expect(() => createFirst.validate(customScreenCreateSchema, createPayload)).not.toThrow();
  expect(() => createFirst.validate(customScreenUpdateSchema, updatePayload)).not.toThrow();

  vi.resetModules();
  const updateFirst = await import("../../../core/server/validation/schemaValidator");
  expect(() => updateFirst.validate(customScreenUpdateSchema, updatePayload)).not.toThrow();
  expect(() => updateFirst.validate(customScreenCreateSchema, createPayload)).not.toThrow();
});

test("TASK-540-01 fresh PATCH schema validation and direct writes reject every unsupported Button action", async () => {
  for (const action of ["publish", "custom"] as const) {
    const definition = buildV4WithBlocks([
      {
        id: `unsupported-${action}`,
        type: "button",
        data: { label: "Unsupported", action, href: "/must-not-persist" },
      },
    ]);

    vi.resetModules();
    const freshValidator = await import("../../../core/server/validation/schemaValidator");
    expect(() => freshValidator.validate(customScreenUpdateSchema, { definition })).toThrow(
      "Invalid payload"
    );
    expect(() => normalizeCustomScreenDefinitionForWrite({ definition })).toThrow(
      "custom_screen_definition_invalid"
    );
  }
});

test("TASK-540-01 media identity predicate has one exact UUID contract", () => {
  for (const value of [
    "123e4567-e89b-12d3-a456-426614174000",
    "123E4567-E89B-12D3-A456-426614174ABC",
  ]) {
    expect(isScreenMediaAssetUuid(value)).toBe(true);
  }
  for (const value of [
    "",
    "123e4567-e89b-12d3-a456-42661417400",
    "/media/123e4567-e89b-12d3-a456-426614174000",
    "https://example.com/123e4567-e89b-12d3-a456-426614174000",
    42,
    null,
  ]) {
    expect(isScreenMediaAssetUuid(value)).toBe(false);
  }
});
