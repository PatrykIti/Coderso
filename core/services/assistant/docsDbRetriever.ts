import { eq } from "drizzle-orm";

import { expandDocsTokens, normalizeDocsText, tokenizeDocsText } from "./docsIndexService";
import { normalizeDocsQuery } from "./docsRetriever";
import type { DocsSearchHit } from "./docsTypes";

const BM25_K1 = 1.2;
const BM25_B = 0.75;

const LOCATION_HINTS = [
  "where",
  "configure",
  "config",
  "screen",
  "tab",
  "panel",
  "settings",
  "gdzie",
  "ustaw",
  "ustawienia",
  "znajde",
  "znalezc",
];
const HOW_HINTS = ["how", "change", "edit", "update", "jak", "zmien", "edyt"];
const SCREEN_HINTS = ["screen", "page", "tab", "panel", "editor", "settings", "module"];

type QueryIntent = {
  normalized: string;
  tokens: string[];
  expandedTokens: string[];
  phrases: string[];
  location: boolean;
  procedural: boolean;
  asksForScreen: boolean;
};

type RankingContext = {
  intent: QueryIntent;
};

export type AssistantDocsDbSearchOptions = {
  topK?: number;
  minScore?: number;
};

export type AssistantDocsDbChunkRow = {
  id: string;
  docPath: string;
  docTitle: string;
  productArea: string;
  keywords: string[];
  headingPath: string[];
  heading: string;
  lineStart: number;
  lineEnd: number;
  content: string;
  normalizedText: string;
  tokenCount: number;
};

type RankedChunkRow = AssistantDocsDbChunkRow & {
  tokenCounts: Record<string, number>;
  pathNormalized: string;
  docTitleNormalized: string;
  productAreaNormalized: string;
  keywordsNormalized: string[];
};

type ScoredChunkRow = {
  row: RankedChunkRow;
  score: number;
  matchedTerms: string[];
  textScore: number;
  domainScore: number;
  intentScore: number;
  phraseScore: number;
  domainPenalty: number;
  matchedQueryCoverage: number;
};

const resolveTopK = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 5;
  return Math.min(Math.max(Math.floor(value), 1), 10);
};

const resolveMinScore = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.01;
  return Math.max(value, 0);
};

const buildQueryPhrases = (tokens: string[]) => {
  const phrases: string[] = [];
  for (let size = 2; size <= Math.min(tokens.length, 4); size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const phrase = tokens.slice(index, index + size).join(" ").trim();
      if (phrase.length > 2) {
        phrases.push(phrase);
      }
    }
  }
  return [...new Set(phrases)];
};

const inferQueryIntent = (query: string): QueryIntent => {
  const normalized = normalizeDocsText(query);
  const tokens = tokenizeDocsText(query);
  const uniqueTokens = [...new Set(tokens)];

  return {
    normalized,
    tokens: uniqueTokens,
    expandedTokens: expandDocsTokens(uniqueTokens),
    phrases: buildQueryPhrases(uniqueTokens),
    location: LOCATION_HINTS.some((term) => normalized.includes(term)),
    procedural: HOW_HINTS.some((term) => normalized.includes(term)),
    asksForScreen: SCREEN_HINTS.some((term) => normalized.includes(term)),
  };
};

const scoreSectionWeight = (headingPath: string[], context: RankingContext) => {
  const normalizedHeading = normalizeDocsText(headingPath.join(" "));
  let score = 0;

  if (normalizedHeading.includes("step by step")) score += 0.9;
  if (normalizedHeading.includes("what is it")) score += 0.35;
  if (normalizedHeading.includes("when to use")) score += 0.25;
  if ((context.intent.location || context.intent.procedural) && normalizedHeading.includes("examples")) {
    score -= 0.45;
  }
  if (context.intent.location && normalizedHeading.includes("common mistakes")) {
    score -= 0.15;
  }

  return score;
};

const scorePathWeight = (docPath: string, context: RankingContext) => {
  const normalizedPath = normalizeDocsText(docPath);
  let score = 0;

  if (normalizedPath.includes("docs screens")) score += 0.7;
  if (normalizedPath.includes("docs coderso")) score += 0.6;
  if (normalizedPath.includes("docs solution kits")) score += 0.2;
  if (normalizedPath.includes("docs playbooks")) score += 0.1;
  if ((context.intent.location || context.intent.asksForScreen) && normalizedPath.includes("docs playbooks")) {
    score -= 0.45;
  }
  if ((context.intent.location || context.intent.asksForScreen) && normalizedPath.includes("docs solution kits")) {
    score -= 0.2;
  }

  return score;
};

const buildSnippet = (content: string, queryTerms: string[], maxLength = 220) => {
  const compact = content.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;

  const lower = compact.toLowerCase();
  let hitIndex = -1;
  for (const term of queryTerms) {
    const index = lower.indexOf(term.toLowerCase());
    if (index === -1) continue;
    if (hitIndex === -1 || index < hitIndex) {
      hitIndex = index;
    }
  }

  if (hitIndex === -1) {
    return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
  }

  const start = Math.max(0, hitIndex - Math.floor(maxLength / 4));
  const end = Math.min(compact.length, start + maxLength);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < compact.length ? "…" : "";
  return `${prefix}${compact.slice(start, end).trim()}${suffix}`;
};

const toTokenCounts = (normalizedText: string) => {
  const counts: Record<string, number> = {};
  for (const token of normalizedText.split(" ")) {
    const trimmed = token.trim();
    if (trimmed.length <= 1) continue;
    counts[trimmed] = (counts[trimmed] ?? 0) + 1;
  }
  return counts;
};

const bm25TermScore = (input: {
  termFrequency: number;
  documentFrequency: number;
  documentCount: number;
  chunkLength: number;
  averageChunkLength: number;
}) => {
  if (input.termFrequency <= 0) return 0;
  const docCount = Math.max(input.documentCount, 1);
  const docFrequency = Math.max(input.documentFrequency, 0);
  const idf = Math.log((docCount - docFrequency + 0.5) / (docFrequency + 0.5) + 1);
  const avgLength = Math.max(input.averageChunkLength, 1);
  const lengthNorm =
    BM25_K1 * (1 - BM25_B + BM25_B * (Math.max(input.chunkLength, 1) / avgLength));
  const tf = (input.termFrequency * (BM25_K1 + 1)) / (input.termFrequency + lengthNorm);
  return idf * tf;
};

const collectMatchedTerms = (source: Set<string>, terms: Iterable<string>) => {
  for (const term of terms) {
    const trimmed = term.trim();
    if (trimmed.length > 0) {
      source.add(trimmed);
    }
  }
};

const scoreFieldTokenMatches = (
  row: RankedChunkRow,
  queryTokens: string[],
  matchedTerms: Set<string>
) => {
  let score = 0;

  for (const token of queryTokens) {
    let matched = false;
    if (row.productAreaNormalized.includes(token)) {
      score += 0.95;
      matched = true;
    }
    if (row.docTitleNormalized.includes(token)) {
      score += 0.75;
      matched = true;
    }
    if (row.keywordsNormalized.some((keyword) => keyword.includes(token))) {
      score += 0.7;
      matched = true;
    }
    if (row.pathNormalized.includes(token)) {
      score += 0.35;
      matched = true;
    }
    if (matched) {
      matchedTerms.add(token);
    }
  }

  return score;
};

const scoreExactMetadataPhraseMatches = (
  row: RankedChunkRow,
  phrases: string[],
  matchedTerms: Set<string>
) => {
  let score = 0;

  for (const phrase of phrases) {
    let matched = false;
    if (row.docTitleNormalized.includes(phrase)) {
      score += 1.35;
      matched = true;
    }
    if (row.productAreaNormalized.includes(phrase)) {
      score += 1.15;
      matched = true;
    }
    if (row.keywordsNormalized.some((keyword) => keyword.includes(phrase))) {
      score += 1.1;
      matched = true;
    }
    if (row.pathNormalized.includes(phrase)) {
      score += 0.75;
      matched = true;
    }
    if (matched) {
      collectMatchedTerms(matchedTerms, phrase.split(" "));
    }
  }

  return score;
};

const scoreIntentAlignment = (row: RankedChunkRow, context: RankingContext) => {
  let score = 0;
  const titleAndPath = `${row.docTitleNormalized} ${row.pathNormalized}`;

  if (context.intent.asksForScreen) {
    if (row.docPath.startsWith("docs/screens/")) score += 0.4;
    if (/(screen|settings|editor|page|tab|panel)/.test(titleAndPath)) score += 0.35;
  }

  if (context.intent.location && /(step by step|settings|editor|screen)/.test(titleAndPath)) {
    score += 0.25;
  }

  return score;
};

const applyCrossAreaPenalty = (rows: ScoredChunkRow[]) => {
  const strongestDomainScore = rows.reduce((max, row) => Math.max(max, row.domainScore), 0);
  if (strongestDomainScore < 1.2) {
    return rows;
  }

  const dominantAreas = new Set(
    rows
      .filter((row) => row.domainScore >= Math.max(1.2, strongestDomainScore - 0.25))
      .map((row) => row.row.productArea)
  );

  return rows.map((row) => {
    let domainPenalty = 0;
    if (!dominantAreas.has(row.row.productArea)) {
      if (row.domainScore === 0) {
        domainPenalty = 1.4;
      } else if (row.domainScore < strongestDomainScore * 0.4) {
        domainPenalty = 0.8;
      }
    }

    return {
      ...row,
      domainPenalty,
      score: row.score - domainPenalty,
    };
  });
};

const loadDbModules = async () => {
  const [{ db }, schema] = await Promise.all([
    import("../../db/client"),
    import("../../db/schema"),
  ]);
  return { db, ...schema };
};

const toHeadingPath = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0);
};

const toKeywords = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0);
};

export const rankAssistantDocsDbRows = (
  rows: AssistantDocsDbChunkRow[],
  query: string,
  options: AssistantDocsDbSearchOptions = {}
): DocsSearchHit[] => {
  const normalizedQuery = normalizeDocsQuery(query);
  if (normalizedQuery.length < 2) return [];
  if (rows.length === 0) return [];

  const intent = inferQueryIntent(normalizedQuery);
  if (intent.tokens.length === 0) return [];

  const topK = resolveTopK(options.topK);
  const minScore = resolveMinScore(options.minScore);

  const preparedRows: RankedChunkRow[] = rows.map((row) => ({
    ...row,
    tokenCounts: toTokenCounts(row.normalizedText),
    pathNormalized: normalizeDocsText(row.docPath),
    docTitleNormalized: normalizeDocsText(row.docTitle),
    productAreaNormalized: normalizeDocsText(row.productArea),
    keywordsNormalized: row.keywords.map((keyword) => normalizeDocsText(keyword)),
  }));

  const averageChunkLength =
    preparedRows.reduce((sum, row) => sum + Math.max(row.tokenCount, 1), 0) /
    Math.max(preparedRows.length, 1);

  const tokenDocumentFrequency: Record<string, number> = {};
  for (const row of preparedRows) {
    for (const token of intent.expandedTokens) {
      if ((row.tokenCounts[token] ?? 0) > 0) {
        tokenDocumentFrequency[token] = (tokenDocumentFrequency[token] ?? 0) + 1;
      }
    }
  }

  const scoredRows: ScoredChunkRow[] = [];
  for (const row of preparedRows) {
    let textScore = 0;
    const matchedTerms = new Set<string>();

    for (const token of intent.expandedTokens) {
      const termFrequency = row.tokenCounts[token] ?? 0;
      if (termFrequency <= 0) continue;
      matchedTerms.add(token);
      textScore += bm25TermScore({
        termFrequency,
        documentFrequency: tokenDocumentFrequency[token] ?? 0,
        documentCount: preparedRows.length,
        chunkLength: row.tokenCount,
        averageChunkLength,
      });
    }

    const fieldTokenScore = scoreFieldTokenMatches(row, intent.expandedTokens, matchedTerms);
    const metadataPhraseScore = scoreExactMetadataPhraseMatches(row, intent.phrases, matchedTerms);
    const domainScore = fieldTokenScore + metadataPhraseScore;

    if (matchedTerms.size === 0) continue;

    const headingNormalized = normalizeDocsText(row.headingPath.join(" "));
    let contentPhraseScore = 0;
    if (intent.normalized && row.normalizedText.includes(intent.normalized)) {
      contentPhraseScore += 1.2;
    }

    let fieldScore = 0;
    for (const term of matchedTerms) {
      if (headingNormalized.includes(term)) fieldScore += 0.35;
      if (row.pathNormalized.includes(term)) fieldScore += 0.25;
    }

    const intentScore =
      scoreSectionWeight(row.headingPath, { intent }) +
      scorePathWeight(row.docPath, { intent }) +
      scoreIntentAlignment(row, { intent });

    scoredRows.push({
      row,
      score: textScore + domainScore + contentPhraseScore + fieldScore + intentScore,
      matchedTerms: [...matchedTerms],
      textScore,
      domainScore,
      intentScore,
      phraseScore: metadataPhraseScore + contentPhraseScore,
      domainPenalty: 0,
      matchedQueryCoverage:
        intent.tokens.length === 0
          ? 0
          : Math.min(
              1,
              intent.tokens.filter((token) => matchedTerms.has(token)).length /
                intent.tokens.length
            ),
    });
  }

  const hits: DocsSearchHit[] = [];
  for (const row of applyCrossAreaPenalty(scoredRows)) {
    if (row.score < minScore) continue;

    hits.push({
      chunk: {
        id: row.row.id,
        docPath: row.row.docPath,
        headingPath: row.row.headingPath,
        heading: row.row.heading,
        lineStart: row.row.lineStart,
        lineEnd: row.row.lineEnd,
        content: row.row.content,
        normalizedText: row.row.normalizedText,
        tokenCounts: row.row.tokenCounts,
        tokenCount: row.row.tokenCount,
      },
      score: row.score,
      matchedTerms: row.matchedTerms,
      snippet: buildSnippet(row.row.content, intent.expandedTokens),
      rankingSignals: {
        textScore: row.textScore,
        domainScore: row.domainScore,
        intentScore: row.intentScore,
        phraseScore: row.phraseScore,
        domainPenalty: row.domainPenalty,
        matchedQueryCoverage: row.matchedQueryCoverage,
      },
    });
  }

  hits.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.chunk.docPath !== right.chunk.docPath) {
      return left.chunk.docPath.localeCompare(right.chunk.docPath);
    }
    return left.chunk.lineStart - right.chunk.lineStart;
  });

  return hits.slice(0, topK);
};

export const searchAssistantDocsDb = async (
  query: string,
  options: AssistantDocsDbSearchOptions = {}
): Promise<DocsSearchHit[]> => {
  try {
    const { db, assistantDocs, assistantDocChunks } = await loadDbModules();
    const rows = await db
      .select({
        chunkId: assistantDocChunks.id,
        docPath: assistantDocs.sourcePath,
        docTitle: assistantDocs.title,
        productArea: assistantDocs.productArea,
        keywords: assistantDocs.keywordsJson,
        headingPath: assistantDocChunks.headingPath,
        heading: assistantDocChunks.heading,
        lineStart: assistantDocChunks.lineStart,
        lineEnd: assistantDocChunks.lineEnd,
        content: assistantDocChunks.content,
        normalizedText: assistantDocChunks.normalizedText,
        tokenCount: assistantDocChunks.tokenCount,
      })
      .from(assistantDocChunks)
      .innerJoin(assistantDocs, eq(assistantDocChunks.docId, assistantDocs.id));

    const rankedRows: AssistantDocsDbChunkRow[] = rows.map((row) => {
      const headingPath = toHeadingPath(row.headingPath);
      const normalizedText = String(row.normalizedText ?? "").trim();
      return {
        id: row.chunkId,
        docPath: String(row.docPath ?? ""),
        docTitle: String(row.docTitle ?? ""),
        productArea: String(row.productArea ?? ""),
        keywords: toKeywords(row.keywords),
        headingPath,
        heading: String(row.heading ?? headingPath[headingPath.length - 1] ?? "Section"),
        lineStart: Number(row.lineStart ?? 0),
        lineEnd: Number(row.lineEnd ?? 0),
        content: String(row.content ?? ""),
        normalizedText,
        tokenCount: Math.max(
          Number(row.tokenCount ?? 0),
          tokenizeDocsText(normalizedText).length
        ),
      };
    });

    return rankAssistantDocsDbRows(rankedRows, query, options);
  } catch {
    throw new Error("assistant_docs_db_unavailable");
  }
};
