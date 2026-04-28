import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { BlockInserter } from "../../../core/admin/ui/posts/editor/blocks/BlockInserter";

test("BlockInserter renders search and categorized blocks", () => {
  const html = renderToString(<BlockInserter onInsertBlock={() => undefined} />);

  expect(html).toContain("Block inserter");
  expect(html).toContain("Search blocks...");
  expect(html).toContain("Text");
  expect(html).toContain("Media");
  expect(html).toContain("Interactive");
  expect(html).toContain("Paragraph");
  expect(html).toContain("Heading");
  expect(html).toContain("Image");
  expect(html).toContain("Button");
});
