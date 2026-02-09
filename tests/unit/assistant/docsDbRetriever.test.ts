import { expect, test } from "bun:test";

import { rankAssistantDocsDbRows } from "../../../core/services/assistant/docsDbRetriever";

const rows = [
  {
    id: "chunk-hero",
    docPath: "_docs/_internal/widgets/hero-basics.md",
    headingPath: ["Hero widget basics", "Step By Step"],
    heading: "Step By Step",
    lineStart: 20,
    lineEnd: 38,
    content:
      "Open Widgets, choose Hero, then go to Visual tab to change colors and spacing.",
    normalizedText:
      "hero widget basics step by step open widgets choose hero then go to visual tab to change colors and spacing",
    tokenCount: 20,
  },
  {
    id: "chunk-security",
    docPath: "_docs/_internal/security/session-limits.md",
    headingPath: ["Session limits", "When To Use"],
    heading: "When To Use",
    lineStart: 10,
    lineEnd: 18,
    content: "Configure session TTL and reset limits for admin access policy.",
    normalizedText:
      "session limits when to use configure session ttl and reset limits for admin access policy",
    tokenCount: 14,
  },
];

test("rankAssistantDocsDbRows ranks the most relevant hero section first", () => {
  const hits = rankAssistantDocsDbRows(rows, "hero visual tab settings", {
    topK: 3,
  });

  expect(hits.length).toBeGreaterThan(0);
  expect(hits[0]?.chunk.docPath).toContain("hero-basics.md");
  expect(hits[0]?.snippet.toLowerCase()).toContain("visual tab");
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

  expect(hits.some((hit) => hit.chunk.docPath.includes("hero-basics.md"))).toBe(true);
});
