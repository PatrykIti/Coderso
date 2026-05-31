import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "vitest";

const css = readFileSync(path.join(process.cwd(), "core/admin/styles/globals.css"), "utf8");

test("widget editor visual and advanced modes collapse responsive multi-column grids to one column", () => {
  expect(css).toContain('[data-widget-editor-mode="visual"] [class*="sm:grid-cols-2"]');
  expect(css).toContain('[data-widget-editor-mode="visual"] [class*="md:grid-cols-["]');
  expect(css).toContain('[data-widget-editor-mode="advanced"] [class*="sm:grid-cols-2"]');
  expect(css).toContain('[data-widget-editor-mode="advanced"] [class*="md:grid-cols-["]');
  expect(css).toContain("grid-template-columns: minmax(0, 1fr) !important;");
});
