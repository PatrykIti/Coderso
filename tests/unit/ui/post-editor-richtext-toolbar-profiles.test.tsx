import { expect, test } from "bun:test";

import { renderAdminUi } from "../../utils/adminRouterRender";
import {
  getToolbarCommandsForProfile,
  PostRichTextToolbar,
} from "../../../core/admin/ui/posts/editor/richtext/PostRichTextToolbar";

test("heading toolbar profile includes heading levels and alignment", () => {
  const commands = getToolbarCommandsForProfile("heading");

  expect(commands.has("heading-1")).toBe(true);
  expect(commands.has("heading-6")).toBe(true);
  expect(commands.has("type-heading")).toBe(true);
  expect(commands.has("bullet-list")).toBe(false);
  expect(commands.has("code-block")).toBe(false);
  expect(commands.has("underline")).toBe(false);
  expect(commands.has("align-center")).toBe(true);
});

test("writing-canvas profile exposes full block formatting set", () => {
  const commands = getToolbarCommandsForProfile("writing-canvas");

  expect(commands.has("heading-1")).toBe(true);
  expect(commands.has("heading-6")).toBe(true);
  expect(commands.has("bullet-list")).toBe(true);
  expect(commands.has("ordered-list")).toBe(true);
  expect(commands.has("quote")).toBe(true);
  expect(commands.has("type-paragraph")).toBe(true);
  expect(commands.has("align-center")).toBe(true);
});

test("PostRichTextToolbar render follows profile visibility", () => {
  const html = renderAdminUi(
    <PostRichTextToolbar
      profile="heading"
      onCommand={() => undefined}
    />
  );

  expect(html).toContain('aria-label="Bold"');
  expect(html).toContain("Type");
  expect(html).toContain("Headings");
  expect(html).not.toContain("List");
  expect(html).not.toContain('aria-label="Bullet list"');
  expect(html).not.toContain('aria-label="Quote"');
});
