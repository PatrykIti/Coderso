import path from "node:path";

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

type SectionKind =
  | "step_by_step"
  | "what_is_it"
  | "when_to_use"
  | "examples"
  | "common_mistakes"
  | "other";

type AnswerIntent = {
  kind: "location" | "capability" | "procedural";
  template: DocsAnswerTemplate;
};

type DocGroup = {
  path: string;
  label: string;
  docScore: number;
  hits: DocsSearchHit[];
  bestHit: DocsSearchHit;
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

const CAPABILITY_PHRASES = [
  "what can i do",
  "what can i",
  "what can",
  "features",
  "feature",
  "capabilities",
  "capability",
  "available options",
  "options",
  "available",
  "co moge",
  "jakie funkcje",
  "funkcje",
  "mozliwosci",
] as const;

const toSource = (hit: DocsSearchHit): DocsAnswerSource => ({
  path: hit.chunk.docPath,
  heading: hit.chunk.headingPath.join(" > "),
  lineStart: hit.chunk.lineStart,
  lineEnd: hit.chunk.lineEnd,
  snippet: hit.snippet,
  score: Number(hit.score.toFixed(4)),
});

const inferAnswerIntent = (question: string, hitsCount: number): AnswerIntent => {
  if (hitsCount === 0) {
    return {
      kind: "procedural",
      template: "missing_answer",
    };
  }

  const normalized = normalizeDocsText(question);
  const compact = normalized.replace(/\s+/g, " ");

  for (const term of LOCATION_HINTS) {
    if (compact.includes(term)) {
      return {
        kind: "location",
        template: "location_answer",
      };
    }
  }

  if (CAPABILITY_PHRASES.some((phrase) => compact.includes(phrase))) {
    return {
      kind: "capability",
      template: "how_to_answer",
    };
  }

  return {
    kind: "procedural",
    template: "how_to_answer",
  };
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

const takeWholeSentences = (sentences: string[], maxSentences: number, maxLength: number) => {
  const selected: string[] = [];
  let totalLength = 0;

  for (const rawSentence of sentences) {
    if (selected.length >= maxSentences) break;
    const sentence = toSentence(rawSentence);
    if (!sentence) continue;

    const nextLength = totalLength + (selected.length > 0 ? 1 : 0) + sentence.length;
    if (selected.length === 0 && sentence.length > maxLength) {
      return [truncateAtWordBoundary(sentence, maxLength)];
    }
    if (nextLength > maxLength) break;

    selected.push(sentence);
    totalLength = nextLength;
  }

  return selected;
};

const takeWholeSteps = (steps: string[], maxSteps: number, maxLength: number) => {
  const selected: string[] = [];
  let totalLength = 0;

  for (const rawStep of steps) {
    if (selected.length >= maxSteps) break;
    const step = normalizeNumberedStep(rawStep);
    if (!step) continue;

    const nextLength = totalLength + (selected.length > 0 ? 1 : 0) + step.length;
    if (selected.length === 0 && step.length > maxLength) {
      return [truncateAtWordBoundary(step, maxLength)];
    }
    if (nextLength > maxLength) break;

    selected.push(step);
    totalLength = nextLength;
  }

  return selected;
};

const buildContentAnswer = (
  content: string,
  options: { maxSteps?: number; maxSentences?: number; maxLength?: number } = {}
): ExtractedAnswerBody => {
  const normalized = normalizeChunkContent(content);
  if (!normalized) {
    return {
      steps: [],
      paragraphs: [],
    };
  }

  const maxSteps = Math.max(options.maxSteps ?? 3, 1);
  const maxSentences = Math.max(options.maxSentences ?? 2, 1);
  const maxLength = Math.max(options.maxLength ?? 360, 60);

  const numberedSteps = extractNumberedSteps(normalized);
  if (numberedSteps.length > 0) {
    return {
      steps: takeWholeSteps(numberedSteps, maxSteps, maxLength),
      paragraphs: [],
    };
  }

  const sentences = extractSentences(normalized);
  if (sentences.length > 0) {
    return {
      steps: [],
      paragraphs: takeWholeSentences(sentences, maxSentences, maxLength),
    };
  }

  return {
    steps: [],
    paragraphs: [truncateAtWordBoundary(normalized.replace(/\s+/g, " "), maxLength)],
  };
};

const inferSectionKind = (headingPath: string[]): SectionKind => {
  const lastHeading = normalizeDocsText(headingPath[headingPath.length - 1] ?? "");
  if (lastHeading.includes("step by step")) return "step_by_step";
  if (lastHeading.includes("what is it")) return "what_is_it";
  if (lastHeading.includes("when to use")) return "when_to_use";
  if (lastHeading.includes("examples")) return "examples";
  if (lastHeading.includes("common mistakes")) return "common_mistakes";
  return "other";
};

const inferDocLabel = (hit: DocsSearchHit | undefined) => {
  if (!hit) return null;
  const headingRoot = hit.chunk.headingPath[0]?.trim();
  if (headingRoot) return headingRoot;
  return path
    .basename(hit.chunk.docPath)
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
};

const getSectionBonus = (kind: SectionKind, intent: AnswerIntent["kind"]) => {
  if (intent === "location") {
    switch (kind) {
      case "step_by_step":
        return 1.2;
      case "what_is_it":
        return 0.35;
      case "when_to_use":
        return 0.15;
      case "examples":
        return -0.75;
      case "common_mistakes":
        return -1.1;
      default:
        return 0;
    }
  }

  if (intent === "capability") {
    switch (kind) {
      case "what_is_it":
        return 1.1;
      case "step_by_step":
        return 0.55;
      case "when_to_use":
        return 0.35;
      case "examples":
        return -0.25;
      case "common_mistakes":
        return -1.15;
      default:
        return 0;
    }
  }

  switch (kind) {
    case "step_by_step":
      return 1.05;
    case "when_to_use":
      return 0.2;
    case "what_is_it":
      return 0.15;
    case "examples":
      return -0.2;
    case "common_mistakes":
      return -0.9;
    default:
      return 0;
  }
};

const groupHitsByDoc = (hits: DocsSearchHit[]) => {
  const groups = new Map<string, DocGroup>();

  for (const hit of hits) {
    const key = hit.chunk.docPath;
    const existing = groups.get(key);
    const label = inferDocLabel(hit) ?? hit.chunk.docPath;
    if (!existing) {
      groups.set(key, {
        path: key,
        label,
        docScore: 0,
        hits: [hit],
        bestHit: hit,
      });
      continue;
    }

    existing.hits.push(hit);
    if (hit.score > existing.bestHit.score) {
      existing.bestHit = hit;
    }
  }

  const result = [...groups.values()].map((group) => {
    const sortedHits = [...group.hits].sort((left, right) => right.score - left.score);
    const bestHit = sortedHits[0] ?? group.bestHit;
    const secondHit = sortedHits[1];
    const bestCoverage = bestHit?.rankingSignals?.matchedQueryCoverage ?? 0;
    const bestDomain = bestHit?.rankingSignals?.domainScore ?? 0;
    const docScore =
      (bestHit?.score ?? 0) +
      (secondHit?.score ?? 0) * 0.3 +
      bestCoverage * 0.5 +
      bestDomain * 0.4;

    return {
      ...group,
      hits: sortedHits,
      bestHit,
      docScore,
    };
  });

  result.sort((left, right) => {
    if (right.docScore !== left.docScore) return right.docScore - left.docScore;
    return left.path.localeCompare(right.path);
  });

  return result;
};

const shouldAskClarifyingQuestion = (
  intent: AnswerIntent,
  docGroups: DocGroup[]
) => {
  if (docGroups.length < 2) return false;

  const top = docGroups[0];
  const second = docGroups[1];
  if (!top || !second || top.path === second.path) return false;

  const topCoverage = top.bestHit.rankingSignals?.matchedQueryCoverage ?? 0;
  const topDomain = top.bestHit.rankingSignals?.domainScore ?? 0;
  const gap = top.docScore - second.docScore;
  const secondIsClose = second.docScore >= top.docScore * 0.84 || gap <= 0.45;

  if (!secondIsClose) return false;

  if (intent.kind === "location") {
    return topCoverage < 0.7 || topDomain < 1.2;
  }

  if (intent.kind === "capability") {
    return topCoverage < 0.55 || topDomain < 1;
  }

  return topCoverage < 0.45 || topDomain < 0.9;
};

const selectPrimaryHit = (group: DocGroup, intent: AnswerIntent["kind"]) => {
  const ranked = [...group.hits].sort((left, right) => {
    const leftScore = left.score + getSectionBonus(inferSectionKind(left.chunk.headingPath), intent);
    const rightScore =
      right.score + getSectionBonus(inferSectionKind(right.chunk.headingPath), intent);
    if (rightScore !== leftScore) return rightScore - leftScore;
    return right.score - left.score;
  });

  return ranked[0] ?? group.bestHit;
};

const selectSupportingHit = (
  group: DocGroup,
  primaryHit: DocsSearchHit,
  intent: AnswerIntent["kind"]
) => {
  const preferredKinds =
    intent === "capability"
      ? (["when_to_use", "step_by_step", "what_is_it"] as SectionKind[])
      : (["what_is_it", "when_to_use", "step_by_step"] as SectionKind[]);

  for (const kind of preferredKinds) {
    const match = group.hits.find((hit) => {
      if (hit.chunk.id === primaryHit.chunk.id) return false;
      return inferSectionKind(hit.chunk.headingPath) === kind;
    });
    if (match) return match;
  }

  return group.hits.find((hit) => hit.chunk.id !== primaryHit.chunk.id) ?? null;
};

const resolveConfidence = (
  hits: DocsSearchHit[],
  template: DocsAnswerTemplate,
  docGroups: DocGroup[]
) => {
  if (template === "clarifying_question") return 0.22;
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
  const docGap =
    docGroups.length >= 2 ? Math.max(0, docGroups[0]!.docScore - docGroups[1]!.docScore) : gap;

  const domainFactor = 0.42 + (Math.min(domainScore, 2.5) / 2.5) * 0.58;
  const coverageFactor = 0.75 + coverage * 0.25;
  const gapFactor = 0.8 + (Math.min(gap, 1.5) / 1.5) * 0.2;
  const docGapFactor = 0.82 + (Math.min(docGap, 1.5) / 1.5) * 0.18;
  const penaltyFactor = Math.max(0.7, 1 - domainPenalty * 0.12);

  return clamp(
    base * domainFactor * coverageFactor * gapFactor * docGapFactor * penaltyFactor,
    0.1,
    0.97
  );
};

const buildClarifyingQuestion = (docGroups: DocGroup[]) => {
  const candidateLabels = [...new Set(docGroups.slice(0, 3).map((group) => group.label))];
  return [
    "I am not confident which product area you mean from the docs yet.",
    "",
    "Do you mean:",
    "",
    ...candidateLabels.map((label) => `- ${label}`),
  ].join("\n");
};

const buildLocationAnswer = (docGroup: DocGroup, primaryHit: DocsSearchHit) => {
  const blocks = [
    ["Most likely surface:", docGroup.label].join("\n"),
  ];

  const primaryBody = buildContentAnswer(primaryHit.chunk.content, {
    maxSteps: 3,
    maxSentences: 2,
    maxLength: 320,
  });

  if (primaryBody.steps.length > 0) {
    blocks.push("What to do:");
    blocks.push(primaryBody.steps.join("\n"));
  } else {
    blocks.push(...primaryBody.paragraphs);
  }

  return blocks.join("\n\n");
};

const buildCapabilityAnswer = (
  docGroup: DocGroup,
  primaryHit: DocsSearchHit,
  supportingHit: DocsSearchHit | null
) => {
  const blocks = [
    ["Most relevant surface:", docGroup.label].join("\n"),
  ];

  const primaryBody = buildContentAnswer(primaryHit.chunk.content, {
    maxSentences: 2,
    maxLength: 340,
  });
  blocks.push(...primaryBody.paragraphs);

  if (supportingHit) {
    const supportingKind = inferSectionKind(supportingHit.chunk.headingPath);
    if (supportingKind === "step_by_step") {
      const stepsBody = buildContentAnswer(supportingHit.chunk.content, {
        maxSteps: 2,
        maxLength: 260,
      });
      if (stepsBody.steps.length > 0) {
        blocks.push("Typical workflow:");
        blocks.push(stepsBody.steps.join("\n"));
      }
    } else if (supportingKind === "when_to_use") {
      const whenToUseBody = buildContentAnswer(supportingHit.chunk.content, {
        maxSentences: 1,
        maxLength: 200,
      });
      if (whenToUseBody.paragraphs.length > 0) {
        blocks.push("Use it when:");
        blocks.push(...whenToUseBody.paragraphs);
      }
    }
  }

  return blocks.join("\n\n");
};

const buildProceduralAnswer = (primaryHit: DocsSearchHit) => {
  const primaryBody = buildContentAnswer(primaryHit.chunk.content, {
    maxSteps: 3,
    maxSentences: 2,
    maxLength: 320,
  });

  if (primaryBody.steps.length > 0) {
    return ["What to do:", primaryBody.steps.join("\n")].join("\n\n");
  }

  return primaryBody.paragraphs.join("\n\n");
};

export const composeDocsAnswer = (input: ComposeDocsAnswerInput): DocsComposedAnswer => {
  const maxSources = Math.min(Math.max(input.maxSources ?? 3, 1), 5);
  const intent = inferAnswerIntent(input.question, input.hits.length);

  if (intent.template === "missing_answer") {
    return {
      mode: "docs-only",
      template: "missing_answer",
      answer:
        "I could not find a confident match in the documentation. Try adding widget name, section, or screen context.",
      confidence: 0.1,
      sources: [],
      fallbackUsed: false,
    };
  }

  const docGroups = groupHitsByDoc(input.hits);
  if (shouldAskClarifyingQuestion(intent, docGroups)) {
    const clarificationSources = docGroups
      .slice(0, maxSources)
      .map((group) => group.bestHit)
      .map(toSource);

    return {
      mode: "docs-only",
      template: "clarifying_question",
      answer: buildClarifyingQuestion(docGroups),
      confidence: resolveConfidence(input.hits, "clarifying_question", docGroups),
      sources: clarificationSources,
      fallbackUsed: false,
    };
  }

  const primaryDocGroup = docGroups[0];
  const primaryHit = primaryDocGroup
    ? selectPrimaryHit(primaryDocGroup, intent.kind)
    : input.hits[0];
  const supportingHit =
    primaryDocGroup && primaryHit
      ? selectSupportingHit(primaryDocGroup, primaryHit, intent.kind)
      : null;

  if (!primaryHit) {
    return {
      mode: "docs-only",
      template: "missing_answer",
      answer:
        "I could not find a confident match in the documentation. Try adding widget name, section, or screen context.",
      confidence: 0.1,
      sources: [],
      fallbackUsed: false,
    };
  }

  const selectedEvidence = [
    primaryHit,
    supportingHit,
    ...input.hits.filter(
      (hit) =>
        hit.chunk.id !== primaryHit.chunk.id &&
        hit.chunk.id !== supportingHit?.chunk.id
    ),
  ]
    .filter((hit): hit is DocsSearchHit => Boolean(hit))
    .slice(0, maxSources);

  const answer =
    intent.kind === "location"
      ? buildLocationAnswer(primaryDocGroup ?? groupHitsByDoc([primaryHit])[0]!, primaryHit)
      : intent.kind === "capability"
        ? buildCapabilityAnswer(
            primaryDocGroup ?? groupHitsByDoc([primaryHit])[0]!,
            primaryHit,
            supportingHit
          )
        : buildProceduralAnswer(primaryHit);

  return {
    mode: "docs-only",
    template: intent.template,
    answer: answer || "Follow the documented steps in the most relevant product guide.",
    confidence: resolveConfidence(selectedEvidence, intent.template, docGroups),
    sources: selectedEvidence.map(toSource),
    fallbackUsed: false,
  };
};
