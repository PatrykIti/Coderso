import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { PageEditorCommandPalette } from "../../../core/admin/ui/pages/editor/PageEditorCommandPalette";

test("PageEditorCommandPalette renders published template choices only when enabled", () => {
  const html = renderToStaticMarkup(
    <PageEditorCommandPalette
      commandQuery=""
      commandActiveIndex={2}
      canInsertSections
      sections={[{ type: "hero", label: "Hero", description: "Hero description" }]}
      blocks={[{ type: "text", label: "Text", description: "Text description" }]}
      templates={[{ id: "tpl-home", name: "Homepage", description: null }]}
      showTemplates
      onQueryChange={vi.fn()}
      onKeyDown={vi.fn()}
      onAddSection={vi.fn()}
      onAddBlock={vi.fn()}
      onInsertTemplate={vi.fn()}
      onClose={vi.fn()}
    />
  );

  expect(html).toContain("Page templates");
  expect(html).toContain("Homepage");
  expect(html).toContain("Insert template sections");
  expect(html).toContain('data-page-editor-command-active="true"');
});

test("PageEditorCommandPalette hides template choices when the host has no template library", () => {
  const html = renderToStaticMarkup(
    <PageEditorCommandPalette
      commandQuery=""
      commandActiveIndex={0}
      canInsertSections={false}
      sections={[]}
      blocks={[{ type: "text", label: "Text", description: "Text description" }]}
      templates={[{ id: "tpl-home", name: "Homepage", description: "Template" }]}
      showTemplates={false}
      onQueryChange={vi.fn()}
      onKeyDown={vi.fn()}
      onAddSection={vi.fn()}
      onAddBlock={vi.fn()}
      onInsertTemplate={vi.fn()}
      onClose={vi.fn()}
    />
  );

  expect(html).not.toContain("Page templates");
  expect(html).not.toContain("Homepage");
  expect(html).toContain("Blocks");
});
