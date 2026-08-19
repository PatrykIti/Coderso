// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, expectTypeOf, test } from "vitest";

import * as facade from "../../../core/admin/ui/pages/PageEditor";
import * as PageEditorRoot from "../../../core/admin/ui/pages/editor/PageEditorRoot";
import * as PageEditorSettingsPanel from "../../../core/admin/ui/pages/editor/PageEditorSettingsPanel";
import * as PageEditorToolbar from "../../../core/admin/ui/pages/editor/PageEditorToolbar";
import * as pageEditorHostContract from "../../../core/admin/ui/pages/editor/pageEditorHostContract";
import * as pageEditorOptions from "../../../core/admin/ui/pages/editor/pageEditorOptions";
import type { PageEditorProps } from "../../../core/admin/ui/pages/PageEditor";
import type { PageEditorProps as ControllerPageEditorProps } from "../../../core/admin/ui/pages/editor/usePageEditorController";

// TASK-481-02-L02 Part A contract: the facade must re-export the exact 15-symbol
// surface (4 values + PageEditorProps + 10 host types) from the split editor/
// modules, preserving import identity, and stay a re-export-only shell.

const VALUE_EXPORTS = [
  "PageEditor",
  "PageSettingsSubpanel",
  "findRecoverableAutosaveRevision",
  "resolveToolbarTargetLabel",
] as const;

const HOST_TYPE_EXPORTS = [
  "PageEditorHost",
  "PageEditorHostAppearancePanelProps",
  "PageEditorHostCanvasChromeProps",
  "PageEditorHostFreshnessMode",
  "PageEditorHostLoadOptions",
  "PageEditorHostPalette",
  "PageEditorHostPreviewResponse",
  "PageEditorHostPublishResult",
  "PageEditorHostRevisions",
  "PageEditorHostSettingsRenderProps",
] as const;

test("facade re-exports exactly the 15-symbol surface", () => {
  expect(Object.keys(facade).sort()).toEqual([...VALUE_EXPORTS].sort());
  expect(VALUE_EXPORTS).toHaveLength(4);
  expect(HOST_TYPE_EXPORTS).toHaveLength(10);
});

test("facade value exports are the split module identities", () => {
  expect(facade.PageEditor).toBe(PageEditorRoot.PageEditor);
  expect(facade.PageSettingsSubpanel).toBe(PageEditorSettingsPanel.PageSettingsSubpanel);
  expect(facade.findRecoverableAutosaveRevision).toBe(
    PageEditorToolbar.findRecoverableAutosaveRevision
  );
  expect(facade.resolveToolbarTargetLabel).toBe(pageEditorOptions.resolveToolbarTargetLabel);
});

test("facade PageEditorProps is the controller PageEditorProps type", () => {
  expectTypeOf<PageEditorProps>().toEqualTypeOf<ControllerPageEditorProps>();
});

test("facade host types are the host contract types", () => {
  expectTypeOf<facade.PageEditorHost>().toEqualTypeOf<pageEditorHostContract.PageEditorHost>();
  expectTypeOf<facade.PageEditorHostAppearancePanelProps>().toEqualTypeOf<pageEditorHostContract.PageEditorHostAppearancePanelProps>();
  expectTypeOf<facade.PageEditorHostCanvasChromeProps>().toEqualTypeOf<pageEditorHostContract.PageEditorHostCanvasChromeProps>();
  expectTypeOf<facade.PageEditorHostFreshnessMode>().toEqualTypeOf<pageEditorHostContract.PageEditorHostFreshnessMode>();
  expectTypeOf<facade.PageEditorHostLoadOptions>().toEqualTypeOf<pageEditorHostContract.PageEditorHostLoadOptions>();
  expectTypeOf<facade.PageEditorHostPalette>().toEqualTypeOf<pageEditorHostContract.PageEditorHostPalette>();
  expectTypeOf<facade.PageEditorHostPreviewResponse>().toEqualTypeOf<pageEditorHostContract.PageEditorHostPreviewResponse>();
  expectTypeOf<facade.PageEditorHostPublishResult>().toEqualTypeOf<pageEditorHostContract.PageEditorHostPublishResult>();
  expectTypeOf<facade.PageEditorHostRevisions>().toEqualTypeOf<pageEditorHostContract.PageEditorHostRevisions>();
  expectTypeOf<facade.PageEditorHostSettingsRenderProps>().toEqualTypeOf<pageEditorHostContract.PageEditorHostSettingsRenderProps>();
});

test("facade is a re-export-only shell with no authored logic", () => {
  const source = readFileSync(join(process.cwd(), "core/admin/ui/pages/PageEditor.tsx"), "utf8");
  const statements = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"))
    .join(" ")
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  expect(statements.length).toBeGreaterThan(0);
  for (const statement of statements) {
    expect(statement.startsWith("export ")).toBe(true);
  }
  expect(source).not.toContain("data-page-editor-canvas-frame");
});
