import { expect, test } from "vitest";

import { composeDocsAnswer } from "../../../core/services/assistant/docsAnswerComposer";
import type { DocsSearchHit } from "../../../core/services/assistant/docsTypes";

const baseHit: DocsSearchHit = {
  chunk: {
    id: "_docs/widgets/hero.md:10-20",
    docPath: "_docs/widgets/hero.md",
    headingPath: ["Hero Widget", "Visual"],
    heading: "Visual",
    lineStart: 10,
    lineEnd: 20,
    content: "Use visual tab to edit background and spacing.",
    normalizedText: "hero widget visual use visual tab to edit background and spacing",
    tokenCounts: {
      hero: 1,
      widget: 1,
      visual: 2,
      background: 1,
      spacing: 1,
    },
    tokenCount: 6,
  },
  score: 2.8,
  matchedTerms: ["hero", "visual", "widget"],
  snippet: "Use visual tab to edit background and spacing.",
};

test("composeDocsAnswer returns location template when query asks where", () => {
  const answer = composeDocsAnswer({
    question: "Where can I find hero widget visual settings?",
    hits: [baseHit],
  });

  expect(answer.template).toBe("location_answer");
  expect(answer.answer).toContain("_docs/widgets/hero.md");
  expect(answer.sources).toHaveLength(1);
  expect(answer.confidence).toBeGreaterThan(0.2);
});

test("composeDocsAnswer returns how-to template for procedural question", () => {
  const answer = composeDocsAnswer({
    question: "How do I change hero spacing?",
    hits: [baseHit],
  });

  expect(answer.template).toBe("how_to_answer");
  expect(answer.answer).toContain("Follow these sections in order");
  expect(answer.sources[0]?.heading).toContain("Hero Widget");
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
