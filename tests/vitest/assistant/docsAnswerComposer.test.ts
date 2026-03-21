import { expect, test } from "vitest";

import { composeDocsAnswer } from "../../../core/services/assistant/docsAnswerComposer";
import type { DocsSearchHit } from "../../../core/services/assistant/docsTypes";

const makeHit = (
  overrides: Partial<DocsSearchHit> & {
    chunk?: Partial<DocsSearchHit["chunk"]>;
  }
): DocsSearchHit => ({
  chunk: {
    id: overrides.chunk?.id ?? "docs/coderso/widgets-and-template-editor.md:10-20",
    docPath:
      overrides.chunk?.docPath ?? "docs/coderso/widgets-and-template-editor.md",
    docTitle:
      overrides.chunk?.docTitle ?? "Coderso Widgets and Template Editor",
    productArea: overrides.chunk?.productArea ?? "coderso-widgets",
    headingPath:
      overrides.chunk?.headingPath ?? [
        "Coderso Widgets and Template Editor",
        "Step By Step",
      ],
    heading: overrides.chunk?.heading ?? "Step By Step",
    lineStart: overrides.chunk?.lineStart ?? 10,
    lineEnd: overrides.chunk?.lineEnd ?? 20,
    content:
      overrides.chunk?.content ??
      "Open the Hero template and use the Visual tab to edit colors, spacing, and background settings.",
    normalizedText:
      overrides.chunk?.normalizedText ??
      "open the hero template and use the visual tab to edit colors spacing and background settings",
    tokenCounts:
      overrides.chunk?.tokenCounts ?? {
        hero: 1,
        template: 1,
        visual: 1,
        colors: 1,
        background: 1,
        spacing: 1,
      },
    tokenCount: overrides.chunk?.tokenCount ?? 8,
  },
  score: overrides.score ?? 2.8,
  matchedTerms: overrides.matchedTerms ?? ["hero", "visual", "colors"],
  snippet:
    overrides.snippet ??
    "…use the Visual tab to edit colors, spacing, and background settings.…",
  rankingSignals: overrides.rankingSignals ?? {
    textScore: 1.9,
    domainScore: 1.8,
    intentScore: 0.8,
    phraseScore: 0.6,
    domainPenalty: 0,
    matchedQueryCoverage: 1,
  },
});

test("composeDocsAnswer chooses step-by-step guidance over examples for location questions", () => {
  const answer = composeDocsAnswer({
    question: "Where can I configure hero widget colors?",
    hits: [
      makeHit({
        score: 3,
        chunk: {
          id: "examples",
          headingPath: ["Coderso Widgets and Template Editor", "Examples"],
          heading: "Examples",
          content:
            "A landing page team reuses a hero, feature grid, and CTA structure across multiple pages.",
          normalizedText:
            "a landing page team reuses a hero feature grid and cta structure across multiple pages",
        },
      }),
      makeHit({
        score: 2.7,
        chunk: {
          id: "steps",
          headingPath: ["Coderso Widgets and Template Editor", "Step By Step"],
          heading: "Step By Step",
          content:
            "1. Open Widgets. 2. Edit the Hero template. 3. Use the Visual tab to change colors and spacing.",
          normalizedText:
            "open widgets edit the hero template use the visual tab to change colors and spacing",
        },
      }),
    ],
  });

  expect(answer.template).toBe("location_answer");
  expect(answer.answer).toContain("Most likely surface:");
  expect(answer.answer).toContain("Coderso Widgets and Template Editor");
  expect(answer.answer).not.toContain("Most likely surface:\nExamples");
  expect(answer.answer).toContain("What to do:");
  expect(answer.answer).toContain("1. Open Widgets.");
  expect(answer.answer).not.toContain("A landing page team reuses");
});

test("composeDocsAnswer uses what-is-it and workflow support for capability questions", () => {
  const answer = composeDocsAnswer({
    question: "what features I have in widgets?",
    hits: [
      makeHit({
        score: 2.9,
        chunk: {
          id: "common-mistakes",
          headingPath: ["Coderso Widgets and Template Editor", "Common Mistakes"],
          heading: "Common Mistakes",
          content:
            "Confusing the widget library with page-level publishing. Editing many pages manually when a reusable template would reduce drift.",
          normalizedText:
            "confusing the widget library with page level publishing editing many pages manually when a reusable template would reduce drift",
        },
      }),
      makeHit({
        score: 2.6,
        chunk: {
          id: "what-is-it",
          headingPath: ["Coderso Widgets and Template Editor", "What Is It"],
          heading: "What Is It",
          content:
            "Widgets and Template Editor are the reusable presentation surfaces for building sections, templates, and composable UI blocks used by pages, custom screens, and kit-driven starter assets.",
          normalizedText:
            "widgets and template editor are the reusable presentation surfaces for building sections templates and composable ui blocks used by pages custom screens and kit driven starter assets",
        },
      }),
      makeHit({
        score: 2.3,
        chunk: {
          id: "steps",
          headingPath: ["Coderso Widgets and Template Editor", "Step By Step"],
          heading: "Step By Step",
          content:
            "1. Browse the Widget Library to find a suitable building block. 2. Create or edit templates when the same composition should be reused in multiple places.",
          normalizedText:
            "browse the widget library to find a suitable building block create or edit templates when the same composition should be reused in multiple places",
        },
      }),
    ],
  });

  expect(answer.template).toBe("how_to_answer");
  expect(answer.answer).toContain("Most relevant surface:");
  expect(answer.answer).not.toContain("Most relevant surface:\nWhat Is It");
  expect(answer.answer).toContain("Widgets and Template Editor are the reusable presentation surfaces");
  expect(answer.answer).toContain("Typical workflow:");
  expect(answer.answer).not.toContain("Confusing the widget library");
});

test("composeDocsAnswer prefers complete sentences over truncated half-sentences", () => {
  const answer = composeDocsAnswer({
    question: "what can I do with coderso engine?",
    hits: [
      makeHit({
        chunk: {
          id: "engine-what-is-it",
          docPath: "docs/coderso/engine-and-schema-builder.md",
          headingPath: ["Coderso Engine and Schema Builder", "What Is It"],
          heading: "What Is It",
          content:
            "Coderso Engine and Schema Builder are the modeling surfaces for custom content types, field structures, and the rules that later drive Entries, Listings, Custom Screens, and other record-based workflows.",
          normalizedText:
            "coderso engine and schema builder are the modeling surfaces for custom content types field structures and the rules that later drive entries listings custom screens and other record based workflows",
        },
      }),
    ],
  });

  expect(answer.answer).toContain("Coderso Engine and Schema Builder are the modeling surfaces");
  expect(answer.answer).not.toContain("record-based workflows.…");
});

test("composeDocsAnswer prefers step-by-step guidance for procedural engine questions", () => {
  const answer = composeDocsAnswer({
    question: "how can i use engine?",
    hits: [
      makeHit({
        score: 2.9,
        chunk: {
          id: "engine-step-by-step",
          docPath: "docs/coderso/engine-and-schema-builder.md",
          docTitle: "Coderso Engine and Schema Builder",
          productArea: "coderso-engine",
          headingPath: ["Coderso Engine and Schema Builder", "Step By Step"],
          heading: "Step By Step",
          content:
            "1. Start by creating or opening a content type in Engine. 2. Define fields, labels, relationships, and schema details in Schema Builder. 3. Validate the model against the downstream workflows you expect to use.",
          normalizedText:
            "start by creating or opening a content type in engine define fields labels relationships and schema details in schema builder validate the model against the downstream workflows you expect to use",
        },
      }),
      makeHit({
        score: 3.1,
        chunk: {
          id: "engine-when-to-use",
          docPath: "docs/coderso/engine-and-schema-builder.md",
          docTitle: "Coderso Engine and Schema Builder",
          productArea: "coderso-engine",
          headingPath: ["Coderso Engine and Schema Builder", "When To Use"],
          heading: "When To Use",
          content:
            "Use Engine before creating real records whenever the site needs repeatable, structured content instead of one-off pages.",
          normalizedText:
            "use engine before creating real records whenever the site needs repeatable structured content instead of one off pages",
        },
      }),
      makeHit({
        score: 2.2,
        chunk: {
          id: "engine-what-is-it",
          docPath: "docs/coderso/engine-and-schema-builder.md",
          docTitle: "Coderso Engine and Schema Builder",
          productArea: "coderso-engine",
          headingPath: ["Coderso Engine and Schema Builder", "What Is It"],
          heading: "What Is It",
          content:
            "Coderso Engine and Schema Builder are the modeling surfaces for custom content types, field structures, and the rules that later drive Entries, Listings, and Custom Screens.",
          normalizedText:
            "coderso engine and schema builder are the modeling surfaces for custom content types field structures and the rules that later drive entries listings and custom screens",
        },
      }),
    ],
  });

  expect(answer.template).toBe("how_to_answer");
  expect(answer.answer).toContain("Most relevant surface:");
  expect(answer.answer).toContain("Coderso Engine and Schema Builder");
  expect(answer.answer).toContain("What to do:");
  expect(answer.answer).toContain("1. Start by creating or opening a content type in Engine.");
  expect(answer.answer).not.toContain("Use it when:");
});

test("composeDocsAnswer returns clarifying question when top docs stay ambiguous", () => {
  const answer = composeDocsAnswer({
    question: "Where can I configure colors?",
    hits: [
      makeHit({
        score: 2.1,
        chunk: {
          id: "themes",
          docPath: "docs/screens/themes.md",
          docTitle: "Themes",
          productArea: "themes",
          headingPath: ["Themes", "Step By Step"],
          heading: "Step By Step",
          content: "Adjust theme tokens and preview global changes.",
          normalizedText: "adjust theme tokens and preview global changes",
        },
        rankingSignals: {
          textScore: 1.4,
          domainScore: 0.7,
          intentScore: 0.7,
          phraseScore: 0.3,
          domainPenalty: 0,
          matchedQueryCoverage: 0.33,
        },
      }),
      makeHit({
        score: 1.95,
        chunk: {
          id: "widgets",
          docPath: "docs/coderso/widgets-and-template-editor.md",
          headingPath: ["Coderso Widgets and Template Editor", "Step By Step"],
          heading: "Step By Step",
          content: "Edit template visual settings from Widgets.",
          normalizedText: "edit template visual settings from widgets",
        },
        rankingSignals: {
          textScore: 1.3,
          domainScore: 0.6,
          intentScore: 0.7,
          phraseScore: 0.2,
          domainPenalty: 0,
          matchedQueryCoverage: 0.33,
        },
      }),
    ],
  });

  expect(answer.template).toBe("clarifying_question");
  expect(answer.answer).toContain("I am not confident");
  expect(answer.answer).toContain("Do you mean:");
  expect(answer.answer).toContain("- Themes");
  expect(answer.answer).toContain("- Coderso Widgets and Template Editor");
  expect(answer.confidence).toBeLessThan(0.3);
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
