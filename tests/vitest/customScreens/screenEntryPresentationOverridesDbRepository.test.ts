import { afterEach, expect, test, vi } from "vitest";

const mockDb = vi.hoisted(() => {
  const state = {
    screenRows: [] as Record<string, unknown>[],
    entryRows: [] as Record<string, unknown>[],
    overrideRows: [] as Record<string, unknown>[],
    queue: [] as unknown[],
    eventLog: [] as string[],
  };

  const terminal = (name: string) => {
    state.eventLog.push(name);
    const next = state.queue.shift();
    return Promise.resolve(next ?? []);
  };

  const chain = (resolve: () => unknown) => {
    const q = {
      from: () => q,
      leftJoin: () => q,
      where: () => q,
      orderBy: () => Promise.resolve(resolve()),
      limit: () => Promise.resolve(resolve()),
      for: () => Promise.resolve(resolve()),
      returning: () => Promise.resolve(resolve()),
    };
    return q;
  };

  const rows = () => chain(() => state.queue.shift() ?? []);

  const client = {
    select: vi.fn((_cols?: unknown) => {
      state.eventLog.push("select");
      return rows();
    }),
    insert: vi.fn(() => ({
      values: vi.fn(() => {
        state.eventLog.push("insert");
        return Promise.resolve([]);
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => chain(() => terminal("delete"))),
    })),
    execute: vi.fn(() => terminal("execute")),
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(client)),
  };

  return {
    state,
    db: client,
    reset() {
      state.screenRows = [];
      state.entryRows = [];
      state.overrideRows = [];
      state.queue = [];
      state.eventLog = [];
    },
  };
});

vi.mock("../../../core/db/client", () => ({ db: mockDb.db }));

import {
  cleanupOverridesForDeletedEntry,
  cleanupOverridesForDeletedScreen,
  cleanupStaleScreenEntryPresentationOverrides,
  getScreenEntryPresentationOverrides,
  saveScreenEntryPresentationOverrides,
} from "../../../core/services/customScreens/screenEntryPresentationOverrides";
import type { CustomScreenDefinition } from "../../../core/services/customScreens/customScreenSchemas";

const SCREEN_ID = "11111111-1111-4111-8111-111111111111";
const CONTENT_TYPE_ID = "22222222-2222-4222-8222-222222222222";
const ENTRY_ID = "33333333-3333-4333-8333-333333333333";
const ACTOR_ID = "44444444-4444-4444-8444-444444444444";
const MEDIA_ID = "55555555-5555-4555-8555-555555555555";

const makeDefinition = (): CustomScreenDefinition => ({
  schemaVersion: 4,
  listView: {
    columns: [
      {
        id: "system-title",
        source: "system",
        field: "title",
        label: "Record",
        formatter: "text",
        visible: true,
      },
    ],
    filters: [],
    defaultSort: { field: "updatedAt", direction: "desc" },
    bulkActions: { delete: true, publish: true, unpublish: true },
  },
  editorView: {
    document: {
      schemaVersion: 1,
      sections: [
        {
          id: "section-1",
          type: "section",
          data: { title: "Details" },
          blocks: [
            { id: "direct-image", type: "image", data: { label: "Cover", src: "/cover.jpg" } },
            { id: "field-name", type: "field", data: { label: "Name", field: "name" } },
          ],
        },
      ],
    },
    bindings: [
      {
        id: "field-name-value",
        blockId: "field-name",
        propPath: "value",
        source: "entry",
        field: "name",
        mode: "readwrite",
      },
    ],
    saveMode: "entry",
    interactionMode: "inline",
  },
});

const makeScreenRow = () => ({
  id: SCREEN_ID,
  contentTypeId: CONTENT_TYPE_ID,
  schemaVersion: 4,
  definition: makeDefinition(),
  contentTypeSlug: "projects",
  contentTypeName: "Projects",
  contentTypeSchema: {
    type: "object",
    properties: { name: { type: "string" } },
  },
});

const makeEntryRow = () => ({ id: ENTRY_ID, typeId: CONTENT_TYPE_ID });

const makeOverrideRow = (
  blockId = "direct-image",
  propPath = "mediaAssetId",
  value = MEDIA_ID
) => ({
  screenId: SCREEN_ID,
  entryId: ENTRY_ID,
  blockId,
  propPath,
  value,
  updatedBy: ACTOR_ID,
  createdAt: new Date("2026-06-24T12:00:00.000Z"),
  updatedAt: new Date("2026-06-24T12:00:00.000Z"),
});

afterEach(() => {
  mockDb.reset();
});

test("default repository loadScreen resolves a screen with a content-type context", async () => {
  mockDb.state.screenRows = [makeScreenRow()];
  mockDb.state.queue = [mockDb.state.screenRows, [makeEntryRow()]];

  const result = await getScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
  });

  expect(result).toEqual([]);
  expect(mockDb.state.eventLog).toContain("select");
});

test("default repository loadScreen null and loadScopeContext throw when the screen is missing", async () => {
  mockDb.state.queue = [[], [makeEntryRow()]];

  await expect(
    getScreenEntryPresentationOverrides({ screenId: SCREEN_ID, entryId: ENTRY_ID })
  ).rejects.toThrow("custom_screen_override_not_found");
});

test("default repository loadEntry null and loadScopeContext throw when the entry is missing", async () => {
  mockDb.state.screenRows = [makeScreenRow()];
  mockDb.state.queue = [mockDb.state.screenRows, []];

  await expect(
    getScreenEntryPresentationOverrides({ screenId: SCREEN_ID, entryId: ENTRY_ID })
  ).rejects.toThrow("custom_screen_override_not_found");
});

test("default repository loadEntry typeId mismatch throws override not found", async () => {
  mockDb.state.screenRows = [makeScreenRow()];
  mockDb.state.queue = [mockDb.state.screenRows, [{ id: ENTRY_ID, typeId: "other-type" }]];

  await expect(
    getScreenEntryPresentationOverrides({ screenId: SCREEN_ID, entryId: ENTRY_ID })
  ).rejects.toThrow("custom_screen_override_not_found");
});

test("default repository listScopedOverrides feeds the active-filter read", async () => {
  mockDb.state.screenRows = [makeScreenRow()];
  mockDb.state.overrideRows = [makeOverrideRow()];
  mockDb.state.queue = [mockDb.state.screenRows, [makeEntryRow()], mockDb.state.overrideRows];

  const result = await getScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
  });

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ blockId: "direct-image", propPath: "mediaAssetId" });
});

test("default repository replaceScopedOverrides inserts drafts inside the writer fence", async () => {
  mockDb.state.screenRows = [makeScreenRow()];
  mockDb.state.overrideRows = [makeOverrideRow()];
  mockDb.state.queue = [
    mockDb.state.screenRows, // loadScreen
    [makeEntryRow()], // loadEntry
    [{ acquired: true }], // fence lock
    [], // fence marker
    mockDb.state.screenRows, // screen FOR KEY SHARE
    [makeEntryRow()], // entry FOR KEY SHARE
    mockDb.state.overrideRows, // post-insert rows
  ];

  const result = await saveScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    actorId: ACTOR_ID,
    overrides: [{ blockId: "direct-image", propPath: "mediaAssetId", value: MEDIA_ID }],
  });

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ blockId: "direct-image", propPath: "mediaAssetId" });
  expect(mockDb.state.eventLog).toContain("insert");
});

test("default repository replaceScopedOverrides skips insert for an empty override list", async () => {
  mockDb.state.screenRows = [makeScreenRow()];
  mockDb.state.queue = [
    mockDb.state.screenRows, // loadScreen
    [makeEntryRow()], // loadEntry
    [{ acquired: true }],
    [],
    mockDb.state.screenRows,
    [makeEntryRow()],
    [], // post-delete rows (no insert)
  ];

  const result = await saveScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    actorId: ACTOR_ID,
    overrides: [],
  });

  expect(result).toEqual([]);
  expect(mockDb.state.eventLog).not.toContain("insert");
});

test("default repository replaceScopedOverrides throws for a missing screen row", async () => {
  mockDb.state.screenRows = [makeScreenRow()];
  mockDb.state.queue = [
    mockDb.state.screenRows, // loadScreen
    [makeEntryRow()], // loadEntry
    [{ acquired: true }],
    [],
    [], // screen FOR KEY SHARE → missing
    [makeEntryRow()], // entry FOR KEY SHARE
  ];

  await expect(
    saveScreenEntryPresentationOverrides({
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      actorId: ACTOR_ID,
      overrides: [{ blockId: "direct-image", propPath: "mediaAssetId", value: MEDIA_ID }],
    })
  ).rejects.toThrow("custom_screen_override_not_found");
});

test("default repository deleteByScreen and deleteByEntry count returned rows", async () => {
  mockDb.state.queue = [[{ acquired: true }], [], [makeOverrideRow()]];
  await expect(cleanupOverridesForDeletedScreen(SCREEN_ID)).resolves.toBe(1);

  mockDb.state.queue = [[{ acquired: true }], [], [makeOverrideRow(), makeOverrideRow()]];
  await expect(cleanupOverridesForDeletedEntry(ENTRY_ID)).resolves.toBe(2);
});

test("default repository deleteExact returns 0 when no row is stale", async () => {
  mockDb.state.screenRows = [makeScreenRow()];
  mockDb.state.overrideRows = [makeOverrideRow()];
  mockDb.state.queue = [mockDb.state.screenRows, mockDb.state.overrideRows];

  const result = await cleanupStaleScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
  });

  expect(result).toEqual({ deleted: 0, staleTargets: [] });
});

test("default repository deleteExact deletes one row per stale target", async () => {
  mockDb.state.screenRows = [makeScreenRow()];
  mockDb.state.overrideRows = [
    makeOverrideRow(),
    makeOverrideRow("missing-block", "tone", "muted"),
  ];
  mockDb.state.queue = [
    mockDb.state.screenRows,
    mockDb.state.overrideRows, // listScreenOverrides (no entryId)
    [{ acquired: true }],
    [],
    [makeOverrideRow("missing-block", "tone", "muted")], // deleteExact returning
  ];

  const result = await cleanupStaleScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
  });

  expect(result.deleted).toBe(1);
  expect(result.staleTargets).toEqual([
    expect.objectContaining({ blockId: "missing-block", propPath: "tone" }),
  ]);
});
