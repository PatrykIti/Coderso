import { eq } from "drizzle-orm";

import { expandDocsTokens, normalizeDocsText, tokenizeDocsText } from "./docsIndexService";
import { normalizeDocsQuery } from "./docsRetriever";
import type { DocsSearchHit } from "./docsTypes";

const BM25_K1 = 1.2;
const BM25_B = 0.75;

const resolveTopK = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 5;
  return Math.min(Math.max(Math.floor(value), 1), 10);
};

const resolveMinScore = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.01;
  return Math.max(value, 0);
};

const LOCATION_HINTS = ["where", "configure", "config", "screen", "tab", "panel"];

const inferLocationIntent = (query: string) => {
  const normalized = normalizeDocsText(query);
  return LOCATION_HINTS.some((term) => normalized.includes(term));
};

const scoreSectionWeight = (headingPath: string[], query: string) => {
  const normalizedHeading = normalizeDocsText(headingPath.join(" "));
  const locationIntent = inferLocationIntent(query);

  let score = 0;
  if (normalizedHeading.includes("step by step")) score += 0.9;
  if (normalizedHeading.includes("what is it")) score += 0.35;
  if (normalizedHeading.includes("when to use")) score += 0.25;
  if (locationIntent && normalizedHeading.includes("examples")) score -= 0.35;
  return score;
};

const scorePathWeight = (docPath: string) => {
  const normalizedPath = normalizeDocsText(docPath);
  let score = 0;
  if (normalizedPath.includes("docs screens")) score += 0.7;
  if (normalizedPath.includes("docs coderso")) score += 0.6;
  if (normalizedPath.includes("docs solution kits")) score += 0.2;
  if (normalizedPath.includes("docs playbooks")) score += 0.1;
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

export type AssistantDocsDbSearchOptions = {
  topK?: number;
  minScore?: number;
};

export type AssistantDocsDbChunkRow = {
  id: string;
  docPath: string;
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
};

export const rankAssistantDocsDbRows = (
  rows: AssistantDocsDbChunkRow[],
  query: string,
  options: AssistantDocsDbSearchOptions = {}
): DocsSearchHit[] => {
  const normalizedQuery = normalizeDocsQuery(query);
  if (normalizedQuery.length < 2) return [];
  if (rows.length === 0) return [];

  const queryTokens = tokenizeDocsText(normalizedQuery);
  if (queryTokens.length === 0) return [];
  const expandedQueryTokens = expandDocsTokens(queryTokens);
  const topK = resolveTopK(options.topK);
  const minScore = resolveMinScore(options.minScore);

  const preparedRows: RankedChunkRow[] = rows.map((row) => ({
    ...row,
    tokenCounts: toTokenCounts(row.normalizedText),
  }));

  const averageChunkLength =
    preparedRows.reduce((sum, row) => sum + Math.max(row.tokenCount, 1), 0) /
    Math.max(preparedRows.length, 1);

  const tokenDocumentFrequency: Record<string, number> = {};
  for (const row of preparedRows) {
    for (const token of expandedQueryTokens) {
      if ((row.tokenCounts[token] ?? 0) > 0) {
        tokenDocumentFrequency[token] = (tokenDocumentFrequency[token] ?? 0) + 1;
      }
    }
  }

  const hits: DocsSearchHit[] = [];
  for (const row of preparedRows) {
    let score = 0;
    const matchedTerms: string[] = [];

    for (const token of expandedQueryTokens) {
      const termFrequency = row.tokenCounts[token] ?? 0;
      if (termFrequency <= 0) continue;
      matchedTerms.push(token);
      score += bm25TermScore({
        termFrequency,
        documentFrequency: tokenDocumentFrequency[token] ?? 0,
        documentCount: preparedRows.length,
        chunkLength: row.tokenCount,
        averageChunkLength,
      });
    }

    if (matchedTerms.length === 0) continue;

    const headingNormalized = normalizeDocsText(row.headingPath.join(" "));
    const pathNormalized = normalizeDocsText(row.docPath);
    const phrase = normalizeDocsText(normalizedQuery);
    if (phrase && row.normalizedText.includes(phrase)) {
      score += 1.2;
    }

    for (const term of matchedTerms) {
      if (headingNormalized.includes(term)) score += 0.35;
      if (pathNormalized.includes(term)) score += 0.25;
    }

    score += scoreSectionWeight(row.headingPath, normalizedQuery);
    score += scorePathWeight(row.docPath);

    if (score < minScore) continue;

    hits.push({
      chunk: {
        id: row.id,
        docPath: row.docPath,
        headingPath: row.headingPath,
        heading: row.heading,
        lineStart: row.lineStart,
        lineEnd: row.lineEnd,
        content: row.content,
        normalizedText: row.normalizedText,
        tokenCounts: row.tokenCounts,
        tokenCount: row.tokenCount,
      },
      score,
      matchedTerms,
      snippet: buildSnippet(row.content, expandedQueryTokens),
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
