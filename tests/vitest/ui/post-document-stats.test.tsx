import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { PostDocumentStats } from "../../../core/admin/ui/posts/editor/outline/PostDocumentStats";

test("PostDocumentStats renders all summary metrics", () => {
  const html = renderToString(
    <PostDocumentStats
      stats={{
        words: 420,
        characters: 2048,
        readingTimeMinutes: 3,
        headings: 5,
        paragraphs: 12,
        blocks: 18,
      }}
    />
  );

  expect(html).toContain("Document stats");
  expect(html).toContain("Words");
  expect(html).toContain("420");
  expect(html).toContain("Read time");
  expect(html).toContain("3 min");
  expect(html).toContain("Blocks");
  expect(html).toContain("18");
});
