import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { PageEditorCommandPalette } from "../../../core/admin/ui/pages/editor/PageEditorCommandPalette";

test("PageEditorCommandPalette renders section and block command groups with active result state", () => {
  const html = renderToStaticMarkup(
    <PageEditorCommandPalette
      commandQuery="hero"
      commandActiveIndex={1}
      canInsertSections
      sections={[{ type: "hero", label: "Hero", description: "Hero description" }]}
      blocks={[{ type: "text", label: "Text", description: "Text description" }]}
      templates={[]}
      showTemplates={false}
      onQueryChange={vi.fn()}
      onKeyDown={vi.fn()}
      onAddSection={vi.fn()}
      onAddBlock={vi.fn()}
      onInsertTemplate={vi.fn()}
      onClose={vi.fn()}
    />
  );

  expect(html).toContain('aria-label="Command palette"');
  expect(html).toContain("Search sections and blocks");
  expect(html).toContain("Sections");
  expect(html).toContain("Blocks");
  expect(html).toContain("Hero description");
  expect(html).toContain("Text description");
  expect(html).toContain('data-page-editor-command-active="true"');
});
