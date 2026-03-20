import { expect, test } from "vitest";

import { composeDocsAnswer } from "../../../core/services/assistant/docsAnswerComposer";
import type { DocsSearchHit } from "../../../core/services/assistant/docsTypes";

const baseHit: DocsSearchHit = {
  chunk: {
    id: "docs/coderso/widgets-and-template-editor.md:10-20",
    docPath: "docs/coderso/widgets-and-template-editor.md",
    headingPath: ["Coderso Widgets and Template Editor", "Step By Step"],
    heading: "Step By Step",
    lineStart: 10,
    lineEnd: 20,
    content: "Open the Hero template and use the Visual tab to edit colors, spacing, and background settings.",
    normalizedText:
      "open the hero template and use the visual tab to edit colors spacing and background settings",
    tokenCounts: {
      hero: 1,
      template: 1,
      visual: 1,
      colors: 1,
      background: 1,
      spacing: 1,
    },
    tokenCount: 8,
  },
  score: 2.8,
  matchedTerms: ["hero", "visual", "colors"],
  snippet:
    "Open the Hero template and use the Visual tab to edit colors, spacing, and background settings.",
};

test("composeDocsAnswer returns location template when query asks where", () => {
  const answer = composeDocsAnswer({
    question: "Where can I find hero widget visual settings?",
    hits: [baseHit],
  });

  expect(answer.template).toBe("location_answer");
  expect(answer.answer).toContain("Visual tab");
  expect(answer.answer).not.toContain("Most relevant locations in docs");
  expect(answer.sources).toHaveLength(1);
  expect(answer.confidence).toBeGreaterThan(0.2);
});

test("composeDocsAnswer returns how-to template for procedural question", () => {
  const answer = composeDocsAnswer({
    question: "How do I change hero spacing?",
    hits: [baseHit],
  });

  expect(answer.template).toBe("how_to_answer");
  expect(answer.answer).toContain("Visual tab");
  expect(answer.sources[0]?.heading).toContain("Coderso Widgets");
});

test("composeDocsAnswer returns missing template when no hits", () => {
  const answer = composeDocsAnswer({
    question: "How to configure unknown quantum panel?",
    hits: [],
  });

  expect(answer.template).toBe("missing_answer");
  expect(answer.sources).toEqual([]);
  expect(answer.confidence).toBe(0.1);
});
