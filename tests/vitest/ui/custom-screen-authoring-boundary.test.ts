import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

const repoRoot = process.cwd();

const readSourceFiles = async (
  directory: string
): Promise<Array<{ file: string; source: string }>> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return readSourceFiles(absolute);
      if (!/\.[cm]?[tj]sx?$/.test(entry.name)) return [];
      return [{ file: absolute, source: await readFile(absolute, "utf8") }];
    })
  );
  return nested.flat();
};

const expectNoForbiddenImports = (
  files: Array<{ file: string; source: string }>,
  forbidden: RegExp[]
) => {
  const violations = files.flatMap(({ file, source }) =>
    forbidden
      .filter((pattern) => pattern.test(source))
      .map((pattern) => `${path.relative(repoRoot, file)} matched ${pattern}`)
  );
  expect(violations).toEqual([]);
};

describe("custom screen authoring boundaries", () => {
  test("neutral authoring modules stay UI-only", async () => {
    const files = await readSourceFiles(path.join(repoRoot, "core/admin/ui/authoring"));

    expectNoForbiddenImports(files, [
      /custom-screens/,
      /customScreens/,
      /\/pages\//,
      /services\/pages/,
      /services\/customScreens/,
      /widgets\/registry/,
      /WidgetRenderer/,
      /db\/client/,
      /server\//,
      /\bBun\./,
    ]);
  });

  test("active custom screen canvas modules do not import page builder or widget runtime code", async () => {
    const files = await Promise.all(
      [
        "core/admin/ui/custom-screens/CustomScreenEditorPage.tsx",
        "core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx",
        "core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx",
        "core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx",
        "core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx",
        "core/admin/ui/custom-screens/CustomScreenPreview.tsx",
      ].map(async (relative) => ({
        file: path.join(repoRoot, relative),
        source: await readFile(path.join(repoRoot, relative), "utf8"),
      }))
    );

    expectNoForbiddenImports(files, [
      /ui\/pages\/builder/,
      /@\/ui\/pages/,
      /ui\/widgets\/registry/,
      /@\/ui\/widgets/,
      /WidgetRenderer/,
    ]);
  });

  test("page editor modules do not import custom screen UI or services", async () => {
    const files = await readSourceFiles(path.join(repoRoot, "core/admin/ui/pages"));

    expectNoForbiddenImports(files, [/custom-screens/, /customScreens/]);
  });
});
