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
  "configure",
  "config",
  "gdzie",
  "znajde",
  "znalezc",
]);

const SCREEN_HINTS = new Set(["screen", "page", "tab", "panel", "settings"]);

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

const toSentence = (value: string) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
};

const pickPrimaryInstruction = (hits: DocsSearchHit[]) => {
  for (const hit of hits) {
    const snippet = toSentence(hit.snippet);
    if (snippet) return snippet;
  }
  return "";
};

const inferPrimaryScreen = (hit: DocsSearchHit | undefined) => {
  if (!hit) return null;
  const heading = hit.chunk.headingPath.join(" > ").trim();
  const path = hit.chunk.docPath.trim();
  if (heading.length === 0 && path.length === 0) return null;
  return {
    heading,
    path,
  };
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
  const primaryInstruction = pickPrimaryInstruction(input.hits);
  const primaryScreen = inferPrimaryScreen(input.hits[0]);

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

  const normalizedQuestion = normalizeDocsText(input.question);
  const asksForScreen =
    [...SCREEN_HINTS].some((term) => normalizedQuestion.includes(term)) ||
    template === "location_answer";

  const answer =
    template === "location_answer"
      ? [
          primaryInstruction || "Use the matching product screen and follow the documented steps there.",
          primaryScreen
            ? asksForScreen
              ? `Most likely screen or section: ${primaryScreen.heading || primaryScreen.path}.`
              : null
            : null,
        ]
          .filter(Boolean)
          .join(" ")
      : primaryInstruction ||
        "Follow the documented steps in the most relevant product guide.";

  return {
    mode: "docs-only",
    template,
    answer,
    confidence: resolveConfidence(input.hits),
    sources,
    fallbackUsed: false,
  };
};
