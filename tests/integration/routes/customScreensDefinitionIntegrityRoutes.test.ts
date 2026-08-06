import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { customScreens } from "../../../core/db/schema";
import { createContentType } from "../../../core/services/content/typeService";
import { getCustomScreen } from "../../../core/services/customScreens/customScreenService";
import type { CustomScreenDefinition } from "../../../core/services/customScreens/customScreenSchemas";
import { canConnect } from "../../utils/db";
import {
  buildDefinition,
  createCustomScreenRouteHarness,
} from "./support/customScreensRouteHarness";

const harness = createCustomScreenRouteHarness();
const {
  cleanup,
  patchScreen,
  patchScreenDefinition,
  postScreen,
  seedBoundScreen,
  trackContentTypeId,
  trackScreenId,
} = harness;

afterEach(cleanup);

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const definitionWithEditorBlocks = (blocks: unknown[]): CustomScreenDefinition => {
  const base = buildDefinition();
  return {
    ...base,
    editorView: {
      ...base.editorView,
      document: {
        schemaVersion: 1,
        sections: [{ id: "section-1", type: "section", data: {}, blocks }],
      },
      bindings: [],
    },
  } as CustomScreenDefinition;
};

testIfDb(
  "TASK-540-01 metadata-only registered PATCH persists local Tabs and overlong-ID read repair without document loss",
  async () => {
    const screen = await seedBoundScreen();
    const base = buildDefinition();
    const overviewContent = [
      {
        id: "overview-group",
        type: "field-group",
        data: {},
        children: [{ type: "text", data: { content: "Keep overview" } }],
      },
    ];
    const detailsContent = [{ id: null, type: "text", data: { content: "Keep details" } }];
    const longSectionId = `section-${"s".repeat(170)}`;
    const longBlockPrefix = `block-${"b".repeat(170)}`;
    const longTabsId = `${longBlockPrefix}-tabs`;
    const longSiblingId = `${longBlockPrefix}-sibling`;
    const longPropPath = `value.${"p".repeat(170)}`;
    const sibling = { id: longSiblingId, type: "field", data: { label: "Keep sibling" } };
    const malformedDefinition = {
      ...base,
      editorView: {
        ...base.editorView,
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: longSectionId,
              type: "section",
              data: {},
              blocks: [
                {
                  id: longTabsId,
                  type: "tabs",
                  data: "malformed-stored-data",
                  slots: { overview: overviewContent, details: detailsContent },
                },
                sibling,
              ],
            },
            {
              id: "second-section",
              type: "section",
              data: {},
              blocks: [{ type: "field", data: { label: "Second section" } }],
            },
          ],
        },
        bindings: [
          {
            id: "malformed-stored-binding",
            blockId: longTabsId,
            propPath: "label",
            source: "external",
            field: "name",
            mode: "read",
          },
          {
            id: "sibling-binding",
            blockId: longSiblingId,
            propPath: longPropPath,
            source: "entry",
            field: "name",
            mode: "read",
          },
          {
            id: "generated-child-binding",
            blockId: "block-2",
            propPath: "content",
            source: "entry",
            field: "name",
            mode: "read",
          },
        ],
      },
    } as unknown as CustomScreenDefinition;
    await db
      .update(customScreens)
      .set({ definition: malformedDefinition })
      .where(eq(customScreens.id, screen.id));
    const [storedBeforePatch] = await db
      .select({ definition: customScreens.definition })
      .from(customScreens)
      .where(eq(customScreens.id, screen.id));
    expect(
      (storedBeforePatch?.definition as CustomScreenDefinition).editorView.bindings.map(
        ({ id }) => id
      )
    ).toEqual(["malformed-stored-binding", "sibling-binding", "generated-child-binding"]);

    const response = (await patchScreen(screen.id, { name: "Repaired metadata name" })) as {
      name: string;
      definition: CustomScreenDefinition;
    };
    const responseSection = response.definition.editorView.document.sections[0]!;
    const responseBlocks = responseSection.blocks;
    expect(response.name).toBe("Repaired metadata name");
    expect(response.definition.editorView.document.sections).toHaveLength(2);
    expect(responseBlocks).toHaveLength(2);
    expect(responseSection.id.length).toBeLessThanOrEqual(160);
    expect(responseBlocks[0]?.id.length).toBeLessThanOrEqual(160);
    expect(responseBlocks[1]?.id.length).toBeLessThanOrEqual(160);
    expect(responseBlocks[0]?.id).not.toBe(responseBlocks[1]?.id);
    expect(responseBlocks[1]).toMatchObject({ type: "field", data: { label: "Keep sibling" } });
    expect(responseBlocks[0]?.data.tabs).toEqual([
      { id: "details", label: "Tab 1" },
      { id: "overview", label: "Tab 2" },
    ]);
    expect(responseBlocks[0]?.slots?.details).toEqual([
      { id: "block-1", type: "text", data: { content: "Keep details" } },
    ]);
    expect(responseBlocks[0]?.slots?.overview).toEqual([
      {
        id: "overview-group",
        type: "field-group",
        data: {},
        children: [{ id: "block-2", type: "text", data: { content: "Keep overview" } }],
      },
    ]);
    expect(response.definition.editorView.document.sections[1]?.blocks).toEqual([
      { id: "block-3", type: "field", data: { label: "Second section" } },
    ]);
    expect(response.definition.editorView.bindings).toEqual([
      {
        id: "sibling-binding",
        blockId: responseBlocks[1]?.id,
        propPath: expect.stringMatching(/^[a-zA-Z0-9_.-]{1,160}$/),
        source: "entry",
        field: "name",
        mode: "read",
      },
      {
        id: "generated-child-binding",
        blockId: "block-2",
        propPath: "content",
        source: "entry",
        field: "name",
        mode: "read",
      },
    ]);

    const [persisted] = await db
      .select({ name: customScreens.name, definition: customScreens.definition })
      .from(customScreens)
      .where(eq(customScreens.id, screen.id));
    const persistedDefinition = persisted?.definition as CustomScreenDefinition | undefined;
    expect(persisted?.name).toBe("Repaired metadata name");
    expect(persistedDefinition).toEqual(response.definition);
    expect(persistedDefinition?.editorView.bindings.map(({ id }) => id)).toEqual([
      "sibling-binding",
      "generated-child-binding",
    ]);
  }
);

testIfDb(
  "TASK-540-01 metadata-only registered PATCH preserves legacy V3 siblings while dropping one malformed binding",
  async () => {
    const screen = await seedBoundScreen();
    const base = buildDefinition();
    const legacyDefinition = {
      schemaVersion: 3,
      listView: {
        ...base.listView,
        bulkActions: { ...base.listView.bulkActions, delete: false },
      },
      editorView: {
        blocks: [
          {
            id: "legacy-primary",
            type: "screen-record-header",
            data: { marker: "keep-primary" },
          },
          {
            id: "legacy-sibling",
            type: "screen-record-header",
            data: { marker: "keep-sibling" },
          },
        ],
        bindings: [
          {
            id: "legacy-malformed-binding",
            widgetId: "legacy-primary",
            propPath: "title",
            field: "name",
            mode: "invalid",
          },
          {
            id: "legacy-sibling-binding",
            widgetId: "legacy-sibling",
            propPath: "title",
            field: "name",
            mode: "read",
          },
        ],
        saveMode: "entry",
        interactionMode: "inline",
      },
    };
    await db
      .update(customScreens)
      .set({ definition: legacyDefinition as unknown as CustomScreenDefinition })
      .where(eq(customScreens.id, screen.id));

    const response = (await patchScreen(screen.id, { name: "Repaired legacy V3 metadata" })) as {
      name: string;
      definition: CustomScreenDefinition;
    };

    expect(response.name).toBe("Repaired legacy V3 metadata");
    expect(response.definition.listView.bulkActions.delete).toBe(false);
    expect(response.definition.editorView.document.sections[0]?.blocks.map(({ id }) => id)).toEqual(
      ["legacy-primary", "legacy-sibling"]
    );
    expect(response.definition.editorView.document.sections[0]?.blocks[0]?.data).toEqual({
      marker: "keep-primary",
    });
    expect(response.definition.editorView.document.sections[0]?.blocks[1]?.data).toEqual({
      marker: "keep-sibling",
    });
    expect(response.definition.editorView.bindings).toEqual([
      {
        id: "legacy-sibling-binding",
        blockId: "legacy-sibling",
        propPath: "title",
        source: "entry",
        field: "name",
        mode: "read",
      },
    ]);

    const [persisted] = await db
      .select({ name: customScreens.name, definition: customScreens.definition })
      .from(customScreens)
      .where(eq(customScreens.id, screen.id));
    expect(persisted?.name).toBe("Repaired legacy V3 metadata");
    expect(persisted?.definition).toEqual(response.definition);
  }
);

testIfDb(
  "TASK-540-01 registered PATCH rejects fresh publish and custom Button actions before persistence",
  async () => {
    const screen = await seedBoundScreen();
    const before = JSON.stringify((await getCustomScreen(screen.id))?.definition);

    for (const action of ["publish", "custom"] as const) {
      const definition = definitionWithEditorBlocks([
        {
          id: `unsupported-${action}`,
          type: "button",
          data: { label: "Unsupported", action, href: "/must-not-persist" },
        },
      ]);
      try {
        await patchScreenDefinition(screen.id, definition);
        throw new Error(`expected ${action} action rejection`);
      } catch (error) {
        expect(error).toMatchObject({
          code: "validation_error",
          message: "Invalid payload",
          status: 400,
        });
      }
      expect(JSON.stringify((await getCustomScreen(screen.id))?.definition)).toBe(before);
    }
  }
);

testIfDb(
  "TASK-540-01 PATCH rejects fixed-kind unknown keys recursively in children and slots without mutating storage",
  async () => {
    const screen = await seedBoundScreen();
    const before = JSON.stringify((await getCustomScreen(screen.id))?.definition);
    const submittedUnknownKey = "submittedUnknownKeyMustNotEcho";
    const invalidDefinitions = [
      definitionWithEditorBlocks([
        {
          id: "child-parent",
          type: "field-group",
          data: {},
          children: [
            {
              id: "child-middle",
              type: "field-group",
              data: {},
              children: [
                {
                  id: "bad-heading-child",
                  type: "heading",
                  data: { text: "Nested", [submittedUnknownKey]: true },
                },
              ],
            },
          ],
        },
      ]),
      definitionWithEditorBlocks([
        {
          id: "slot-parent",
          type: "columns",
          data: {},
          slots: {
            left: [
              {
                id: "slot-middle",
                type: "columns",
                data: {},
                slots: {
                  right: [
                    {
                      id: "bad-heading-slot",
                      type: "heading",
                      data: { text: "Nested", [submittedUnknownKey]: true },
                    },
                  ],
                },
              },
            ],
          },
        },
      ]),
    ];

    for (const definition of invalidDefinitions) {
      try {
        await patchScreenDefinition(screen.id, definition);
        throw new Error("expected recursive schema rejection");
      } catch (error) {
        expect(error).toMatchObject({
          code: "validation_error",
          message: "Invalid payload",
          status: 400,
        });
        expect(JSON.stringify((error as { details?: unknown }).details)).not.toContain(
          submittedUnknownKey
        );
      }
      expect(JSON.stringify((await getCustomScreen(screen.id))?.definition)).toBe(before);
    }
  }
);

testIfDb(
  "TASK-540-01 PATCH rejects unsupported block types at root, child, and slot boundaries without mutating storage",
  async () => {
    const screen = await seedBoundScreen();
    const before = JSON.stringify((await getCustomScreen(screen.id))?.definition);
    const submittedType = "submitted-plugin-type-must-not-echo";
    const invalidDefinitions = [
      definitionWithEditorBlocks([{ id: "unsupported-root", type: submittedType, data: {} }]),
      definitionWithEditorBlocks([
        {
          id: "child-parent",
          type: "field-group",
          data: {},
          children: [{ id: "unsupported-child", type: submittedType, data: {} }],
        },
      ]),
      definitionWithEditorBlocks([
        {
          id: "slot-parent",
          type: "columns",
          data: {},
          slots: {
            content: [{ id: "unsupported-slot", type: submittedType, data: {} }],
          },
        },
      ]),
    ];

    for (const definition of invalidDefinitions) {
      try {
        await patchScreenDefinition(screen.id, definition);
        throw new Error("expected unsupported block type rejection");
      } catch (error) {
        expect(error).toMatchObject({
          code: "validation_error",
          message: "Invalid payload",
          status: 400,
        });
        expect(JSON.stringify((error as { details?: unknown }).details)).not.toContain(
          submittedType
        );
      }
      expect(JSON.stringify((await getCustomScreen(screen.id))?.definition)).toBe(before);
    }
  }
);

testIfDb(
  "TASK-540-01 PATCH maps unsafe URLs, duplicate Tabs, and tab-slot mismatch to bounded non-echo domain errors",
  async () => {
    const screen = await seedBoundScreen();
    const before = JSON.stringify((await getCustomScreen(screen.id))?.definition);
    const rejectedUrl = "javascript:submitted-value-must-not-echo";
    const semanticFailures = [
      definitionWithEditorBlocks([
        { id: "unsafe-image", type: "image", data: { src: rejectedUrl } },
      ]),
      definitionWithEditorBlocks([
        {
          id: "unsafe-button",
          type: "button",
          data: { action: "link", href: rejectedUrl },
        },
      ]),
      definitionWithEditorBlocks([
        {
          id: "duplicate-tabs",
          type: "tabs",
          data: {
            tabs: [
              { id: "same", label: "First" },
              { id: "same", label: "Second" },
            ],
          },
          slots: { same: [] },
        },
      ]),
      definitionWithEditorBlocks([
        {
          id: "mismatched-tabs",
          type: "tabs",
          data: { tabs: [{ id: "expected", label: "Expected" }] },
          slots: { other: [] },
        },
      ]),
    ];

    for (const definition of semanticFailures) {
      try {
        await patchScreenDefinition(screen.id, definition);
        throw new Error("expected semantic definition rejection");
      } catch (error) {
        expect(error).toMatchObject({
          code: "custom_screen_definition_invalid",
          message: "Custom screen definition is invalid",
          status: 400,
        });
        const fields =
          ((error as { details?: { fields?: unknown } }).details?.fields as string[] | undefined) ??
          [];
        expect(fields.length).toBeLessThanOrEqual(8);
        expect(fields.every((field) => field.length <= 240)).toBe(true);
        expect(fields.join(" ")).not.toContain(rejectedUrl);
        expect(fields.join(" ")).not.toContain("same");
        expect(fields.join(" ")).not.toContain("other");
      }
      expect(JSON.stringify((await getCustomScreen(screen.id))?.definition)).toBe(before);
    }
  }
);

testIfDb(
  "TASK-540-01 POST prunes empty-document block ghosts, returns de-duplicated warnings, and GET stays warning-free",
  async () => {
    const contentType = await createContentType({
      name: `Empty Screen ${randomUUID()}`,
      slug: `empty-screen-${randomUUID()}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { name: { type: "string", xFieldType: "text" } },
      },
    });
    trackContentTypeId(contentType.id);
    const base = buildDefinition();
    const ghostBinding = (id: string) => ({
      id,
      blockId: "missing-block",
      propPath: "value",
      source: "entry" as const,
      field: "name",
      mode: "read" as const,
    });
    const definition: CustomScreenDefinition = {
      ...base,
      listView: {
        ...base.listView,
        rowTemplate: {
          document: { schemaVersion: 1, sections: [] },
          bindings: [ghostBinding("row-ghost")],
        },
      },
      editorView: {
        ...base.editorView,
        document: { schemaVersion: 1, sections: [] },
        bindings: [ghostBinding("editor-ghost-a"), ghostBinding("editor-ghost-b")],
      },
    };

    const created = (await postScreen({
      name: `Empty Screen ${randomUUID()}`,
      contentTypeId: contentType.id,
      definition,
    })) as Awaited<ReturnType<typeof getCustomScreen>> & {
      warnings?: { code: string; fields: string[] }[];
    };
    if (!created) throw new Error("custom screen create did not return a record");
    trackScreenId(created.id);
    expect(created.definition.listView.rowTemplate?.bindings).toEqual([]);
    expect(created.definition.editorView.bindings).toEqual([]);
    expect(created.warnings).toEqual([{ code: "binding_block_removed", fields: ["name"] }]);

    const reread = await getCustomScreen(created.id);
    expect(reread?.definition.listView.rowTemplate?.bindings).toEqual([]);
    expect(reread?.definition.editorView.bindings).toEqual([]);
    expect(reread?.warnings).toBeUndefined();
  }
);

test("route harness cleanup continues exact-ID attempts, clears trackers, and propagates failures", async () => {
  const ids = {
    overrideScreen: randomUUID(),
    overrideEntry: randomUUID(),
    screen: randomUUID(),
    entry: randomUUID(),
    contentType: randomUUID(),
    user: randomUUID(),
    untracked: randomUUID(),
  };
  const attempts: string[] = [];
  const failureHarness = createCustomScreenRouteHarness({
    deleteOverride: async ({ screenId, entryId }) => {
      attempts.push(`override:${screenId}:${entryId}`);
      throw new Error("override cleanup failed");
    },
    deleteScreen: async (screenId) => {
      attempts.push(`screen:${screenId}`);
      throw new Error("screen cleanup failed");
    },
    deleteEntry: async (entryId) => {
      attempts.push(`entry:${entryId}`);
    },
    deleteContentType: async (contentTypeId) => {
      attempts.push(`content-type:${contentTypeId}`);
      throw new Error("content-type primary cleanup failed");
    },
    deleteContentTypeFallback: async (contentTypeId) => {
      attempts.push(`content-type-fallback:${contentTypeId}`);
    },
    deleteUser: async (userId) => {
      attempts.push(`user:${userId}`);
    },
  });

  expect(() => failureHarness.trackScreenId(`prefix-${ids.screen}`)).toThrow(
    "screenId must be an exact UUID"
  );
  failureHarness.trackOverrideScope(ids.overrideScreen, ids.overrideEntry);
  failureHarness.trackScreenId(ids.screen);
  failureHarness.trackEntryId(ids.entry);
  failureHarness.trackContentTypeId(ids.contentType);
  failureHarness.trackUserId(ids.user);

  let cleanupFailure: unknown;
  try {
    await failureHarness.cleanup();
  } catch (error) {
    cleanupFailure = error;
  }

  expect(cleanupFailure).toBeInstanceOf(AggregateError);
  expect(
    (cleanupFailure as AggregateError).errors.map((error) => (error as Error).message)
  ).toEqual(["override cleanup failed", "screen cleanup failed"]);
  expect(attempts).toEqual([
    `override:${ids.overrideScreen}:${ids.overrideEntry}`,
    `screen:${ids.screen}`,
    `entry:${ids.entry}`,
    `content-type:${ids.contentType}`,
    `content-type-fallback:${ids.contentType}`,
    `user:${ids.user}`,
  ]);
  expect(attempts.join(" ")).not.toContain(ids.untracked);

  await failureHarness.cleanup();
  expect(attempts).toHaveLength(6);
});
