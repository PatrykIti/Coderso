import { normalizeDocsText } from "./docsIndexService";
import type {
  DocsAnswerSource,
  DocsComposedAnswer,
  DocsSearchHit,
  DocsAnswerTemplate,
} from "./docsTypes";

type ComposeDocsAnswerInput = {
  question: string;
  hits: DocsSearchHit[];
  maxSources?: number;
};

const LOCATION_HINTS = new Set([
  "where",
  "whereis",
  "location",
  "gdzie",
  "znajde",
  "znalezc",
]);

const toSource = (hit: DocsSearchHit): DocsAnswerSource => ({
  path: hit.chunk.docPath,
  heading: hit.chunk.headingPath.join(" > "),
  lineStart: hit.chunk.lineStart,
  lineEnd: hit.chunk.lineEnd,
  snippet: hit.snippet,
  score: Number(hit.score.toFixed(4)),
});

const inferTemplate = (question: string, hitsCount: number): DocsAnswerTemplate => {
  if (hitsCount === 0) return "missing_answer";
  const normalized = normalizeDocsText(question).replace(/\s+/g, "");
  for (const term of LOCATION_HINTS) {
    if (normalized.includes(term)) return "location_answer";
  }
  return "how_to_answer";
};

const resolveConfidence = (hits: DocsSearchHit[]) => {
  if (hits.length === 0) return 0.1;
  const topScore = hits[0]?.score ?? 0;
  if (topScore <= 0) return 0.1;
  return Math.min(0.97, Math.max(0.2, topScore / 4));
};

export const composeDocsAnswer = (input: ComposeDocsAnswerInput): DocsComposedAnswer => {
  const maxSources = Math.min(Math.max(input.maxSources ?? 3, 1), 5);
  const template = inferTemplate(input.question, input.hits.length);
  const sources = input.hits.slice(0, maxSources).map(toSource);

  if (template === "missing_answer") {
    return {
      mode: "docs-only",
      template,
      answer:
        "I could not find a confident match in the documentation. Try adding widget name, section, or screen context.",
      confidence: 0.1,
      sources: [],
      fallbackUsed: false,
    };
  }

  const sourceLabels = sources.map((source, index) => {
    const heading = source.heading || "Top level";
    return `${index + 1}. ${source.path} -> ${heading}`;
  });

  const answer =
    template === "location_answer"
      ? `Most relevant locations in docs:\n${sourceLabels.join("\n")}`
      : `Follow these sections in order:\n${sourceLabels.join("\n")}`;

  return {
    mode: "docs-only",
    template,
    answer,
    confidence: resolveConfidence(input.hits),
    sources,
    fallbackUsed: false,
  };
};
