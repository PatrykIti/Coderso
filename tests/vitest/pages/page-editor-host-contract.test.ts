import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

import { resolveToolbarTargetLabel } from "../../../core/admin/ui/pages/editor/pageEditorOptions";
import type { PageEditorHost } from "../../../core/admin/ui/pages/editor/pageEditorHostContract";

const repoRoot = process.cwd();
const reusableEditorFiles = [
  "core/admin/ui/pages/editor/pageEditorHostContract.ts",
  "core/admin/ui/pages/editor/pageEditorOptions.ts",
];

test("host contract remains type-only and accepts current editor modes", () => {
  const modes: Array<PageEditorHost["mode"]> = ["page", "page-template", "menu"];
  expect(modes).toEqual(["page", "page-template", "menu"]);
});

test("toolbar labels resolve from type copy instead of user-authored content", () => {
  expect(resolveToolbarTargetLabel(null)).toBe("Page");
  expect(resolveToolbarTargetLabel({ kind: "section", type: "hero" })).toBe("Hero");
  expect(resolveToolbarTargetLabel({ kind: "block", type: "quote" })).toBe("Quote");
});

test("reusable editor contract modules do not import admin API clients", () => {
  const forbiddenPatterns = [
    /@\/services\/[A-Za-z0-9]+Client/,
    /from "\.\.\/\.\.\/\.\.\/services\/[A-Za-z0-9]+Client"/,
    /from "\.\.\/\.\.\/\.\.\/\.\.\/services\/[A-Za-z0-9]+Client"/,
  ];

  for (const relativePath of reusableEditorFiles) {
    const source = readFileSync(join(repoRoot, relativePath), "utf8");
    for (const pattern of forbiddenPatterns) {
      expect(source, `${relativePath} imports an admin client`).not.toMatch(pattern);
    }
  }
});
