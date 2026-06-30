// tests/vitest/ui/editor-surface-dead-code.test.ts (new)
// Guard: the TASK-496 no-dead-code mandate. Pure filesystem/grep assertions —
// no rendering, no model logic. Keeps the editor surface free of orphans.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

// -a is mandatory: the default search root `core` contains PageEditor.tsx, which reads
// as binary to plain grep; without -a the shell-import assertion below can never see
// PageEditor.tsx (it would rely solely on the non-binary Screen importers).
const grepCount = (pattern: string, paths = "core") =>
  execSync(
    `grep -arn ${JSON.stringify(pattern)} ${paths} --include='*.tsx' --include='*.ts' || true`,
    { encoding: "utf8" }
  ).trim();

describe("editor-surface dead-code mandate (TASK-496)", () => {
  it("the shared editor-chrome shell is imported, not orphaned", () => {
    const shellPath = "core/admin/ui/shared/CanvasEditor.tsx";
    if (existsSync(shellPath)) {
      const refs = grepCount("shared/CanvasEditor")
        .split("\n")
        .filter((l) => l && !l.includes("_PROTOTYPE") && !l.startsWith(`${shellPath}:`));
      expect(refs.some((l) => /import/.test(l))).toBe(true);
    } else {
      expect(grepCount("shared/CanvasEditor")).toBe("");
    }
  });

  it("the dead BlockChip export is gone", () => {
    expect(grepCount("BlockChip")).toBe("");
  });

  it("the retired dark authoring chrome is gone (deleted + un-exported)", () => {
    expect(existsSync("core/admin/ui/authoring/AuthoringFloatingToolbar.tsx")).toBe(false);
    expect(existsSync("core/admin/ui/authoring/AuthoringCanvasFrame.tsx")).toBe(false);
    expect(existsSync("core/admin/ui/authoring/canvasChrome.ts")).toBe(false);
    expect(grepCount("AuthoringFloatingToolbar\\|AuthoringCanvasFrame")).toBe("");
    // The pre-existing orphan AuthoringInsertionZone is also swept (board criterion #4 /
    // Sweep 3). 496-02 removed its only reference (the authoring-canvas.test.tsx case), so
    // this leaf deletes the file + barrel re-export; assert the file no longer exists.
    expect(existsSync("core/admin/ui/authoring/AuthoringInsertionZone.tsx")).toBe(false);
  });

  it("pre-existing editor-surface orphans are swept (deleted)", () => {
    // FieldBindingPanel: 0 production importers — binding UI lives in ScreenBlockInspector;
    // its 2 test importers were retargeted to ScreenBlockInspector by 496-02. FilterBar: 0 refs.
    expect(existsSync("core/admin/ui/custom-screens/FieldBindingPanel.tsx")).toBe(false);
    expect(existsSync("core/admin/ui/shared/FilterBar.tsx")).toBe(false);
  });

  it("no editor-surface component is orphaned (0 core AND 0 test importers) — Sweep 6", () => {
    // KEEP = pre-existing test-covered wrappers TASK-496 does NOT own (route is PageEditor /
    // PageListPage, not these). They retain test importers; allowlisted belt-and-braces.
    const KEEP = /^(PageEditorPage|PageList|PageRevisionDrawer)$/;
    const files = execSync(
      "git ls-files 'core/admin/ui/pages/*.tsx' 'core/admin/ui/pages/**/*.tsx' " +
        "'core/admin/ui/custom-screens/*.tsx' 'core/admin/ui/authoring/*.tsx' " +
        "'core/admin/ui/shared/*.tsx'",
      { encoding: "utf8" }
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    const orphans = files.filter((f) => {
      const base = f.replace(/.*\//, "").replace(/\.tsx$/, "");
      if (KEEP.test(base)) return false;
      // count importers in BOTH core AND tests — a test importer means the file is still used.
      const refs = grepCount(`\\b${base}\\b`, "core tests")
        .split("\n")
        .filter((l) => l && !l.startsWith(`${f}:`) && !/\/index\.ts:/.test(l));
      return refs.length === 0;
    });
    expect(orphans, `orphaned editor-surface file(s): ${orphans.join(", ")}`).toEqual([]);
  }, 120000); // wide timeout: this case greps `core` + `tests` per editor-surface file (slow, but synchronous & deterministic).

  it("authoring logic that Screens still need is preserved (live importers)", () => {
    for (const sym of [
      "InlineEditWrapper",
      "selectionBorder",
      "AuthoringLayersPanel",
      "AuthoringCommandPalette",
    ]) {
      const external = grepCount(sym)
        .split("\n")
        .filter((l) => l && !l.includes("core/admin/ui/authoring/"));
      expect(external.length, `${sym} must keep a live importer`).toBeGreaterThan(0);
    }
  });
});
