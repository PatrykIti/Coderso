// tests/vitest/ui/editor-surface-dead-code.test.ts (new)
// Guard: the TASK-496 no-dead-code mandate. Pure filesystem/grep assertions —
// no rendering, no model logic. Keeps the editor surface free of orphans.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type SourceScope = "core" | "core-and-tests";

interface IndexedSourceFile {
  path: string;
  lines: readonly string[];
}

const listGitFiles = (args: readonly string[]) =>
  execFileSync("git", args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);

const isTypeScriptSource = (path: string) => /\.tsx?$/u.test(path);
const trackedSourcePaths = listGitFiles(["ls-files", "--cached", "--", "core", "tests"])
  .filter(isTypeScriptSource)
  .filter(existsSync)
  .sort();
const searchableSourcePaths = [
  ...new Set([
    ...trackedSourcePaths,
    ...listGitFiles(["ls-files", "--others", "--exclude-standard", "--", "core", "tests"]).filter(
      isTypeScriptSource
    ),
  ]),
]
  .filter(existsSync)
  .sort();
const sourceFiles: readonly IndexedSourceFile[] = searchableSourcePaths.map((path) => ({
  path,
  // Read the bytes directly instead of relying on grep's binary-file heuristic. This keeps
  // PageEditor.tsx and every other tracked or untracked TypeScript source in the same index.
  lines: readFileSync(path, "utf8").split(/\r?\n/u),
}));

const inScope = (path: string, scope: SourceScope) =>
  path.startsWith("core/") || (scope === "core-and-tests" && path.startsWith("tests/"));

const matchingLines = (
  matches: (line: string) => boolean,
  scope: SourceScope = "core"
): string[] => {
  const result: string[] = [];
  for (const file of sourceFiles) {
    if (!inScope(file.path, scope)) continue;
    file.lines.forEach((line, index) => {
      if (matches(line)) result.push(`${file.path}:${index + 1}:${line}`);
    });
  }
  return result;
};

const linesContaining = (value: string, scope: SourceScope = "core") =>
  matchingLines((line) => line.includes(value), scope);

const identifierReferences = (identifiers: readonly string[]): ReadonlyMap<string, string[]> => {
  const targetIdentifiers = new Set(identifiers);
  const references = new Map(identifiers.map((identifier) => [identifier, [] as string[]]));
  for (const file of sourceFiles) {
    if (!inScope(file.path, "core-and-tests")) continue;
    file.lines.forEach((line, index) => {
      const identifiersOnLine = new Set(line.match(/[A-Za-z_$][\w$]*/gu) ?? []);
      for (const identifier of identifiersOnLine) {
        if (!targetIdentifiers.has(identifier)) continue;
        references.get(identifier)?.push(`${file.path}:${index + 1}:${line}`);
      }
    });
  }
  return references;
};

describe("editor-surface dead-code mandate (TASK-496)", () => {
  it("the shared editor-chrome shell is imported, not orphaned", () => {
    const shellPath = "core/admin/ui/shared/CanvasEditor.tsx";
    if (existsSync(shellPath)) {
      const refs = linesContaining("shared/CanvasEditor").filter(
        (line) => !line.includes("_PROTOTYPE") && !line.startsWith(`${shellPath}:`)
      );
      expect(refs.some((l) => /import/.test(l))).toBe(true);
    } else {
      expect(linesContaining("shared/CanvasEditor")).toEqual([]);
    }
  });

  it("the dead BlockChip export is gone", () => {
    expect(linesContaining("BlockChip")).toEqual([]);
  });

  it("the retired dark authoring chrome is gone (deleted + un-exported)", () => {
    expect(existsSync("core/admin/ui/authoring/AuthoringFloatingToolbar.tsx")).toBe(false);
    expect(existsSync("core/admin/ui/authoring/AuthoringCanvasFrame.tsx")).toBe(false);
    expect(existsSync("core/admin/ui/authoring/canvasChrome.ts")).toBe(false);
    expect(
      matchingLines((line) => /AuthoringFloatingToolbar|AuthoringCanvasFrame/u.test(line))
    ).toEqual([]);
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
    // TASK-498-01 removed the List-view EDITOR surface from CustomScreenEditorPage
    // (its four ListView* imports). The row-template model/runtime + these three
    // component FILES are retained on disk for later relocation, so they are
    // import-removed-but-kept (0 core/test importers) and allowlisted here.
    const KEEP =
      /^(PageEditorPage|PageList|PageRevisionDrawer|ListViewDesigner|ListViewColumnInspector|ListViewElementLibrary)$/;
    const files = trackedSourcePaths.filter((path) =>
      /^core\/admin\/ui\/(?:pages|custom-screens|authoring|shared)\/.+\.tsx$/u.test(path)
    );
    const referencesByComponent = identifierReferences(
      files.map((file) => file.replace(/.*\//u, "").replace(/\.tsx$/u, ""))
    );
    const orphans = files.filter((f) => {
      const base = f.replace(/.*\//u, "").replace(/\.tsx$/u, "");
      if (KEEP.test(base)) return false;
      // Count importers in BOTH core AND tests — a test importer means the file is still used.
      const refs = (referencesByComponent.get(base) ?? []).filter(
        (line) => !line.startsWith(`${f}:`) && !/\/index\.ts:/u.test(line)
      );
      return refs.length === 0;
    });
    expect(orphans, `orphaned editor-surface file(s): ${orphans.join(", ")}`).toEqual([]);
  }, 30000); // One source index and one identifier pass keep this deterministic under full load.

  it("authoring logic that Screens still need is preserved (live importers)", () => {
    for (const sym of [
      "InlineEditWrapper",
      "selectionBorder",
      "AuthoringLayersPanel",
      "AuthoringCommandPalette",
    ]) {
      const external = linesContaining(sym).filter(
        (line) => !line.includes("core/admin/ui/authoring/")
      );
      expect(external.length, `${sym} must keep a live importer`).toBeGreaterThan(0);
    }
  }, 30000);
});
