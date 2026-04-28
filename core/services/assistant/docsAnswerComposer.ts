import path from "node:path";

import { normalizeDocsText } from "./docsIndexService";
import type {
  DocsAnswerSource,
  DocsComposedAnswer,
  DocsSearchHit,
  DocsAnswerTemplate,
  DocsDetailLevel,
  DocsGuideMode,
  DocsFollowUpOption,
} from "./docsTypes";

type ComposeDocsAnswerInput = {
  question: string;
  hits: DocsSearchHit[];
  maxSources?: number;
  detailLevel?: DocsDetailLevel;
  guideMode?: DocsGuideMode;
};

type ExtractedAnswerBody = {
  steps: string[];
  paragraphs: string[];
};

type SectionKind =
  | "step_by_step"
  | "basic"
  | "medium"
  | "instruction"
  | "advanced"
  | "troubleshooting"
  | "decision_guide"
  | "checklist"
  | "security"
  | "what_is_it"
  | "when_to_use"
  | "examples"
  | "common_mistakes"
  | "other";

type AnswerIntent = {
  kind: "location" | "capability" | "procedural";
  template: DocsAnswerTemplate;
  detailLevel: DocsDetailLevel;
  guideMode: DocsGuideMode;
  detailLevelLocked: boolean;
  guideModeLocked: boolean;
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
const DETAIL_BASIC_HINTS = ["basic", "quick", "brief", "short answer"] as const;
const DETAIL_MEDIUM_HINTS = ["medium", "more detail", "more context", "expand"] as const;
const DETAIL_INSTRUCTION_HINTS = [
  "instruction",
  "step by step",
  "how to",
  "krok po kroku",
  "instrukcja",
] as const;
const DETAIL_ADVANCED_HINTS = [
  "advanced",
  "scenario",
  "tradeoff",
  "best practice",
  "zaawans",
  "scenariusz",
] as const;
const TROUBLESHOOTING_HINTS = [
  "troubleshooting",
  "troubleshoot",
  "fix",
  "error",
  "issue",
  "problem",
  "debug",
] as const;
const DECISION_GUIDE_HINTS = [
  "decision",
  "which should i choose",
  "which one",
  "compare",
  "comparison",
  "wybrac",
  "porown",
] as const;
const CHECKLIST_HINTS = [
  "checklist",
  "ready to launch",
  "go live",
  "readiness",
  "lista kontrolna",
  "check list",
] as const;
const SECURITY_HINTS = ["security", "secure", "csrf", "rbac", "auth", "hardening"] as const;

const toSource = (hit: DocsSearchHit): DocsAnswerSource => ({
  path: hit.chunk.docPath,
  heading: hit.chunk.headingPath.join(" > "),
  lineStart: hit.chunk.lineStart,
  lineEnd: hit.chunk.lineEnd,
  snippet: hit.snippet,
  score: Number(hit.score.toFixed(4)),
});

const inferDetailLevel = (
  normalizedQuestion: string,
  override: DocsDetailLevel | undefined,
  intentKind: "location" | "capability" | "procedural"
): DocsDetailLevel => {
  if (override) return override;
  if (DETAIL_BASIC_HINTS.some((term) => normalizedQuestion.includes(term))) return "basic";
  if (DETAIL_INSTRUCTION_HINTS.some((term) => normalizedQuestion.includes(term))) {
    return "instruction";
  }
  if (DETAIL_ADVANCED_HINTS.some((term) => normalizedQuestion.includes(term))) return "advanced";
  if (DETAIL_MEDIUM_HINTS.some((term) => normalizedQuestion.includes(term))) return "medium";

  if (intentKind === "location" || intentKind === "procedural") return "instruction";
  if (intentKind === "capability") return "basic";
  return "medium";
};

const inferGuideMode = (
  normalizedQuestion: string,
  override: DocsGuideMode | undefined
): DocsGuideMode => {
  if (override) return override;
  if (TROUBLESHOOTING_HINTS.some((term) => normalizedQuestion.includes(term))) {
    return "troubleshooting";
  }
  if (DECISION_GUIDE_HINTS.some((term) => normalizedQuestion.includes(term))) {
    return "decision_guide";
  }
  if (CHECKLIST_HINTS.some((term) => normalizedQuestion.includes(term))) {
    return "checklist";
  }
  if (SECURITY_HINTS.some((term) => normalizedQuestion.includes(term))) {
    return "security";
  }
  return "default";
};

const inferAnswerIntent = (
  question: string,
  hitsCount: number,
  options: { detailLevel?: DocsDetailLevel; guideMode?: DocsGuideMode } = {}
): AnswerIntent => {
  if (hitsCount === 0) {
    return {
      kind: "procedural",
      template: "missing_answer",
      detailLevel: options.detailLevel ?? "medium",
      guideMode: options.guideMode ?? "default",
      detailLevelLocked: Boolean(options.detailLevel),
      guideModeLocked: Boolean(options.guideMode),
    };
  }

  const normalized = normalizeDocsText(question);
  const compact = normalized.replace(/\s+/g, " ");

  let kind: AnswerIntent["kind"] = "procedural";
  let template: DocsAnswerTemplate = "how_to_answer";

  for (const term of LOCATION_HINTS) {
    if (compact.includes(term)) {
      kind = "location";
      template = "location_answer";
      break;
    }
  }

  if (kind !== "location" && CAPABILITY_PHRASES.some((phrase) => compact.includes(phrase))) {
    kind = "capability";
    template = "how_to_answer";
  }

  return {
    kind,
    template,
    detailLevel: inferDetailLevel(compact, options.detailLevel, kind),
    guideMode: inferGuideMode(compact, options.guideMode),
    detailLevelLocked: Boolean(options.detailLevel),
    guideModeLocked: Boolean(options.guideMode),
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
  if (lastHeading === "basic") return "basic";
  if (lastHeading === "medium") return "medium";
  if (lastHeading.includes("instruction")) return "instruction";
  if (lastHeading === "advanced") return "advanced";
  if (lastHeading.includes("troubleshooting")) return "troubleshooting";
  if (lastHeading.includes("decision guide")) return "decision_guide";
  if (lastHeading.includes("checklist")) return "checklist";
  if (lastHeading.includes("security")) return "security";
  if (lastHeading.includes("what is it")) return "what_is_it";
  if (lastHeading.includes("when to use")) return "when_to_use";
  if (lastHeading.includes("examples")) return "examples";
  if (lastHeading.includes("common mistakes")) return "common_mistakes";
  return "other";
};

const inferDocLabel = (hit: DocsSearchHit | undefined) => {
  if (!hit) return null;
  const docTitle = hit.chunk.docTitle?.trim();
  if (docTitle) return docTitle;
  return path
    .basename(hit.chunk.docPath)
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
};

const getDetailLevelSectionBonus = (kind: SectionKind, detailLevel: DocsDetailLevel) => {
  if (detailLevel === "basic") {
    if (kind === "basic") return 1.35;
    if (kind === "what_is_it") return 1.15;
    if (kind === "medium") return 0.45;
    if (kind === "instruction") return 0.15;
    if (kind === "step_by_step") return 0.15;
    if (kind === "advanced") return -0.2;
    return 0;
  }

  if (detailLevel === "instruction") {
    if (kind === "instruction") return 1.55;
    if (kind === "step_by_step") return 1.45;
    if (kind === "medium") return 0.35;
    if (kind === "what_is_it") return 0.15;
    if (kind === "advanced") return -0.05;
    return 0;
  }

  if (detailLevel === "advanced") {
    if (kind === "advanced") return 1.5;
    if (kind === "decision_guide") return 0.95;
    if (kind === "security") return 0.75;
    if (kind === "examples") return 0.55;
    if (kind === "common_mistakes") return 0.45;
    if (kind === "basic") return -0.2;
    return 0;
  }

  if (kind === "medium") return 1.25;
  if (kind === "what_is_it") return 0.85;
  if (kind === "when_to_use") return 0.7;
  if (kind === "instruction") return 0.35;
  if (kind === "step_by_step") return 0.25;
  return 0;
};

const getGuideModeSectionBonus = (kind: SectionKind, guideMode: DocsGuideMode) => {
  if (guideMode === "troubleshooting") {
    if (kind === "troubleshooting") return 2.15;
    if (kind === "common_mistakes") return 0.85;
    return 0;
  }

  if (guideMode === "decision_guide") {
    if (kind === "decision_guide") return 2;
    if (kind === "advanced") return 0.85;
    if (kind === "when_to_use") return 0.55;
    return 0;
  }

  if (guideMode === "checklist") {
    if (kind === "checklist") return 2;
    if (kind === "instruction") return 0.7;
    return 0;
  }

  if (guideMode === "security") {
    if (kind === "security") return 2;
    if (kind === "common_mistakes") return 0.55;
    return 0;
  }

  return 0;
};

const getSectionBonus = (kind: SectionKind, intent: AnswerIntent) => {
  let score =
    getDetailLevelSectionBonus(kind, intent.detailLevel) +
    getGuideModeSectionBonus(kind, intent.guideMode);

  if (intent.kind === "location") {
    switch (kind) {
      case "step_by_step":
        score += 1.2;
        break;
      case "instruction":
        score += 1.25;
        break;
      case "basic":
        score += 0.4;
        break;
      case "medium":
        score += 0.3;
        break;
      case "what_is_it":
        score += 0.35;
        break;
      case "when_to_use":
        score += 0.15;
        break;
      case "examples":
        score -= 0.75;
        break;
      case "common_mistakes":
        score -= 1.1;
        break;
      default:
        break;
    }
    return score;
  }

  if (intent.kind === "capability") {
    switch (kind) {
      case "basic":
        score += 1.15;
        break;
      case "medium":
        score += 0.75;
        break;
      case "what_is_it":
        score += 1.1;
        break;
      case "step_by_step":
        score += 0.55;
        break;
      case "instruction":
        score += 0.45;
        break;
      case "when_to_use":
        score += 0.35;
        break;
      case "examples":
        score -= 0.25;
        break;
      case "common_mistakes":
        score -= 1.15;
        break;
      default:
        break;
    }
    return score;
  }

  switch (kind) {
    case "step_by_step":
      score += 1.45;
      break;
    case "instruction":
      score += 1.5;
      break;
    case "medium":
      score += 0.45;
      break;
    case "basic":
      score += 0.25;
      break;
    case "when_to_use":
      score += -0.1;
      break;
    case "what_is_it":
      score += 0.2;
      break;
    case "examples":
      score += -0.2;
      break;
    case "common_mistakes":
      score += -0.9;
      break;
    default:
      break;
  }
  return score;
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

const resolvePreferredKindsForDetailLevel = (
  detailLevel: DocsDetailLevel
): SectionKind[] => {
  if (detailLevel === "basic") return ["basic", "what_is_it", "medium"];
  if (detailLevel === "instruction") return ["instruction", "step_by_step", "medium"];
  if (detailLevel === "advanced") {
    return ["advanced", "decision_guide", "security", "examples", "common_mistakes"];
  }
  return ["medium", "what_is_it", "when_to_use", "instruction"];
};

const resolvePreferredKindsForGuideMode = (
  guideMode: DocsGuideMode
): SectionKind[] => {
  if (guideMode === "troubleshooting") return ["troubleshooting", "common_mistakes"];
  if (guideMode === "decision_guide") return ["decision_guide", "advanced", "when_to_use"];
  if (guideMode === "checklist") return ["checklist", "instruction", "step_by_step"];
  if (guideMode === "security") return ["security", "advanced", "common_mistakes"];
  return [];
};

const selectPrimaryHit = (group: DocGroup, intent: AnswerIntent) => {
  if (intent.guideModeLocked && intent.guideMode !== "default") {
    const guideKinds = resolvePreferredKindsForGuideMode(intent.guideMode);
    for (const kind of guideKinds) {
      const hit = group.hits.find((candidate) => inferSectionKind(candidate.chunk.headingPath) === kind);
      if (hit) return hit;
    }
  }

  if (intent.detailLevelLocked) {
    const detailKinds = resolvePreferredKindsForDetailLevel(intent.detailLevel);
    for (const kind of detailKinds) {
      const hit = group.hits.find((candidate) => inferSectionKind(candidate.chunk.headingPath) === kind);
      if (hit) return hit;
    }
  }

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
  intent: AnswerIntent
) => {
  if (intent.guideMode === "troubleshooting") {
    const troubleshooting = group.hits.find(
      (hit) =>
        hit.chunk.id !== primaryHit.chunk.id &&
        inferSectionKind(hit.chunk.headingPath) === "troubleshooting"
    );
    if (troubleshooting) return troubleshooting;
  }

  if (intent.guideMode === "decision_guide") {
    const decision = group.hits.find(
      (hit) =>
        hit.chunk.id !== primaryHit.chunk.id &&
        inferSectionKind(hit.chunk.headingPath) === "decision_guide"
    );
    if (decision) return decision;
  }

  if (intent.guideMode === "checklist") {
    const checklist = group.hits.find(
      (hit) =>
        hit.chunk.id !== primaryHit.chunk.id &&
        inferSectionKind(hit.chunk.headingPath) === "checklist"
    );
    if (checklist) return checklist;
  }

  if (intent.guideMode === "security") {
    const security = group.hits.find(
      (hit) =>
        hit.chunk.id !== primaryHit.chunk.id &&
        inferSectionKind(hit.chunk.headingPath) === "security"
    );
    if (security) return security;
  }

  const preferredKinds =
    intent.kind === "capability"
      ? (["when_to_use", "step_by_step", "what_is_it"] as SectionKind[])
      : (["what_is_it", "step_by_step", "when_to_use"] as SectionKind[]);

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

const buildGuideModeHeading = (guideMode: DocsGuideMode) => {
  if (guideMode === "troubleshooting") return "Troubleshooting:";
  if (guideMode === "decision_guide") return "Decision guide:";
  if (guideMode === "checklist") return "Checklist:";
  if (guideMode === "security") return "Security notes:";
  return null;
};

const resolveGuideModeSectionKind = (
  guideMode: DocsGuideMode
): SectionKind | null => {
  if (guideMode === "troubleshooting") return "troubleshooting";
  if (guideMode === "decision_guide") return "decision_guide";
  if (guideMode === "checklist") return "checklist";
  if (guideMode === "security") return "security";
  return null;
};

const isGuideModePrimarySection = (
  guideMode: DocsGuideMode,
  primaryHit: DocsSearchHit
) => {
  const expectedKind = resolveGuideModeSectionKind(guideMode);
  if (!expectedKind) return false;
  return inferSectionKind(primaryHit.chunk.headingPath) === expectedKind;
};

const buildGuideModeBlock = (
  guideMode: DocsGuideMode,
  primaryHit: DocsSearchHit,
  supportingHit: DocsSearchHit | null
) => {
  if (guideMode === "default") return [] as string[];
  if (isGuideModePrimarySection(guideMode, primaryHit)) return [] as string[];
  const heading = buildGuideModeHeading(guideMode);
  if (!heading) return [] as string[];

  const source = supportingHit ?? primaryHit;
  const body = buildContentAnswer(source.chunk.content, {
    maxSteps: guideMode === "checklist" ? 5 : 3,
    maxSentences: 2,
    maxLength: 440,
  });

  if (body.steps.length > 0) {
    return [heading, body.steps.join("\n")];
  }
  if (body.paragraphs.length > 0) {
    return [heading, ...body.paragraphs];
  }
  return [] as string[];
};

const buildLocationAnswer = (
  docGroup: DocGroup,
  primaryHit: DocsSearchHit,
  supportingHit: DocsSearchHit | null,
  intent: AnswerIntent
) => {
  const blocks = [
    ["Most likely surface:", docGroup.label].join("\n"),
  ];

  const locationOptions =
    intent.detailLevel === "basic"
      ? { maxSteps: 2, maxSentences: 1, maxLength: 260 }
      : intent.detailLevel === "advanced"
        ? { maxSteps: 5, maxSentences: 3, maxLength: 640 }
        : intent.detailLevel === "instruction"
          ? { maxSteps: 5, maxSentences: 2, maxLength: 620 }
          : { maxSteps: 4, maxSentences: 2, maxLength: 520 };

  const primaryBody = buildContentAnswer(primaryHit.chunk.content, {
    ...locationOptions,
  });
  const guideModePrimary = isGuideModePrimarySection(intent.guideMode, primaryHit);
  const guideModeHeading = guideModePrimary
    ? buildGuideModeHeading(intent.guideMode)
    : null;

  if (guideModeHeading) {
    blocks.push(guideModeHeading);
    if (primaryBody.steps.length > 0) {
      blocks.push(primaryBody.steps.join("\n"));
    } else {
      blocks.push(...primaryBody.paragraphs);
    }
  } else if (primaryBody.steps.length > 0) {
    blocks.push("What to do:");
    blocks.push(primaryBody.steps.join("\n"));
  } else {
    blocks.push(...primaryBody.paragraphs);
  }

  const guideModeBlocks = buildGuideModeBlock(intent.guideMode, primaryHit, supportingHit);
  blocks.push(...guideModeBlocks);

  return blocks.join("\n\n");
};

const buildCapabilityAnswer = (
  docGroup: DocGroup,
  primaryHit: DocsSearchHit,
  supportingHit: DocsSearchHit | null,
  intent: AnswerIntent
) => {
  const blocks = [
    ["Most relevant surface:", docGroup.label].join("\n"),
  ];

  const capabilityOptions =
    intent.detailLevel === "basic"
      ? { maxSentences: 1, maxLength: 240 }
      : intent.detailLevel === "advanced"
        ? { maxSentences: 3, maxLength: 520 }
        : { maxSentences: 2, maxLength: 360 };

  const primaryBody = buildContentAnswer(primaryHit.chunk.content, {
    ...capabilityOptions,
  });
  const guideModePrimary = isGuideModePrimarySection(intent.guideMode, primaryHit);
  const guideModeHeading = guideModePrimary
    ? buildGuideModeHeading(intent.guideMode)
    : null;

  if (guideModeHeading) {
    blocks.push(guideModeHeading);
  }
  blocks.push(...primaryBody.paragraphs);

  if (!guideModePrimary && supportingHit) {
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

  const guideModeBlocks = buildGuideModeBlock(intent.guideMode, primaryHit, supportingHit);
  blocks.push(...guideModeBlocks);

  return blocks.join("\n\n");
};

const buildProceduralAnswer = (
  docGroup: DocGroup,
  primaryHit: DocsSearchHit,
  supportingHit: DocsSearchHit | null,
  intent: AnswerIntent
) => {
  const blocks = [
    ["Most relevant surface:", docGroup.label].join("\n"),
  ];

  const proceduralOptions =
    intent.detailLevel === "basic"
      ? { maxSteps: 2, maxSentences: 1, maxLength: 260 }
      : intent.detailLevel === "advanced"
        ? { maxSteps: 5, maxSentences: 3, maxLength: 620 }
        : intent.detailLevel === "instruction"
          ? { maxSteps: 5, maxSentences: 2, maxLength: 620 }
          : { maxSteps: 4, maxSentences: 2, maxLength: 420 };

  const primaryBody = buildContentAnswer(primaryHit.chunk.content, {
    ...proceduralOptions,
  });
  const guideModePrimary = isGuideModePrimarySection(intent.guideMode, primaryHit);
  const guideModeHeading = guideModePrimary
    ? buildGuideModeHeading(intent.guideMode)
    : null;

  if (guideModeHeading) {
    blocks.push(guideModeHeading);
    if (primaryBody.steps.length > 0) {
      blocks.push(primaryBody.steps.join("\n"));
    } else {
      blocks.push(...primaryBody.paragraphs);
    }
  } else if (primaryBody.steps.length > 0) {
    blocks.push("What to do:");
    blocks.push(primaryBody.steps.join("\n"));
  } else {
    blocks.push(...primaryBody.paragraphs);
  }

  if (!guideModePrimary && supportingHit) {
    const supportingKind = inferSectionKind(supportingHit.chunk.headingPath);
    if (supportingKind === "what_is_it") {
      const supportingBody = buildContentAnswer(supportingHit.chunk.content, {
        maxSentences: 1,
        maxLength: 220,
      });
      if (supportingBody.paragraphs.length > 0) {
        blocks.push("What it helps with:");
        blocks.push(...supportingBody.paragraphs);
      }
    } else if (supportingKind === "when_to_use") {
      const supportingBody = buildContentAnswer(supportingHit.chunk.content, {
        maxSentences: 1,
        maxLength: 220,
      });
      if (supportingBody.paragraphs.length > 0) {
        blocks.push("Use it when:");
        blocks.push(...supportingBody.paragraphs);
      }
    }
  }

  const guideModeBlocks = buildGuideModeBlock(intent.guideMode, primaryHit, supportingHit);
  blocks.push(...guideModeBlocks);

  return blocks.join("\n\n");
};

const buildFollowUpOptions = (intent: AnswerIntent): DocsFollowUpOption[] => {
  const options: DocsFollowUpOption[] = [];

  if (intent.guideMode === "default") {
    if (intent.detailLevel !== "medium") {
      options.push({
        id: "followup-medium",
        label: "More detail",
        detailLevel: "medium",
        guideMode: "default",
        promptHint: "Give me a medium-detail explanation for this feature.",
      });
    }
    if (intent.detailLevel !== "instruction") {
      options.push({
        id: "followup-instruction",
        label: "Step-by-step",
        detailLevel: "instruction",
        guideMode: "default",
        promptHint: "Give me step-by-step instructions for this feature.",
      });
    }
    if (intent.detailLevel !== "advanced") {
      options.push({
        id: "followup-advanced",
        label: "Advanced scenarios",
        detailLevel: "advanced",
        guideMode: "default",
        promptHint: "Give me advanced scenarios, trade-offs, and anti-patterns.",
      });
    }
  } else {
    options.push({
      id: "followup-back-default",
      label: "Back to default guidance",
      detailLevel: "medium",
      guideMode: "default",
      promptHint: "Go back to default product guidance for this topic.",
    });
  }

  if (intent.guideMode !== "troubleshooting") {
    options.push({
      id: "followup-troubleshooting",
      label: "Troubleshooting",
      detailLevel: intent.detailLevel,
      guideMode: "troubleshooting",
      promptHint: "Give me troubleshooting steps and likely root causes.",
    });
  }
  if (intent.guideMode !== "decision_guide") {
    options.push({
      id: "followup-decision",
      label: "Decision guide",
      detailLevel: intent.detailLevel,
      guideMode: "decision_guide",
      promptHint: "Help me decide which option to choose and when.",
    });
  }
  if (intent.guideMode !== "checklist") {
    options.push({
      id: "followup-checklist",
      label: "Checklist",
      detailLevel: "instruction",
      guideMode: "checklist",
      promptHint: "Give me a practical checklist for this configuration.",
    });
  }
  if (intent.guideMode !== "security") {
    options.push({
      id: "followup-security",
      label: "Security focus",
      detailLevel: "advanced",
      guideMode: "security",
      promptHint: "List security requirements and hardening notes for this topic.",
    });
  }

  return options.slice(0, 5);
};

export const composeDocsAnswer = (input: ComposeDocsAnswerInput): DocsComposedAnswer => {
  const maxSources = Math.min(Math.max(input.maxSources ?? 3, 1), 5);
  const intent = inferAnswerIntent(input.question, input.hits.length, {
    detailLevel: input.detailLevel,
    guideMode: input.guideMode,
  });

  if (intent.template === "missing_answer") {
    return {
      mode: "docs-only",
      template: "missing_answer",
      detailLevel: intent.detailLevel,
      guideMode: intent.guideMode,
      answer:
        "I could not find a confident match in the documentation. Try adding widget name, section, or screen context.",
      confidence: 0.1,
      sources: [],
      followUpOptions: buildFollowUpOptions(intent),
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
      detailLevel: intent.detailLevel,
      guideMode: intent.guideMode,
      answer: buildClarifyingQuestion(docGroups),
      confidence: resolveConfidence(input.hits, "clarifying_question", docGroups),
      sources: clarificationSources,
      followUpOptions: [],
      fallbackUsed: false,
    };
  }

  const primaryDocGroup = docGroups[0];
  const primaryHit = primaryDocGroup
    ? selectPrimaryHit(primaryDocGroup, intent)
    : input.hits[0];
  const supportingHit =
    primaryDocGroup && primaryHit
      ? selectSupportingHit(primaryDocGroup, primaryHit, intent)
      : null;

  if (!primaryHit) {
    return {
      mode: "docs-only",
      template: "missing_answer",
      detailLevel: intent.detailLevel,
      guideMode: intent.guideMode,
      answer:
        "I could not find a confident match in the documentation. Try adding widget name, section, or screen context.",
      confidence: 0.1,
      sources: [],
      followUpOptions: buildFollowUpOptions(intent),
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
      ? buildLocationAnswer(
          primaryDocGroup ?? groupHitsByDoc([primaryHit])[0]!,
          primaryHit,
          supportingHit,
          intent
        )
      : intent.kind === "capability"
        ? buildCapabilityAnswer(
            primaryDocGroup ?? groupHitsByDoc([primaryHit])[0]!,
            primaryHit,
            supportingHit,
            intent
          )
        : buildProceduralAnswer(
            primaryDocGroup ?? groupHitsByDoc([primaryHit])[0]!,
            primaryHit,
            supportingHit,
            intent
          );

  return {
    mode: "docs-only",
    template: intent.template,
    detailLevel: intent.detailLevel,
    guideMode: intent.guideMode,
    answer: answer || "Follow the documented steps in the most relevant product guide.",
    confidence: resolveConfidence(selectedEvidence, intent.template, docGroups),
    sources: selectedEvidence.map(toSource),
    followUpOptions: buildFollowUpOptions(intent),
    fallbackUsed: false,
  };
};
