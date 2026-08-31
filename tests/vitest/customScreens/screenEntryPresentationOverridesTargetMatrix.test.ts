import { beforeEach, expect, test } from "vitest";

import {
  cleanupStaleScreenEntryPresentationOverrides,
  getScreenEntryPresentationOverrides,
  resolveActiveScreenEntryPresentationOverrides,
  type ScreenEntryPresentationOverrideRecord,
  type ScreenEntryPresentationOverrideRepository,
} from "../../../core/services/customScreens/screenEntryPresentationOverrides";
import type {
  CustomScreenDefinition,
  ScreenBlockV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";

const SCREEN_ID = "11111111-1111-4111-8111-111111111111";
const CONTENT_TYPE_ID = "22222222-2222-4222-8222-222222222222";
const ENTRY_ID = "33333333-3333-4333-8333-333333333333";

const makeContentType = () => ({
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
});

type BlockSpec = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

const makeDefinition = (
  blocks: BlockSpec[],
  bindings: ScreenFieldBinding[]
): CustomScreenDefinition => ({
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
          blocks: blocks.map((spec) => ({ ...spec }) as ScreenBlockV1),
        },
      ],
    },
    bindings,
    saveMode: "entry",
    interactionMode: "inline",
  },
});

const makeRecord = (
  blockId: string,
  propPath: "image" | "mediaAssetId" | "textSize" | "textEmphasis" | "tone",
  value: string,
  overrides: Partial<ScreenEntryPresentationOverrideRecord> = {}
): ScreenEntryPresentationOverrideRecord => ({
  screenId: SCREEN_ID,
  entryId: ENTRY_ID,
  blockId,
  propPath,
  value,
  updatedBy: null,
  createdAt: new Date("2026-06-24T12:00:00.000Z"),
  updatedAt: new Date("2026-06-24T12:00:00.000Z"),
  ...overrides,
});

class TargetMatrixRepository implements ScreenEntryPresentationOverrideRepository {
  public rows: ScreenEntryPresentationOverrideRecord[] = [];
  public listedScreenScope: string[] = [];
  public deletedExact: Array<{
    screenId: string;
    entryId: string;
    blockId: string;
    propPath: string;
  }> = [];

  async loadScreen(screenId: string) {
    if (screenId !== SCREEN_ID) return null;
    return {
      id: SCREEN_ID,
      contentTypeId: CONTENT_TYPE_ID,
      schemaVersion: 4,
      definition: makeDefinition(
        [
          { id: "unbound-field", type: "field", data: { label: "No value binding" } },
          { id: "data-field-name", type: "field", data: { label: "Name", field: "name" } },
          { id: "header-1", type: "record-header", data: { title: "Header" } },
          { id: "rich-1", type: "rich-text", data: { content: "Notes", tone: "muted" } },
          { id: "field-image", type: "field", data: { label: "Hero", field: "heroImage" } },
        ],
        [
          {
            id: "header-1-title",
            blockId: "header-1",
            propPath: "title",
            source: "entry",
            field: "name",
            mode: "read",
          },
          {
            id: "field-image-value",
            blockId: "field-image",
            propPath: "value",
            source: "entry",
            field: "heroImage",
            mode: "readwrite",
          },
        ]
      ),
      contentType: makeContentType(),
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
    this.listedScreenScope.push(screenId);
    return this.rows.filter((row) => row.screenId === screenId);
  }

  async replaceScopedOverrides() {
    return [];
  }

  async deleteByScreen() {
    return 0;
  }

  async deleteByEntry() {
    return 0;
  }

  async deleteExact(
    targets: Parameters<ScreenEntryPresentationOverrideRepository["deleteExact"]>[0]
  ) {
    this.deletedExact.push(...targets);
    return targets.length;
  }
}

let repository: TargetMatrixRepository;

beforeEach(() => {
  repository = new TargetMatrixRepository();
});

const deps = () => ({ repository });

test("normalizeText rejects non-string field data and trims a valid data field fallback", () => {
  // `unbound-field` has NO `value` binding and NO `data.field` → resolveFieldBlockField
  // falls back to normalizeText(undefined) → null → the override is inactive.
  const definition = makeDefinition(
    [{ id: "unbound-field", type: "field", data: { label: "No value binding" } }],
    []
  );
  const inactive = resolveActiveScreenEntryPresentationOverrides({
    overrides: [makeRecord("unbound-field", "textSize", "lg")],
    definition,
    contentType: makeContentType(),
  });
  expect(inactive).toEqual([]);

  // `data-field-name` has no binding but a non-empty `data.field` → the string branch
  // of normalizeText runs and the system/schema field resolves.
  const resolvable = resolveActiveScreenEntryPresentationOverrides({
    overrides: [makeRecord("data-field-name", "textEmphasis", "semibold")],
    definition: makeDefinition(
      [{ id: "data-field-name", type: "field", data: { label: "Name", field: "name" } }],
      []
    ),
    contentType: makeContentType(),
  });
  expect(resolvable.map((row) => row.blockId)).toEqual(["data-field-name"]);
});

test("record-header text overrides resolve only when every record-header binding field resolves", () => {
  const bindings: ScreenFieldBinding[] = [
    {
      id: "header-1-title",
      blockId: "header-1",
      propPath: "title",
      source: "entry",
      field: "name",
      mode: "read",
    },
    {
      id: "header-1-eyebrow",
      blockId: "header-1",
      propPath: "eyebrow",
      source: "entry",
      field: "deletedField",
      mode: "read",
    },
  ];
  const definition = makeDefinition(
    [{ id: "header-1", type: "record-header", data: { title: "Header" } }],
    bindings
  );

  // `deletedField` is not on the schema nor a system root → every() is false → inactive.
  const inactive = resolveActiveScreenEntryPresentationOverrides({
    overrides: [makeRecord("header-1", "tone", "muted")],
    definition,
    contentType: makeContentType(),
  });
  expect(inactive).toEqual([]);

  // All record-header bindings resolve (title/eyebrow → system root) → active.
  const resolvableBindings: ScreenFieldBinding[] = [
    {
      id: "header-1-title",
      blockId: "header-1",
      propPath: "title",
      source: "entry",
      field: "name",
      mode: "read",
    },
    {
      id: "header-1-eyebrow",
      blockId: "header-1",
      propPath: "eyebrow",
      source: "entry",
      field: "slug",
      mode: "read",
    },
  ];
  const active = resolveActiveScreenEntryPresentationOverrides({
    overrides: [makeRecord("header-1", "tone", "muted")],
    definition: makeDefinition(
      [{ id: "header-1", type: "record-header", data: { title: "Header" } }],
      resolvableBindings
    ),
    contentType: makeContentType(),
  });
  expect(active.map((row) => row.propPath)).toEqual(["tone"]);
});

test("rich-text text overrides are active; a missing block id is inactive", () => {
  const definition = makeDefinition(
    [{ id: "rich-1", type: "rich-text", data: { content: "Notes", tone: "muted" } }],
    []
  );
  const active = resolveActiveScreenEntryPresentationOverrides({
    overrides: [makeRecord("rich-1", "tone", "muted")],
    definition,
    contentType: makeContentType(),
  });
  expect(active.map((row) => row.blockId)).toEqual(["rich-1"]);
});

test("getScreenEntryPresentationOverrides rejects when the entry is missing or typeId mismatches", async () => {
  await expect(
    getScreenEntryPresentationOverrides({
      screenId: SCREEN_ID,
      entryId: "99999999-9999-4999-8999-999999999999",
      deps: deps(),
    })
  ).rejects.toThrow("custom_screen_override_not_found");
});

test("cleanupStale without an entryId lists the whole screen scope and deletes stale rows", async () => {
  const now = new Date("2026-06-24T12:00:00.000Z");
  repository.rows = [
    makeRecord("field-image", "image", "55555555-5555-4555-8555-555555555555"),
    makeRecord("missing-block", "tone", "muted"),
  ];

  const result = await cleanupStaleScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    deps: deps(),
  });

  expect(repository.listedScreenScope).toEqual([SCREEN_ID]);
  expect(result.staleTargets).toEqual([
    expect.objectContaining({ blockId: "missing-block", propPath: "tone" }),
  ]);
  expect(result.deleted).toBe(1);
  expect(repository.deletedExact).toEqual([
    expect.objectContaining({ blockId: "missing-block", propPath: "tone" }),
  ]);
});

test("cleanupStale with an entryId keeps fully active scoped rows", async () => {
  repository.rows = [makeRecord("field-image", "image", "55555555-5555-4555-8555-555555555555")];

  const result = await cleanupStaleScreenEntryPresentationOverrides({
    screenId: SCREEN_ID,
    entryId: ENTRY_ID,
    deps: deps(),
  });

  expect(result).toEqual({ deleted: 0, staleTargets: [] });
  expect(repository.deletedExact).toEqual([]);
});
