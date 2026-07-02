import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

import { resolveToolbarTargetLabel } from "../../../core/admin/ui/pages/editor/pageEditorOptions";
import {
  isNewerPageDetailTimestamp,
  shouldApplyFreshPageEditorDetail,
  type PageEditorHost,
} from "../../../core/admin/ui/pages/editor/pageEditorHostContract";

const repoRoot = process.cwd();
const reusableEditorFiles = [
  "core/admin/ui/pages/editor/pageEditorHostContract.ts",
  "core/admin/ui/pages/editor/pageEditorOptions.ts",
];

test("host contract remains type-only and accepts current editor modes", () => {
  // TASK-499-03: the menu design host no longer routes through PageEditor, so
  // the `mode` union is narrowed to the page + page-template hosts only.
  const modes: Array<PageEditorHost["mode"]> = ["page", "page-template"];
  expect(modes).toEqual(["page", "page-template"]);
});

test("toolbar labels resolve from type copy instead of user-authored content", () => {
  expect(resolveToolbarTargetLabel(null)).toBe("Page");
  expect(resolveToolbarTargetLabel({ kind: "section", type: "hero" })).toBe("Hero");
  expect(resolveToolbarTargetLabel({ kind: "block", type: "quote" })).toBe("Quote");
});

test("host freshness helpers reject stale timestamps and allow forced clean replacement", () => {
  const current = {
    id: "page-1",
    title: "Home",
    slug: "home",
    status: "draft" as const,
    currentData: {},
    updatedAt: "2026-03-08T09:00:00.000Z",
  };
  const fresh = { ...current, updatedAt: "2026-03-08T09:05:00.000Z" };
  const same = { ...current };
  const invalid = { ...current, updatedAt: "not-a-date" };

  expect(isNewerPageDetailTimestamp(fresh.updatedAt, current.updatedAt)).toBe(true);
  expect(isNewerPageDetailTimestamp(current.updatedAt, current.updatedAt)).toBe(false);
  expect(isNewerPageDetailTimestamp(invalid.updatedAt, current.updatedAt)).toBe(false);
  expect(
    shouldApplyFreshPageEditorDetail({
      current,
      fresh,
      isDirty: false,
      mode: "updatedAt",
    })
  ).toBe(true);
  expect(
    shouldApplyFreshPageEditorDetail({
      current,
      fresh: same,
      isDirty: false,
      mode: "updatedAt",
    })
  ).toBe(false);
  expect(
    shouldApplyFreshPageEditorDetail({
      current,
      fresh: same,
      isDirty: false,
      mode: "forced-clean-replace",
    })
  ).toBe(true);
  expect(
    shouldApplyFreshPageEditorDetail({
      current,
      fresh,
      isDirty: true,
      mode: "forced-clean-replace",
    })
  ).toBe(false);
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
