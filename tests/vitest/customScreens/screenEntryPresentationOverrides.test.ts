import { beforeEach, expect, test } from "vitest";

import {
  cleanupOverridesForDeletedEntry,
  cleanupOverridesForDeletedScreen,
  cleanupStaleScreenEntryPresentationOverrides,
  getScreenEntryPresentationOverrides,
  isScreenEntryPresentationSingleMediaSchemaDefinition,
  normalizeScreenEntryPresentationOverride,
  normalizeScreenEntryPresentationOverrideList,
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
              id: "direct-image",
              type: "image",
              data: { label: "Cover", src: "/static/cover.jpg" },
            },
            {
              id: "field-image",
              type: "field",
              data: { label: "Hero image", field: "heroImage" },
            },
            {
              id: "field-gallery",
              type: "field",
              data: { label: "Gallery", field: "gallery" },
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
        id: "field-gallery-value",
        blockId: "field-gallery",
        propPath: "value",
        source: "entry",
        field: "gallery",
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
            gallery: {
              type: "array",
              items: { type: "string" },
              xFieldType: "media",
              xFieldConfig: { media: { multiple: true, maxItems: 4 } },
            },
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

test("classifies only scalar media schema representations as override targets", () => {
  expect(
    isScreenEntryPresentationSingleMediaSchemaDefinition({
      type: "string",
      xFieldType: "media",
    })
  ).toBe(true);
  expect(
    isScreenEntryPresentationSingleMediaSchemaDefinition({
      type: "array",
      items: { type: "string" },
      xFieldType: "media",
    })
  ).toBe(false);
  expect(
    isScreenEntryPresentationSingleMediaSchemaDefinition({
      type: "string",
      xFieldType: "media",
      xFieldConfig: { media: { multiple: true } },
    })
  ).toBe(false);
  expect(
    isScreenEntryPresentationSingleMediaSchemaDefinition({
      type: "string",
      xFieldType: "media",
      xFieldConfig: { multiple: true },
    })
  ).toBe(false);
});

test("saves scoped overrides without mutating content entry data", async () => {
  const beforeEntryData = { ...repository.entryData };

  const result = await saveScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    actorId: ACTOR_ID,
    overrides: [
      { blockId: "direct-image", propPath: "mediaAssetId", value: MEDIA_ID },
      { blockId: "field-image", propPath: "image", value: MEDIA_ID },
      { blockId: "field-name", propPath: "textEmphasis", value: "semibold" },
    ],
    deps: deps(),
  });

  expect(result).toHaveLength(3);
  expect(repository.lastReplace).toMatchObject({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    actorId: ACTOR_ID,
    overrides: [
      { blockId: "direct-image", propPath: "mediaAssetId", value: MEDIA_ID },
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

test("TASK-9999-01-L01 rejects a non-UUID actor and preserves valid uppercase round-trip", async () => {
  const beforeEntryData = { ...repository.entryData };

  await expect(
    saveScreenEntryPresentationOverrides({
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      actorId: "not-a-uuid",
      overrides: [{ blockId: "direct-image", propPath: "mediaAssetId", value: MEDIA_ID }],
      deps: deps(),
    })
  ).rejects.toThrow("custom_screen_override_invalid");
  expect(repository.lastReplace).toBeNull();
  expect(repository.entryData).toEqual(beforeEntryData);

  const result = await saveScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    actorId: "123E4567-E89B-12D3-A456-426614174ABC",
    overrides: [{ blockId: "direct-image", propPath: "mediaAssetId", value: MEDIA_ID }],
    deps: deps(),
  });
  expect(result).toHaveLength(1);
  expect(repository.lastReplace?.actorId).toBe("123E4567-E89B-12D3-A456-426614174ABC");
});

test("rejects scalar overrides for multiple-media fields and ignores legacy stored rows", async () => {
  await expect(
    saveScreenEntryPresentationOverrides({
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      actorId: ACTOR_ID,
      overrides: [{ blockId: "field-gallery", propPath: "mediaAssetId", value: MEDIA_ID }],
      deps: deps(),
    })
  ).rejects.toThrow("custom_screen_override_invalid");
  expect(repository.lastReplace).toBeNull();

  const now = new Date("2026-06-24T12:00:00.000Z");
  repository.rows = [
    {
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      blockId: "field-gallery",
      propPath: "mediaAssetId",
      value: MEDIA_ID,
      updatedBy: ACTOR_ID,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await expect(
    getScreenEntryPresentationOverrides({
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      deps: deps(),
    })
  ).resolves.toEqual([]);
  const cleanup = await cleanupStaleScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    deps: deps(),
  });
  expect(cleanup.deleted).toBe(1);
  expect(cleanup.staleTargets).toEqual([
    expect.objectContaining({
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      blockId: "field-gallery",
      propPath: "mediaAssetId",
    }),
  ]);
  expect(repository.rows).toEqual([]);
});

test("repository reads reject a structurally malformed row instead of returning a partial list", async () => {
  const now = new Date("2026-06-24T12:00:00.000Z");
  repository.rows = [
    {
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      blockId: "direct-image",
      propPath: "mediaAssetId",
      value: MEDIA_ID,
      updatedBy: ACTOR_ID,
      createdAt: now,
      updatedAt: now,
    },
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

  await expect(
    getScreenEntryPresentationOverrides({
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      deps: deps(),
    })
  ).rejects.toThrow("custom_screen_override_invalid");
});

test("reads filter structurally valid inactive targets after complete-list validation", async () => {
  const now = new Date("2026-06-24T12:00:00.000Z");
  repository.rows = [
    {
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      blockId: "direct-image",
      propPath: "mediaAssetId",
      value: MEDIA_ID,
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
  ];

  await expect(
    getScreenEntryPresentationOverrides({
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      deps: deps(),
    })
  ).resolves.toEqual([
    expect.objectContaining({
      blockId: "direct-image",
      propPath: "mediaAssetId",
      value: MEDIA_ID,
      createdAt: now,
      updatedAt: now,
    }),
  ]);
});

test("normalizes exact draft, repository, and transport list modes without cross-mode coercion", () => {
  const now = new Date("2026-06-24T12:00:00.000Z");
  const draft = { blockId: "direct-image", propPath: "mediaAssetId", value: MEDIA_ID } as const;
  const repositoryRecord = {
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    updatedBy: ACTOR_ID,
    createdAt: now,
    updatedAt: now,
    ...draft,
  };
  const transportRecord = {
    ...repositoryRecord,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  expect(normalizeScreenEntryPresentationOverrideList([draft], { source: "draft-cache" })).toEqual([
    draft,
  ]);
  const repositoryResult = normalizeScreenEntryPresentationOverrideList([repositoryRecord], {
    source: "repository-record",
  });
  expect(repositoryResult[0]?.createdAt).toBe(now);
  expect(
    normalizeScreenEntryPresentationOverrideList([transportRecord], {
      source: "transport-response",
    })
  ).toEqual([draft]);

  expect(() =>
    normalizeScreenEntryPresentationOverrideList([transportRecord], {
      source: "repository-record",
    })
  ).toThrow("custom_screen_override_invalid");
  expect(() =>
    normalizeScreenEntryPresentationOverrideList([repositoryRecord], {
      source: "transport-response",
    })
  ).toThrow("custom_screen_override_invalid");
  expect(() =>
    normalizeScreenEntryPresentationOverrideList([{ ...transportRecord, extra: true }], {
      source: "transport-response",
    })
  ).toThrow("custom_screen_override_invalid");
  expect(() =>
    normalizeScreenEntryPresentationOverrideList(
      [transportRecord, { ...transportRecord, updatedBy: "not-a-uuid" }],
      { source: "transport-response" }
    )
  ).toThrow("custom_screen_override_invalid");
});

test("list normalization rejects invalid envelopes and accepts only source-native nullable metadata", () => {
  const timestamp = "2026-06-24T12:00:00.000Z";
  const draft = { blockId: "direct-image", propPath: "mediaAssetId", value: MEDIA_ID } as const;
  const repositoryRecord = {
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    updatedBy: null,
    createdAt: new Date(timestamp),
    updatedAt: new Date(timestamp),
    ...draft,
  };
  const transportRecord = {
    ...repositoryRecord,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  expect(() =>
    normalizeScreenEntryPresentationOverrideList(null, { source: "draft-cache" })
  ).toThrow("custom_screen_override_invalid");
  expect(() =>
    normalizeScreenEntryPresentationOverrideList(
      Array.from({ length: 201 }, () => draft),
      {
        source: "draft-cache",
      }
    )
  ).toThrow("custom_screen_override_invalid");
  expect(() =>
    normalizeScreenEntryPresentationOverrideList([{ ...draft, unknown: true }], {
      source: "draft-cache",
    })
  ).toThrow("custom_screen_override_invalid");

  expect(
    normalizeScreenEntryPresentationOverrideList([repositoryRecord], {
      source: "repository-record",
    })[0]?.updatedBy
  ).toBeNull();
  expect(
    normalizeScreenEntryPresentationOverrideList([transportRecord], {
      source: "transport-response",
    })
  ).toEqual([draft]);

  for (const invalidRecord of [
    { ...repositoryRecord, createdAt: new Date("invalid") },
    { ...repositoryRecord, updatedAt: timestamp },
    { ...repositoryRecord, updatedBy: "not-a-uuid" },
    { ...repositoryRecord, unknown: true },
  ]) {
    expect(() =>
      normalizeScreenEntryPresentationOverrideList([invalidRecord], {
        source: "repository-record",
      })
    ).toThrow("custom_screen_override_invalid");
  }

  for (const invalidRecord of [
    { ...transportRecord, createdAt: "2026-06-24T12:00:00Z" },
    { ...transportRecord, updatedAt: new Date(timestamp) },
    { ...transportRecord, updatedBy: "not-a-uuid" },
    { ...transportRecord, unknown: true },
  ]) {
    expect(() =>
      normalizeScreenEntryPresentationOverrideList([invalidRecord], {
        source: "transport-response",
      })
    ).toThrow("custom_screen_override_invalid");
  }
});

test("repository save, active read, and cleanup preserve the exact direct-image UUID", async () => {
  await saveScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    actorId: ACTOR_ID,
    overrides: [{ blockId: "direct-image", propPath: "mediaAssetId", value: MEDIA_ID }],
    deps: deps(),
  });

  const savedRow = repository.rows[0];
  expect(savedRow).toMatchObject({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    blockId: "direct-image",
    propPath: "mediaAssetId",
    value: MEDIA_ID,
    updatedBy: ACTOR_ID,
  });
  expect(savedRow?.createdAt).toBeInstanceOf(Date);
  await expect(
    getScreenEntryPresentationOverrides({
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      deps: deps(),
    })
  ).resolves.toEqual([savedRow]);
  await expect(
    cleanupStaleScreenEntryPresentationOverrides({
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      deps: deps(),
    })
  ).resolves.toEqual({ deleted: 0, staleTargets: [] });
  expect(repository.rows[0]?.value).toBe(MEDIA_ID);
});

test("cleanupStaleScreenEntryPresentationOverrides removes unresolved rows only", async () => {
  const now = new Date("2026-06-24T12:00:00.000Z");
  repository.rows = [
    {
      screenId: SCREEN_ID,
      entryId: ENTRY_ID,
      blockId: "direct-image",
      propPath: "mediaAssetId",
      value: MEDIA_ID,
      updatedBy: ACTOR_ID,
      createdAt: now,
      updatedAt: now,
    },
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
  expect(repository.rows).toHaveLength(2);
  expect(repository.rows.map((row) => row.blockId).sort()).toEqual(["direct-image", "field-name"]);
});

test("delete cleanup helpers delegate to screen and entry scopes", async () => {
  await cleanupOverridesForDeletedScreen(SCREEN_ID, deps());
  await cleanupOverridesForDeletedEntry(ENTRY_ID, deps());

  expect(repository.deletedScreens).toEqual([SCREEN_ID]);
  expect(repository.deletedEntries).toEqual([ENTRY_ID]);
});
