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

type ExtractedAnswerBody = {
  steps: string[];
  paragraphs: string[];
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeChunkContent = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/\n+/g, "\n")
    .trim();

const extractNumberedSteps = (value: string) => {
  const matches = value.match(/\d+\.\s.*?(?=(?:\s\d+\.\s)|$)/gs);
  if (!matches) return [] as string[];
  return matches
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .filter((entry) => entry.length > 0);
};

const extractSentences = (value: string) => {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return [] as string[];
  return compact
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const truncateAtWordBoundary = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  const sliced = value.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  const safe = lastSpace > Math.floor(maxLength / 2) ? sliced.slice(0, lastSpace) : sliced;
  return `${safe.trimEnd()}…`;
};

const normalizeNumberedStep = (value: string) => {
  const match = value.match(/^(\d+)\.\s*(.*)$/);
  if (!match) return toSentence(value);
  const label = match[1];
  const body = toSentence(match[2] ?? "");
  return `${label}. ${body.replace(/^[0-9]+\.\s*/, "")}`;
};

const buildContentAnswer = (content: string): ExtractedAnswerBody => {
  const normalized = normalizeChunkContent(content);
  if (!normalized) {
    return {
      steps: [],
      paragraphs: [],
    };
  }

  const numberedSteps = extractNumberedSteps(normalized);
  if (numberedSteps.length > 0) {
    return {
      steps: numberedSteps.slice(0, 3).map(normalizeNumberedStep),
      paragraphs: [],
    };
  }

  const sentences = extractSentences(normalized);
  if (sentences.length > 0) {
    return {
      steps: [],
      paragraphs: sentences
        .slice(0, 2)
        .map((entry) => truncateAtWordBoundary(toSentence(entry), 180)),
    };
  }

  return {
    steps: [],
    paragraphs: [truncateAtWordBoundary(normalized.replace(/\s+/g, " "), 360)],
  };
};

const pickPrimaryInstruction = (hits: DocsSearchHit[]) => {
  for (const hit of hits) {
    const contentAnswer = buildContentAnswer(hit.chunk.content);
    if (contentAnswer.steps.length > 0 || contentAnswer.paragraphs.length > 0) {
      return contentAnswer;
    }
  }
  return {
    steps: [],
    paragraphs: [],
  };
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
  const topHit = hits[0];
  const topScore = topHit?.score ?? 0;
  if (topScore <= 0) return 0.1;

  const secondScore = hits[1]?.score ?? 0;
  const base = clamp(topScore / 3.75, 0.18, 0.94);
  const domainScore = topHit?.rankingSignals?.domainScore ?? 0;
  const domainPenalty = topHit?.rankingSignals?.domainPenalty ?? 0;
  const coverage = topHit?.rankingSignals?.matchedQueryCoverage ?? 0.35;
  const gap = Math.max(0, topScore - secondScore);

  const domainFactor = 0.42 + (Math.min(domainScore, 2.5) / 2.5) * 0.58;
  const coverageFactor = 0.75 + coverage * 0.25;
  const gapFactor = 0.8 + (Math.min(gap, 1.5) / 1.5) * 0.2;
  const penaltyFactor = Math.max(0.7, 1 - domainPenalty * 0.12);

  return clamp(base * domainFactor * coverageFactor * gapFactor * penaltyFactor, 0.1, 0.97);
};

const buildFormattedAnswer = (input: {
  template: DocsAnswerTemplate;
  primaryInstruction: ReturnType<typeof pickPrimaryInstruction>;
  primaryScreen: ReturnType<typeof inferPrimaryScreen>;
  asksForScreen: boolean;
}) => {
  const blocks: string[] = [];

  if (input.template === "location_answer" && input.primaryScreen) {
    blocks.push(
      [
        "Most likely screen or section:",
        input.asksForScreen
          ? input.primaryScreen.heading || input.primaryScreen.path
          : input.primaryScreen.path,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  if (input.primaryInstruction.steps.length > 0) {
    blocks.push("What to do:");
    blocks.push(input.primaryInstruction.steps.join("\n"));
  } else if (input.primaryInstruction.paragraphs.length > 0) {
    blocks.push(...input.primaryInstruction.paragraphs);
  }

  return blocks.filter((entry) => entry.trim().length > 0).join("\n\n");
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
    buildFormattedAnswer({
      template,
      primaryInstruction,
      primaryScreen,
      asksForScreen,
    }) || "Follow the documented steps in the most relevant product guide.";

  return {
    mode: "docs-only",
    template,
    answer,
    confidence: resolveConfidence(input.hits),
    sources,
    fallbackUsed: false,
  };
};
