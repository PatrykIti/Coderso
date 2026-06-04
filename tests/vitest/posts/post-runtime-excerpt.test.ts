import { describe, expect, test } from "vitest";

import {
  resolvePostRuntimeExcerpt,
  resolvePostRuntimeMetaDescription,
} from "../../../core/services/posts/runtime/postRuntimeExcerpt";

describe("post runtime excerpts", () => {
  test("uses explicit plain text fields before document body fallback", () => {
    expect(
      resolvePostRuntimeExcerpt({
        excerpt: "<p>Short launch summary</p>",
        blocks: [
          {
            id: "paragraph-1",
            type: "paragraph",
            content: "Document body should not win.",
          },
        ],
      })
    ).toBe("Short launch summary");
  });

  test("builds excerpt from writing canvas content without loading media runtime", () => {
    const excerpt = resolvePostRuntimeExcerpt(
      {
        document: {
          version: 1,
          blocks: [
            {
              id: "canvas-1",
              type: "writing-canvas",
              attrs: {},
              content: {
                nodes: [
                  { id: "heading-1", type: "heading", text: "Runtime title" },
                  {
                    id: "list-1",
                    type: "list",
                    items: ["First point", "<strong>Second point</strong>"],
                  },
                  {
                    id: "image-1",
                    type: "image",
                    alt: "Preview image",
                    caption: "Visible caption",
                  },
                ],
              },
            },
          ],
          meta: {},
        },
      },
      80
    );

    expect(excerpt).toBe("Runtime title First point Second point Preview image Visible caption");
  });

  test("truncates meta description fallback text", () => {
    const content = [
      "This content is intentionally longer than the metadata description limit",
      "so the public runtime can keep search snippets bounded and deterministic",
      "while preserving the existing ellipsis behavior for generated metadata.",
    ].join(" ");

    const description = resolvePostRuntimeMetaDescription({
      content,
    });

    expect(description).toBe(`${content.slice(0, 160).trimEnd()}...`);
  });
});
