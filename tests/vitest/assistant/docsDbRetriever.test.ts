import { expect, test } from "vitest";

import { rankAssistantDocsDbRows } from "../../../core/services/assistant/docsDbRetriever";

const rows = [
  {
    id: "chunk-hero",
    docPath: "docs/guide/coderso/widget-template-editor.md",
    docTitle: "Widget Template Editor",
    productArea: "coderso-widgets",
    keywords: [
      "widgets",
      "templates",
      "widget library",
      "template editor",
      "hero",
      "block settings",
      "visual settings",
    ],
    headingPath: ["Widget Template Editor", "Step By Step"],
    heading: "Step By Step",
    lineStart: 20,
    lineEnd: 38,
    content:
      "You can configure Hero widget colors from block-level details. Select the Hero block, open Details, then use Block Settings > Visual to change colors and background.",
    normalizedText:
      "widget template editor step by step you can configure hero widget colors from block level details select the hero block open details then use block settings visual to change colors and background",
    tokenCount: 29,
  },
  {
    id: "chunk-library",
    docPath: "docs/guide/coderso/widget-library.md",
    docTitle: "Widget Library",
    productArea: "coderso-widgets",
    keywords: ["widgets", "widget library", "reusable blocks", "favorites"],
    headingPath: ["Widget Library", "Medium"],
    heading: "Medium",
    lineStart: 24,
    lineEnd: 41,
    content:
      "Use Widget Library to discover reusable components, search by name, narrow the catalog, and decide whether to inspect or edit a reusable item.",
    normalizedText:
      "widget library medium use widget library to discover reusable components search by name narrow the catalog and decide whether to inspect or edit a reusable item",
    tokenCount: 22,
  },
  {
    id: "chunk-themes",
    docPath: "docs/guide/screens/themes.md",
    docTitle: "Themes",
    productArea: "themes",
    keywords: ["themes", "tokens", "templates", "presentation"],
    headingPath: ["Themes", "Step By Step"],
    heading: "Step By Step",
    lineStart: 15,
    lineEnd: 28,
    content:
      "Adjust global color, spacing, and typography tokens from Themes when the issue belongs to the site-wide design layer.",
    normalizedText:
      "themes step by step adjust global color spacing and typography tokens from themes when the issue belongs to the site wide design layer",
    tokenCount: 20,
  },
  {
    id: "chunk-booking",
    docPath: "docs/guide/coderso/booking.md",
    docTitle: "Coderso Booking",
    productArea: "coderso-booking",
    keywords: ["booking", "reservations", "availability", "services"],
    headingPath: ["Coderso Booking", "Step By Step"],
    heading: "Step By Step",
    lineStart: 18,
    lineEnd: 30,
    content:
      "Configure availability, blackout periods, services, and slot behavior for appointment workflows.",
    normalizedText:
      "coderso booking step by step configure availability blackout periods services and slot behavior for appointment workflows",
    tokenCount: 16,
  },
];

test("rankAssistantDocsDbRows ranks the most relevant hero section first", () => {
  const hits = rankAssistantDocsDbRows(rows, "hero visual tab settings", {
    topK: 3,
  });

  expect(hits.length).toBeGreaterThan(0);
  expect(hits[0]?.chunk.docPath).toContain("widget-template-editor.md");
  expect(hits[0]?.snippet.toLowerCase()).toContain("block settings > visual");
});

test("rankAssistantDocsDbRows prefers widgets product area over themes for hero widget color questions", () => {
  const hits = rankAssistantDocsDbRows(rows, "where can I configure hero widget colors", {
    topK: 3,
  });

  expect(hits[0]?.chunk.docPath).toBe("docs/guide/coderso/widget-template-editor.md");
  expect(hits[0]?.rankingSignals?.matchedQueryCoverage ?? 0).toBeGreaterThanOrEqual(0.8);
  expect(hits[0]?.rankingSignals?.domainScore ?? 0).toBeGreaterThan(0);
  expect(hits[1]?.chunk.docPath).toBe("docs/guide/coderso/widget-library.md");
  expect(hits.some((hit) => hit.chunk.docPath === "docs/guide/screens/themes.md")).toBe(false);
});

test("rankAssistantDocsDbRows prefers step-by-step over examples for config questions", () => {
  const hits = rankAssistantDocsDbRows(
    [
      ...rows,
      {
        id: "chunk-examples",
        docPath: "docs/guide/coderso/widget-template-editor.md",
        docTitle: "Widget Template Editor",
        productArea: "coderso-widgets",
        keywords: ["widgets", "templates", "widget library", "template editor"],
        headingPath: ["Widget Template Editor", "Examples"],
        heading: "Examples",
        lineStart: 60,
        lineEnd: 66,
        content: "A landing page team reuses a hero structure across multiple pages.",
        normalizedText:
          "widget template editor examples a landing page team reuses a hero structure across multiple pages",
        tokenCount: 18,
      },
    ],
    "where can I configure hero colors",
    {
      topK: 3,
    }
  );

  expect(hits[0]?.chunk.headingPath.join(" > ").toLowerCase()).toContain("step by step");
});

test("rankAssistantDocsDbRows prefers what-is-it over common-mistakes for capability questions", () => {
  const hits = rankAssistantDocsDbRows(
    [
      ...rows,
      {
        id: "chunk-what-is-it",
        docPath: "docs/guide/coderso/widget-template-editor.md",
        docTitle: "Widget Template Editor",
        productArea: "coderso-widgets",
        keywords: ["widgets", "templates", "widget library", "template editor"],
        headingPath: ["Widget Template Editor", "What Is It"],
        heading: "What Is It",
        lineStart: 6,
        lineEnd: 14,
        content:
          "Widgets and Template Editor are reusable presentation surfaces for building sections, templates, and composable UI blocks.",
        normalizedText:
          "widgets and template editor are reusable presentation surfaces for building sections templates and composable ui blocks",
        tokenCount: 16,
      },
      {
        id: "chunk-common-mistakes",
        docPath: "docs/guide/coderso/widget-template-editor.md",
        docTitle: "Widget Template Editor",
        productArea: "coderso-widgets",
        keywords: ["widgets", "templates", "widget library", "template editor"],
        headingPath: ["Widget Template Editor", "Common Mistakes"],
        heading: "Common Mistakes",
        lineStart: 42,
        lineEnd: 46,
        content:
          "Confusing the widget library with page-level publishing. Editing many pages manually when a reusable template would reduce drift.",
        normalizedText:
          "confusing the widget library with page level publishing editing many pages manually when a reusable template would reduce drift",
        tokenCount: 18,
      },
    ],
    "what features I have in widgets",
    {
      topK: 3,
    }
  );

  expect(hits[0]?.chunk.headingPath.join(" > ").toLowerCase()).toContain("what is it");
});

test("rankAssistantDocsDbRows prefers step-by-step over when-to-use for procedural use questions", () => {
  const hits = rankAssistantDocsDbRows(
    [
      ...rows,
      {
        id: "chunk-engine-step-by-step",
        docPath: "docs/guide/coderso/content-type-editor-and-schema-builder.md",
        docTitle: "Content Type Editor and Schema Builder",
        productArea: "coderso-engine",
        keywords: ["engine", "schema", "content type", "fields"],
        headingPath: ["Content Type Editor and Schema Builder", "Step By Step"],
        heading: "Step By Step",
        lineStart: 20,
        lineEnd: 32,
        content:
          "1. Start by creating or opening a content type in Engine. 2. Define fields, labels, relationships, and schema details in Schema Builder.",
        normalizedText:
          "start by creating or opening a content type in engine define fields labels relationships and schema details in schema builder",
        tokenCount: 18,
      },
      {
        id: "chunk-engine-when-to-use",
        docPath: "docs/guide/coderso/content-type-editor-and-schema-builder.md",
        docTitle: "Content Type Editor and Schema Builder",
        productArea: "coderso-engine",
        keywords: ["engine", "schema", "content type", "fields"],
        headingPath: ["Content Type Editor and Schema Builder", "When To Use"],
        heading: "When To Use",
        lineStart: 12,
        lineEnd: 18,
        content:
          "Use Engine before creating real records whenever the site needs repeatable, structured content instead of one-off pages.",
        normalizedText:
          "use engine before creating real records whenever the site needs repeatable structured content instead of one off pages",
        tokenCount: 15,
      },
    ],
    "how can i use engine",
    {
      topK: 3,
    }
  );

  expect(hits[0]?.chunk.docPath).toBe(
    "docs/guide/coderso/content-type-editor-and-schema-builder.md"
  );
  expect(hits[0]?.chunk.headingPath.join(" > ").toLowerCase()).toContain("step by step");
});

test("rankAssistantDocsDbRows prioritizes troubleshooting sections for troubleshooting queries", () => {
  const hits = rankAssistantDocsDbRows(
    [
      ...rows,
      {
        id: "chunk-entries-instruction",
        docPath: "docs/guide/coderso/entry-editor-and-metadata.md",
        docTitle: "Entry Editor and Metadata Workflow",
        productArea: "coderso-entries",
        keywords: ["entries", "records", "validation"],
        headingPath: ["Entry Editor and Metadata Workflow", "Instruction"],
        heading: "Instruction",
        lineStart: 30,
        lineEnd: 44,
        content: "1. Open Entries. 2. Edit and save the record.",
        normalizedText: "open entries edit and save the record",
        tokenCount: 10,
      },
      {
        id: "chunk-entries-troubleshooting",
        docPath: "docs/guide/coderso/entry-editor-and-metadata.md",
        docTitle: "Entry Editor and Metadata Workflow",
        productArea: "coderso-entries",
        keywords: ["entries", "records", "validation"],
        headingPath: ["Entry Editor and Metadata Workflow", "Troubleshooting"],
        heading: "Troubleshooting",
        lineStart: 46,
        lineEnd: 58,
        content: "If save fails, verify required fields and schema constraints before retrying.",
        normalizedText:
          "if save fails verify required fields and schema constraints before retrying",
        tokenCount: 13,
      },
    ],
    "entries save error troubleshooting",
    {
      topK: 3,
    }
  );

  expect(hits[0]?.chunk.docPath).toBe("docs/guide/coderso/entry-editor-and-metadata.md");
  expect(hits[0]?.chunk.headingPath.join(" > ").toLowerCase()).toContain("troubleshooting");
});

test("rankAssistantDocsDbRows prioritizes widget security section for hero security questions", () => {
  const hits = rankAssistantDocsDbRows(
    [
      ...rows,
      {
        id: "chunk-widget-security",
        docPath: "docs/guide/coderso/widget-template-editor.md",
        docTitle: "Widget Template Editor",
        productArea: "coderso-widgets",
        keywords: ["widgets", "template editor", "hero", "security", "hardening", "button urls"],
        headingPath: ["Widget Template Editor", "Security"],
        heading: "Security",
        lineStart: 140,
        lineEnd: 150,
        content:
          "Hero color configuration is presentation-only. Do not place secrets, API keys, internal tokens, or privileged operational data in Hero copy, button URLs, or media metadata.",
        normalizedText:
          "widget template editor security hero color configuration is presentation only do not place secrets api keys internal tokens or privileged operational data in hero copy button urls or media metadata",
        tokenCount: 26,
      },
    ],
    "hero widget color security hardening",
    {
      topK: 3,
    }
  );

  expect(hits[0]?.chunk.docPath).toBe("docs/guide/coderso/widget-template-editor.md");
  expect(hits[0]?.chunk.headingPath.join(" > ").toLowerCase()).toContain("security");
});

test("rankAssistantDocsDbRows returns empty list for unrelated query", () => {
  const hits = rankAssistantDocsDbRows(rows, "quantum banana neutron", {
    topK: 3,
  });

  expect(hits).toEqual([]);
});

test("rankAssistantDocsDbRows supports token expansion via docs tokenizer", () => {
  const hits = rankAssistantDocsDbRows(rows, "gdzie hero widget", {
    topK: 3,
  });

  expect(hits.some((hit) => hit.chunk.docPath.includes("widget-template-editor.md"))).toBe(true);
});
