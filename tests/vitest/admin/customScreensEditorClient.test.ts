import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  getCachedCustomScreenEditor,
  getCustomScreenEditorCached,
  normalizeCustomScreenRecordForEditor,
} from "../../../core/admin/services/customScreensEditorClient";
import * as customScreensClient from "../../../core/admin/services/customScreensClient";
import type { CustomScreenSummaryRecord } from "../../../core/services/customScreens/customScreenSummaryContract";
import type { CustomScreenDefinition } from "../../../core/services/customScreens/customScreenSchemas";

const makeV4Definition = (blockId = "field-1"): CustomScreenDefinition => ({
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
          label: "Details",
          data: { title: "Details" },
          blocks: [
            {
              id: blockId,
              type: "field",
              data: { label: "Name", value: "" },
            },
          ],
        },
      ],
    },
    bindings: [
      {
        id: `${blockId}-value`,
        blockId,
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

const makeSummary = (
  overrides: Partial<CustomScreenSummaryRecord> = {}
): CustomScreenSummaryRecord => ({
  id: "screen-1",
  name: "Catalog screen",
  contentTypeId: "ct-1",
  status: "draft",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: false,
  sidebarLabel: null,
  schemaVersion: 4,
  definition: makeV4Definition(),
  blocks: [],
  bindings: [],
  capabilities: null,
  revision: 7,
  createdAt: "2026-03-05T00:00:00.000Z",
  updatedAt: "2026-03-05T00:00:00.000Z",
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeCustomScreenRecordForEditor", () => {
  test("keeps full definition normalization and derives editor-view blocks/bindings", () => {
    const record = normalizeCustomScreenRecordForEditor(makeSummary());

    expect(record.definition.schemaVersion).toBe(4);
    expect(record.blocks).toHaveLength(1);
    expect(record.blocks[0].id).toBe("field-1");
    expect(record.blocks[0].type).toBe("screen-field-value");
    expect(record.bindings).toHaveLength(1);
    expect(record.bindings[0].widgetId).toBe("field-1");
  });

  test("derives capabilities when the summary carries none", () => {
    const record = normalizeCustomScreenRecordForEditor(makeSummary({ capabilities: null }));

    expect(record.capabilities.mode).toBe("editor");
    expect(record.capabilities.hasBlocks).toBe(true);
    expect(record.capabilities.hasBindings).toBe(true);
    expect(record.capabilities.supportsDedicatedEditor).toBe(true);
  });

  test("preserves capabilities and revision supplied by the summary", () => {
    const capabilities = {
      mode: "editor" as const,
      hasBlocks: true,
      hasBindings: true,
      hasReadableBindings: true,
      hasWritableBindings: true,
      supportsDedicatedPreview: true,
      supportsDedicatedEditor: true,
      bindingCounts: { total: 1, readable: 1, writable: 1 },
    };
    const record = normalizeCustomScreenRecordForEditor(
      makeSummary({ capabilities, revision: 11 })
    );

    expect(record.capabilities).toBe(capabilities);
    expect(record.revision).toBe(11);
  });

  test("passes transient warnings through for editor surfacing", () => {
    const warnings = [{ code: "binding_gc" }];
    const record = normalizeCustomScreenRecordForEditor(makeSummary({ warnings }));

    expect(record.warnings).toEqual(warnings);
  });
});

describe("editor cached getters wrap the lightweight client", () => {
  test("getCustomScreenEditorCached delegates to raw detail and normalizes", async () => {
    const raw = makeSummary();
    vi.spyOn(customScreensClient, "getCustomScreenRawCached").mockResolvedValue(raw);

    const record = await getCustomScreenEditorCached("screen-1");

    expect(customScreensClient.getCustomScreenRawCached).toHaveBeenCalledWith(
      "screen-1",
      undefined
    );
    expect(record?.definition.schemaVersion).toBe(4);
    expect(record?.id).toBe("screen-1");
  });

  test("getCustomScreenEditorCached returns null for a missing screen", async () => {
    vi.spyOn(customScreensClient, "getCustomScreenRawCached").mockResolvedValue(null);

    const record = await getCustomScreenEditorCached("missing");

    expect(record).toBeNull();
  });

  test("getCachedCustomScreenEditor wraps the synchronous summary getter", () => {
    const raw = makeSummary();
    vi.spyOn(customScreensClient, "getCachedCustomScreen").mockReturnValue(raw);

    const record = getCachedCustomScreenEditor("screen-1");

    expect(customScreensClient.getCachedCustomScreen).toHaveBeenCalledWith("screen-1");
    expect(record?.blocks[0].id).toBe("field-1");
  });

  test("getCachedCustomScreenEditor returns null for a missing screen", () => {
    vi.spyOn(customScreensClient, "getCachedCustomScreen").mockReturnValue(null);

    expect(getCachedCustomScreenEditor("missing")).toBeNull();
  });
});
