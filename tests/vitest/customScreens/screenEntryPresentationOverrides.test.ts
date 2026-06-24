import { beforeEach, expect, test } from "vitest";

import {
  cleanupOverridesForDeletedEntry,
  cleanupOverridesForDeletedScreen,
  cleanupStaleScreenEntryPresentationOverrides,
  getScreenEntryPresentationOverrides,
  normalizeScreenEntryPresentationOverride,
  saveScreenEntryPresentationOverrides,
  type ScreenEntryPresentationOverrideDraft,
  type ScreenEntryPresentationOverrideRecord,
  type ScreenEntryPresentationOverrideRepository,
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
            {
              id: "field-image",
              type: "field",
              data: { label: "Hero image", field: "heroImage" },
            },
            {
              id: "field-name",
              type: "field",
              data: { label: "Name", field: "name" },
            },
            {
              id: "field-stale",
              type: "field",
              data: { label: "Removed", field: "removedField" },
            },
            {
              id: "rich-1",
              type: "rich-text",
              data: { content: "Notes", tone: "muted" },
            },
          ],
        },
      ],
    },
    bindings: [
      {
        id: "field-image-value",
        blockId: "field-image",
        propPath: "value",
        source: "entry",
        field: "heroImage",
        mode: "readwrite",
      },
      {
        id: "field-name-value",
        blockId: "field-name",
        propPath: "value",
        source: "entry",
        field: "name",
        mode: "readwrite",
      },
      {
        id: "field-stale-value",
        blockId: "field-stale",
        propPath: "value",
        source: "entry",
        field: "removedField",
        mode: "readwrite",
      },
    ],
    saveMode: "entry",
    interactionMode: "inline",
  },
});

class MemoryOverrideRepository implements ScreenEntryPresentationOverrideRepository {
  public entryData = { heroImage: "original-media", name: "Original name" };
  public rows: ScreenEntryPresentationOverrideRecord[] = [];
  public deletedScreens: string[] = [];
  public deletedEntries: string[] = [];
  public deletedExact: Array<{
    screenId: string;
    entryId: string;
    blockId: string;
    propPath: string;
  }> = [];
  public lastReplace: {
    screenId: string;
    entryId: string;
    actorId: string;
    overrides: ScreenEntryPresentationOverrideDraft[];
  } | null = null;

  async loadScreen(screenId: string) {
    if (screenId !== SCREEN_ID) return null;
    return {
      id: SCREEN_ID,
      contentTypeId: CONTENT_TYPE_ID,
      schemaVersion: 4,
      definition: makeDefinition(),
      contentType: {
        id: CONTENT_TYPE_ID,
        slug: "projects",
        name: "Projects",
        schema: {
          type: "object",
          properties: {
            heroImage: { type: "string", xFieldType: "media" },
            name: { type: "string" },
          },
        },
      },
    };
  }

  async loadEntry(entryId: string) {
    if (entryId !== ENTRY_ID) return null;
    return { id: ENTRY_ID, typeId: CONTENT_TYPE_ID };
  }

  async listScopedOverrides(screenId: string, entryId: string) {
    return this.rows.filter((row) => row.screenId === screenId && row.entryId === entryId);
  }

  async listScreenOverrides(screenId: string) {
    return this.rows.filter((row) => row.screenId === screenId);
  }

  async replaceScopedOverrides(input: {
    screenId: string;
    entryId: string;
    overrides: ScreenEntryPresentationOverrideDraft[];
    actorId: string;
  }) {
    this.lastReplace = input;
    this.rows = this.rows.filter(
      (row) => row.screenId !== input.screenId || row.entryId !== input.entryId
    );
    const now = new Date("2026-06-24T12:00:00.000Z");
    this.rows.push(
      ...input.overrides.map((override) => ({
        screenId: input.screenId,
        entryId: input.entryId,
        blockId: override.blockId,
        propPath: override.propPath,
        value: override.value as string,
        updatedBy: input.actorId,
        createdAt: now,
        updatedAt: now,
      }))
    );
    return this.listScopedOverrides(input.screenId, input.entryId);
  }

  async deleteByScreen(screenId: string) {
    this.deletedScreens.push(screenId);
    const before = this.rows.length;
    this.rows = this.rows.filter((row) => row.screenId !== screenId);
    return before - this.rows.length;
  }

  async deleteByEntry(entryId: string) {
    this.deletedEntries.push(entryId);
    const before = this.rows.length;
    this.rows = this.rows.filter((row) => row.entryId !== entryId);
    return before - this.rows.length;
  }

  async deleteExact(
    targets: Array<{
      screenId: string;
      entryId: string;
      blockId: string;
      propPath: string;
    }>
  ) {
    this.deletedExact.push(...targets);
    const targetKeys = new Set(
      targets.map((target) =>
        [target.screenId, target.entryId, target.blockId, target.propPath].join("\u0000")
      )
    );
    const before = this.rows.length;
    this.rows = this.rows.filter(
      (row) =>
        !targetKeys.has([row.screenId, row.entryId, row.blockId, row.propPath].join("\u0000"))
    );
    return before - this.rows.length;
  }
}

let repository: MemoryOverrideRepository;

beforeEach(() => {
  repository = new MemoryOverrideRepository();
});

const deps = () => ({ repository });

test("normalizes bounded override prop paths and value domains", () => {
  expect(
    normalizeScreenEntryPresentationOverride({
      blockId: "field-name",
      propPath: "textSize",
      value: "lg",
    })
  ).toEqual({ blockId: "field-name", propPath: "textSize", value: "lg" });

  expect(() =>
    normalizeScreenEntryPresentationOverride({
      blockId: "field-name",
      propPath: "data.title",
      value: "lg",
    })
  ).toThrow("custom_screen_override_invalid");
  expect(() =>
    normalizeScreenEntryPresentationOverride({
      blockId: "__proto__",
      propPath: "tone",
      value: "muted",
    })
  ).toThrow("custom_screen_override_invalid");
  expect(() =>
    normalizeScreenEntryPresentationOverride({
      blockId: "field-name",
      propPath: "textSize",
      value: "massive",
      extra: true,
    })
  ).toThrow("custom_screen_override_invalid");
});

test("saves scoped overrides without mutating content entry data", async () => {
  const beforeEntryData = { ...repository.entryData };

  const result = await saveScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    actorId: ACTOR_ID,
    overrides: [
      { blockId: "field-image", propPath: "image", value: MEDIA_ID },
      { blockId: "field-name", propPath: "textEmphasis", value: "semibold" },
    ],
    deps: deps(),
  });

  expect(result).toHaveLength(2);
  expect(repository.lastReplace).toMatchObject({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    actorId: ACTOR_ID,
    overrides: [
      { blockId: "field-image", propPath: "image", value: MEDIA_ID },
      { blockId: "field-name", propPath: "textEmphasis", value: "semibold" },
    ],
  });
  expect(repository.entryData).toEqual(beforeEntryData);
});

test("rejects duplicate targets and media overrides on non-media fields", async () => {
  await expect(
    saveScreenEntryPresentationOverrides({
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      actorId: ACTOR_ID,
      overrides: [
        { blockId: "field-name", propPath: "tone", value: "muted" },
        { blockId: "field-name", propPath: "tone", value: "strong" },
      ],
      deps: deps(),
    })
  ).rejects.toThrow("custom_screen_override_conflict");

  await expect(
    saveScreenEntryPresentationOverrides({
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      actorId: ACTOR_ID,
      overrides: [{ blockId: "field-name", propPath: "image", value: MEDIA_ID }],
      deps: deps(),
    })
  ).rejects.toThrow("custom_screen_override_invalid");
});

test("reads skip stale block, field, and value targets defensively", async () => {
  const now = new Date("2026-06-24T12:00:00.000Z");
  repository.rows = [
    {
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      blockId: "rich-1",
      propPath: "tone",
      value: "muted",
      updatedBy: ACTOR_ID,
      createdAt: now,
      updatedAt: now,
    },
    {
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      blockId: "missing-block",
      propPath: "tone",
      value: "muted",
      updatedBy: ACTOR_ID,
      createdAt: now,
      updatedAt: now,
    },
    {
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      blockId: "field-stale",
      propPath: "textSize",
      value: "lg",
      updatedBy: ACTOR_ID,
      createdAt: now,
      updatedAt: now,
    },
    {
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      blockId: "rich-1",
      propPath: "tone",
      value: "unbounded-tone",
      updatedBy: ACTOR_ID,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const result = await getScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    deps: deps(),
  });

  expect(result).toEqual([
    expect.objectContaining({
      blockId: "rich-1",
      propPath: "tone",
      value: "muted",
    }),
  ]);
});

test("cleanupStaleScreenEntryPresentationOverrides removes unresolved rows only", async () => {
  const now = new Date("2026-06-24T12:00:00.000Z");
  repository.rows = [
    {
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      blockId: "field-name",
      propPath: "tone",
      value: "muted",
      updatedBy: ACTOR_ID,
      createdAt: now,
      updatedAt: now,
    },
    {
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      blockId: "field-stale",
      propPath: "textSize",
      value: "lg",
      updatedBy: ACTOR_ID,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const result = await cleanupStaleScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    deps: deps(),
  });

  expect(result.deleted).toBe(1);
  expect(repository.deletedExact).toEqual([
    expect.objectContaining({ blockId: "field-stale", propPath: "textSize" }),
  ]);
  expect(repository.rows).toHaveLength(1);
  expect(repository.rows[0]?.blockId).toBe("field-name");
});

test("delete cleanup helpers delegate to screen and entry scopes", async () => {
  await cleanupOverridesForDeletedScreen(SCREEN_ID, deps());
  await cleanupOverridesForDeletedEntry(ENTRY_ID, deps());

  expect(repository.deletedScreens).toEqual([SCREEN_ID]);
  expect(repository.deletedEntries).toEqual([ENTRY_ID]);
});
