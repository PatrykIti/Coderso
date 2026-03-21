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
    content:
      "Open the Hero template and use the Visual tab to edit colors, spacing, and background settings.",
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
    "…use the Visual tab to edit colors, spacing, and background settings.…",
  rankingSignals: {
    textScore: 1.9,
    domainScore: 1.8,
    intentScore: 0.8,
    phraseScore: 0.6,
    domainPenalty: 0,
    matchedQueryCoverage: 1,
  },
};

test("composeDocsAnswer returns location template when query asks where", () => {
  const answer = composeDocsAnswer({
    question: "Where can I find hero widget visual settings?",
    hits: [baseHit],
  });

  expect(answer.template).toBe("location_answer");
  expect(answer.answer).toContain("Most likely screen or section:");
  expect(answer.answer).toContain("Visual tab");
  expect(answer.answer).toContain("Hero template");
  expect(answer.answer).not.toContain("…");
  expect(answer.answer).not.toContain("Most relevant locations in docs");
  expect(answer.sources).toHaveLength(1);
  expect(answer.confidence).toBeGreaterThan(0.5);
});

test("composeDocsAnswer returns how-to template for procedural question", () => {
  const answer = composeDocsAnswer({
    question: "How do I change hero spacing?",
    hits: [baseHit],
  });

  expect(answer.template).toBe("how_to_answer");
  expect(answer.answer).toContain("Visual tab");
  expect(answer.answer).toContain("Hero template");
  expect(answer.answer).not.toContain("Most likely screen or section:");
  expect(answer.sources[0]?.heading).toContain("Coderso Widgets");
});

test("composeDocsAnswer uses full chunk content instead of truncated snippet preview", () => {
  const answer = composeDocsAnswer({
    question: "Where can I configure hero widget colors?",
    hits: [
      {
        ...baseHit,
        chunk: {
          ...baseHit.chunk,
          content:
            "1. Open Widgets. 2. Edit the Hero template. 3. Use the Visual tab to change colors and spacing. 4. Save the template.",
        },
        snippet: "…Use the Visual tab to change colors and spacing.…",
      },
    ],
  });

  expect(answer.answer).toContain("What to do:");
  expect(answer.answer).toContain("1. Open Widgets.");
  expect(answer.answer).toContain("2. Edit the Hero template.");
  expect(answer.answer).toContain("3. Use the Visual tab to change colors and spacing.");
  expect(answer.answer).not.toContain("…Use the Visual tab");
});

test("composeDocsAnswer lowers confidence when the top hit lacks domain alignment", () => {
  const answer = composeDocsAnswer({
    question: "Where can I configure hero widget colors?",
    hits: [
      {
        ...baseHit,
        score: 3.2,
        rankingSignals: {
          textScore: 2.6,
          domainScore: 0,
          intentScore: 0.5,
          phraseScore: 0.4,
          domainPenalty: 0.8,
          matchedQueryCoverage: 0.33,
        },
      },
    ],
  });

  expect(answer.confidence).toBeLessThan(0.45);
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
