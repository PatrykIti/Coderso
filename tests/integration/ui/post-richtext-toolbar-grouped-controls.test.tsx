import { expect, test } from "bun:test";

import { PostRichTextToolbar } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextToolbar";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("writing-canvas toolbar renders grouped heading/list/code controls", () => {
  const html = renderAdminUi(
    <PostRichTextToolbar profile="writing-canvas" onCommand={() => undefined} />
  );

  expect(html).toContain("Headings");
  expect(html).toContain("List");
  expect(html).toContain("Code");
});

test("heading toolbar profile hides grouped controls that are out of scope", () => {
  const html = renderAdminUi(
    <PostRichTextToolbar profile="heading" onCommand={() => undefined} />
  );

  expect(html).toContain('aria-label="Paragraph"');
  expect(html).not.toContain("Headings");
  expect(html).not.toContain("List");
});

