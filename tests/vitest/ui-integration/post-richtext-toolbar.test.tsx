import React from "react";
import { expect, test } from "vitest";

import { PostRichTextAdapter } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("PostRichTextAdapter renders toolbar and editor shortcuts", () => {
  const html = renderAdminUi(
    <PostRichTextAdapter
      value="<p>Hello</p>"
      onChange={() => undefined}
      fontFamily="sans"
      onFontFamilyChange={() => undefined}
      baseTextScale="md"
      onBaseTextScaleChange={() => undefined}
    />
  );

  expect(html).toContain("Type");
  expect(html).toContain("Text");
  expect(html).toContain("List");
  expect(html).toContain("Code");
  expect(html).toContain("More formatting");
  expect(html).toContain("Typography follows the selected block style.");
  expect(html).toContain('aria-label="Bold"');
  expect(html).toContain('aria-label="Italic"');
  expect(html).toContain('aria-label="Link"');
  expect(html).toContain("Shortcuts: Ctrl/Cmd+B");
  expect(html).toContain("contentEditable=\"true\"");
});
