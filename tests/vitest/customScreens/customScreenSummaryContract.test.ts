import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { analyzeAdminBoundary } from "../../../scripts/adminBoundaryReport";

import {
  isCustomScreenSummaryList,
  isCustomScreenSummaryRecord,
  normalizeCustomScreenSummaryRecord,
  type CustomScreenSummaryCapabilities,
  type CustomScreenSummaryRecord,
} from "../../../core/services/customScreens/customScreenSummaryContract";

const read = (file: string) => readFile(path.resolve(file), "utf8");

const capabilities: CustomScreenSummaryCapabilities = {
  mode: "editor",
  hasBlocks: true,
  hasBindings: true,
  hasReadableBindings: true,
  hasWritableBindings: true,
  supportsDedicatedPreview: true,
  supportsDedicatedEditor: true,
  bindingCounts: { total: 2, readable: 2, writable: 2 },
};

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
  definition: {
    schemaVersion: 4,
    listView: { columns: [] },
    editorView: { blocks: [], bindings: [] },
  },
  blocks: [],
  bindings: [],
  capabilities,
  revision: 7,
  createdAt: "2026-03-05T00:00:00.000Z",
  updatedAt: "2026-03-05T00:00:00.000Z",
  ...overrides,
});

describe("normalizeCustomScreenSummaryRecord", () => {
  test("null-defaults nullable summary fields", () => {
    const record = normalizeCustomScreenSummaryRecord(
      makeSummary({
        collectionRole: undefined,
        compositionKey: undefined,
        showInSidebar: undefined,
        sidebarLabel: undefined,
        capabilities: undefined,
      } as unknown as CustomScreenSummaryRecord)
    );

    expect(record.collectionRole).toBeNull();
    expect(record.compositionKey).toBeNull();
    expect(record.showInSidebar).toBe(false);
    expect(record.sidebarLabel).toBeNull();
    expect(record.capabilities).toBeNull();
  });

  test("preserves server-normalized editor payloads as pass-through", () => {
    const definition = {
      schemaVersion: 4,
      listView: { columns: [] },
      editorView: { blocks: [], bindings: [] },
    };
    const blocks = [{ id: "block-1", type: "text" }];
    const bindings = [{ blockId: "block-1", propPath: "text" }];
    const raw = makeSummary({ definition, blocks, bindings, capabilities });

    const record = normalizeCustomScreenSummaryRecord(raw);

    expect(record.definition).toBe(definition);
    expect(record.blocks).toBe(blocks);
    expect(record.bindings).toBe(bindings);
    expect(record.capabilities).toBe(capabilities);
    expect(record.capabilities?.supportsDedicatedPreview).toBe(true);
    expect(record.capabilities?.supportsDedicatedEditor).toBe(true);
  });

  test("keeps revision and transient warnings", () => {
    const warnings = [{ code: "binding_gc" }];
    const record = normalizeCustomScreenSummaryRecord(makeSummary({ revision: 9, warnings }));

    expect(record.revision).toBe(9);
    expect(record.warnings).toBe(warnings);
  });
});

describe("isCustomScreenSummaryRecord", () => {
  test("accepts a well-formed summary record", () => {
    expect(isCustomScreenSummaryRecord(makeSummary())).toBe(true);
  });

  test("rejects rows with invalid stable fields", () => {
    expect(
      isCustomScreenSummaryRecord(makeSummary({ id: 5 } as unknown as CustomScreenSummaryRecord))
    ).toBe(false);
    expect(
      isCustomScreenSummaryRecord(
        makeSummary({ status: "archived" } as unknown as CustomScreenSummaryRecord)
      )
    ).toBe(false);
    expect(
      isCustomScreenSummaryRecord(
        makeSummary({ schemaVersion: "4" } as unknown as CustomScreenSummaryRecord)
      )
    ).toBe(false);
    expect(
      isCustomScreenSummaryRecord(
        makeSummary({ collectionRole: "admin" } as unknown as CustomScreenSummaryRecord)
      )
    ).toBe(false);
    expect(
      isCustomScreenSummaryRecord(
        makeSummary({ capabilities: { mode: "bogus" } } as unknown as CustomScreenSummaryRecord)
      )
    ).toBe(false);
  });

  test("accepts null and undefined optional summary fields", () => {
    const record = makeSummary({
      collectionRole: null,
      compositionKey: null,
      showInSidebar: undefined,
      sidebarLabel: null,
      capabilities: null,
      revision: undefined,
    } as unknown as CustomScreenSummaryRecord);

    expect(isCustomScreenSummaryRecord(record)).toBe(true);
  });

  test("isCustomScreenSummaryList requires every element to be valid", () => {
    expect(isCustomScreenSummaryList([makeSummary(), makeSummary({ id: "screen-2" })])).toBe(true);
    expect(isCustomScreenSummaryList([makeSummary(), { id: 5 }])).toBe(false);
  });
});

describe("lightweight import boundary", () => {
  test("summary contract imports no domain editor machinery", async () => {
    const source = await read("core/services/customScreens/customScreenSummaryContract.ts");

    expect(source).not.toContain("customScreenSchemas");
    expect(source).not.toContain("customScreens/capabilities");
    expect(source).not.toContain("bindingResolver");
    expect(source).not.toContain("widgets/runtime");
    expect(source).toContain("customScreenContracts");
  });

  test("lightweight client does not import domain widget runtime", async () => {
    const source = await read("core/admin/services/customScreensClient.ts");

    expect(source).not.toContain("customScreens/customScreenSchemas");
    expect(source).not.toContain("customScreens/capabilities");
    expect(source).not.toContain("bindingResolver");
    expect(source).not.toContain("widgets/runtime");
  });

  test("list model and list hooks stay on lightweight summary contract", async () => {
    for (const file of [
      "core/admin/ui/custom-screens/customScreenListModel.ts",
      "core/admin/ui/custom-screens/hooks/useCustomScreens.ts",
    ]) {
      const source = await read(file);
      expect(source).not.toContain("resolveCustomScreenCapabilities");
      expect(source).not.toContain("bindingResolver");
      expect(source).not.toContain("widgets/runtime");
    }
  });
});

describe("lightweight custom screen import graph", () => {
  test("lightweight entrypoints cannot reach editor-only modules", () => {
    const repoRoot = process.cwd();
    const report = analyzeAdminBoundary({
      repoRoot,
      entrypoints: [
        "core/admin/services/customScreensClient.ts",
        "core/admin/services/customScreenShortcutsClient.ts",
        "core/admin/utils/adminPrefetchCustomScreens.ts",
        "core/admin/ui/custom-screens/customScreenListModel.ts",
        "core/admin/ui/custom-screens/hooks/useCustomScreens.ts",
      ],
      forbiddenPathRules: [
        {
          label: "custom screen full definition schema",
          path: "core/services/customScreens/customScreenSchemas.ts",
          exact: true,
        },
        {
          label: "custom screen capability resolver",
          path: "core/services/customScreens/capabilities.ts",
          exact: true,
        },
        {
          label: "custom screen binding resolver",
          path: "core/services/customScreens/bindingResolver.ts",
          exact: true,
        },
      ],
    });

    expect(report.violations).toEqual([]);
  });
});
